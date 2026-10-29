const PW = 'C:/Users/TA/.workbuddy-ai/binaries/node/versions/22.22.2-6/node_modules/@playwright/cli/node_modules/playwright-core'
const { chromium } = require(PW)

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await ctx.newPage()

  // First visit — intro should run
  await page.goto('http://localhost:3100/', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(600)
  const first = await page.evaluate(() => ({
    overlay: !!document.querySelector('.z-\\[200\\]'),
    seen: sessionStorage.getItem('nx_intro_seen'),
  }))

  await page.waitForTimeout(3500)
  const afterFirst = await page.evaluate(() => ({
    overlay: !!document.querySelector('.z-\\[200\\]'),
    seen: sessionStorage.getItem('nx_intro_seen'),
    lineOp: getComputedStyle(document.querySelector('[data-line]')).opacity,
    overflow: document.documentElement.style.overflow,
  }))

  // Second visit in the same session — intro must be skipped, hero visible fast
  const t0 = Date.now()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(900)
  const second = await page.evaluate(() => ({
    overlay: !!document.querySelector('.z-\\[200\\]'),
    lineOp: getComputedStyle(document.querySelector('[data-line]')).opacity,
    fadeOp: getComputedStyle(document.querySelector('[data-hero="fade"]')).opacity,
    scrollLocked: document.documentElement.style.overflow,
  }))
  const elapsed = Date.now() - t0

  console.log(JSON.stringify({ first, afterFirst, second, elapsedMs: elapsed }, null, 2))
  await browser.close()
})()
