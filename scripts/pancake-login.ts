/**
 * Pancake POS — persistent login browser.
 *
 * Launches your REAL installed Chrome (channel: 'chrome') with a PERSISTENT
 * profile so your Pancake POS login is saved to disk and reused on every future
 * run. Log in once in the window that opens; later runs (and the scraper) stay
 * logged in.
 *
 * Run:
 *   npx tsx scripts/pancake-login.ts     # or: node scripts/pancake-login.ts (Node 22+)
 *
 * Optional overrides:
 *   SHOP_ID=5875807 PANCAKE_PROFILE_DIR="C:\\pancake-profile" npx tsx scripts/pancake-login.ts
 */

import { chromium, type BrowserContext, type Page } from 'playwright'
import path from 'node:path'
import fs from 'node:fs'

const SHOP_ID = process.env.SHOP_ID || '5875807'
const SHOP_URL = `https://pos.pancake.vn/shop/${SHOP_ID}/product/management`

// Persistent profile: this folder holds the saved login session.
const USER_DATA_DIR =
  process.env.PANCAKE_PROFILE_DIR || path.resolve('.pancake-profile')

/** Navigate with retries — Pancake's SPA can be slow/flaky on first hit. */
async function gotoWithRetry(page: Page, url: string, attempts = 3): Promise<void> {
  for (let i = 1; i <= attempts; i++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
      return
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`⚠ goto attempt ${i}/${attempts} failed: ${msg}`)
      if (i === attempts) throw err
      await page.waitForTimeout(2_000 * i)
    }
  }
}

async function main(): Promise<void> {
  fs.mkdirSync(USER_DATA_DIR, { recursive: true })

  const context: BrowserContext = await chromium.launchPersistentContext(USER_DATA_DIR, {
    channel: 'chrome',           // use the real installed Chrome, not bundled Chromium
    headless: false,
    viewport: null,              // use the full OS window size
    ignoreHTTPSErrors: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--start-maximized',
    ],
  })

  const page = context.pages()[0] ?? (await context.newPage())
  await gotoWithRetry(page, SHOP_URL)

  console.log('▶ Chrome open with a persistent profile:')
  console.log('  ', USER_DATA_DIR)
  console.log('▶ Log into Pancake POS in the window — the session is saved here.')
  console.log('▶ Close the browser window when done; your login persists for next time.')

  // Keep the process alive until you close the browser window.
  await context.waitForEvent('close', { timeout: 0 })
  console.log('✓ Browser closed. Login session saved.')
}

main().catch((err) => {
  console.error('✗', err)
  process.exit(1)
})
