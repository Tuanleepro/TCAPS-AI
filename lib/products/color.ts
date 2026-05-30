// Detect a cap's COLOUR + BRIM SHAPE from product / variant Vietnamese names
// and pick only the gallery images matching the chosen variant. Stops the AI
// try-on from drifting either axis when one parent SKU groups multiple
// variants (e.g. TC67's gallery contains TRẮNG + ĐEN AND NGANG + CONG photos;
// without filtering Gemini was picking the wrong colour OR the wrong brim).

import type { Product } from '@/constants/products'

// ─── Colour ────────────────────────────────────────────────────────────────

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

export type BrimShape = 'FLAT' | 'CURVED'

const BRIM_VN_TOKEN: Record<BrimShape, string> = {
  FLAT:   'NGANG',
  CURVED: 'CONG',
}

/** Vietnamese label shown in logs / UI / prompts for explaining the lock. */
export const BRIM_LABEL_VN: Record<BrimShape, string> = {
  FLAT:   'lưỡi ngang',
  CURVED: 'lưỡi cong',
}

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

/** Detect the cap's brim shape from a name. NGANG → FLAT, CONG → CURVED. */
export function detectBrim(name: string | null | undefined): BrimShape | null {
  if (!name) return null
  const upper = name.toUpperCase()
  if (wordBoundaryRegex(BRIM_VN_TOKEN.FLAT).test(upper))   return 'FLAT'
  if (wordBoundaryRegex(BRIM_VN_TOKEN.CURVED).test(upper)) return 'CURVED'
  return null
}

/**
 * Two-axis variant filter. Returns only the gallery images whose variant name
 * matches BOTH the requested colour AND the requested brim shape (when known).
 * Falls back to colour-only if no two-axis match exists, then to the full
 * gallery if still nothing matches — so try-on always has SOMETHING to send.
 *
 * The product thumbnail (`imageUrl`) leads the list when it's part of the
 * matching set, so Gemini sees the canonical primary-variant photo first.
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

  const matchesName = (target: string, name: unknown) =>
    typeof name === 'string' && wordBoundaryRegex(target).test(name.toUpperCase())

  // Try the two-axis filter first.
  let matching = product.variants.filter(v => {
    if (color && !matchesName(color.vn,               v.name)) return false
    if (brim  && !matchesName(BRIM_VN_TOKEN[brim],    v.name)) return false
    return true
  })

  // Fallback: colour-only (when no variant satisfies both axes).
  if (matching.length === 0 && color) {
    matching = product.variants.filter(v => matchesName(color.vn, v.name))
  }
  if (matching.length === 0) return fallback

  const matchingImages = matching
    .map(v => v.image)
    .filter((u): u is string => typeof u === 'string' && /^https?:\/\//.test(u))
  if (matchingImages.length === 0) return fallback

  // Lead with the product thumbnail when it's one of the matches; otherwise
  // lead with the first matching variant image.
  const head = product.imageUrl && matchingImages.includes(product.imageUrl)
    ? product.imageUrl
    : matchingImages[0]
  return Array.from(new Set([head, ...matchingImages]))
}
