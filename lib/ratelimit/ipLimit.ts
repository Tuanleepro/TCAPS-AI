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

// 2026-06-06: tightened from 10/hour to 10/10-minutes. Daily cap stays at 50
// as a safety net for distributed-burst abuse (one IP fanning small bursts
// across the day from many residential proxies).
const SHORT_WINDOW_LIMIT = 10
const SHORT_WINDOW_TTL   = 10 * 60         // seconds
const DAY_LIMIT          = 50
const DAY_TTL            = 86_400

export interface RateLimitResult {
  ok:            boolean
  reason?:       string
  retryAfter?:   number       // seconds until the offending window resets
  remainingHour: number
  remainingDay:  number
}

const ALLOW: RateLimitResult = {
  ok: true, remainingHour: SHORT_WINDOW_LIMIT, remainingDay: DAY_LIMIT,
}

/**
 * Increment short-window (10-min) + daily counters for `ip` and check both
 * limits. Returns ALLOW if KV is missing OR ip is unknown (we don't want
 * to blanket-block requests we can't attribute). On block, also LOG so the
 * owner can review abuse patterns in Vercel logs / Sheets.
 */
export async function checkAndIncrementIp(ip: string): Promise<RateLimitResult> {
  if (!kvAvailable() || !ip || ip === 'unknown') return ALLOW

  // Use ":" separators so the keys are inspectable in Redis CLI / Upstash UI.
  // "w10" = 10-minute window. Kept the legacy "h" key prefix unchanged so
  // any in-flight counters expire naturally rather than getting orphaned.
  const shortKey = `tcaps:rl:tryon:w10:${ip}`
  const dayKey   = `tcaps:rl:tryon:d:${ip}`

  // Two parallel calls (each is a 2-cmd pipeline = 1 round-trip).
  const [shortCount, dayCount] = await Promise.all([
    kvIncrWithTtl(shortKey, SHORT_WINDOW_TTL),
    kvIncrWithTtl(dayKey,   DAY_TTL),
  ])

  // If either side returned null (KV outage mid-pipeline), fail OPEN.
  if (shortCount === null || dayCount === null) return ALLOW

  const remainingHour = Math.max(0, SHORT_WINDOW_LIMIT - shortCount)  // name kept for caller compat
  const remainingDay  = Math.max(0, DAY_LIMIT          - dayCount)

  // Check daily FIRST — the durable block.
  if (dayCount > DAY_LIMIT) {
    console.warn(`[ratelimit] BLOCK day ip=${ip} count=${dayCount}/${DAY_LIMIT}`)
    return {
      ok:            false,
      reason:        `Bạn đã vượt giới hạn ${DAY_LIMIT} lượt thử/ngày. Vui lòng quay lại sau.`,
      retryAfter:    DAY_TTL,
      remainingHour, remainingDay: 0,
    }
  }
  if (shortCount > SHORT_WINDOW_LIMIT) {
    console.warn(`[ratelimit] BLOCK short ip=${ip} count=${shortCount}/${SHORT_WINDOW_LIMIT} (10-min window)`)
    return {
      ok:            false,
      reason:        `Bạn đã vượt giới hạn ${SHORT_WINDOW_LIMIT} lượt thử/${SHORT_WINDOW_TTL / 60} phút. Vui lòng thử lại sau ${SHORT_WINDOW_TTL / 60} phút.`,
      retryAfter:    SHORT_WINDOW_TTL,
      remainingHour: 0, remainingDay,
    }
  }
  return { ok: true, remainingHour, remainingDay }
}
