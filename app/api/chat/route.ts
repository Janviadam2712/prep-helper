import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientKey } from '../../../lib/rateLimit';

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

export async function POST(req: NextRequest) {
  const clientKey = getClientKey(req);
  if (!checkRateLimit(clientKey, RATE_LIMIT, RATE_WINDOW_MS)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment before trying again.' },
      { status: 429 }
    );
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return NextResponse.json(
      { error: 'GROQ_API_KEY not set in .env.local' },
      { status: 500 }
    );
  }

  const { messages, transcript, subject } = await req.json();
  // Only send the last few turns to Groq to control token usage.
// The full conversation still displays in the UI (AIChatPanel keeps
// its own complete `messages` state) — this only limits what gets
// sent to the model on each call, not what the student sees.
  const MAX_HISTORY_MESSAGES = 6; // last 3 user+AI exchanges
  const trimmedMessages = messages.slice(-MAX_HISTORY_MESSAGES);
  const hasTranscript = Boolean(transcript && transcript.trim().length > 0);

  // REVERTED: the "only send transcript on first message" optimization was
  // based on a wrong assumption — that the AI would somehow retain context
  // from a previous, separate API call. It won't; every Groq call is fully
  // stateless, so omitting the transcript on follow-ups meant the AI had
  // ZERO access to lecture content on any message after the first, causing
  // it to wrongly claim no lecture was loaded when asked for a Cheat Sheet.
  // Worse, testing showed this optimization never actually prevented the
  // rate limit anyway — it hit by message 2 regardless of whether transcript
  // was included. Reverting to always including it. The real fix for rate
  // limits was the video-changed chat-reset (stops re-sending accumulated
  // history from PREVIOUS videos, which was the actual root cause).
  const includeTranscript = hasTranscript;

  const systemPrompt = `You are an expert AI tutor helping a student study ${subject || 'for JEE and Board exams'}. Be concise, clear, and encouraging.

${
  includeTranscript
    ? `The student is watching a YouTube lecture. Transcript:\n\n${transcript.slice(0, 3000)}\n\nBase answers on this transcript where relevant.`
    : hasTranscript
      ? 'A transcript was already provided earlier in this conversation and is reflected in your prior replies — continue grounding answers in what was already established, without needing the full transcript re-sent.'
      : 'IMPORTANT: No transcript is loaded. The student has NOT shared any lecture or video with you yet. You have NOT watched anything. You have no specific "lecture" or "video" to reference. You also have NO ability to browse the internet, search for sources, or verify facts in real time — any answer you give is generated purely from training data and may be incomplete, outdated, or wrong. NEVER claim or imply that an answer is verified, sourced, fact-checked, or confirmed against any reference unless a transcript was actually provided.'
}

Ground rules (follow strictly):
- NEVER claim to have watched, referenced, or pulled a question from "the lecture" or "the video" unless a transcript was actually provided (either in this message or established earlier in the conversation).
- If no transcript is loaded and the student asks for a Quiz, Cheat Sheet, or Example "from the lecture," say plainly that no lecture is loaded yet and ask them to paste a YouTube URL first. You may offer a general-knowledge version but MUST explicitly say "general knowledge" in your reply every time.
- Never state or imply an answer is verified from material you were not given.

Formatting rules:
- Keep responses under 250 words unless asked for a Cheat Sheet
- For math write equations in plain text: F = ma, v² = u² + 2as
- Format ALL responses as clean HTML using these tags only: <h4>, <ul>, <li>, <ol>, <strong>, <em>, <p>
- Never use markdown asterisks, never use backticks, never use # for headings — HTML only
- For Cheat Sheet: structure your response with three sections — Key Concepts, Formulas, and Quick Facts. Use h4 for section headers and ul/li for items. Bold the term name in each item.
- If asked to Quiz Me AND a transcript is loaded: one MCQ with 4 options (A B C D), then wait
- If asked for 10yo Style: simple words, real-world analogies, wrapped in <p> tags
- If asked for an Example: numbered steps using <ol><li>`;

  // REVERTED: switching to llama-3.3-70b-versatile for its higher 12K TPM
  // ceiling did NOT meaningfully help — the real token cost driver was the
  // repeated full-transcript re-send on every message (fixed above), not
  // the model's rate limit. gpt-oss-120b followed formatting instructions
  // more thoroughly (confirmed via side-by-side testing), so reverting to
  // it now that the actual bottleneck is addressed.
  const lastMessage = messages[messages.length - 1]?.content || '';
  const isComplexMath = /integrat|differentiat|calculus|matrix|eigen|fourier|trigonometr/i.test(lastMessage);
  const model = 'openai/gpt-oss-20b';

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...trimmedMessages,
        ],
        max_tokens: 1200,
        temperature: 0.7,
        reasoning_effort: 'low',
      }),
    });

    const data = await response.json();

    console.log('RAW GROQ RESPONSE:', JSON.stringify(data, null, 2));
    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || `Groq error: ${response.status}` },
        { status: 500 }
      );
    }

    const rawText = data.choices[0].message.content as string;

    const text = hasTranscript
      ? rawText
      : `⚠️ <strong>Unverified general knowledge</strong> — no lecture is loaded, and this AI has no way to browse the internet or check sources. This answer is generated from the model's training, not fact-checked or cited. Please verify anything important against your textbook or a trusted source.\n\n${rawText}`;

    return NextResponse.json({
      text,
      model: data.model,
      hasTranscript,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to reach Groq. Check your internet and API key.' },
      { status: 500 }
    );
  }
}