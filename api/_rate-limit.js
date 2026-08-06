/**
 * api/_rate-limit.js
 * Minimal shared in-memory sliding-window rate limiter for public (unauthenticated)
 * endpoints that are keyed by a booking reference: /api/invoice and
 * /api/lookup-booking. Blunts brute-forcing of reference codes.
 *
 * Best-effort per warm instance — on serverless (Vercel) each instance keeps its
 * own bucket, so this must be paired with platform-level limits (WAF / dashboard)
 * for hard enforcement. Tune via env: RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS.
 */

const LIMIT = Math.max(1, Number(process.env.RATE_LIMIT_MAX) || 30);
const WINDOW_MS = Math.max(1000, Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000);

const buckets = new Map();

function clientIp(req) {
  if (!req) return 'unknown';
  const fwd = req.headers && req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  if (req.socket && req.socket.remoteAddress) return req.socket.remoteAddress;
  if (req.connection && req.connection.remoteAddress) return req.connection.remoteAddress;
  return 'unknown';
}

function allow(req) {
  const now = Date.now();
  const key = clientIp(req);
  let bucket = buckets.get(key);
  if (!bucket || now - bucket.start >= WINDOW_MS) {
    bucket = { start: now, hits: 0 };
    buckets.set(key, bucket);
  }
  bucket.hits++;

  // Opportunistic cleanup so the map never grows unbounded.
  if (buckets.size > 10_000) {
    for (const [k, b] of buckets) {
      if (now - b.start >= WINDOW_MS) buckets.delete(k);
    }
  }

  return {
    allowed: bucket.hits <= LIMIT,
    remaining: Math.max(0, LIMIT - bucket.hits),
    retryAfter: Math.max(0, Math.ceil((bucket.start + WINDOW_MS - now) / 1000))
  };
}

module.exports = { allow, LIMIT, WINDOW_MS };
