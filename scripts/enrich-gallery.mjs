/**
 * Gallery enrichment for TCAPS products (OFFLINE — no Pancake session needed).
 *
 * Pancake spreads each product's photos across variations[].images (front /
 * side / back / detail / worn shots). The product list scraper used to keep only
 * the FIRST variation's image, so the AI try-on had a single angle to work from.
 *
 * This reads the cached API capture in data/pancake-raw.json, rebuilds the FULL
 * deduped gallery per product (front-first), and updates ONLY `images[]` +
 * `imageUrl` in constants/products.ts. Every other field — including curated
 * metadata and the vision metadataSource/metadataConfidence — is preserved.
 *
 *   node scripts/enrich-gallery.mjs
 *
 * Coverage is limited to whatever products are present in the cached raw.json.
 * To pull galleries for the WHOLE catalog, re-run the (now fixed) scraper while
 * logged into Pancake:  node scripts/pancake-scrape.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const PRODUCTS_TS = path.resolve('constants/products.ts')
const RAW_JSON = path.resolve('data/pancake-raw.json')

if (!fs.existsSync(RAW_JSON)) { console.error('✗ data/pancake-raw.json not found — run the scraper first'); process.exit(1) }

// ── collect galleries from the cached product-list responses ─────────────────
function toUrls(x) {
  if (!x) return []
  const one = (i) => (typeof i === 'string' ? i : i?.url ?? i?.image_url ?? i?.src ?? '')
  return (Array.isArray(x) ? x.map(one) : [one(x)]).filter((u) => typeof u === 'string' && /^https?:\/\//.test(u))
}
function gallery(p) {
  const seen = new Set(); const out = []
  const add = (u) => { if (!seen.has(u)) { seen.add(u); out.push(u) } }
  toUrls(p.images ?? p.image_url ?? p.product_images).forEach(add)
  for (const v of (p.variations || [])) toUrls(v.images ?? v.image_url).forEach(add)
  return out
}

const raw = JSON.parse(fs.readFileSync(RAW_JSON, 'utf8'))
const byId = new Map()   // pancakeId → gallery[]
for (const entry of (Array.isArray(raw) ? raw : [])) {
  if (!/\/products\?/.test(entry.url || '')) continue
  for (const p of (entry.json?.data || [])) {
    const id = String(p.id ?? p.product_id ?? p.display_id ?? '')
    const g = gallery(p)
    if (id && g.length && (byId.get(id)?.length ?? 0) < g.length) byId.set(id, g)
  }
}
console.log(`▶ cached galleries: ${byId.size} products in raw.json`)

// ── serializer (matches scripts/enrich-vision.mjs — preserves every field) ───
const num0 = (x) => { const n = Number(x); return Number.isFinite(n) ? n : 0 }
const qs = (s) => JSON.stringify(String(s ?? ''))
const arr = (a) => `[${(a || []).map((x) => JSON.stringify(String(x))).join(', ')}]`
function serializeVariants(vs) {
  return `[\n${vs.map((v) => {
    const parts = []
    if (v.sku) parts.push(`sku: ${qs(v.sku)}`)
    if (v.name) parts.push(`name: ${qs(v.name)}`)
    if (v.price) parts.push(`price: ${num0(v.price)}`)
    if (v.stock || v.stock === 0) parts.push(`stock: ${num0(v.stock)}`)
    if (v.image) parts.push(`image: ${qs(v.image)}`)
    return `      { ${parts.join(', ')} }`
  }).join(',\n')}\n    ]`
}
function serializeProduct(p) {
  const L = ['  {']
  L.push(`    sku: ${qs(p.sku)},`)
  L.push(`    name: ${qs(p.name)},`)
  L.push(`    line: ${qs(p.line)}, style: ${qs(p.style)}, color: ${qs(p.color)},`)
  L.push(`    price: ${num0(p.price)}, priceBundle: ${num0(p.priceBundle)},`)
  L.push(`    badge: ${p.badge == null ? 'null' : qs(p.badge)},`)
  L.push(`    description: ${qs(p.description)},`)
  L.push(`    faceShapes: ${arr(p.faceShapes)},`)
  L.push(`    topFor: ${arr(p.topFor)},`)
  L.push(`    imageUrl: ${qs(p.imageUrl)}, overlayUrl: ${qs(p.overlayUrl)},`)
  L.push(`    tags: ${arr(p.tags)},`)
  if (p.images?.length) L.push(`    images: ${arr(p.images)},`)
  if (p.variants?.length) L.push(`    variants: ${serializeVariants(p.variants)},`)
  if (p.stock !== undefined && p.stock !== null && p.stock !== '') L.push(`    stock: ${num0(p.stock)},`)
  if (p.pancakeId !== undefined && p.pancakeId !== null && p.pancakeId !== '')
    L.push(`    pancakeId: ${typeof p.pancakeId === 'number' ? p.pancakeId : qs(p.pancakeId)},`)
  if (p.metadataSource) L.push(`    metadataSource: ${qs(p.metadataSource)},`)
  if (p.metadataConfidence) L.push(`    metadataConfidence: ${qs(p.metadataConfidence)},`)
  L.push('  },')
  return L.join('\n')
}
function writeProductsFile(list) {
  const src = fs.readFileSync(PRODUCTS_TS, 'utf8')
  const startIdx = src.indexOf('export const PRODUCTS: Product[] = [')
  const tailIdx = src.indexOf('\n// Quick lookup by SKU')
  if (startIdx < 0 || tailIdx < 0) throw new Error('boundaries not found')
  const body = list.map(serializeProduct).join('\n')
  fs.writeFileSync(PRODUCTS_TS, `${src.slice(0, startIdx)}export const PRODUCTS: Product[] = [\n${body}\n]\n${src.slice(tailIdx)}`)
}

// ── update images[] only for matched products with MORE angles than now ──────
const mod = await import(pathToFileURL(PRODUCTS_TS).href + `?t=${Date.now()}`)
const all = mod.PRODUCTS || []
const gained = []
let unchanged = 0, unmatched = 0

const out = all.map((p) => {
  const g = p.pancakeId ? byId.get(String(p.pancakeId)) : null
  if (!g) { unmatched++; return p }
  const current = Array.isArray(p.images) ? p.images.length : 0
  if (g.length <= current) { unchanged++; return p }
  gained.push({ sku: p.sku, name: p.name, from: current, to: g.length })
  return { ...p, images: g, imageUrl: g[0] || p.imageUrl }
})

writeProductsFile(out)

// ── report ───────────────────────────────────────────────────────────────────
console.log('\n════ GALLERY ENRICH ════')
console.log('SKU'.padEnd(16), 'ANGLES'.padEnd(10), 'NAME')
console.log('-'.repeat(70))
for (const r of gained.sort((a, b) => b.to - a.to)) {
  console.log(String(r.sku).padEnd(16), `${r.from} → ${r.to}`.padEnd(10), String(r.name).slice(0, 40))
}
console.log('\n════ THỐNG KÊ ════')
console.log('Sản phẩm thêm góc nón :', gained.length)
console.log('Đã đủ góc / không tăng:', unchanged)
console.log('Không có trong cache   :', unmatched, '(cần re-scrape khi đăng nhập Pancake)')
console.log('Tổng sản phẩm          :', all.length)
console.log('\n→ Để lấy gallery cho TOÀN BỘ sản phẩm: node scripts/pancake-scrape.mjs (đang đăng nhập Pancake)')
