const PW = 'C:/Users/TA/.workbuddy-ai/binaries/node/versions/22.22.2-6/node_modules/@playwright/cli/node_modules/playwright-core'
const { chromium } = require(PW)

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message))

  await page.goto('http://localhost:3100/', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(5000)

  // idle over empty space
  await page.mouse.move(700, 420)
  await page.waitForTimeout(700)
  await page.screenshot({ path: '.preview/cursor-idle.png' })

  // hover the hero CTA
  const cta = page.locator('a.btn-ink').first()
  const box = await cta.boundingBox()
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.waitForTimeout(900)
    await page.screenshot({ path: '.preview/cursor-link.png' })
  }

  const state = await page.evaluate(() => {
    const frame = document.querySelector('.cursor-frame')
    const dot = document.querySelector('.cursor-frame + div')
    const cs = frame ? getComputedStyle(frame) : null
    return {
      htmlHasClass: document.documentElement.classList.contains('has-custom-cursor'),
      frame: cs ? { w: cs.width, h: cs.height, color: cs.borderColor, opacity: cs.opacity } : null,
      dotOpacity: dot ? getComputedStyle(dot).opacity : null,
      bodyCursor: getComputedStyle(document.body).cursor,
    }
  })

  console.log(JSON.stringify({ state, errors: errors.slice(0, 5) }, null, 2))
  await browser.close()
})()
