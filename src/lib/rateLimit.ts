// Best-effort in-memory per-key rate limiter. Per-process only: it does NOT
// share state across serverless instances, so it is a brute-force speed bump,
// not a distributed limiter. No external dependency by design.

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 10;

type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();

export function rateLimit(key: string, now: number = Date.now()): {
  allowed: boolean;
  retryAfterSec: number;
} {
  const entry = buckets.get(key);
  if (!entry || now >= entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSec: 0 };
  }
  entry.count += 1;
  if (entry.count > MAX_ATTEMPTS) {
    return { allowed: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfterSec: 0 };
}

export function clearRateLimit(key: string): void {
  buckets.delete(key);
}

export function resetRateLimitStore(): void {
  buckets.clear();
}
