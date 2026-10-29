const PW = 'C:/Users/TA/.workbuddy-ai/binaries/node/versions/22.22.2-6/node_modules/@playwright/cli/node_modules/playwright-core'
const { chromium } = require(PW)

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })

  await page.goto('http://localhost:3100/', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(4200)

  // wheel scroll should move the page
  await page.mouse.move(640, 400)
  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel(0, 700)
    await page.waitForTimeout(180)
  }
  await page.waitForTimeout(900)
  const afterWheel = await page.evaluate(() => Math.round(window.scrollY))

  // a section further down should now be revealed
  const reveal = await page.evaluate(() => {
    const heads = [...document.querySelectorAll('h2')]
    const target = heads.find((h) => h.textContent.includes('سه قدم'))
    if (!target) return null
    const r = target.getBoundingClientRect()
    return { opacity: getComputedStyle(target.parentElement).opacity, y: Math.round(r.y) }
  })

  // anchor link through the smooth-scroll handler
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(600)
  await page.click('a[href="#pricing"]')
  await page.waitForTimeout(1600)
  const afterAnchor = await page.evaluate(() => {
    const el = document.querySelector('#pricing')
    return el ? Math.round(el.getBoundingClientRect().top) : null
  })

  console.log(
    JSON.stringify({ afterWheel, reveal, pricingTopAfterAnchor: afterAnchor, errors: errors.slice(0, 6) }, null, 2)
  )
  await browser.close()
})()
