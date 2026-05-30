/**
 * AI product RENAMER for TCAPS — gives every cap a descriptive Vietnamese name.
 *
 * Gemini Vision reads each product photo (the printed/embroidered line name or
 * the main graphic + the dominant colour), then builds:
 *     "{CODE} - NÓN {MOTIF} {COLOR}"   e.g. "TC67 - NÓN SKELETON TRẮNG"
 * CODE is the TCxx / CTx code parsed from the sku/name; if there's no code the
 * name is just "NÓN {MOTIF} {COLOR}".
 *
 * Writes only the `name` field in constants/products.ts (every other field —
 * sku, price, images, faceShapes, vision metadata… — is preserved). Products
 * with no image, non-hats, or low Vision confidence keep their current name and
 * are listed under "Needs Manual Review".
 *
 * Run (key from .env.local, system CA for the corporate TLS intercept):
 *   node --use-system-ca --env-file=.env.local scripts/rename-vision.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const PRODUCTS_TS = path.resolve('constants/products.ts')
const KEY = process.env.GEMINI_API_KEY?.trim()
const MODEL = process.env.GEMINI_TEXT_MODEL?.trim() || 'gemini-2.5-flash'
const CONF_MIN = 0.55

if (!KEY) { console.error('✗ GEMINI_API_KEY missing — run with --env-file=.env.local'); process.exit(1) }

// ── code parsed from sku/name: TC67, CT3, TC10 … (null if none) ──────────────
function codeOf(p) {
  const m = `${p.sku ?? ''} ${p.name ?? ''}`.match(/\b(TC|CT)\s?0*(\d+)\b/i)
  return m ? `${m[1].toUpperCase()}${m[2]}` : null
}

// ── Gemini Vision: read the cap's theme + colour ─────────────────────────────
const VISION_PROMPT =
  'You are naming a streetwear cap. Look at the cap in the photo and return its design THEME and COLOR. ' +
  'THEME: read any text/logo printed or embroidered ON the cap (e.g. SKELETON, SPARTAN, KINGGOAT, WOLF, ' +
  'DARK STALLION, WUKONG, FREEDOM, PICKLEBALL, SPORTLINE, AERIE, INFERNO, REAL MAN, FOR LIFE, TCAPS). ' +
  'If there is no readable text, name the MAIN graphic in 1-2 words: skull→SKELETON, wolf→WOLF, goat→GOAT, ' +
  'horse→STALLION, dragon→RỒNG, eagle→EAGLE, rooster→GÀ, lion→SƯ TỬ, knight/horse crest→KỴ SĨ, ' +
  'zodiac wheel→12 CON GIÁP, monogram/luxury pattern→MONOGRAM. ' +
  'COLOR: the cap\'s dominant colour in Vietnamese — one of TRẮNG, ĐEN, BẠC, VÀNG, ĐỎ, XANH, NÂU, KEM; ' +
  'if it is a multicolour patterned/tapestry fabric use HỌA TIẾT. ' +
  'Return ONLY JSON: {"isHat": boolean, "motif": string (UPPERCASE, <=3 words), "color": string, "confidence": number 0..1}. ' +
  'If the item is NOT a wearable cap/hat (lighter, wallet, keychain), set isHat=false.'

async function fetchImageInline(url) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`image HTTP ${r.status}`)
  const buf = Buffer.from(await r.arrayBuffer())
  const mime = r.headers.get('content-type')?.split(';')[0] || 'image/jpeg'
  return { mime_type: /^image\//.test(mime) ? mime : 'image/jpeg', data: buf.toString('base64') }
}

async function classify(imageUrl) {
  const img = await fetchImageInline(imageUrl)
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`
  let lastErr = ''
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: VISION_PROMPT }, { inline_data: img }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 400, thinkingConfig: { thinkingBudget: 0 }, responseMimeType: 'application/json' },
      }),
    }).catch(e => { lastErr = String(e); return null })
    if (res && res.ok) {
      const json = await res.json().catch(() => null)
      const text = (json?.candidates?.[0]?.content?.parts ?? []).filter(p => typeof p?.text === 'string').map(p => p.text).join('')
      try { return JSON.parse(text) } catch { lastErr = 'JSON parse fail: ' + text.slice(0, 80) }
    } else if (res) {
      const j = await res.json().catch(() => null)
      lastErr = j?.error?.message ?? `HTTP ${res.status}`
      if (res.status === 503 || res.status === 429) { await new Promise(r => setTimeout(r, 2500 * attempt)); continue }
    }
    if (attempt < 4) await new Promise(r => setTimeout(r, 1500))
  }
  throw new Error(lastErr || 'classify failed')
}

const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()
function buildName(code, motif, color) {
  let m = clean(motif).toUpperCase().replace(/^NÓN\s+/i, '')
  const c = clean(color).toUpperCase()
  const suffix = clean(`${m} ${c}`)
  return code ? `${code} - NÓN ${suffix}` : `NÓN ${suffix}`
}

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

// ── run ──────────────────────────────────────────────────────
const mod = await import(pathToFileURL(PRODUCTS_TS).href + `?t=${Date.now()}`)
const all = mod.PRODUCTS || []
const report = []
const review = []
let renamed = 0

const out = []
for (const p of all) {
  const url = p.imageUrl || (p.images || [])[0]
  const code = codeOf(p)
  if (!url) {
    out.push(p); review.push({ sku: p.sku, old: p.name, reason: 'không có ảnh' }); continue
  }
  process.stdout.write(`\r▶ reading ${p.sku} …                      `)
  let c
  try { c = await classify(url) } catch (e) {
    out.push(p); review.push({ sku: p.sku, old: p.name, reason: 'vision lỗi: ' + (e.message || e) }); continue
  }
  const conf = typeof c.confidence === 'number' ? c.confidence : 0
  if (c.isHat === false || !c.motif || conf < CONF_MIN) {
    out.push(p)
    review.push({ sku: p.sku, old: p.name, reason: c.isHat === false ? 'không phải nón' : `confidence ${conf.toFixed(2)} (${clean(c.motif)}/${clean(c.color)})` })
    continue
  }
  const newName = buildName(code, c.motif, c.color)
  out.push({ ...p, name: newName })
  renamed++
  report.push({ sku: p.sku, old: p.name, neu: newName, conf: conf.toFixed(2) })
}
process.stdout.write('\r' + ' '.repeat(50) + '\r')

writeProductsFile(out)

// ── report ───────────────────────────────────────────────────
console.log('CŨ → MỚI'.padEnd(4))
console.log('-'.repeat(90))
for (const r of report) console.log(`${String(r.old).padEnd(16)} → ${r.neu}   (${r.conf})`)
console.log('\n════ THỐNG KÊ ════')
console.log('Đã đổi tên :', renamed)
console.log('Cần kiểm tra:', review.length)
console.log('Tổng        :', all.length)
if (review.length) {
  console.log('\n════ NEEDS MANUAL REVIEW (giữ tên cũ) ════')
  for (const r of review) console.log('  -', r.sku, '·', r.old, '→', r.reason)
}
