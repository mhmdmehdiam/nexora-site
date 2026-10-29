const PW = 'C:/Users/TA/.workbuddy-ai/binaries/node/versions/22.22.2-6/node_modules/@playwright/cli/node_modules/playwright-core'
const { chromium } = require(PW)

const EMAIL = process.env.SHOT_EMAIL || 'admin@nexora.ir'
const PASS = process.env.SHOT_PASS || 'admin123'
const TARGETS = (process.env.SHOT_PATHS || '/admin:admin-final').split(',')

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))

  await page.goto('http://localhost:3100/login', { waitUntil: 'networkidle' })
  await page.evaluate(
    async ({ email, pass }) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      })
      const json = await res.json()
      if (json.user) localStorage.setItem('user', JSON.stringify(json.user))
    },
    { email: EMAIL, pass: PASS }
  )

  for (const target of TARGETS) {
    const [path, name] = target.split(':')
    await page.goto('http://localhost:3100' + path, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1600)
    await page.screenshot({ path: `.preview/${name}.png` })
    console.log('shot', path, '->', name)
  }

  console.log('errors:', JSON.stringify(errors.slice(0, 5)))
  await browser.close()
})()
