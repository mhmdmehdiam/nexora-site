const PW = 'C:/Users/TA/.workbuddy-ai/binaries/node/versions/22.22.2-6/node_modules/@playwright/cli/node_modules/playwright-core'
const { chromium } = require(PW)
const fs = require('fs')

const OUT = 'D:/Projects/project4/.preview/intro'
fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })

const SHOTS = [400, 1100, 1800, 2500, 3200, 3800, 4400, 5200]

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })

  const t0 = Date.now()
  await page.goto('http://localhost:3100/', { waitUntil: 'domcontentloaded' })

  for (let i = 0; i < SHOTS.length; i++) {
    const target = SHOTS[i]
    const wait = target - (Date.now() - t0)
    if (wait > 0) await page.waitForTimeout(wait)
    await page.screenshot({ path: `${OUT}/f${String(i + 1).padStart(2, '0')}.png` })
  }

  // after the intro, verify the page is interactive and scroll still works
  await page.waitForTimeout(1200)
  const state = await page.evaluate(() => ({
    overlay: !!document.querySelector('[aria-hidden="true"].z-\\[200\\]'),
    overflow: document.documentElement.style.overflow,
    scrollY: window.scrollY,
    h1: document.querySelector('h1')?.textContent?.trim().slice(0, 40),
  }))

  await page.mouse.wheel(0, 900)
  await page.waitForTimeout(700)
  const afterScroll = await page.evaluate(() => Math.round(window.scrollY))

  console.log(JSON.stringify({ state, afterScroll, errors: errors.slice(0, 6) }, null, 2))
  await browser.close()
})()
