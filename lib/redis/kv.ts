// Tiny Upstash Redis client over the REST API — NO npm dependency.
//
// Works with both Vercel KV env names (KV_REST_API_URL / KV_REST_API_TOKEN)
// and standard Upstash env names (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).
//
// Fails OPEN: if env vars are missing, every helper resolves to `null` /
// `false` so callers can fall through to the un-cached path without any
// special-casing. This means the app keeps working before/during KV setup.
//
// Why fetch() instead of @upstash/redis? Zero new dependency, ~80 lines,
// and the REST surface we need (GET/SET/INCR/EXPIRE/DEL/PIPELINE) is tiny.

interface UpstashOk { result: unknown }
interface UpstashErr { error: string }
type UpstashRes = UpstashOk | UpstashErr | unknown[]

function getCreds(): { url: string; token: string } | null {
  const url   = process.env.KV_REST_API_URL?.trim()  ?? process.env.UPSTASH_REDIS_REST_URL?.trim()
  const token = process.env.KV_REST_API_TOKEN?.trim() ?? process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  if (!url || !token) return null
  return { url, token }
}

export function kvAvailable(): boolean {
  return getCreds() !== null
}

/**
 * Run one Redis command. Returns the `result` from Upstash, or `null` on
 * any failure (missing creds, HTTP error, JSON parse error). Never throws.
 */
async function kvCmd(args: string[]): Promise<unknown> {
  const creds = getCreds()
  if (!creds) return null
  try {
    const res = await fetch(creds.url, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${creds.token}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(args),
      // Don't cache KV calls — they're stateful by nature.
      cache: 'no-store',
    })
    const data = await res.json() as UpstashRes
    if (!res.ok) {
      console.warn('[kv] HTTP', res.status, data)
      return null
    }
    if (typeof data === 'object' && data && 'error' in data) {
      console.warn('[kv] cmd error:', (data as UpstashErr).error)
      return null
    }
    return (data as UpstashOk).result ?? null
  } catch (e) {
    console.warn('[kv] fetch failed:', e instanceof Error ? e.message : e)
    return null
  }
}

/**
 * Pipeline N commands in ONE round-trip. Returns an array of results aligned
 * with `cmds`, or `null` on transport failure. Each individual command can
 * still error — its slot in the return array becomes `null`.
 */
async function kvPipeline(cmds: string[][]): Promise<unknown[] | null> {
  const creds = getCreds()
  if (!creds) return null
  try {
    const res = await fetch(`${creds.url}/pipeline`, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${creds.token}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(cmds),
      cache: 'no-store',
    })
    const data = await res.json() as UpstashRes
    if (!res.ok || !Array.isArray(data)) {
      console.warn('[kv] pipeline HTTP', res.status, data)
      return null
    }
    return data.map(d =>
      typeof d === 'object' && d && 'error' in d
        ? null
        : (d as UpstashOk).result ?? null,
    )
  } catch (e) {
    console.warn('[kv] pipeline failed:', e instanceof Error ? e.message : e)
    return null
  }
}

// ── Typed helpers ──────────────────────────────────────────────────────────

export async function kvGet(key: string): Promise<string | null> {
  const r = await kvCmd(['GET', key])
  return typeof r === 'string' ? r : null
}

export async function kvSet(key: string, value: string, ttlSeconds: number): Promise<boolean> {
  const r = await kvCmd(['SET', key, value, 'EX', String(ttlSeconds)])
  return r === 'OK'
}

export async function kvDel(key: string): Promise<void> {
  await kvCmd(['DEL', key])
}

/**
 * Increment a counter and set TTL atomically (via pipeline). Returns the new
 * count, or `null` if KV is unavailable / failed. Caller treats `null` as
 * "don't enforce" so rate limit doesn't block legit users on KV outage.
 */
export async function kvIncrWithTtl(key: string, ttlSeconds: number): Promise<number | null> {
  const results = await kvPipeline([
    ['INCR', key],
    ['EXPIRE', key, String(ttlSeconds)],
  ])
  if (!results) return null
  const count = results[0]
  return typeof count === 'number' ? count : null
}
