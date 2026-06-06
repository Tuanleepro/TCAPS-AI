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
}

export const TRYON_OVERRIDES: Record<string, TryOnOverride> = {
  // ── Face-leak SKUs — capped at maxRefImages: 1 ──────────────────────────
  //
  // Global default is 20 (send entire Pancake gallery) for cap-detail
  // fidelity. Some SKUs have Pancake galleries that still carry photos
  // of a single model wearing the cap — those leak the model's face onto
  // the customer's selfie when included as refs. The fix is to cap THESE
  // SKUs at 1 ref (variant.image only, no gallery padding) so Gemini
  // can't learn the model's identity.
  //
  // Identity > cap detail. If a specific SKU's design suffers too much
  // at 1 ref (e.g. brim underside detail missing), individually bump it
  // to 2 here and re-check the face. If face leaks at 2, accept the
  // simplification.
  TC39:        { maxRefImages: 1 },
  TC42:        { maxRefImages: 1 },
  TC43:        { maxRefImages: 1 },
  'NÓN TC43':  { maxRefImages: 1 },
  TC49:        { maxRefImages: 1 },
  'CB TC49':   { maxRefImages: 1 },
  TC56:        { maxRefImages: 1 },
  TC59:        { maxRefImages: 1 },
  'Nón TC59':  { maxRefImages: 1 },
  TC61:        { maxRefImages: 1 },
  TC63:        { maxRefImages: 1 },
  TC67:        { maxRefImages: 1 },
  TC68:        { maxRefImages: 1 },

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
