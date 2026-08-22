import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';

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
    const transcript = transcriptItems
      .map((item) => item.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    return NextResponse.json({ transcript });
  } catch {
    return NextResponse.json(
      { error: 'Transcript not available for this video' },
      { status: 404 }
    );
  }
}