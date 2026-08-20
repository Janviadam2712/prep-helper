import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';

export type TranscriptSegment = {
  text: string;
  start: number;    // seconds from video start
  duration: number; // seconds this segment is on screen
};

export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get('videoId');

  if (!videoId) {
    return NextResponse.json(
      { error: 'Missing videoId' },
      { status: 400 }
    );
  }

  try {
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);

    // NOTE: the `youtube-transcript` package returns `offset` and
    // `duration` in MILLISECONDS, not seconds — verify this against your
    // installed version if timestamps look 1000x off in testing.
    // We convert to seconds here so the rest of the app (player.seekTo,
    // currentTime polling) can compare directly without unit confusion.
    const segments: TranscriptSegment[] = transcriptItems.map((item) => ({
      text: item.text,
      start: item.offset / 1000,
      duration: item.duration / 1000,
    }));

    const transcript = segments
      .map((s) => s.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    return NextResponse.json(
      { transcript, segments },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (err) {
    console.error('Transcript fetch failed:', err);
    return NextResponse.json(
      { error: 'Transcript not available for this video' },
      { status: 404 }
    );
  }
}