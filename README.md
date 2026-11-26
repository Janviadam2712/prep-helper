# Prep Helper

An AI study assistant for exam preparation. Paste a YouTube lecture and chat with it, take quizzes on it, and get answers to Chemistry past-paper questions grounded in real syllabus PDFs.

**Live app:** https://prep-helper-tau.vercel.app

---

## What it does

- **Lecture chat:** load a YouTube lecture and ask questions about it. The transcript is fetched automatically.
- **Quizzes and cheat sheets:** generated from the lecture content.
- **Chemistry past-paper search (RAG):** answers questions using retrieved passages from 13 Chemistry PDFs, instead of guessing from the model's memory.
- **Voice input:** dictate a question using the browser's built-in speech recognition, then review and edit it before sending.
- **Real study streaks:** daily activity is logged in the database and the consecutive-day count is computed server-side.
- **Subject detection sidebar:** updates live using Supabase Realtime.
- **Honest answers:** when no lecture is loaded, the app tells the user it has no internet access and cannot verify or cite sources, rather than inventing citations.

---

## How the RAG pipeline works

1. Chemistry PDFs are split into 1000-character chunks with a 200-character overlap.
2. Each chunk is turned into a vector (Gemini `gemini-embedding-001`) and stored in Supabase with pgvector.
3. A question is embedded the same way, the closest chunks are retrieved, and the chat model answers using only those chunks.

**Total: 88 chunks.**

### A bug worth mentioning

Early on, some answers were wrong because the original chunks had no overlap, so an answer could be split across two chunks and never fully retrieved. Adding the 200-character overlap fixed it, and I confirmed the fix by re-running the exact question that had failed.

---

## Evaluation (RAGAS)

| Metric | Score |
| --- | --- |
| Faithfulness | 0.77 |
| Context recall | 0.90 |
| Factual correctness (F1) | 0.19 |

The low factual-correctness score needs context. This metric compares wording against a reference answer, so correct answers phrased differently are marked down. I reviewed the flagged answers by hand: 7 of 8 were actually correct. I report the number as it is rather than leaving it out.

---

## Tech stack

| Part | Technology |
| --- | --- |
| Framework | Next.js |
| Database, auth, realtime | Supabase (Postgres, pgvector, Auth, Realtime) |
| Chat model | Groq, `openai/gpt-oss-20b` |
| Embeddings | Google Gemini, `gemini-embedding-001` |
| Lecture transcripts | Supadata API |
| Voice input | Web Speech API (browser-native) |
| Hosting | Vercel |

---

## Known limitations

- **Rate limits:** the free Groq tier allows roughly 3-5 chat exchanges per minute. I reduced this as far as reasonable (smaller model, trimmed context) and chose to document the limit rather than hide it.
- **No web citations:** the general chat has no internet search. Adding it would be a build of similar size to the RAG pipeline.
- **One subject:** the RAG pipeline currently covers Chemistry only.

---

## Roadmap

- Lecture-to-PDF study notes (topics, formulas and examples from a lecture)
- Pen and highlight annotations on the video
- Spaced-repetition review of past quiz questions
- Weak-topic dashboard
- More subjects in the RAG pipeline

---

## Run it locally

```bash
git clone https://github.com/Janviadam2712/prep-helper.git
cd prep-helper
npm install
```

Create a `.env.local` file with your own keys for Supabase, Groq, Gemini and Supadata, then:

```bash
npm run dev
```

Open http://localhost:3000.

---

## About

Built by ** Janvi Adam **