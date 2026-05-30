// Detect the primary cap colour from a product's Vietnamese name + pick only
// the gallery images that match that colour. This stops the AI try-on from
// drifting colourways when a single SKU groups multiple-colour variants
// (e.g. TC67 - NÓN SKELETON CROWN TRẮNG has both TRẮNG and ĐEN variant photos
// in its gallery; sending all of them to Gemini lets the model "pick" the
// wrong colour for the result).

import type { Product } from '@/constants/products'

export interface ColorTag {
  /** Vietnamese name as it appears in product/variant names (uppercase) */
  vn: string
  /** English colour name used in prompts (uppercase) */
  en: string
}

// Order matters: longer / more specific tokens first so "VÀNG" matches before
// a shorter substring would. Word boundaries are enforced at match time.
const COLOR_TABLE: ColorTag[] = [
  { vn: 'TRẮNG',  en: 'WHITE'  },
  { vn: 'ĐEN',    en: 'BLACK'  },
  { vn: 'BẠC',    en: 'SILVER' },
  { vn: 'VÀNG',   en: 'GOLD'   },
  { vn: 'GOLD',   en: 'GOLD'   },
  { vn: 'XANH',   en: 'BLUE'   },
  { vn: 'ĐỎ',     en: 'RED'    },
  { vn: 'HỒNG',   en: 'PINK'   },
  { vn: 'NÂU',    en: 'BROWN'  },
  { vn: 'XÁM',    en: 'GRAY'   },
  { vn: 'KEM',    en: 'CREAM'  },
  { vn: 'BE',     en: 'BEIGE'  },
]

// ─── Brim shape ────────────────────────────────────────────────────────────
// NGANG = flat snapback brim, CONG = curved baseball brim. Pancake variant
// names use these tokens (e.g. "NGANG / TRẮNG"). Filtering by brim stops the
// AI from swapping flat for curved when the gallery contains both.

export type BrimShape = 'FLAT' | 'CURVED'

const BRIM_VN: Record<BrimShape, string> = { FLAT: 'NGANG', CURVED: 'CONG' }

const wordBoundaryRegex = (token: string) =>
  // Vietnamese diacritics aren't word characters in JS regex, so use spaces /
  // slashes / dashes / string boundaries as separators instead of \b.
  new RegExp(`(^|[\\s/\\-])${token.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}($|[\\s/\\-])`, 'iu')

/** Detect the cap's primary colour from its (Vietnamese) name. */
export function detectColor(name: string | null | undefined): ColorTag | null {
  if (!name) return null
  const upper = name.toUpperCase()
  for (const c of COLOR_TABLE) {
    if (wordBoundaryRegex(c.vn).test(upper)) return c
  }
  return null
}

/** Detect brim shape from a name. NGANG → FLAT, CONG → CURVED. */
export function detectBrim(name: string | null | undefined): BrimShape | null {
  if (!name) return null
  const upper = name.toUpperCase()
  if (wordBoundaryRegex(BRIM_VN.FLAT).test(upper))   return 'FLAT'
  if (wordBoundaryRegex(BRIM_VN.CURVED).test(upper)) return 'CURVED'
  return null
}

/**
 * Two-axis variant filter (colour + brim). Returns only the gallery URLs whose
 * variant name matches BOTH axes. Falls back to colour-only if no variant
 * matches both, then to the full gallery — try-on must always have SOMETHING.
 *
 * The product thumbnail leads the list when it's part of the matches.
 */
export function filterImagesByVariant(
  product: Product,
  color: ColorTag | null,
  brim:  BrimShape | null,
): string[] {
  const allImages = product.images?.filter(u => /^https?:\/\//.test(u)) ?? []
  const fallback  = allImages.length
    ? allImages
    : product.imageUrl ? [product.imageUrl] : []
  if (!product.variants?.length) return fallback

  const matchesName = (token: string, name: unknown) =>
    typeof name === 'string' && wordBoundaryRegex(token).test(name.toUpperCase())

  let matching = product.variants.filter(v => {
    if (color && !matchesName(color.vn,         v.name)) return false
    if (brim  && !matchesName(BRIM_VN[brim],    v.name)) return false
    return true
  })
  if (matching.length === 0 && color) {
    matching = product.variants.filter(v => matchesName(color.vn, v.name))
  }
  if (matching.length === 0) return fallback

  const matchingImages = matching
    .map(v => v.image)
    .filter((u): u is string => typeof u === 'string' && /^https?:\/\//.test(u))
  if (matchingImages.length === 0) return fallback

  const head = product.imageUrl && matchingImages.includes(product.imageUrl)
    ? product.imageUrl
    : matchingImages[0]
  return Array.from(new Set([head, ...matchingImages]))
}

/**
 * Backwards-compat colour-only filter. New code should call `filterImagesByVariant`
 * with both axes (colour + brim) for tighter results.
 */
export function filterImagesByColor(product: Product, color: ColorTag): string[] {
  return filterImagesByVariant(product, color, null)
}
