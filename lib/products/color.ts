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

/**
 * Return the subset of the product's gallery URLs whose corresponding variant
 * matches the given colour. Falls back to the original gallery if no variant
 * info exists or no images match (so try-on still works for un-tagged products).
 *
 * The product thumbnail (`imageUrl`) is always kept first so Gemini sees the
 * canonical primary-variant photo at index 0.
 */
export function filterImagesByColor(product: Product, color: ColorTag): string[] {
  const allImages = product.images?.filter(u => /^https?:\/\//.test(u)) ?? []
  if (allImages.length === 0) return product.imageUrl ? [product.imageUrl] : []

  if (!product.variants || product.variants.length === 0) return allImages

  const matchingImages = product.variants
    .filter(v => typeof v.name === 'string' && wordBoundaryRegex(color.vn).test(v.name.toUpperCase()))
    .map(v => v.image)
    .filter((u): u is string => typeof u === 'string' && /^https?:\/\//.test(u))

  if (matchingImages.length === 0) return allImages   // safe fallback

  // Dedupe + keep the product thumbnail (canonical primary) first.
  return Array.from(new Set([product.imageUrl, ...matchingImages].filter(Boolean)))
}
