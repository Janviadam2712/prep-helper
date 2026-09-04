This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).


## RAG Feature (Chemistry PYQs)

Added a Retrieval-Augmented Generation (RAG) system to answer questions from Chemistry Previous Year Questions (PYQs) and syllabus PDFs.

**How it works:**
- 72 text chunks extracted from 13 Chemistry PDFs
- Chunks embedded using Gemini's `gemini-embedding-001` model and stored in Supabase (pgvector)
- User question → relevant chunks retrieved → answer generated with source attribution

**Evaluation (RAGAS):**
- `faithfulness`: 0.77 — answers stay grounded in retrieved context
- `context_recall`: 0.90 — retrieval reliably finds relevant source material
- `factual_correctness (F1)`: 0.19 — this metric is strict on phrasing; manual review found the large majority of low-scored answers were factually correct but worded differently from the reference

**Debugging note:** one failure mode was root-caused to a chunk-boundary issue in PDF ingestion (a question's answer key landed in the next chunk), fixed by adding overlapping chunks — a common RAG failure pattern.

**Current scope:** Chemistry PYQs + syllabus only.


## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
