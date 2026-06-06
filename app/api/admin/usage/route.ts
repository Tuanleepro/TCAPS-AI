// JSON usage aggregation — same source data as /admin/usage but machine
// readable so the owner can poll, cron-export to a spreadsheet, or pipe
// into Google Billing reconciliation.
//
// GET /api/admin/usage
// Optional query: ?days=30 (defaults to 30)
//
// No auth today (matches /admin convention). Add Basic auth or a shared
// secret header if this endpoint becomes externally reachable.

import { NextRequest, NextResponse } from 'next/server'
import { readUsageLog, type UsageLogRow } from '@/lib/usage/log'
import { ESTIMATED_SAVING_PER_HIT_USD } from '@/lib/cache/tryonCache'

export const runtime  = 'nodejs'
export const dynamic  = 'force-dynamic'

function dayKey(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(d)
  const y = parts.find(p => p.type === 'year')?.value
  const m = parts.find(p => p.type === 'month')?.value
  const dd = parts.find(p => p.type === 'day')?.value
  return `${y}-${m}-${dd}`
}

function inLast(rows: UsageLogRow[], days: number): UsageLogRow[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return rows.filter(r => {
    const t = new Date(r.timestamp).getTime()
    return !isNaN(t) && t >= cutoff
  })
}

function summarise(rows: UsageLogRow[]) {
  let cost = 0
  let success = 0, failed = 0
  let cacheHits = 0, geminiCalls = 0
  let qcRanCount = 0
  const retryDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
  for (const r of rows) {
    cost += r.costUsd
    if (r.status === 'success') success++; else failed++
    if (r.cacheHit) cacheHits++; else geminiCalls++
    if (r.qcRan)    qcRanCount++
    const a = r.attempt >= 1 && r.attempt <= 4 ? r.attempt : 1
    retryDistribution[a] = (retryDistribution[a] ?? 0) + 1
  }
  return {
    total:        rows.length,
    success,
    failed,
    successRate:  rows.length ? +(success / rows.length).toFixed(4) : 1,
    cacheHits,
    geminiCalls,
    cacheHitRate: rows.length ? +(cacheHits / rows.length).toFixed(4) : 0,
    cacheSavedUsd: +(cacheHits * ESTIMATED_SAVING_PER_HIT_USD).toFixed(4),
    qcRanCount,
    qcSkipRate:   rows.length ? +(1 - qcRanCount / rows.length).toFixed(4) : 1,
    estimatedCostUsd: +cost.toFixed(4),
    avgCostPerCallUsd: rows.length ? +(cost / rows.length).toFixed(6) : 0,
    retryDistribution,
    retries:      Object.entries(retryDistribution)
      .filter(([n]) => Number(n) > 1)
      .reduce((s, [, v]) => s + v, 0),
  }
}

export async function GET(req: NextRequest) {
  const url   = new URL(req.url)
  const days  = Math.min(Math.max(Number(url.searchParams.get('days') ?? 30), 1), 365)
  const rows  = await readUsageLog({ limit: 5000 })
  const today = dayKey(new Date().toISOString())

  return NextResponse.json({
    generatedAt:  new Date().toISOString(),
    timezone:     'Asia/Ho_Chi_Minh',
    rangeDays:    days,
    today:        summarise(rows.filter(r => dayKey(r.timestamp) === today)),
    last7:        summarise(inLast(rows, 7)),
    rolling:      summarise(inLast(rows, days)),
    estimatedSavingPerCacheHitUsd: ESTIMATED_SAVING_PER_HIT_USD,
  })
}
