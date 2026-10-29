const PW = 'C:/Users/TA/.workbuddy-ai/binaries/node/versions/22.22.2-6/node_modules/@playwright/cli/node_modules/playwright-core'
const { chromium } = require(PW)

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()

  await page.goto('http://localhost:3100/', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(5000)

  // idle
  await page.mouse.move(640, 500)
  await page.waitForTimeout(800)
  await page.screenshot({ path: '.preview/cur-idle.png' })

  // hover the product mockup
  await page.evaluate(() => window.scrollTo(0, 620))
  await page.waitForTimeout(1200)
  const frame = page.locator('[data-cursor-label]').first()
  const b = await frame.boundingBox()
  if (b) {
    await page.mouse.move(b.x + b.width / 2, b.y + 120)
    await page.waitForTimeout(1000)
    await page.screenshot({ path: '.preview/cur-frame.png' })
  }

  console.log('done')
  await browser.close()
})()
