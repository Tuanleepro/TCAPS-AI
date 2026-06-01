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
}

export const TRYON_OVERRIDES: Record<string, TryOnOverride> = {
  // TC39 NÓN THE WARRIORS — every Pancake angle is the SAME model facing
  // the camera, so Gemini learns her face as canonical and replaces the
  // customer's selfie. Capping refs at 1 means only the pinned variant
  // image is sent — no gallery padding — which keeps the customer's face.
  TC39: { maxRefImages: 1 },

  // TC42 NÓN TCAPS — face-leak SKU. Started at maxRefImages: 1 to kill
  // the face drift, but at 1 ref the cap design simplified (Gemini
  // invented a different patch graphic because it only saw one angle).
  // Bumped to 2: variant image + one extra angle. Gives the cap design
  // a second lock-in without enough face votes to drift the identity.
  // If face starts drifting again drop back to 1; if the cap design
  // is still wrong push to 3.
  TC42: { maxRefImages: 2 },

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
