const PW = 'C:/Users/TA/.workbuddy-ai/binaries/node/versions/22.22.2-6/node_modules/@playwright/cli/node_modules/playwright-core'
const { chromium } = require(PW)

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await ctx.newPage()
  await page.goto('http://localhost:3100/', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(4500)

  const report = await page.evaluate(() => {
    const pick = (sel) =>
      [...document.querySelectorAll(sel)].slice(0, 6).map((el) => {
        const cs = getComputedStyle(el)
        const r = el.getBoundingClientRect()
        return {
          tag: el.tagName,
          text: (el.textContent || '').trim().slice(0, 18),
          opacity: cs.opacity,
          visibility: cs.visibility,
          transform: cs.transform === 'none' ? 'none' : cs.transform.slice(0, 40),
          y: Math.round(r.y),
          h: Math.round(r.height),
        }
      })
    return {
      lines: pick('[data-line]'),
      fades: pick('[data-hero="fade"]'),
      frame: pick('[data-hero="frame"]'),
      overlayPresent: !!document.querySelector('.z-\\[200\\]'),
      h1: document.querySelector('h1')?.getBoundingClientRect().height,
    }
  })

  console.log(JSON.stringify(report, null, 2))
  await browser.close()
})()
