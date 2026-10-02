import type { RequestHandler } from 'express';

export type IpThrottlePolicy = {
  limit: number;
  windowMs: number;
  maxBuckets?: number;
  now?: () => number;
};

const WINDOW_MS = 15 * 60 * 1000;
export const loginThrottlePolicy = { limit: 60, windowMs: WINDOW_MS } as const;
export const registerThrottlePolicy = { limit: 30, windowMs: WINDOW_MS } as const;
export const contactThrottlePolicy = { limit: 30, windowMs: WINDOW_MS } as const;

// A bounded, per-process fixed window. IPs remain only in memory and are never
// logged. Deployment behind a proxy must configure Express trust proxy for its
// actual trusted topology; this middleware does not trust forwarded headers.
export function createIpThrottle(policy: IpThrottlePolicy): RequestHandler {
  const maxBuckets = policy.maxBuckets ?? 5000;
  if (!Number.isSafeInteger(policy.limit) || policy.limit < 1 || !Number.isSafeInteger(policy.windowMs) || policy.windowMs < 1
    || !Number.isSafeInteger(maxBuckets) || maxBuckets < 1) throw new Error('Invalid request throttle policy.');
  const buckets = new Map<string, { count: number; resetAt: number }>();
  const clock = policy.now ?? Date.now;
  const sweepInterval = Math.min(policy.windowMs, 60 * 1000);
  let nextSweepAt = 0;

  return (req, res, next) => {
    const now = clock();
    if (now >= nextSweepAt) {
      for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
      nextSweepAt = now + sweepInterval;
    }
    const key = req.ip || 'unknown';
    let bucket = buckets.get(key);
    if (bucket && bucket.resetAt <= now) { buckets.delete(key); bucket = undefined; }
    const reject = (resetAt: number) => {
      res.setHeader('Retry-After', Math.max(1, Math.ceil((resetAt - now) / 1000)));
      res.setHeader('Cache-Control', 'no-store');
      res.status(429).json({ error: 'Quá nhiều yêu cầu. Vui lòng chờ rồi thử lại.', code: 'RATE_LIMITED' });
    };
    if (!bucket) {
      // Fail closed for new IPs at capacity. Evicting active IPs would let an
      // attacker reset its allowance by flooding this map with new identities.
      if (buckets.size >= maxBuckets) { reject(nextSweepAt); return; }
      bucket = { count: 0, resetAt: now + policy.windowMs };
      buckets.set(key, bucket);
    }
    if (bucket.count >= policy.limit) { reject(bucket.resetAt); return; }
    bucket.count++;
    next();
  };
}

export const loginThrottle = createIpThrottle(loginThrottlePolicy);
export const registerThrottle = createIpThrottle(registerThrottlePolicy);
export const contactThrottle = createIpThrottle(contactThrottlePolicy);
