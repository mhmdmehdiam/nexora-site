const PW = 'C:/Users/TA/.workbuddy-ai/binaries/node/versions/22.22.2-6/node_modules/@playwright/cli/node_modules/playwright-core'
const { chromium } = require(PW)

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await ctx.newPage()
  await page.goto('http://localhost:3100/', { waitUntil: 'domcontentloaded' })

  const samples = []
  for (const t of [1000, 2000, 3000, 4000, 5500, 7000]) {
    await page.waitForTimeout(t - (samples.length ? samples[samples.length - 1].t : 0))
    const s = await page.evaluate(() => {
      const line = document.querySelector('[data-line]')
      const fade = document.querySelector('[data-hero="fade"]')
      const cs = (el) => (el ? getComputedStyle(el) : null)
      return {
        overlay: !!document.querySelector('.z-\\[200\\]'),
        lineOp: cs(line)?.opacity,
        lineTr: cs(line)?.transform?.slice(0, 34),
        fadeOp: cs(fade)?.opacity,
        fadeVis: cs(fade)?.visibility,
      }
    })
    samples.push({ t, ...s })
  }

  console.log(JSON.stringify(samples, null, 2))
  await browser.close()
})()
