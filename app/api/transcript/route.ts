import { NextRequest, NextResponse } from 'next/server';

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
    const res = await fetch(
      `https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}`,
      { headers: { 'x-api-key': process.env.SUPADATA_API_KEY! } }
    );

    if (!res.ok) {
      throw new Error(`Supadata returned status ${res.status}`);
    }

    const data = await res.json();

    // Supadata returns a `content` array where each item has
    // text, offset (ms), and duration (ms) — same unit issue as before,
    // so we still convert to seconds here.
    const segments: TranscriptSegment[] = data.content.map((item: { text: string; offset: number; duration: number }) => ({
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