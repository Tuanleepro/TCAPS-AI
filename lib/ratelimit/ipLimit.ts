// IP-based rate limit for /api/tryon.
//
// Two windows: 10 requests / hour, 50 requests / day. Counters live in KV
// with TTLs matching their window — no background sweeper needed; Redis
// expires them automatically.
//
// Failure mode: if KV is unavailable, the limiter FAILS OPEN (allows the
// request through). This protects legitimate users when KV hiccups; it
// also means the limit isn't enforced before owner provisions KV.
//
// What counts: every call to /api/tryon that hits Gemini. Cache hits are
// allowed through WITHOUT consuming quota (see /api/tryon ordering) so a
// customer browsing back-and-forth between caps doesn't hit the cap.

import { kvAvailable, kvIncrWithTtl } from '@/lib/redis/kv'

const HOUR_LIMIT = 10
const DAY_LIMIT  = 50
const HOUR_TTL   = 3600       // seconds
const DAY_TTL    = 86_400

export interface RateLimitResult {
  ok:            boolean
  reason?:       string
  retryAfter?:   number       // seconds until the offending window resets
  remainingHour: number
  remainingDay:  number
}

const ALLOW: RateLimitResult = {
  ok: true, remainingHour: HOUR_LIMIT, remainingDay: DAY_LIMIT,
}

/**
 * Increment hourly + daily counters for `ip` and check both limits.
 * Returns ALLOW if either KV is missing OR ip is unknown (we don't want to
 * blanket-block requests we can't attribute).
 */
export async function checkAndIncrementIp(ip: string): Promise<RateLimitResult> {
  if (!kvAvailable() || !ip || ip === 'unknown') return ALLOW

  // Use ":" separators so the keys are inspectable in Redis CLI / Upstash UI.
  const hourKey = `tcaps:rl:tryon:h:${ip}`
  const dayKey  = `tcaps:rl:tryon:d:${ip}`

  // Two sequential calls (each is a 2-cmd pipeline = 1 round-trip). Total
  // overhead per request: ~100ms. The pipeline helper EXPIRE-on-INCR keeps
  // counters scoped to their window without us having to track wall time.
  const [hourCount, dayCount] = await Promise.all([
    kvIncrWithTtl(hourKey, HOUR_TTL),
    kvIncrWithTtl(dayKey,  DAY_TTL),
  ])

  // If either side returned null (KV outage mid-pipeline), fail OPEN — better
  // to let a single request through than to block a legitimate customer
  // because of our infra.
  if (hourCount === null || dayCount === null) return ALLOW

  const remainingHour = Math.max(0, HOUR_LIMIT - hourCount)
  const remainingDay  = Math.max(0, DAY_LIMIT  - dayCount)

  // Check daily FIRST — exceeding the daily cap is the more durable block
  // (resets at midnight, not in 60min), so it's the most useful retry hint.
  if (dayCount > DAY_LIMIT) {
    return {
      ok:            false,
      reason:        `Bạn đã vượt giới hạn ${DAY_LIMIT} lượt thử/ngày. Vui lòng quay lại sau.`,
      retryAfter:    DAY_TTL,
      remainingHour, remainingDay: 0,
    }
  }
  if (hourCount > HOUR_LIMIT) {
    return {
      ok:            false,
      reason:        `Bạn đã vượt giới hạn ${HOUR_LIMIT} lượt thử/giờ. Vui lòng thử lại sau ${HOUR_TTL / 60} phút.`,
      retryAfter:    HOUR_TTL,
      remainingHour: 0, remainingDay,
    }
  }
  return { ok: true, remainingHour, remainingDay }
}
