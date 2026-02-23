/**
 * In-memory rate limiter for public endpoints.
 * Uses a sliding window approach keyed by identifier (phone, email, IP).
 */

type RateLimitEntry = {
  timestamps: number[];
};

const store = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}

/**
 * Check if a request should be rate limited.
 * @param key - Unique identifier (e.g. phone number, IP address)
 * @param maxRequests - Maximum number of requests allowed in the window
 * @param windowMs - Time window in milliseconds (default 15 minutes)
 * @returns true if the request is allowed, false if rate limited
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number = 15 * 60 * 1000
): boolean {
  cleanup(windowMs);

  const now = Date.now();
  const entry = store.get(key);

  if (!entry) {
    store.set(key, { timestamps: [now] });
    return true;
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= maxRequests) {
    return false;
  }

  entry.timestamps.push(now);
  return true;
}

/**
 * Fixed delay to prevent timing attacks on lookup endpoints.
 */
export function timingSafeDelay(ms: number = 500): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
