/**
 * Vision metadata enrichment for TCAPS products.
 *
 * Uses Gemini Vision to classify EACH product photo (hat type / crown / style /
 * visual characteristics), then RULE-BASED maps the classification → faceShapes
 * (no random). Writes results into constants/products.ts.
 *
 * Rules:
 *   • manual > inferred — never overwrite a product whose metadataSource==='manual'.
 *   • confidence < 0.70 → NOT saved → "Needs Manual Review".
 *   • non-hat (lighter/combo/wallet) → faceShapes left empty.
 *
 * Run (key from .env.local, system CA for the corporate TLS intercept):
 *   node --use-system-ca --env-file=.env.local scripts/enrich-vision.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const PRODUCTS_TS = path.resolve('constants/products.ts')
const KEY = process.env.GEMINI_API_KEY?.trim()
const MODEL = process.env.GEMINI_TEXT_MODEL?.trim() || 'gemini-2.5-flash'
const CONF_MIN = 0.70

if (!KEY) { console.error('✗ GEMINI_API_KEY missing — run with --env-file=.env.local'); process.exit(1) }

// ── enums ────────────────────────────────────────────────────
const HAT_TYPES = ['snapback', 'trucker', 'baseball', 'dad cap', 'tactical', 'fitted', 'flat brim', 'curved brim']
const CROWNS    = ['low profile', 'mid profile', 'high profile']
const STYLES    = ['streetwear', 'trucker', 'snapback', 'luxury', 'minimal', 'tactical', 'biker', 'sport']
const CHARS     = ['mesh back', 'flat bill', 'curved bill', 'embroidered', 'printed graphic', 'leather patch', 'metallic logo']

// ── RULE MAPPING: hat type (+ crown) → face shapes (deterministic) ───────────
const BASE_SHAPES = {
  snapback:      ['oval', 'round', 'heart'],
  trucker:       ['round', 'oval', 'diamond'],
  baseball:      ['square', 'diamond', 'oval'],
  'dad cap':     ['oval', 'square', 'heart'],
  tactical:      ['oval', 'square', 'diamond'],
  fitted:        ['oval', 'square', 'heart'],
  'flat brim':   ['oval', 'square', 'diamond', 'heart'],
  'curved brim': ['oval', 'round', 'heart', 'oblong'],
}
function mapFaceShapes(hatType, crown) {
  let shapes = [...(BASE_SHAPES[hatType] ?? BASE_SHAPES['baseball'])]
  if (crown === 'high profile') {            // high crown adds vertical length
    if (!shapes.includes('round')) shapes.push('round')   // balances a round face
    shapes = shapes.filter(s => s !== 'oblong')           // too tall for long faces
  } else if (crown === 'low profile') {      // low crown keeps height down
    if (!shapes.includes('oblong')) shapes.push('oblong') // good for long faces
    shapes = shapes.filter(s => s !== 'round')            // adds width emphasis
  }
  shapes = [...new Set(shapes)]
  return { faceShapes: shapes, topFor: shapes.slice(0, 1) }
}

// ── Gemini Vision classify one image ─────────────────────────
const VISION_PROMPT =
  'You are a product classifier for caps/hats. Look at the product photo and classify the item. ' +
  'Return ONLY JSON (no prose) with this exact shape: ' +
  '{"isHat": boolean, "hatType": one of ["snapback","trucker","baseball","dad cap","tactical","fitted","flat brim","curved brim"], ' +
  '"crownType": one of ["low profile","mid profile","high profile"], ' +
  '"style": one of ["streetwear","trucker","snapback","luxury","minimal","tactical","biker","sport"], ' +
  '"characteristics": array (subset of ["mesh back","flat bill","curved bill","embroidered","printed graphic","leather patch","metallic logo"]), ' +
  '"confidence": number 0..1}. ' +
  'If the item is NOT a wearable cap/hat (e.g. lighter, wallet, keychain, a combo box), set isHat=false. ' +
  'Base confidence on how clearly the cap type is visible.'

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
        generationConfig: { temperature: 0.1, maxOutputTokens: 600, thinkingConfig: { thinkingBudget: 0 }, responseMimeType: 'application/json' },
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

const inList = (v, list) => (typeof v === 'string' && list.includes(v) ? v : null)

// ── serializer (rewrites the PRODUCTS array literal) ─────────
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
let saved = 0, skippedManual = 0

const out = []
for (const p of all) {
  if (p.metadataSource === 'manual') {            // never overwrite manual
    skippedManual++; out.push(p)
    report.push({ sku: p.sku, name: p.name, hatType: '(manual)', style: p.style, faceShapes: p.faceShapes, confidence: 'manual' })
    continue
  }
  const url = p.imageUrl || (p.images || [])[0]
  if (!url) {
    out.push(p); review.push({ sku: p.sku, name: p.name, reason: 'không có ảnh' })
    report.push({ sku: p.sku, name: p.name, hatType: '—', style: p.style, faceShapes: p.faceShapes, confidence: 'no-image' })
    continue
  }
  process.stdout.write(`\r▶ classifying ${p.sku} …                    `)
  let c
  try { c = await classify(url) } catch (e) {
    out.push(p); review.push({ sku: p.sku, name: p.name, reason: 'vision lỗi: ' + (e.message || e) })
    report.push({ sku: p.sku, name: p.name, hatType: 'ERROR', style: p.style, faceShapes: p.faceShapes, confidence: 'error' })
    continue
  }

  const conf = typeof c.confidence === 'number' ? c.confidence : 0
  const isHat = c.isHat !== false
  const hatType = inList(c.hatType, HAT_TYPES) || 'baseball'
  const crown = inList(c.crownType, CROWNS) || 'mid profile'
  const style = inList(c.style, STYLES) || 'streetwear'

  if (!isHat) {                                   // accessory → no face fit
    out.push({ ...p, faceShapes: [], topFor: [], metadataSource: 'inferred', metadataConfidence: 'low' })
    review.push({ sku: p.sku, name: p.name, reason: 'non-hat (isHat=false)' })
    report.push({ sku: p.sku, name: p.name, hatType: 'non-hat', style, faceShapes: [], confidence: conf.toFixed(2) })
    continue
  }
  if (conf < CONF_MIN) {                           // low confidence → DON'T save
    out.push(p)
    review.push({ sku: p.sku, name: p.name, reason: `confidence ${conf.toFixed(2)} < ${CONF_MIN} (vision: ${hatType}/${style})` })
    report.push({ sku: p.sku, name: p.name, hatType, style, faceShapes: p.faceShapes, confidence: conf.toFixed(2) + ' (low→giữ cũ)' })
    continue
  }

  const { faceShapes, topFor } = mapFaceShapes(hatType, crown)
  out.push({ ...p, style, faceShapes, topFor, metadataSource: 'inferred', metadataConfidence: conf >= 0.85 ? 'high' : 'medium' })
  saved++
  report.push({ sku: p.sku, name: p.name, hatType, style, faceShapes, confidence: conf.toFixed(2) })
}
process.stdout.write('\r' + ' '.repeat(50) + '\r')

writeProductsFile(out)

// ── report ───────────────────────────────────────────────────
console.log('SKU'.padEnd(14), 'HATTYPE'.padEnd(12), 'STYLE'.padEnd(11), 'CONF'.padEnd(14), 'FACE SHAPES')
console.log('-'.repeat(100))
for (const r of report) {
  console.log(String(r.sku).padEnd(14), String(r.hatType).padEnd(12), String(r.style).padEnd(11),
    String(r.confidence).padEnd(14), (r.faceShapes?.length ? r.faceShapes.join(',') : '∅'))
}
console.log('\n════ THỐNG KÊ ════')
console.log('Enrich thành công (saved):', saved)
console.log('Giữ thủ công (manual)    :', skippedManual)
console.log('Cần kiểm tra thủ công    :', review.length)
console.log('Tổng                     :', all.length)
console.log('\n════ NEEDS MANUAL REVIEW ════')
for (const r of review) console.log('  -', r.sku, '·', r.name, '→', r.reason)
console.log('\n════ RULE MAPPING (hat type → face shape) ════')
for (const k of HAT_TYPES) console.log(`  ${k.padEnd(12)} → ${BASE_SHAPES[k].join(', ')}`)
console.log('  + crown high → thêm round, bỏ oblong | crown low → thêm oblong, bỏ round')
