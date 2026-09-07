import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fs from 'fs';
import path from 'path';
import { PDFParse } from 'pdf-parse';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

// Loads the same keys your app already uses — no new secrets needed
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const embedModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' }); // outputs 768-dim vectors

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // needs the service role key, not the anon key, to bypass RLS for this one-time script
);

const CHUNK_SIZE = 1000; // characters, roughly ~500 tokens
const CHUNK_OVERLAP = 200; // characters repeated at the start of the next chunk

function chunkText(text: string): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  const chunks: string[] = [];
  const step = CHUNK_SIZE - CHUNK_OVERLAP; // how far we move forward each time
  for (let i = 0; i < clean.length; i += step) {
    chunks.push(clean.slice(i, i + CHUNK_SIZE));
  }
  return chunks;
}

async function ingestFile(filePath: string) {
  const fileName = path.basename(filePath);
  console.log(`Processing ${fileName}...`);

  const buffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  await parser.destroy();
  const chunks = chunkText(result.text);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (chunk.length < 50) continue; // skip near-empty chunks

    const result = await embedModel.embedContent(chunk);
    const embedding = result.embedding.values;

    const { error } = await supabase.from('document_chunks').insert({
      content: chunk,
      embedding,
      source_pdf: fileName,
      page_number: null, // pdf-parse doesn't give per-chunk page numbers by default — fine for now
    });

    if (error) console.error(`  ✗ chunk ${i}:`, error.message);
    else console.log(`  ✓ chunk ${i}/${chunks.length}`);
  }
}

async function main() {
  const dir = path.join(process.cwd(), 'data/chemistry');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.pdf'));

  for (const file of files) {
    await ingestFile(path.join(dir, file));
  }
  console.log('Done.');
}

main();