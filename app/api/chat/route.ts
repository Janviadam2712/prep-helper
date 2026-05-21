import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENROUTER_API_KEY not set in .env.local' },
      { status: 500 }
    );
  }

  const { messages, transcript, subject } = await req.json();

  const systemPrompt = `You are an expert AI tutor helping a student study ${subject || 'for JEE and Board exams'}. Be concise, clear, and encouraging.

${
  transcript
    ? `The student is watching a YouTube lecture. Transcript:\n\n${transcript.slice(0, 8000)}\n\nBase answers on this transcript where relevant.`
    : 'No transcript loaded yet. Help with general subject questions.'
}

Rules:
- Keep responses under 250 words unless asked for a Cheat Sheet
- For math write equations in plain text: F = ma, v² = u² + 2as
- If asked to Quiz Me: write exactly one MCQ with 4 options (A B C D) then wait
- If asked for 10yo Style: use simple words and real-world analogies
- If asked for a Cheat Sheet: short bullet points, one formula or concept per line
- If asked for an Example: give a clear step-by-step worked example`;

  const lastMessage = messages[messages.length - 1]?.content || '';
  const isComplexMath = /integrat|differentiat|calculus|matrix|eigen|fourier|trigonometr/i.test(lastMessage);

  const model = isComplexMath
    ? 'anthropic/claude-3.5-sonnet'
    : 'openai/gpt-4o-mini';

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://prep-helper.vercel.app',
        'X-Title': 'Prep Helper',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || `OpenRouter error: ${response.status}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      text: data.choices[0].message.content,
      model: data.model,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to reach OpenRouter. Check your internet and API key.' },
      { status: 500 }
    );
  }
}