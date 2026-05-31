// TCAPS tiered bulk pricing — used by both the order modal (client) and the
// /api/order route (server) so client and server never disagree on a total.
//
// Owner-defined tiers (May 2026):
//   1 cap   → 130k + 30k ship      (160k total)
//   2 caps  → 250k freeship
//   3 caps  → 370k freeship
//   4 caps  → 516k freeship + 🎁 1 cap miễn phí (customer ships 5 caps)
//   5 caps  → 650k freeship + 🎁 1 cap miễn phí (customer ships 6 caps)
//   6+ caps → 650k base + 130k × (qty − 5) freeship + 🎁 1 cap miễn phí
//
// `qty` = number of caps the customer PAYS for (cart line items × their qty).
// `bonusQty` = number of FREE caps shop owner ships on top (the gift).

export const UNIT_PRICE   = 130_000   // base "1 cap" price
export const SHIPPING_FEE = 30_000    // only applied at qty=1; everything ≥2 is free ship

export interface PricingResult {
  qty:        number     // caps paid for
  bonusQty:   number     // free bonus caps (0 or 1)
  totalCaps:  number     // qty + bonusQty — what the shop actually ships
  subtotal:   number     // tier cap price (excludes shipping)
  shipping:   number     // 0 = free
  total:      number     // subtotal + shipping
}

export function calculatePricing(qty: number): PricingResult {
  const q = Math.max(0, Math.floor(qty))

  if (q === 0) {
    return { qty: 0, bonusQty: 0, totalCaps: 0, subtotal: 0,       shipping: 0,            total: 0       }
  }
  if (q === 1) {
    return { qty: 1, bonusQty: 0, totalCaps: 1, subtotal: 130_000, shipping: SHIPPING_FEE, total: 160_000 }
  }
  if (q === 2) {
    return { qty: 2, bonusQty: 0, totalCaps: 2, subtotal: 250_000, shipping: 0,            total: 250_000 }
  }
  if (q === 3) {
    return { qty: 3, bonusQty: 0, totalCaps: 3, subtotal: 370_000, shipping: 0,            total: 370_000 }
  }
  if (q === 4) {
    return { qty: 4, bonusQty: 1, totalCaps: 5, subtotal: 516_000, shipping: 0,            total: 516_000 }
  }
  // q >= 5: 650k base for 5 caps + 1 bonus, additional caps at flat 130k each.
  const baseQty   = 5
  const baseTotal = 650_000
  const extras    = q - baseQty
  const subtotal  = baseTotal + extras * UNIT_PRICE
  return {
    qty:       q,
    bonusQty:  1,
    totalCaps: q + 1,
    subtotal,
    shipping:  0,
    total:     subtotal,
  }
}

/** "130.000₫" — single source of truth for currency formatting. */
export const fmtVnd = (n: number) => `${Math.round(n).toLocaleString('vi-VN')}₫`
