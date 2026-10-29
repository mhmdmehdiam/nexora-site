const PW = 'C:/Users/TA/.workbuddy-ai/binaries/node/versions/22.22.2-6/node_modules/@playwright/cli/node_modules/playwright-core'
const { chromium } = require(PW)

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const errors = []

  // --- functional: submit the real form ---
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })

  await page.goto('http://localhost:3100/login', { waitUntil: 'networkidle' })
  await page.fill('#email', 'admin@nexora.ir')
  await page.fill('#password', 'admin123')
  await Promise.all([
    page.waitForURL('**/admin', { timeout: 20000 }).catch(() => null),
    page.click('button[type=submit]'),
  ])
  const url = page.url()
  const stored = await page.evaluate(() => localStorage.getItem('user'))

  // --- wrong password shows an error ---
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const p2 = await ctx2.newPage()
  await p2.goto('http://localhost:3100/login', { waitUntil: 'networkidle' })
  await p2.fill('#email', 'admin@nexora.ir')
  await p2.fill('#password', 'wrongpass')
  await p2.click('button[type=submit]')
  await p2.waitForTimeout(1500)
  const errText = await p2.locator('#login-error').textContent().catch(() => null)

  // --- mobile layout ---
  const ctx3 = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  })
  const p3 = await ctx3.newPage()
  await p3.goto('http://localhost:3100/login', { waitUntil: 'networkidle' })
  await p3.waitForTimeout(900)
  await p3.screenshot({ path: '.preview/login-mobile.png' })
  await p3.goto('http://localhost:3100/register', { waitUntil: 'networkidle' })
  await p3.waitForTimeout(900)
  await p3.screenshot({ path: '.preview/register-mobile.png' })

  console.log(
    JSON.stringify(
      { redirectedTo: url, hasUser: !!stored, errorShown: errText, errors: errors.slice(0, 6) },
      null,
      2
    )
  )
  await browser.close()
})()
