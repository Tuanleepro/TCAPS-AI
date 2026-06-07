// Per-SKU overrides for the try-on pipeline.
//
// Why this file exists:
//   The default behaviour sends up to MAX_CAP_IMAGES (currently 6) cap angles
//   to Gemini per try-on. For MOST products this is fine — more angles → cap
//   reproduces more faithfully, and the head-lock + colour/brim locks in the
//   prompt prevent identity drift.
//
//   For a handful of products the Pancake gallery is dominated by close-up
//   shots of a single model's face wearing the cap. When 4–6 of those photos
//   reach Gemini together, the model's face identity bleeds through and
//   overwrites the customer's selfie — even with the head-lock prompt.
//
//   This override lets us dial DOWN the number of references on a per-SKU
//   basis: a value of 1 sends ONLY the pinned variant image (no parent
//   gallery angles), which empirically kills the face-leak.
//
// How to apply:
//   `maxRefImages: 1` — minimal, use when the gallery is full-face-only.
//   `maxRefImages: 2` — keep variant + 1 angle when one extra angle helps.
//   omit / undefined  — use the global MAX_CAP_IMAGES.
//
// This file is NOT touched by scripts/pancake-scrape.mjs — it's the
// owner-curated companion to products.ts.

/** Colour tokens the COLOUR LOCK sentence understands. Must match the `en`
 * values in lib/products/color.ts so the prompt reads naturally. */
export type ColorOverride =
  | 'BLACK' | 'WHITE' | 'SILVER' | 'GOLD'
  | 'RED'   | 'BLUE'  | 'PINK'   | 'BROWN' | 'GRAY' | 'CREAM' | 'BEIGE'

export interface TryOnOverride {
  /** Number of reference cap photos to send to Gemini (default = global
   * MAX_CAP_IMAGES). Lower for face-leak SKUs. */
  maxRefImages?: number
  /** Force the COLOUR LOCK sent to Gemini. Use when the product name
   * contains a colour token that's actually a proper noun (e.g.
   * "LẠC HỒNG" matches HỒNG → PINK, but the cap is black). Set `null`
   * to SKIP the colour lock entirely when even a fixed value would
   * mislead Gemini. Leave `undefined` to use auto-detect from the name. */
  colorOverride?: ColorOverride | null
  /** Default variant SKU to pre-select when the customer enters the
   * try-on flow from a "deep" link (catalog "THỬ NÓN" button, search
   * dropdown). The product detail page IGNORES this — it always uses
   * the variant the customer manually picked there. */
  defaultTryOnVariant?: string
  /** Force the catalog / product-detail "representative" image to this
   * URL, regardless of what Pancake's API returns as images[0]. Used
   * when the POS UI shows one photo as primary but the API keeps
   * returning a different one. The scraper checks this override and
   * skips overwriting imageUrl during SYNC_ONLY when set. */
  pinnedImageUrl?: string
  /** Per-SKU text guidance appended to the Gemini prompt. Use when a cap
   * has details that Gemini consistently misreads from photos alone
   * (complex patches, intricate embroidery, ambiguous shapes). The hint
   * is owner-curated prose — describe the design in concrete terms so
   * Gemini can verify its output against the description rather than
   * inventing details. Leave undefined for SKUs where photos suffice. */
  promptHint?: string
}

export const TRYON_OVERRIDES: Record<string, TryOnOverride> = {
  // ── No per-SKU maxRefImages overrides ──────────────────────────────────
  //
  // 2026-06-07 owner: all SKUs use the global cap from hooks/useTryOn.ts
  // (20 images max). Pancake's `images[]` for each product is curated
  // owner-side, so trusting the whole gallery gives Gemini the richest
  // reference set without per-SKU hard-coding.
  //
  // History: a face-leak cohort (TC39/42/43/49/56/59/61/63/67/68) was
  // previously capped at 2 to suppress model-face leak. The overrides were
  // removed when owner cleaned the Pancake galleries to product-only shots
  // — if face-leak returns on a specific SKU, the right fix is to clean
  // that SKU's Pancake gallery, not re-add an SKU override here.

  // TC46 NÓN DARK STALLION — pinnedImageUrl kept (Pancake's API returns
  // the wrong primary). maxRefImages override removed: global cap is now
  // 20, which covers TC46's 13-photo gallery in full.
  TC46: {
    pinnedImageUrl: 'https://content.pancake.vn/2-2512/2025/12/8/ec2768ecb1c60190902f3199e71ad4d1dd4578af.jpg',
  },

  // TC30 NÓN SÓI ĐÊM TCAPS — owner picked CONG/ĐEN VÀNG (gold-badge black)
  // as the canonical hero. Pancake's variant API doesn't tell us which
  // variant photo is "primary", so we pin the URL here to keep the hero
  // stable across syncs. defaultTryOnVariant makes the catalog "THỬ NÓN"
  // button deep-link straight to that variant so the AI matches the hero.
  TC30: {
    pinnedImageUrl:      'https://content.pancake.vn/2-2512/2025/12/11/181ac89e7432747255b8c29bc1491f86f22ce285.jpg',
    defaultTryOnVariant: 'TC30CONGDENVANG',
  },

  // CT1 NÓN TCAPS — catalog thumbnail features the "Đen / Kết" variant.
  // When the customer taps "THỬ NÓN" from the catalog the try-on should
  // open on that variant by default (instead of the first variant in
  // the array, which is "Đen / COMBO 2 NÓN" — that combo doesn't make
  // sense as a single try-on subject).
  'Combo CT1': { defaultTryOnVariant: 'COMBOCT1DENKET' },

  // Combo CT3 — TCAPS SPARTAN luxury cap. Owner observed Gemini rendering
  // this as a BUCKET HAT instead of a baseball cap — likely misreading
  // the decorative "BUILT IN SILENCE" leather strap as a bucket-hat band.
  // The hint locks the silhouette (baseball cap with curved brim) and
  // describes each design element so Gemini can verify its output.
  'Combo CT3': {
    promptHint:
      'COMBO CT3 SPARTAN CAP — silhouette + design verification: ' +
      'SHAPE: this is a STRUCTURED BASEBALL CAP / SNAPBACK with a CURVED BRIM ' +
      '(lưỡi cong). It is NOT a bucket hat. NOT a fisherman hat. NOT a beanie. ' +
      'NOT a flat-brim cap. The crown is rounded and structured, the brim ' +
      'extends forward like a typical baseball cap. The output MUST be a ' +
      'baseball cap silhouette. ' +
      'DECORATIVE LEATHER STRAP: a thin BLACK LEATHER STRAP wraps around the ' +
      'BASE of the crown (at the seam where crown meets brim). The strap has ' +
      'GOLD text "BUILT IN SILENCE" on the front section near the brim and ' +
      'small gold quatrefoil / cross motifs spaced along its length. This ' +
      'strap is a decorative band on the cap surface — it is NOT a bucket-hat ' +
      'band, NOT a brim, NOT a separate item. ' +
      'FRONT-RIGHT PATCH: vertical rectangular patch (taller than wide), ' +
      'black background, gold elements: "TCPS" text on top with a small ' +
      'Spartan helmet icon, surrounded by small gold quatrefoil motifs. ' +
      'SIDE PANELS: gold PYRAMIDAL STUDS (4-sided pyramid / cone studs) ' +
      'placed at intervals on the side panels. ' +
      'BRIM: BLACK LEATHER TRIM along the brim edge with small gold ' +
      'quatrefoil motifs. Brim shape is CURVED. ' +
      'BACK: "FORGED BY PRESSURE" text in gold across the back panels + ' +
      '"Gentle" text on the back closure strap. ' +
      'OVERALL AESTHETIC: luxury streetwear — gold studs + leather trim + ' +
      'gold text + Spartan branding on a black baseball cap base.',
  },

  // TC56 NÓN TCAPS FOR LIFE — owner observed Gemini rendering a generic
  // smooth-front-panel cap, missing the cap's defining feature: the
  // ENTIRE front panel is BLACK MESH with a visible honeycomb pattern,
  // and the white text is printed OVER the mesh. The brim underside
  // also has a large white cursive "Tcaps" signature script.
  TC56: {
    promptHint:
      'TC56 NÓN TCAPS FOR LIFE — design verification: ' +
      'CONSTRUCTION: this is an ALL-MESH TRUCKER CAP. The ENTIRE FRONT ' +
      'PANEL is BLACK MESH with a visible HONEYCOMB / HEXAGONAL pattern ' +
      'texture (not solid fabric). The back is also mesh. The mesh texture ' +
      'MUST be visible on the front panel — do NOT render the front as a ' +
      'smooth solid panel. This is the defining feature of TC56. ' +
      'FRONT TEXT: white CURSIVE script "Tcaps" (stylised handwriting font) ' +
      'large across the upper front, with block-letter "FOR LIFE" below it ' +
      'in white. The text is printed OVER the mesh, so the mesh pattern ' +
      'shows through and around the letters. ' +
      'BRIM UNDERSIDE: a LARGE WHITE CURSIVE "Tcaps" signature script is ' +
      'printed on the UNDERSIDE of the brim (visible when the brim is ' +
      'tilted up or viewed from below). This is a signature detail — do ' +
      'NOT leave the brim underside blank. ' +
      'SIDE PANEL: small black rectangular label on the right side panel ' +
      'near the brim, with small white icons (star + Tcaps logo elements). ' +
      'BRIM TOP: solid black, plain. ' +
      'OVERALL: this is a streetwear MESH trucker cap — the honeycomb mesh ' +
      'texture is what makes it look "real". A smooth-fronted black cap ' +
      'with just text is the WRONG output.',
  },

  // TC57 NÓN TCAPS — owner observed Gemini rendering an over-simplified
  // cap with most luxury details missing (no gold border on TCAPS patch,
  // no gold eyelets, faint side stripes). The hint locks the metallic
  // detail elements so the output looks "real" and not plain.
  'NÓN TC57': {
    promptHint:
      'TC57 NÓN TCAPS — design verification: ' +
      'BASE: black baseball cap, structured crown. ' +
      'FRONT-RIGHT PATCH: vertical rectangular black patch with "TCAPS" text ' +
      'in WHITE running vertically. The patch is FLANKED by TWO vertical GOLD ' +
      'STRIPES — one gold stripe on the LEFT edge of the patch and one on the ' +
      'RIGHT edge. These gold border stripes are a SIGNATURE detail and MUST ' +
      'appear. The patch is NOT a plain rectangle. ' +
      'SIDE PANELS: each side panel has 3 HORIZONTAL gold/yellow stripes ' +
      '(military epaulette style — three thin gold horizontal lines stacked). ' +
      'These stripes are clearly visible from the front-right and back-right ' +
      'angles. ' +
      'GOLD METAL EYELETS: the crown panels are decorated with MULTIPLE small ' +
      'gold/orange RECTANGULAR METAL EYELETS / GROMMETS (decorative metal ' +
      'pieces). At least 4–6 visible from front and side angles. These give ' +
      'the cap its premium / luxury look. ' +
      'BRIM: dark glossy / leather underside trim along the brim — the brim ' +
      'has a two-tone look with a darker leather-like inner section. ' +
      'BACK CLOSURE: gold "TCAPS" text on the back closure strap. ' +
      'OVERALL: this is a LUXURY cap — gold border stripes + gold side ' +
      'stripes + gold eyelets + leather brim trim must all be visible. Do ' +
      'NOT render as a plain black cap with just a small patch.',
  },

  // TC63 NÓN SAMURAI — owner observed Gemini misreading the complex
  // Japanese-themed front patch (rendered as a generic square cherry-
  // blossom design instead of the actual vertical kanji+wave layout).
  // The hint describes the patch in concrete terms so Gemini has a
  // text-based reference to cross-check its output.
  TC63: {
    promptHint:
      'TC63 SAMURAI CAP — design verification: ' +
      'FRONT PATCH is a VERTICAL RECTANGULAR patch (taller than wide, NOT square), gold-bordered. ' +
      'Inside the rectangle, top to bottom: (1) a small red sun-disc / red circle near the top, ' +
      '(2) two vertical Japanese kanji characters in the middle, ' +
      '(3) a blue traditional wave pattern (seigaiha style) as the background fill, ' +
      '(4) a small red square stamp near the bottom. ' +
      'The patch is NOT a flower. NOT a cherry blossom. NOT a square. NOT abstract. ' +
      'It is a tall vertical rectangle with kanji characters and Japanese wave patterns. ' +
      'SIDE PANEL has a small gold dragon/serpent embroidery. ' +
      'BRIM TOP has gold oriental decorative patterns. ' +
      'BACK has a small gold patch with red sun + mountain silhouette, and a small gold samurai helmet embroidery on the side. ' +
      'CAP base is BLACK with corduroy front + mesh back trucker style + curved brim.',
  },
}

export function getTryOnMaxRefs(sku: string | undefined, fallback: number): number {
  if (!sku) return fallback
  const ov = TRYON_OVERRIDES[sku]?.maxRefImages
  return typeof ov === 'number' && ov > 0 ? ov : fallback
}

/** Resolve the default try-on variant SKU for a deep-link entry point
 *  (catalog "THỬ NÓN" button, navbar search). Returns the variant SKU
 *  to pre-select, or `undefined` to fall back to the first variant. */
export function getDefaultTryOnVariant(sku: string | undefined): string | undefined {
  if (!sku) return undefined
  return TRYON_OVERRIDES[sku]?.defaultTryOnVariant
}

/** Resolve the colour-lock value for a given SKU. Tri-state result:
 *  - `string` — owner-forced colour, override the auto-detected value
 *  - `null`   — owner explicitly said "no colour lock"
 *  - `undefined` — no override, fall back to auto-detect
 */
export function getTryOnColorOverride(
  sku: string | undefined,
): ColorOverride | null | undefined {
  if (!sku) return undefined
  const ov = TRYON_OVERRIDES[sku]
  if (!ov) return undefined
  // 'colorOverride' present but `null` → explicit skip.
  // 'colorOverride' present and a string → explicit force.
  // 'colorOverride' absent → no opinion.
  return 'colorOverride' in ov ? ov.colorOverride : undefined
}

/** Resolve the per-SKU prompt hint, if any. Owner-curated text describing
 *  details Gemini misreads from photos alone. */
export function getTryOnPromptHint(sku: string | undefined): string | undefined {
  if (!sku) return undefined
  return TRYON_OVERRIDES[sku]?.promptHint
}
