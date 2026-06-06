// Result cache for the Gemini try-on pipeline.
//
// Goal: if the SAME customer (same selfie bytes) tries the SAME (sku, variant)
// twice, the second call returns the cached image — no Gemini bill.
//
// Why this is the biggest cost lever:
//   - Image-output tokens on gemini-2.5-flash-image are ~97% of per-call cost.
//   - A repeat call is byte-identical to the original output, so caching
//     guarantees ZERO quality regression.
//   - Customers browse multiple caps with the same selfie; cache hits are
//     common (catalog re-visits, picker toggles, accidental page reloads).
//
// Storage: Upstash Redis via lib/redis/kv.ts. Fails OPEN if KV not configured.
// TTL: 30 days. Owner can manually invalidate via the helper or by deleting
// the KV key (cache key is logged on each cache_miss for traceability).

import crypto from 'node:crypto'
import { kvAvailable, kvDel, kvGet, kvSet } from '@/lib/redis/kv'

const KEY_PREFIX  = 'tcaps:tryon:v1:'
const TTL_SECONDS = 30 * 24 * 60 * 60     // 30 days

interface KeyArgs {
  selfieDataUrl: string
  sku?:          string | null
  variantSku?:   string | null
}

/**
 * Stable cache key from (selfie bytes, sku, variant).
 *
 * Hashes the BASE64 payload of the selfie (skipping the data URL prefix) so
 * the key doesn't shift between PNG/JPEG MIME variants of identical bytes.
 * Returns a short SHA256 prefix — collision probability at 2^96 is well
 * below the rate of any TCAPS-scale traffic.
 */
export function tryonCacheKey(args: KeyArgs): string {
  const comma   = args.selfieDataUrl.indexOf(',')
  const payload = comma >= 0 ? args.selfieDataUrl.slice(comma + 1) : args.selfieDataUrl
  const selfieHash = crypto.createHash('sha256').update(payload).digest('hex').slice(0, 24)
  const composite  = [selfieHash, args.sku ?? '', args.variantSku ?? ''].join('|')
  const keyHash    = crypto.createHash('sha256').update(composite).digest('hex').slice(0, 32)
  return KEY_PREFIX + keyHash
}

/** Returns cached result data URL, or `null` on miss / KV outage / no creds. */
export async function getCachedTryOn(key: string): Promise<string | null> {
  if (!kvAvailable()) return null
  return kvGet(key)
}

/**
 * Write a fresh result into cache. Fire-and-forget semantics for the caller:
 * if the value exceeds the KV plan's per-value limit, we log + move on.
 * The customer's try-on already returned successfully so there's nothing to
 * undo — we just lose the cache benefit for that pair.
 */
export async function setCachedTryOn(key: string, resultDataUrl: string): Promise<boolean> {
  if (!kvAvailable()) return false
  const ok = await kvSet(key, resultDataUrl, TTL_SECONDS)
  if (!ok) console.warn('[cache] set returned non-OK — possibly value too large for KV plan')
  return ok
}

/** Manual cache eviction — exposed for an admin-side "regenerate" flow. */
export async function invalidateTryOnCache(key: string): Promise<void> {
  if (!kvAvailable()) return
  await kvDel(key)
}

// ── Cost-savings bookkeeping ───────────────────────────────────────────────

/**
 * Per-cache-hit USD savings — what one Gemini image generation costs at
 * our current per-call estimate. Kept here so the dashboard and the
 * usage log read from the SAME constant.
 *
 * Source: lib/usage/log.ts pricing math @ default ref count.
 * 1 image output (1290 tokens × $30/1M) + tiny input ≈ $0.040.
 */
export const ESTIMATED_SAVING_PER_HIT_USD = 0.04
