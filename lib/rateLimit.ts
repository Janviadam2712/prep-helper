// In-memory rate limiter — a stopgap, NOT a production-grade solution.
//
// Limitations (read before assuming this is "done"):
// - State lives in server memory. If the server restarts, all limits reset.
// - On Vercel, each serverless instance can have its OWN memory. Under real
//   traffic with multiple concurrent instances, a single IP could exceed
//   the limit by hitting different instances. This only fully works
//   correctly in `npm run dev` / a single long-running server process.
// - The real fix once you have actual users: a shared store (Upstash Redis
//   or a Supabase table) so all instances see the same counts. Flagged as
//   a Phase A follow-up, not solved here.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now > existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (existing.count >= limit) {
    return false;
  }

  existing.count += 1;
  return true;
}

export function getClientKey(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return 'unknown-client';
}
