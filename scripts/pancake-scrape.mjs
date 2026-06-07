/**
 * Pancake POS product scraper → imports into constants/products.ts
 *
 * Reuses the SAME persistent Playwright profile created by pancake-login.ts
 * (.pancake-profile/). No CDP, no extra login flow — it relies on the saved
 * session. If the profile isn't logged in, it exits without touching anything.
 *
 *   1) npx tsx scripts/pancake-login.ts   # log into Pancake POS once
 *   2) close that browser window
 *   3) node scripts/pancake-scrape.mjs    # scrape + import
 *
 * It scrapes ALL products (SKU, name, price, images, variants), then merges
 * into constants/products.ts:
 *   • matched SKU/name  → updates ONLY real product data, keeps curated
 *                          metadata (line, style, faceShapes, topFor, badge,
 *                          description, tags, priceBundle, overlayUrl)
 *   • no match          → adds the product automatically with safe defaults
 *
 * Outputs: data/pancake-products.json|csv, data/pancake-raw.json, and a
 * console summary (imported / skipped / updated SKUs).
 *
 * Env overrides: SHOP_ID, PANCAKE_PROFILE_DIR, PAGE_SIZE, HEADLESS=1
 */

import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SHOP_ID = process.env.SHOP_ID || '5875807'
const SHOP_URL = process.env.SHOP_URL || `https://pos.pancake.vn/shop/${SHOP_ID}/product/management`
const PROFILE_DIR = process.env.PANCAKE_PROFILE_DIR || path.join(ROOT, '.pancake-profile')
const OUT_DIR = path.join(ROOT, 'data')
const PRODUCTS_TS = path.join(ROOT, 'constants', 'products.ts')
const PAGE_SIZE = Number(process.env.PAGE_SIZE || 100)
const MAX_PAGES = Number(process.env.MAX_PAGES || 200)
const HEADLESS = process.env.HEADLESS === '1'
// SYNC_ONLY=1 → don't add new products, don't prune existing, don't touch
// curated fields. Only refresh stock counts (parent + per-variant) and images
// (parent + per-variant). Local /public image paths are PRESERVED so the
// photo swaps the owner made for TC68/TC63/TC61/TC59/TC45/TC42 don't get
// clobbered every sync.
const SYNC_ONLY = process.env.SYNC_ONLY === '1'
const isLocalPath = (s) => typeof s === 'string' && s.startsWith('/')

// Mirror of pinnedImageUrl in constants/tryon-overrides.ts. When Pancake's
// API returns the wrong image[0] for an SKU (POS UI shows one canonical,
// API returns another), pin the correct URL here so SYNC_ONLY doesn't
// re-clobber the manual fix in products.ts on every run.
const PINNED_IMAGE_URLS = {
  TC46: 'https://content.pancake.vn/2-2512/2025/12/8/ec2768ecb1c60190902f3199e71ad4d1dd4578af.jpg',
  TC30: 'https://content.pancake.vn/2-2512/2025/12/11/181ac89e7432747255b8c29bc1491f86f22ce285.jpg',
}
const pinnedFor = (sku) => PINNED_IMAGE_URLS[(sku || '').trim()] ?? null

fs.mkdirSync(OUT_DIR, { recursive: true })

const isLoginUrl = (u) => /login|signin|sign-in|\/auth|account\.pancake/i.test(u)
const num0 = (x) => { const n = Number(x); return Number.isFinite(n) ? n : 0 }
const loose = (s) =>
  String(s ?? '').toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]/g, '')

// ── permanent ignore-list (NON-HAT / operational entries) ────────────────────
// These are not real caps (lighters, combos, gifts, keychains, appointment/
// exchange placeholders). Pancake keeps them in the catalog, so without this the
// scraper re-adds them every run. Matched by stable pancakeId AND normalized name
// — both, so a renamed entry or a changed id can't sneak back in. Applied twice:
// (1) skip while collecting, (2) prune any already in products.ts before writing.
const IGNORE_PANCAKE_IDS = new Set([
  'cdbf0c91-004c-4182-80af-160cfa5830c8', // Quẹt ZIPPO (lighter)
  'b80f35d0-4c37-46b7-bb15-c7090d90969f', // Combo 3 món chống năng
  'f258311b-2466-4d31-b450-03b0c33dcbf2', // GẤP GẤP
  'ed840510-05cd-4153-b5ce-920f41da8d64', // COMBO VÍ + NÓN
  '4fa447de-040b-4b9d-9c2e-7d15d1d9659f', // MÓC KHÓA
  '02c44b6a-1d3c-4a84-b2f3-b6504ebfd35a', // HẸN NGÀY NHẬN
  'ad855bb0-88c9-418b-8681-7c393b9eb79e', // ĐỔI NÓN
  'dd18cfb6-5a0e-4ed3-a424-bac2dc5cf8ea', // NÓN LẠ
  '14cc996b-ae9f-4588-b3cd-4408148dfb96', // NÓN TẶNG
])
const IGNORE_NAMES = new Set([
  'quetzippo', 'combo3monchongnang', 'gapgap', 'combovinon',
  'mockhoa', 'henngaynhan', 'doinon', 'nonla', 'nontang',
])
const isIgnored = (idLike, name) =>
  IGNORE_PANCAKE_IDS.has(String(idLike ?? '')) || IGNORE_NAMES.has(loose(name))

// ── extraction helpers ───────────────────────────────────────────────────────
function toUrlArray(x) {
  if (!x) return []
  const one = (i) => (typeof i === 'string' ? i : i?.url ?? i?.image_url ?? i?.src ?? '')
  const arr = Array.isArray(x) ? x.map(one) : [one(x)]
  return arr.filter((u) => typeof u === 'string' && /^https?:\/\//.test(u))
}
function stripHtml(s) {
  return String(s ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Find the first array of objects that look like products inside any JSON. */
function findProductArray(node, depth = 0) {
  if (depth > 8 || node == null) return null
  if (Array.isArray(node)) {
    const looksProduct = node.length && node.every((x) => x && typeof x === 'object') &&
      node.some((x) => x.name && (x.id ?? x.product_id ?? x.display_id) != null)
    if (looksProduct) return node
    for (const item of node) { const f = findProductArray(item, depth + 1); if (f) return f }
    return null
  }
  if (typeof node === 'object') {
    for (const key of ['data', 'products', 'items', 'results', 'rows']) {
      if (key in node) { const f = findProductArray(node[key], depth + 1); if (f) return f }
    }
    for (const v of Object.values(node)) { const f = findProductArray(v, depth + 1); if (f) return f }
  }
  return null
}

// Collect EVERY distinct cap photo (front / side / back / detail / worn) for one
// product — Pancake spreads the gallery across variations[].images, not the
// product root — so the AI try-on gets multiple angles, not just one.
function collectGallery(p, variations) {
  const seen = new Set()
  const out = []
  const add = (u) => { if (typeof u === 'string' && /^https?:\/\//.test(u) && !seen.has(u)) { seen.add(u); out.push(u) } }
  toUrlArray(p.images ?? p.image_url ?? p.product_images).forEach(add)   // product-level first (if any)
  for (const v of variations) toUrlArray(v.images ?? v.image_url).forEach(add)  // then each variation, in order
  return out
}

function normalizeScraped(p) {
  const variations = Array.isArray(p.variations) ? p.variations
    : Array.isArray(p.variants) ? p.variants : []
  const v0 = variations[0] || null
  const images = collectGallery(p, variations)
  const variants = variations.map((v) => {
    const vImages = toUrlArray(v.images ?? v.image_url ?? [])
    return {
      sku: v.barcode ?? v.custom_id ?? '',
      name: v.name ?? (Array.isArray(v.fields) ? v.fields.map((f) => f.value).filter(Boolean).join(' / ') : '') ?? '',
      price: num0(v.retail_price ?? v.price),
      stock: num0(v.remain_quantity ?? v.quantity ?? v.total_quantity),
      image: vImages[0] ?? '',
      // Preserve ALL per-variant photos so STRICT_VARIANT_MODE can send the
      // full angle bundle (front / back / inside / underbrim / ...) for THIS
      // variant only — no sibling-colourway leak.
      images: vImages,
    }
  }).filter((v) => v.sku || v.name || v.price)
  const stockSum = variations.reduce((s, v) => s + num0(v.remain_quantity ?? v.quantity ?? v.total_quantity), 0)
  return {
    pancakeId: p.id ?? p.product_id ?? p.display_id ?? '',
    name: String(p.name ?? '').trim(),
    sku: String(p.custom_id ?? p.barcode ?? v0?.barcode ?? v0?.custom_id ?? '').trim(),
    price: num0(p.retail_price ?? p.price ?? v0?.retail_price ?? v0?.price),
    stock: num0(p.total_quantity ?? p.remain_quantity) || stockSum,
    images,
    variants,
    description: stripHtml(p.note ?? p.description ?? ''),
  }
}

// ── inference for brand-new products (no curated metadata yet) ───────────────
function inferLine(name, sku) {
  const s = loose(`${name} ${sku}`)
  if (s.includes('gcl2')) return 'gcl2'
  if (s.includes('gcd')) return 'gcd'
  if (s.includes('soi')) return 'soi'
  return ''
}
function inferStyle(name, sku) {
  const s = loose(`${name} ${sku}`)
  if (s.includes('trucker') || s.includes('luoi') || s.includes('mesh')) return 'trucker'
  if (s.includes('fitted')) return 'fitted'
  if (s.includes('snapback')) return 'snapback'
  return ''
}
function inferColor(name) {
  const s = loose(name)
  if (s.includes('den') || s.includes('black')) return 'Đen'
  if (s.includes('trang') || s.includes('white')) return 'Trắng'
  if (s.includes('bac') || s.includes('silver')) return 'Bạc'
  if (s.includes('gold') || s.includes('vang')) return 'Gold'
  return ''
}
function skuFromName(name) {
  return String(name ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'PRODUCT'
}

// ── TS serialization (rewrites only the PRODUCTS array literal) ──────────────
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
    // 2026-06-07: serialize per-variant images[] so multi-angle refs survive
    // the JSON → TS round-trip. Only write when there's MORE than the canonical.
    if (Array.isArray(v.images) && v.images.length > 1) {
      parts.push(`images: ${arr(v.images)}`)
    }
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
  L.push('  },')
  return L.join('\n')
}

function writeProductsFile(merged) {
  const src = fs.readFileSync(PRODUCTS_TS, 'utf8')
  const startMarker = 'export const PRODUCTS: Product[] = ['
  const tailMarker = '\n// Quick lookup by SKU'
  const startIdx = src.indexOf(startMarker)
  const tailIdx = src.indexOf(tailMarker)
  if (startIdx < 0 || tailIdx < 0 || tailIdx < startIdx) {
    throw new Error('Could not locate the PRODUCTS array boundaries in products.ts')
  }
  const before = src.slice(0, startIdx)
  const after = src.slice(tailIdx)
  const body = merged.map(serializeProduct).join('\n')
  const literal = `export const PRODUCTS: Product[] = [\n${body}\n]\n`
  fs.writeFileSync(PRODUCTS_TS, before + literal + after)
}

async function main() {
  console.log('▶ Launching Chromium with persistent profile:')
  console.log('  ', PROFILE_DIR)
  let context
  try {
    context = await chromium.launchPersistentContext(PROFILE_DIR, {
      channel: 'chrome',           // same real Chrome as pancake-login.ts → shared session
      headless: HEADLESS,
      viewport: null,
      ignoreHTTPSErrors: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--start-maximized',
      ],
    })
  } catch (e) {
    console.error('✗ Could not launch with the persistent profile.')
    if (/ProcessSingleton|already (in use|running)|cannot create/i.test(e.message)) {
      console.error('  The profile is in use — close the pancake-login.ts browser window first.')
    }
    console.error('  (detail:', e.message, ')')
    process.exit(1)
  }

  // capture product-ish JSON responses
  const captured = []
  const apiHits = []
  context.on('response', async (res) => {
    const url = res.url()
    if (!/pancake\.vn/i.test(url)) return
    if (!(res.headers()['content-type'] || '').includes('application/json')) return
    let json
    try { json = await res.json() } catch { return }
    captured.push({ url, method: res.request().method(), json })
    const a = findProductArray(json)
    if (/product/i.test(url) && a?.length) {
      apiHits.push({ url, method: res.request().method(), count: a.length })
      console.log(`  ◀ product API (${a.length}): ${url.slice(0, 100)}`)
    }
  })

  const page = context.pages()[0] ?? (await context.newPage())
  console.log('▶ Opening', SHOP_URL)
  await page.goto(SHOP_URL, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {})
  await page.waitForTimeout(3500)

  if (isLoginUrl(page.url())) {
    console.error('✗ Not logged in (no saved session). Run:  npx tsx scripts/pancake-login.ts')
    console.error('  Log into Pancake POS there, close it, then re-run this scraper.')
    console.error('  → constants/products.ts was NOT modified.')
    await context.close().catch(() => {})
    process.exit(1)
  }

  // ── collect scraped products: API replay (preferred) + capture harvest ─────
  const scraped = []
  const seenIds = new Set()
  const addScraped = (p) => {
    const sp = normalizeScraped(p)
    const id = String(sp.pancakeId || sp.sku || sp.name)
    if (!id || seenIds.has(id)) return
    if (isIgnored(sp.pancakeId, sp.name)) return        // non-hat / operational entry
    seenIds.add(id)
    scraped.push(sp)
  }

  for (let i = 0; i < 5 && apiHits.length === 0; i++) await page.waitForTimeout(1000)

  const getHit = apiHits.sort((a, b) => b.count - a.count)[0]
  let pageParam = null
  if (getHit) {
    const u = new URL(getHit.url)
    pageParam = ['page_number', 'page', 'page_index', 'pageNumber', 'page_no'].find((k) => u.searchParams.has(k))
  }

  if (getHit && pageParam && getHit.method === 'GET') {
    console.log(`▶ Replaying API "${pageParam}" pagination (page_size=${PAGE_SIZE})…`)
    const u = new URL(getHit.url)
    if (u.searchParams.has('page_size')) u.searchParams.set('page_size', String(PAGE_SIZE))
    for (let pageNo = 1; pageNo <= MAX_PAGES; pageNo++) {
      u.searchParams.set(pageParam, String(pageNo))
      const json = await page.evaluate(async (url) => {
        try {
          const r = await fetch(url, { credentials: 'include', headers: { accept: 'application/json' } })
          return r.ok ? await r.json() : null
        } catch { return null }
      }, u.toString())
      if (!json) break
      const a = findProductArray(json) ?? []
      if (a.length === 0) break
      const before = scraped.length
      a.forEach(addScraped)
      process.stdout.write(`\r  page ${pageNo}: total ${scraped.length}   `)
      if (scraped.length === before) break
      if (a.length < PAGE_SIZE && u.searchParams.has('page_size')) break
    }
    console.log('')
  } else {
    console.log('▶ No paginated GET API — scrolling + UI pagination fallback…')
    for (let i = 0; i < 40; i++) {
      await page.mouse.wheel(0, 6000).catch(() => {})
      await page.waitForTimeout(900)
      const next = page.locator('button:has-text("Tiếp"), [aria-label="Next"], .ant-pagination-next:not(.ant-pagination-disabled)').first()
      if ((await next.isVisible().catch(() => false)) && (await next.isEnabled().catch(() => false))) {
        await next.click().catch(() => {}); await page.waitForTimeout(1300)
      }
    }
    await page.waitForTimeout(1500)
    for (const { json } of captured) { const a = findProductArray(json); if (a) a.forEach(addScraped) }
  }

  // archive raw + normalized for inspection
  fs.writeFileSync(path.join(OUT_DIR, 'pancake-raw.json'), JSON.stringify(captured, null, 2))
  fs.writeFileSync(path.join(OUT_DIR, 'pancake-products.json'), JSON.stringify(scraped, null, 2))
  const esc = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`
  fs.writeFileSync(path.join(OUT_DIR, 'pancake-products.csv'),
    ['sku,name,price,stock,images']
      .concat(scraped.map((p) => [p.sku, p.name, p.price, p.stock, p.images.join('|')].map(esc).join(',')))
      .join('\n'))
  console.log(`✓ scraped ${scraped.length} products → data/pancake-products.json (+ .csv, raw)`)

  await context.close().catch(() => {})

  if (scraped.length === 0) {
    console.log('▶ 0 products scraped — constants/products.ts left untouched.')
    console.log('  Inspect data/pancake-raw.json for the real API shape and tell me.')
    return
  }

  // ── merge into constants/products.ts ───────────────────────────────────────
  const mod = await import(pathToFileURL(PRODUCTS_TS).href + `?t=${Date.now()}`)
  const merged = (mod.PRODUCTS || []).map((p) => ({ ...p }))

  const updatedSkus = []
  const addedSkus = []
  const skipped = []
  const usedSku = new Set(merged.map((p) => (p.sku || '').toUpperCase()))

  const findIdx = (sp) => {
    const skuKey = (sp.sku || '').toUpperCase().trim()
    if (skuKey) { const i = merged.findIndex((m) => (m.sku || '').toUpperCase().trim() === skuKey); if (i >= 0) return i }
    const nk = loose(sp.name)
    if (nk) { const i = merged.findIndex((m) => loose(m.name) === nk); if (i >= 0) return i }
    return -1
  }

  for (const sp of scraped) {
    if (!sp.name) { skipped.push({ reason: 'no name', id: sp.pancakeId, sku: sp.sku }); continue }
    const idx = findIdx(sp)
    if (idx >= 0) {
      const m = merged[idx]                                   // update REAL data only
      // NOTE: m.name is curated (descriptive names from rename-vision.mjs) — do
      // NOT overwrite it with the Pancake code name on re-scrape.

      if (SYNC_ONLY) {
        // SYNC mode: stock + (non-local) images only. Curated price stays.
        if (sp.stock || sp.stock === 0) m.stock = sp.stock
        if (sp.pancakeId) m.pancakeId = sp.pancakeId

        // Parent imageUrl + images: refresh from Pancake unless either
        //   (a) the current value is a local /public path (owner override), or
        //   (b) this SKU is in PINNED_IMAGE_URLS (Pancake API returns the
        //       wrong primary — keep the pinned URL but still refresh the
        //       gallery so other angles update).
        const pinned = pinnedFor(m.sku)
        if (sp.images.length && !isLocalPath(m.imageUrl)) {
          if (pinned) {
            m.imageUrl = pinned
            // Move pinned URL to the front of the new gallery if Pancake
            // already lists it; otherwise prepend so the canonical leads.
            const fromApi = sp.images.filter((u) => u !== pinned)
            m.images = sp.images.includes(pinned) ? [pinned, ...fromApi] : [pinned, ...fromApi]
          } else {
            m.imageUrl = sp.images[0]
            m.images   = sp.images
          }
        }

        // Per-variant: match by sku first, then name, then index. Update stock
        // always; update image only if existing isn't local.
        //
        // Bootstrap case (2026-06-06): when the app row is a fresh stub with
        // an EMPTY variants array but Pancake has variants, copy them across
        // wholesale. Without this, adding a new product to the app required
        // hand-typing each variant SKU before SYNC_ONLY could populate it.
        if (sp.variants.length && Array.isArray(m.variants)) {
          if (m.variants.length === 0) {
            m.variants = sp.variants.map((v) => ({ ...v }))
          } else {
            for (let vi = 0; vi < sp.variants.length; vi++) {
              const newV = sp.variants[vi]
              const existingV =
                m.variants.find((v) => v.sku && newV.sku && (v.sku || '').toUpperCase() === (newV.sku || '').toUpperCase()) ||
                m.variants.find((v) => v.name && newV.name && loose(v.name) === loose(newV.name)) ||
                m.variants[vi]
              if (!existingV) continue
              if (newV.stock || newV.stock === 0) existingV.stock = newV.stock
              if (newV.image && !isLocalPath(existingV.image)) existingV.image = newV.image
              // 2026-06-07: sync per-variant multi-angle images. Same isLocalPath
              // guard as `image` — never overwrite a locally-curated path.
              if (Array.isArray(newV.images) && newV.images.length) {
                if (!Array.isArray(existingV.images) || !existingV.images.some(isLocalPath)) {
                  existingV.images = newV.images
                }
              }
            }
          }
        }
      } else {
        // FULL mode (default): refresh all real product data.
        if (sp.price > 0) m.price = sp.price
        if (sp.images.length) { m.imageUrl = sp.images[0]; m.images = sp.images }
        if (sp.variants.length) m.variants = sp.variants
        if (sp.stock || sp.stock === 0) m.stock = sp.stock
        if (sp.pancakeId) m.pancakeId = sp.pancakeId
      }
      updatedSkus.push(m.sku)                                 // curated fields untouched
    } else {
      // In SYNC_ONLY mode, never add new products — the owner wants the
      // catalog to stay exactly as it is, just refreshed.
      if (SYNC_ONLY) {
        skipped.push({ reason: 'sync-only: not in app', sku: sp.sku, name: sp.name })
        continue
      }
      let sku = (sp.sku || '').trim() || skuFromName(sp.name)
      let unique = sku, n = 2
      while (usedSku.has(unique.toUpperCase())) unique = `${sku}-${n++}`
      sku = unique; usedSku.add(sku.toUpperCase())
      merged.push({
        sku,
        name: sp.name,
        line: inferLine(sp.name, sp.sku),
        style: inferStyle(sp.name, sp.sku),
        color: inferColor(sp.name),
        price: sp.price > 0 ? sp.price : 149000,
        priceBundle: sp.price > 0 ? sp.price : 99000,
        badge: null,
        description: sp.description || '',
        faceShapes: [],
        topFor: [],
        imageUrl: sp.images[0] || '',
        overlayUrl: '',
        tags: [],
        images: sp.images.length ? sp.images : undefined,
        variants: sp.variants.length ? sp.variants : undefined,
        stock: (sp.stock || sp.stock === 0) ? sp.stock : undefined,
        pancakeId: sp.pancakeId || undefined,
      })
      addedSkus.push(sku)
    }
  }

  // prune any ignored entries that already live in products.ts (so re-running
  // this scraper REMOVES them, not just stops re-adding). In SYNC_ONLY mode
  // we leave products.ts membership exactly as the owner curated it.
  const prunedSkus = SYNC_ONLY
    ? []
    : merged.filter((p) => isIgnored(p.pancakeId, p.name)).map((p) => p.sku)
  const finalList = SYNC_ONLY
    ? merged
    : merged.filter((p) => !isIgnored(p.pancakeId, p.name))

  writeProductsFile(finalList)

  // ── summary ─────────────────────────────────────────────────────────────────
  console.log(`\n──────────── ${SYNC_ONLY ? 'SYNC' : 'IMPORT'} SUMMARY ────────────`)
  if (SYNC_ONLY) console.log('Mode           : SYNC_ONLY (stock + non-local images only, never add)')
  if (prunedSkus.length) console.log(`Pruned (ignored): ${prunedSkus.join(', ')}`)
  console.log(`Total imported : ${updatedSkus.length + addedSkus.length}  (updated ${updatedSkus.length}, added ${addedSkus.length})`)
  console.log(`Updated SKUs   : ${updatedSkus.join(', ') || '(none)'}`)
  console.log(`Added SKUs     : ${addedSkus.join(', ') || '(none)'}`)
  console.log(`Skipped        : ${skipped.length}`)
  for (const s of skipped) console.log(`   - ${s.reason}: ${s.sku || s.id || '(unknown)'}`)
  console.log('────────────────────────────────────────')
  console.log(`✓ constants/products.ts now has ${finalList.length} products.`)
}

main().catch((e) => { console.error('✗', e); process.exit(1) })
