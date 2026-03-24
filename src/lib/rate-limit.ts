/**
 * Simple in-memory sliding window rate limiter.
 * Usage: rateLimit(ip, 5, 60_000) → max 5 requests per minute
 *
 * Note: In-memory only. For multi-instance deployments, use Redis instead.
 * Swap to @upstash/ratelimit when scaling to multiple servers.
 */

const store = new Map<string, number[]>();

// Clean up entries older than 2x the window to prevent memory leak
const GC_INTERVAL = 5 * 60 * 1000; // 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of store.entries()) {
    const recent = timestamps.filter((t) => now - t < 2 * 60 * 1000);
    if (recent.length === 0) store.delete(key);
    else store.set(key, recent);
  }
}, GC_INTERVAL);

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  limit: number;
  resetAt: number; // unix ms
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;

  const timestamps = (store.get(key) ?? []).filter((t) => t > cutoff);

  const remaining = Math.max(0, limit - timestamps.length);
  const resetAt = timestamps.length > 0 ? timestamps[0] + windowMs : now + windowMs;

  if (timestamps.length >= limit) {
    store.set(key, timestamps);
    return { ok: false, remaining: 0, limit, resetAt };
  }

  timestamps.push(now);
  store.set(key, timestamps);
  return { ok: true, remaining: remaining - 1, limit, resetAt };
}

/** Convenience: extract IP from Next.js request */
export function getRequestIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

/** Add rate limit headers to a Response */
export function addRateLimitHeaders(
  headers: Headers,
  result: RateLimitResult
): void {
  headers.set('X-RateLimit-Limit', String(result.limit));
  headers.set('X-RateLimit-Remaining', String(result.remaining));
  headers.set('X-RateLimit-Reset', String(Math.floor(result.resetAt / 1000)));
}

/** Convenience: check rate limit and return a 429 Response if exceeded, else null */
export function checkRateLimit(
  req: Request,
  limit: number,
  windowMs: number
): Response | null {
  const ip = getRequestIp(req);
  const result = rateLimit(ip, limit, windowMs);
  if (!result.ok) {
    const headers = new Headers({ 'Content-Type': 'application/json' });
    addRateLimitHeaders(headers, result);
    return new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429, headers });
  }
  return null;
}

/**
 * Wrap an external fetch with a timeout.
 * Throws an AbortError if the request takes longer than timeoutMs.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 5000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
