import { NextRequest, NextResponse } from 'next/server';
import type { TranscriptSegment } from '../transcript/route';
import { checkRateLimit, getClientKey } from '../../../lib/rateLimit';
import { createClient } from '../../../lib/supabase/server';

const RATE_LIMIT = 10;         // requests
const RATE_WINDOW_MS = 60_000; // per 1 minute — lower than chat since this is a more expensive call

// In-memory cache, keyed by videoId — same limitations as rateLimit.ts:
// resets on server restart, not shared across multiple serverless instances.
// Real fix later: a Supabase table (videoId -> checkpoints), which also
// gives you a permanent record instead of re-paying every cold start.
const analysisCache = new Map<string, { checkpoints: ConceptCheckpoint[]; subject: string | null; title: string | null }>();

export type ConceptCheckpoint = {
  start: number;       // seconds — guaranteed to be a REAL timestamp from the transcript
  question: string;
  options: string[];   // exactly 4
  correctIndex: number; // 0-3
  explanation: string;
};

type Candidate = {
  index: number;
  start: number;
  text: string;
};

const BUCKET_SECONDS = 20;

// Groups raw transcript segments into ~20s buckets so we send the AI a
// manageable number of candidate moments regardless of lecture length,
// instead of every single caption line (which could be hundreds/thousands
// for a long JEE lecture and blow up token cost).
function bucketSegments(segments: TranscriptSegment[]): Candidate[] {
  if (segments.length === 0) return [];

  const candidates: Candidate[] = [];
  let bucketStart = segments[0].start;
  let bucketTexts: string[] = [];
  let bucketAnchor = segments[0].start;

  for (const seg of segments) {
    if (seg.start - bucketStart >= BUCKET_SECONDS && bucketTexts.length > 0) {
      candidates.push({ index: candidates.length, start: bucketAnchor, text: bucketTexts.join(' ') });
      bucketStart = seg.start;
      bucketTexts = [];
      bucketAnchor = seg.start;
    }
    bucketTexts.push(seg.text);
  }
  if (bucketTexts.length > 0) {
    candidates.push({ index: candidates.length, start: bucketAnchor, text: bucketTexts.join(' ') });
  }
  return candidates;
}

// YouTube's oEmbed endpoint requires no API key and gives us the title for
// free. If it fails for any reason (private video, rate limited, network
// blip), we don't want that to take down the whole analyze call — title is
// a nice-to-have for display, not load-bearing like the transcript is.
async function fetchVideoTitle(videoId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.title === 'string' ? data.title : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const clientKey = getClientKey(req);
  if (!checkRateLimit(clientKey, RATE_LIMIT, RATE_WINDOW_MS)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment before trying again.' },
      { status: 429 }
    );
  }

  const { segments, subject: userProvidedSubject, videoId } = await req.json() as {
    segments: TranscriptSegment[];
    subject?: string;
    videoId?: string;
  };

  if (!segments || segments.length === 0) {
    return NextResponse.json({ error: 'No transcript segments provided' }, { status: 400 });
  }

  // Cache check happens BEFORE any AI call — this is the actual cost savings,
  // not just a nice-to-have. Re-loading the same video is now free.
  if (videoId && analysisCache.has(videoId)) {
    const cached = analysisCache.get(videoId)!;
    return NextResponse.json({
      checkpoints: cached.checkpoints,
      subject: cached.subject,
      title: cached.title,
      cached: true,
    });
  }

  const candidates = bucketSegments(segments);

  // Cap how many checkpoints we ask for based on video length, so a 3-minute
  // clip doesn't get interrupted 15 times and a 45-minute lecture doesn't
  // only get 2. Roughly one checkpoint per ~3 minutes of content, bounded.
  const videoLengthSeconds = candidates.length * BUCKET_SECONDS;
  const targetCheckpoints = Math.max(2, Math.min(8, Math.round(videoLengthSeconds / 180)));

  const candidateList = candidates
    .map((c) => `${c.index}: ${c.text.slice(0, 280)}`)
    .join('\n');

  // If the user already manually set a subject for this video, we don't ask
  // the AI to guess — manual override always wins over AI detection. If not,
  // we ask the AI to detect it as part of the same call (one call, not two —
  // keeps cost down, per the explicit cost flag on this project).
  const subjectInstruction = userProvidedSubject
    ? `The subject has already been set by the student as "${userProvidedSubject}". Do not guess a different one.`
    : `You must also detect the subject of this lecture (e.g. "Physics", "Chemistry", "Mathematics", "Biology", or another subject name if it's clearly something else). Pick the single best-fitting subject name as a short string.`;

  const systemPrompt = `You are an expert educational content analyzer for a student studying ${userProvidedSubject || 'a competitive exam in India'}.

STEP 1 — GATEKEEPING (do this before anything else):
Look at the transcript content below and decide if this is genuinely educational / competitive-exam-prep content. This includes (but is not limited to) JEE, NEET, Boards, UPSC, CAT, banking exams (IBPS/SBI/etc), GATE, and similar serious academic/competitive-exam subjects (Physics, Chemistry, Maths, Biology, History, Polity, Economics, Reasoning, English/Verbal, General Studies, etc).
This explicitly EXCLUDES: vlogs, personal finance/lifestyle content, entertainment, music, movies/Bollywood, gaming, comedy, motivational content with no exam-relevant subject matter, or any video that is not actually teaching exam-relevant academic content — even if a word in the title sounds academic.
If, and only if, the content is NOT genuinely educational/exam-prep content, respond with ONLY this exact JSON and nothing else:
{"isEducational": false}

STEP 2 — only if the content IS genuinely educational, continue below.

${subjectInstruction}

Below is a numbered list of moments from a lecture transcript. Each number is a "candidate index" — you do NOT have access to real timestamps, only these indices. Your job is to pick approximately ${targetCheckpoints} candidate indices that represent genuinely important concept moments worth pausing the video to quiz the student on — moments where understanding the idea is more important than just hearing it pass by.

Rules:
- Pick candidates that are spread out across the lecture, not clustered together.
- Skip intros, outros, filler, sponsor reads, "subscribe" requests, and pure tangents/jokes — only pick moments with real educational content.
- For each picked candidate, write exactly one multiple-choice question (4 options) testing understanding of the concept at that moment, the correct answer index (0-3), and a short explanation of why that answer is correct.
- Base each question ONLY on content actually present in that candidate's text. Do not invent facts not present in the transcript.
- Respond with ONLY a raw JSON object, no markdown fences, no preamble, no explanation outside the JSON. Format exactly:
{"isEducational": true, "subject": "Physics", "checkpoints": [{"candidateIndex": 0, "question": "...", "options": ["...", "...", "...", "..."], "correctIndex": 0, "explanation": "..."}]}

If the subject was already given to you above, echo that exact same subject string back in the "subject" field instead of guessing.

Candidates:
${candidateList}`;

  // Title fetch runs in parallel — independent of the AI call.
  const titlePromise = fetchVideoTitle(videoId || '');

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not set in .env.local' }, { status: 500 });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 2000,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || `Gemini error: ${response.status}` },
        { status: 500 }
      );
    }

    const rawText: string = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    // Strip markdown fences — Gemini adds them even when told not to.
    const cleaned = rawText.replace(/```json|```/g, '').trim();

    let parsed: {
      isEducational?: boolean;
      subject?: string;
      checkpoints: Array<{
        candidateIndex: number;
        question: string;
        options: string[];
        correctIndex: number;
        explanation: string;
      }>;
    };

    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: 'AI did not return valid JSON. Try again.' },
        { status: 502 }
      );
    }

    // Gatekeeping check: the AI was instructed to classify content BEFORE
    // generating anything. If it's not genuinely educational/exam-prep
    // content, we stop here completely — no checkpoints, no Supabase write,
    // no fabricated subject. This is the actual fix for the misclassification
    // bug (a personal-finance vlog getting tagged "Physics").
    if (parsed.isEducational === false) {
      return NextResponse.json(
        {
          error: 'NOT_EDUCATIONAL',
          message: "This doesn't look like exam-prep or educational content. Prep Helper works best with lecture videos for JEE, NEET, Boards, UPSC, CAT, banking exams, and similar subjects.",
        },
        { status: 422 }
      );
    }

    // This is the critical safety step: we IGNORE any timestamp the AI might
    // have hallucinated and look up the REAL start time from our own
    // candidates array using only the index. The AI cannot invent a pause
    // point that doesn't correspond to actual transcript content.
    const checkpoints: ConceptCheckpoint[] = (parsed.checkpoints || [])
      .filter((item) => {
        const candidate = candidates[item.candidateIndex];
        return (
          candidate &&
          Array.isArray(item.options) &&
          item.options.length === 4 &&
          typeof item.correctIndex === 'number' &&
          item.correctIndex >= 0 &&
          item.correctIndex <= 3 &&
          typeof item.question === 'string' &&
          item.question.trim().length > 0
        );
      })
      .map((item) => ({
        start: candidates[item.candidateIndex].start,
        question: item.question,
        options: item.options,
        correctIndex: item.correctIndex,
        explanation: item.explanation || '',
      }))
      .sort((a, b) => a.start - b.start);

    if (checkpoints.length === 0) {
      return NextResponse.json(
        { error: 'AI did not produce any usable checkpoints for this video.' },
        { status: 502 }
      );
    }

    // Subject resolution: manual override always wins. Otherwise trust
    // whatever the AI detected, falling back to null if it gave us nothing
    // usable (better to show "unset" in the UI than a garbage string).
    const detectedSubject =
      userProvidedSubject ||
      (typeof parsed.subject === 'string' && parsed.subject.trim() ? parsed.subject.trim() : null);

    const title = await titlePromise;

    if (videoId) {
      analysisCache.set(videoId, { checkpoints, subject: detectedSubject, title });
    }

    // Best-effort write to Supabase. We do NOT fail the whole request if
    // this write fails — the student should still get their checkpoints and
    // be able to study, even if, say, Supabase has a blip. We just won't
    // have a persisted video/subject record for the sidebar in that case.
    if (videoId) {
      try {
        const supabase = await createClient();
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;

        if (userId) {
          await supabase
            .from('videos')
            .upsert(
              {
                user_id: userId,
                youtube_video_id: videoId,
                title,
                subject: detectedSubject,
                subject_source: userProvidedSubject ? 'user_set' : (detectedSubject ? 'ai_detected' : 'unset'),
              },
              { onConflict: 'user_id,youtube_video_id' }
            );

          // Also upsert into `subjects` so the Sidebar's subject list reflects
          // reality instead of a hardcoded array. This table is the canonical
          // "subjects this student has actually studied," not just a tag on
          // one video. on conflict, do nothing — we don't want to overwrite
          // icon/color a student may have customized later, just ensure the
          // row exists.
          if (detectedSubject) {
            await supabase
              .from('subjects')
              .upsert(
                { user_id: userId, name: detectedSubject },
                { onConflict: 'user_id,name', ignoreDuplicates: true }
              );
          }
        }
      } catch (dbErr) {
        console.error('Failed to upsert video/subject record (non-fatal):', dbErr);
      }
    }

    return NextResponse.json({ checkpoints, subject: detectedSubject, title });
  } catch {
    return NextResponse.json(
      { error: 'Failed to reach OpenRouter. Check your internet and API key.' },
      { status: 500 }
    );
  }
}