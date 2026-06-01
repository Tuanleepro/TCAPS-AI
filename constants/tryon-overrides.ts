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

export interface TryOnOverride {
  maxRefImages?: number
}

export const TRYON_OVERRIDES: Record<string, TryOnOverride> = {
  // TC39 NÓN THE WARRIORS — every Pancake angle is the SAME model facing
  // the camera, so Gemini learns her face as canonical and replaces the
  // customer's selfie. Capping refs at 1 means only the pinned variant
  // image is sent — no gallery padding — which keeps the customer's face.
  TC39: { maxRefImages: 1 },

  // TC59 NÓN LẠC HỒNG — same failure mode as TC39: the multi-angle
  // gallery is dominated by a single model facing camera, and the result
  // came out as a CGI-rendered face instead of the customer's. Drop refs
  // to 1 (pinned variant only).
  TC59: { maxRefImages: 1 },
  // Pancake parent SKU is "Nón TC59" (whitespace + diacritic) — the
  // catalog row that powers the try-on is keyed by that exact string.
  'Nón TC59': { maxRefImages: 1 },
}

export function getTryOnMaxRefs(sku: string | undefined, fallback: number): number {
  if (!sku) return fallback
  const ov = TRYON_OVERRIDES[sku]?.maxRefImages
  return typeof ov === 'number' && ov > 0 ? ov : fallback
}
