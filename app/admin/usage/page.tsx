// Server-rendered usage dashboard for the Gemini try-on pipeline.
//
// Reads the TRYON_LOG sheet on each load (no client-side polling, no
// caching), then aggregates by day / SKU / status and renders a
// minimal dark-mode dashboard. Designed to be opened from /admin so
// the owner can answer:
//   - "How many try-ons today / this week / this month?"
//   - "What's the estimated cost?"
//   - "Which SKUs drive most of the spend?"
//   - "What's the success rate? How often do retries fire?"
//
// Auth: none today (matches /admin). Whoever has the URL gets in. If
// this matters, add Basic auth via middleware later.

import Link from 'next/link'
import { readUsageLog, type UsageLogRow } from '@/lib/usage/log'

export const dynamic   = 'force-dynamic'    // always re-render (no static cache)
export const revalidate = 0

// ── Helpers ────────────────────────────────────────────────────────────────

const fmtUsd  = (n: number) => `$${n.toFixed(2)}`
const fmtVnd  = (n: number) => `${Math.round(n).toLocaleString('vi-VN')}₫`
const USD_VND = 25_000                       // rough — for VND display

function dayKey(iso: string): string {
  // Bucket logs by day in Asia/Ho_Chi_Minh so dashboard reads match the
  // owner's clock. ISO timestamps are UTC; convert via Intl, format YYYY-MM-DD.
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

interface DailyBucket { date: string; count: number; cost: number; success: number; failed: number }

function bucketByDay(rows: UsageLogRow[]): DailyBucket[] {
  const map = new Map<string, DailyBucket>()
  for (const r of rows) {
    const k = dayKey(r.timestamp)
    if (!k) continue
    const b = map.get(k) ?? { date: k, count: 0, cost: 0, success: 0, failed: 0 }
    b.count++
    b.cost += r.costUsd
    if (r.status === 'success') b.success++
    else b.failed++
    map.set(k, b)
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
}

function bucketBySku(rows: UsageLogRow[], topN: number): Array<{ sku: string; count: number; cost: number }> {
  const map = new Map<string, { sku: string; count: number; cost: number }>()
  for (const r of rows) {
    const k = r.sku || '(unknown)'
    const b = map.get(k) ?? { sku: k, count: 0, cost: 0 }
    b.count++
    b.cost += r.costUsd
    map.set(k, b)
  }
  return Array.from(map.values()).sort((a, b) => b.cost - a.cost).slice(0, topN)
}

function inLast(rows: UsageLogRow[], days: number): UsageLogRow[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return rows.filter(r => {
    const t = new Date(r.timestamp).getTime()
    return !isNaN(t) && t >= cutoff
  })
}

function todayRows(rows: UsageLogRow[]): UsageLogRow[] {
  const today = dayKey(new Date().toISOString())
  return rows.filter(r => dayKey(r.timestamp) === today)
}

interface Totals { count: number; cost: number; success: number; failed: number; retries: number; avgElapsed: number }
function summarise(rows: UsageLogRow[]): Totals {
  let cost = 0, success = 0, failed = 0, retries = 0, elapsed = 0
  for (const r of rows) {
    cost += r.costUsd
    if (r.status === 'success') success++
    else failed++
    if (r.attempt > 1) retries++
    elapsed += r.elapsedMs
  }
  return {
    count:   rows.length,
    cost,
    success,
    failed,
    retries,
    avgElapsed: rows.length ? elapsed / rows.length : 0,
  }
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function UsagePage() {
  const rows  = await readUsageLog({ limit: 5000 })
  const today = summarise(todayRows(rows))
  const last7 = summarise(inLast(rows, 7))
  const last30 = summarise(inLast(rows, 30))

  // Bar chart — last 14 days inclusive of today. Backfill empty days with
  // zero counts so the chart shape doesn't lie about idle days.
  const days14: DailyBucket[] = (() => {
    const buckets = new Map(bucketByDay(rows).map(b => [b.date, b]))
    const out: DailyBucket[] = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const k = dayKey(d.toISOString())
      out.push(buckets.get(k) ?? { date: k, count: 0, cost: 0, success: 0, failed: 0 })
    }
    return out
  })()
  const maxBar = Math.max(1, ...days14.map(d => d.count))

  const topSkus = bucketBySku(inLast(rows, 30), 10)
  const recent  = rows.slice(0, 50)

  return (
    <div className="min-h-dvh bg-[#0A0A0A] text-[#F5F5F5]">
      <header className="border-b border-[#161616] bg-[#0D0D0D] sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xl font-black tracking-widest shimmer">TCAPS</Link>
            <span className="text-xs text-[#6B6B6B]">/</span>
            <span className="text-xs text-[#C9A84C] font-bold uppercase tracking-wider">Usage Dashboard</span>
          </div>
          <Link href="/admin" className="text-xs text-[#6B6B6B] hover:text-[#C9A84C] transition-colors">← Admin</Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-6">

        {/* Stat cards */}
        <section className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <StatCard
            label="Hôm nay" sub="Try-on count + estimated cost"
            value={today.count.toLocaleString('vi-VN')}
            cost={today.cost}
            success={today.success}
            failed={today.failed}
            highlight
          />
          <StatCard
            label="7 ngày" sub="Last 7 days inclusive"
            value={last7.count.toLocaleString('vi-VN')}
            cost={last7.cost}
            success={last7.success}
            failed={last7.failed}
          />
          <StatCard
            label="30 ngày" sub="Rolling month"
            value={last30.count.toLocaleString('vi-VN')}
            cost={last30.cost}
            success={last30.success}
            failed={last30.failed}
          />
        </section>

        {rows.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Daily bar chart */}
            <section className="rounded-2xl border border-[#1E1E1E] bg-[#0D0D0D] p-4">
              <header className="flex items-baseline justify-between mb-3">
                <h2 className="text-sm font-black text-[#F5F5F5] uppercase tracking-widest">Try-ons / ngày · 14 ngày gần nhất</h2>
                <span className="text-[10.5px] text-[#6B6B6B] font-mono">max {maxBar}</span>
              </header>
              <div className="grid grid-cols-14 gap-1 h-32 items-end" style={{ gridTemplateColumns: 'repeat(14, minmax(0, 1fr))' }}>
                {days14.map(d => (
                  <div key={d.date} className="flex flex-col items-center gap-1 group">
                    <div
                      title={`${d.date}: ${d.count} try-ons · ${fmtUsd(d.cost)}`}
                      className="w-full rounded-t bg-gradient-to-t from-[#C9A84C]/30 to-[#C9A84C] group-hover:from-[#C9A84C]/50 group-hover:to-[#E8C96A] transition-all"
                      style={{ height: `${(d.count / maxBar) * 100}%`, minHeight: d.count ? 4 : 0 }}
                    />
                    <span className="text-[9px] text-[#5A5A5A] font-mono tabular-nums leading-none">
                      {d.date.slice(-2)}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Top SKUs by cost (30d) */}
            <section className="rounded-2xl border border-[#1E1E1E] bg-[#0D0D0D] p-4">
              <header className="flex items-baseline justify-between mb-3">
                <h2 className="text-sm font-black text-[#F5F5F5] uppercase tracking-widest">Top SKU · 30 ngày</h2>
                <span className="text-[10.5px] text-[#6B6B6B]">Theo chi phí · USD</span>
              </header>
              {topSkus.length === 0 ? (
                <p className="text-xs text-[#6B6B6B]">Chưa có data.</p>
              ) : (
                <div className="grid grid-cols-1 gap-1">
                  {topSkus.map((s, i) => {
                    const max = topSkus[0].cost || 1
                    return (
                      <div key={s.sku} className="grid grid-cols-[14px_minmax(0,1fr)_70px_70px] items-center gap-3 text-[12.5px] py-1.5 border-b border-[#161616] last:border-0">
                        <span className="text-[#6B6B6B] font-mono tabular-nums text-[10px]">{i + 1}</span>
                        <span className="truncate text-[#C8C8C8] font-bold">{s.sku}</span>
                        <span className="text-right font-mono text-[#8A8A8A] tabular-nums">{s.count}×</span>
                        <span className="text-right font-mono text-[#C9A84C] tabular-nums">{fmtUsd(s.cost)}</span>
                        <div className="col-span-4 h-1 rounded bg-[#1E1E1E] overflow-hidden -mt-1">
                          <div className="h-full bg-[#C9A84C]/60" style={{ width: `${(s.cost / max) * 100}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Recent log table */}
            <section className="rounded-2xl border border-[#1E1E1E] bg-[#0D0D0D] p-4">
              <header className="flex items-baseline justify-between mb-3">
                <h2 className="text-sm font-black text-[#F5F5F5] uppercase tracking-widest">Log gần nhất · {recent.length} dòng</h2>
                <span className="text-[10.5px] text-[#6B6B6B]">Mới nhất ở trên</span>
              </header>
              <div className="overflow-x-auto">
                <table className="w-full text-[11.5px] font-mono tabular-nums">
                  <thead>
                    <tr className="text-[#5A5A5A] uppercase tracking-wider text-[10px] border-b border-[#1E1E1E]">
                      <th className="text-left py-2 pr-3 font-bold">Time</th>
                      <th className="text-left py-2 pr-3 font-bold">IP</th>
                      <th className="text-left py-2 pr-3 font-bold">SKU</th>
                      <th className="text-right py-2 pr-3 font-bold">Att</th>
                      <th className="text-right py-2 pr-3 font-bold">Refs</th>
                      <th className="text-right py-2 pr-3 font-bold">In tok</th>
                      <th className="text-right py-2 pr-3 font-bold">Out tok</th>
                      <th className="text-right py-2 pr-3 font-bold">Cost</th>
                      <th className="text-right py-2 pr-3 font-bold">ms</th>
                      <th className="text-left py-2 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((r, i) => (
                      <tr key={i} className="border-b border-[#141414] last:border-0 text-[#C8C8C8]">
                        <td className="py-1.5 pr-3 text-[#8A8A8A] whitespace-nowrap">{shortTime(r.timestamp)}</td>
                        <td className="py-1.5 pr-3 text-[#6B6B6B]">{r.ip}</td>
                        <td className="py-1.5 pr-3 text-[#C9A84C]">{r.sku || '—'}</td>
                        <td className="py-1.5 pr-3 text-right">{r.attempt}</td>
                        <td className="py-1.5 pr-3 text-right">{r.capRefs}</td>
                        <td className="py-1.5 pr-3 text-right text-[#8A8A8A]">{r.inputTokens.toLocaleString('en-US')}</td>
                        <td className="py-1.5 pr-3 text-right text-[#8A8A8A]">{r.outputTokens.toLocaleString('en-US')}</td>
                        <td className="py-1.5 pr-3 text-right text-[#C9A84C]">{fmtUsd(r.costUsd)}</td>
                        <td className="py-1.5 pr-3 text-right text-[#8A8A8A]">{r.elapsedMs}</td>
                        <td className="py-1.5">
                          <StatusBadge status={r.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        <footer className="text-[10.5px] text-[#5A5A5A] text-center py-2">
          Pricing estimate uses Gemini list price · double-check actual billing at Google Cloud Console.
          <br />
          1 USD ≈ {USD_VND.toLocaleString('vi-VN')}₫ for VND display.
        </footer>
      </main>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatCard({
  label, sub, value, cost, success, failed, highlight = false,
}: {
  label: string; sub: string; value: string
  cost: number; success: number; failed: number; highlight?: boolean
}) {
  const total = success + failed
  const rate  = total > 0 ? Math.round((success / total) * 100) : 100
  return (
    <div className={[
      'rounded-2xl border p-4 flex flex-col gap-2',
      highlight ? 'border-[#C9A84C]/40 bg-gradient-to-br from-[#C9A84C]/8 to-[#0D0D0D]' : 'border-[#1E1E1E] bg-[#0D0D0D]',
    ].join(' ')}>
      <p className="text-[10px] uppercase tracking-[.22em] text-[#C9A84C] font-bold">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-black tabular-nums text-[#F5F5F5]">{value}</span>
        <span className="text-[11px] text-[#6B6B6B]">try-ons</span>
      </div>
      <div className="flex items-baseline justify-between text-[11px]">
        <span className="text-[#8A8A8A]">~{fmtUsd(cost)}</span>
        <span className="text-[#8A8A8A] font-mono">≈ {fmtVnd(cost * USD_VND)}</span>
      </div>
      <div className="flex items-center justify-between text-[10.5px] text-[#6B6B6B] mt-1">
        <span>Success {rate}%</span>
        <span>{success}✓ {failed > 0 && <span className="text-[#E05252]">{failed}✗</span>}</span>
      </div>
      <p className="text-[9.5px] text-[#5A5A5A] mt-0.5">{sub}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const style =
    status === 'success'    ? 'border-[#22A06A]/40 bg-[#22A06A]/10 text-[#22A06A]'
    : status === 'qc_failed'? 'border-[#E0A852]/40 bg-[#E0A852]/10 text-[#E0A852]'
    :                         'border-[#E05252]/40 bg-[#E05252]/10 text-[#E05252]'
  return (
    <span className={`inline-block px-2 py-0.5 rounded border text-[10px] uppercase tracking-wider ${style}`}>
      {status}
    </span>
  )
}

function EmptyState() {
  return (
    <section className="rounded-2xl border border-[#1E1E1E] bg-[#0D0D0D] p-10 text-center">
      <p className="text-sm text-[#C8C8C8] font-bold mb-1">Chưa có log nào</p>
      <p className="text-xs text-[#6B6B6B] leading-relaxed">
        Mỗi lần khách thử nón, một dòng sẽ ghi vào sheet <span className="text-[#C9A84C] font-mono">TRYON_LOG</span>.
        <br />Quay lại sau khi có lượt thử đầu tiên.
      </p>
    </section>
  )
}

function shortTime(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    hour12: false,
  }).format(d)
}
