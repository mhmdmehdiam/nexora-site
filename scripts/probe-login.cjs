const PW = 'C:/Users/TA/.workbuddy-ai/binaries/node/versions/22.22.2-6/node_modules/@playwright/cli/node_modules/playwright-core'
const { chromium } = require(PW)

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  await page.goto('http://localhost:3100/login', { waitUntil: 'networkidle' })

  const info = await page.evaluate(() => {
    const link = [...document.querySelectorAll('a')].find((a) => a.textContent.includes('ثبت‌نام'))
    const p = link?.closest('p')
    const r = (el) => {
      const b = el.getBoundingClientRect()
      return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }
    }
    const after = link ? getComputedStyle(link, '::after') : null
    return {
      p: p ? { ...r(p), textAlign: getComputedStyle(p).textAlign, display: getComputedStyle(p).display } : null,
      link: link ? { ...r(link), display: getComputedStyle(link).display } : null,
      afterTransform: after ? after.transform : null,
      afterBg: after ? after.backgroundColor : null,
    }
  })

  console.log(JSON.stringify(info, null, 2))
  await browser.close()
})()
