const PW =
  'C:/Users/TA/.workbuddy-ai/binaries/node/versions/22.22.2-6/node_modules/@playwright/cli/node_modules/playwright-core'
const { chromium } = require(PW)

;(async () => {
  const b = await chromium.launch({ headless: true })
  const c = await b.newContext({ viewport: { width: 1440, height: 900 } })
  const p = await c.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  p.on('console', (m) => m.type() === 'error' && errs.push(m.text()))

  await p.goto('http://localhost:3100/register', { waitUntil: 'domcontentloaded' })

  // 1. curtain counter ticks toward ۱۰۰
  await p.waitForTimeout(450)
  const curtain = await p.evaluate(() => {
    const el = document.querySelector('.z-\\[400\\]')
    if (!el) return { present: false }
    const nums = el.querySelectorAll('span')
    const pct = [...nums].map((n) => n.textContent).find((t) => /[۰-۹]/.test(t || ''))
    return { present: true, pct }
  })
  console.log('curtain counter:', JSON.stringify(curtain))

  // 2. after intro — full inventory incl. aurora + watermark
  await p.waitForTimeout(3800)
  const inv = await p.evaluate(() => ({
    auroras: document.querySelectorAll('.reg-aurora').length,
    watermark: document.querySelector('.reg-step-num')?.textContent,
    slug: !!document.querySelector('.slug-chip'),
    strength: document.querySelectorAll('[aria-live] .h-1').length,
  }))
  console.log('inventory:', JSON.stringify(inv))

  // 3. tilt: card transform responds to mouse
  const card = p.locator('.reg-card')
  const cb = await card.boundingBox()
  await p.mouse.move(cb.x + cb.width * 0.15, cb.y + cb.height * 0.2)
  await p.waitForTimeout(250)
  const tilt = await p.evaluate(() => document.querySelector('.reg-card').style.transform)
  console.log('tilt near:', tilt ? tilt.slice(0, 60) : '(none)')

  // 4. slug preview: type a business name
  await p.fill('#businessName', 'فروشگاه پارسیان')
  await p.waitForTimeout(400)
  const slug = await p.evaluate(() => document.querySelector('.slug-chip')?.textContent)
  console.log('slug preview:', JSON.stringify(slug))

  // 5. burst on step advance
  await p.click('button[type="submit"]')
  await p.waitForTimeout(200)
  const burstCount = await p.evaluate(() => document.querySelectorAll('.burst-dot').length)
  await p.waitForTimeout(1400)
  const burstGone = await p.evaluate(() => document.querySelectorAll('.burst-dot').length)
  console.log('burst: spawned =', burstCount, '| after 1.4s =', burstGone)

  // 6. watermark flipped to 02
  const wm2 = await p.evaluate(() => document.querySelector('.reg-step-num')?.textContent)
  console.log('watermark now:', wm2)

  // 7. strength meter reacts to password
  await p.fill('#password', 'abc')
  await p.waitForTimeout(150)
  const s1 = await p.evaluate(() => document.querySelector('[aria-live="polite"]').textContent)
  await p.fill('#password', 'Abcdef1234!@')
  await p.waitForTimeout(150)
  const s2 = await p.evaluate(() => document.querySelector('[aria-live="polite"]').textContent)
  console.log('strength weak -> strong:', JSON.stringify(s1), '->', JSON.stringify(s2))

  await p.screenshot({ path: '.preview/reg-l2-step2.png' })

  // 8. mobile sanity
  const m = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const mp = await m.newPage()
  await mp.goto('http://localhost:3100/register', { waitUntil: 'networkidle' })
  await mp.waitForTimeout(2200)
  const mob = await mp.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  }))
  console.log('mobile:', JSON.stringify(mob))

  console.log('page errors:', JSON.stringify(errs))
  await b.close()
})()
