import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '../../../lib/supabase/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const embedModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

export async function POST(req: NextRequest) {
  const { question } = await req.json() as { question: string };

  if (!question || !question.trim()) {
    return NextResponse.json({ error: 'Question is required' }, { status: 400 });
  }

  // Embed the user's question the same way the PDFs were embedded
  const embedResult = await embedModel.embedContent(question);
  const queryEmbedding = embedResult.embedding.values;

  const supabase = await createClient();
  const { data: chunks, error: searchError } = await supabase.rpc('match_document_chunks', {
    query_embedding: queryEmbedding,
    match_count: 5,
  });

  if (searchError) {
    return NextResponse.json({ error: searchError.message }, { status: 500 });
  }

  if (!chunks || chunks.length === 0) {
    return NextResponse.json({
      answer: "I couldn't find anything relevant in the Chemistry papers for that question.",
      sources: [],
    });
  }

  const context = chunks
    .map((c: any, i: number) => `[${i + 1}] (from ${c.source_pdf}): ${c.content}`)
    .join('\n\n');

  const prompt = `You are a Chemistry study assistant. Answer the student's question using ONLY the context below from real JEE Chemistry past papers and syllabus. If the context doesn't contain the answer, say so honestly — do not make anything up.

Context:
${context}

Question: ${question}

Answer:`;

  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 500,
    }),
  });

  const groqData = await groqRes.json();
  const answer = groqData.choices?.[0]?.message?.content || 'No answer generated.';

  return NextResponse.json({ answer, sources: chunks.map((c: any) => c.source_pdf), contexts: chunks.map((c: any) => c.content) });
}