'use client'

import {
  createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState,
} from 'react'
import { calculatePricing, type PricingResult } from '@/lib/pricing'

// ── Types ──────────────────────────────────────────────────────────────────

export interface CartItem {
  /** Unique row key — `${sku}::${variantSku ?? ''}`. */
  key:         string
  /** Parent product SKU — used to look up the catalog row server-side. */
  sku:         string
  /** Variant SKU, when the parent has multiple variants. */
  variantSku?: string
  /** Display name e.g. "TC68 - NÓN SPARTAN (CONG / ĐEN)". */
  name:        string
  /** Thumbnail URL — the variant photo when one is pinned, else parent. */
  image:       string
  /** Per-row unit price — for display only; the tier rule in lib/pricing.ts
   * still drives the cart total from the combined qty. */
  unitPrice:   number
  qty:         number
}

interface CartState {
  items: CartItem[]
  /** Increments whenever an item is added — Navbar listens to this to play
   * a "bounce" animation on the badge so the customer SEES the addition. */
  bump:  number
}

type Action =
  | { type: 'add';      item: Omit<CartItem, 'qty'>; qty?: number }
  | { type: 'setQty';   key: string; qty: number }
  | { type: 'remove';   key: string }
  | { type: 'clear' }
  | { type: 'hydrate';  state: CartState }

const STORAGE_KEY = 'tcaps_cart_v1'

function reducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case 'add': {
      const addQty = Math.max(1, Math.floor(action.qty ?? 1))
      const idx    = state.items.findIndex(i => i.key === action.item.key)
      if (idx >= 0) {
        const next = state.items.slice()
        next[idx]  = { ...next[idx], qty: Math.min(99, next[idx].qty + addQty) }
        return { items: next, bump: state.bump + 1 }
      }
      return { items: [...state.items, { ...action.item, qty: addQty }], bump: state.bump + 1 }
    }
    case 'setQty': {
      const q = Math.max(0, Math.floor(action.qty))
      if (q === 0) return { ...state, items: state.items.filter(i => i.key !== action.key) }
      return {
        ...state,
        items: state.items.map(i => i.key === action.key ? { ...i, qty: Math.min(99, q) } : i),
      }
    }
    case 'remove':
      return { ...state, items: state.items.filter(i => i.key !== action.key) }
    case 'clear':
      return { items: [], bump: state.bump }
    case 'hydrate':
      return action.state
  }
}

// ── Context shape ──────────────────────────────────────────────────────────

interface CartContextValue {
  items:       CartItem[]
  bump:        number
  totalQty:    number
  pricing:     PricingResult
  addItem:     (item: Omit<CartItem, 'qty'>, qty?: number) => void
  setQty:      (key: string, qty: number) => void
  removeItem:  (key: string) => void
  clear:       () => void
  /** Drawer open/close lives here so any component (navbar icon, add-to-cart
   * button on product detail) can open the drawer without prop drilling. */
  drawerOpen:  boolean
  openDrawer:  () => void
  closeDrawer: () => void
  /** Checkout modal open/close — same story. */
  checkoutOpen: boolean
  openCheckout: () => void
  closeCheckout: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

// ── Helpers ────────────────────────────────────────────────────────────────

export function cartKey(sku: string, variantSku?: string): string {
  return `${sku}::${variantSku ?? ''}`
}

// ── Provider ───────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { items: [], bump: 0 })
  const [drawerOpen, setDrawerOpen]     = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  // Hydration flag so SSR doesn't desync — server renders empty cart, then
  // we replace from localStorage on first mount.
  const [hydrated, setHydrated] = useState(false)

  // Load from localStorage on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as { items?: CartItem[] } | null
        if (parsed?.items && Array.isArray(parsed.items)) {
          dispatch({ type: 'hydrate', state: { items: parsed.items, bump: 0 } })
        }
      }
    } catch {
      // ignore corrupted state — start fresh
    }
    setHydrated(true)
  }, [])

  // Persist on every change (only after first hydration, to avoid wiping
  // localStorage with the empty initial state during SSR → client handoff).
  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: state.items }))
    } catch {
      // quota or privacy mode — non-fatal
    }
  }, [state.items, hydrated])

  const addItem    = useCallback((item: Omit<CartItem, 'qty'>, qty = 1) => dispatch({ type: 'add', item, qty }), [])
  const setQty     = useCallback((key: string, qty: number) => dispatch({ type: 'setQty', key, qty }), [])
  const removeItem = useCallback((key: string) => dispatch({ type: 'remove', key }), [])
  const clear      = useCallback(() => dispatch({ type: 'clear' }), [])

  const openDrawer    = useCallback(() => setDrawerOpen(true),  [])
  const closeDrawer   = useCallback(() => setDrawerOpen(false), [])
  const openCheckout  = useCallback(() => {
    setDrawerOpen(false)
    setCheckoutOpen(true)
  }, [])
  const closeCheckout = useCallback(() => setCheckoutOpen(false), [])

  const totalQty = state.items.reduce((s, i) => s + i.qty, 0)
  const pricing  = useMemo(() => calculatePricing(totalQty), [totalQty])

  const value: CartContextValue = {
    items:        state.items,
    bump:         state.bump,
    totalQty,
    pricing,
    addItem, setQty, removeItem, clear,
    drawerOpen, openDrawer, closeDrawer,
    checkoutOpen, openCheckout, closeCheckout,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>')
  return ctx
}
