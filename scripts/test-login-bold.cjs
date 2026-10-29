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

  await p.goto('http://localhost:3100/login', { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(4000) // curtain + entrance

  // 1. full inventory
  const inv = await p.evaluate(() => {
    const r = (el) => {
      if (!el) return null
      const b = el.getBoundingClientRect()
      return [Math.round(b.x), Math.round(b.y), Math.round(b.width)]
    }
    const hidden = []
    document
      .querySelectorAll('[data-ent], [data-ent-line], [data-ent-brand]')
      .forEach((el) => {
        const cs = getComputedStyle(el)
        if (cs.opacity !== '1' || cs.visibility === 'hidden') hidden.push(el.textContent?.slice(0, 16))
      })
    return {
      hidden,
      curtainGone: !document.querySelector('.z-\\[400\\]'),
      auroras: document.querySelectorAll('.reg-aurora').length,
      particles: document.querySelectorAll('.reg-particle').length,
      watermark: !!document.querySelector('.reg-watermark'),
      marquee: !!document.querySelector('.marquee-track'),
      card: r(document.querySelector('.reg-card')),
      glow: !!document.querySelector('.reg-card-glow'),
      demos: document.querySelectorAll('[data-cursor-label]').length,
      feed: !!document.querySelector('.feed-line'),
      scrollW: document.documentElement.scrollWidth,
    }
  })
  console.log('inventory:', JSON.stringify(inv))

  // 2. tilt + magnet + cursor label
  const card = p.locator('.reg-card')
  const cb = await card.boundingBox()
  await p.mouse.move(cb.x + cb.width * 0.2, cb.y + cb.height * 0.25)
  await p.waitForTimeout(250)
  const tilt = await p.evaluate(() => document.querySelector('.reg-card').style.transform)
  const btn = p.locator('button[type="submit"]')
  const bb = await btn.boundingBox()
  await p.mouse.move(bb.x + bb.width / 2 - 25, bb.y + bb.height / 2)
  await p.waitForTimeout(250)
  const magnet = await p.evaluate(() => document.querySelector('button[type="submit"]').style.transform || '(none)')
  const label = await p.evaluate(() => document.querySelector('.cursor-label')?.textContent)
  console.log('tilt:', tilt ? tilt.slice(0, 40) : '(none)', '| magnet:', magnet, '| cursor label:', JSON.stringify(label))

  // 3. wrong-password error still renders inside the card
  await p.fill('#email', 'ali@digiland.ir')
  await p.fill('#password', 'wrongpass')
  await p.click('button[type="submit"]')
  await p.waitForTimeout(900)
  const err = await p.evaluate(() => document.querySelector('#login-error')?.textContent)
  console.log('login error shown:', JSON.stringify(err))
  await p.screenshot({ path: '.preview/login-bold.png' })

  // 4. demo login actually navigates to dashboard
  await p.locator('text=مدیر پلتفرم').click()
  await p.waitForURL('**/admin', { timeout: 15000 })
  console.log('demo login -> /admin OK')

  // 5. mobile sanity
  const m = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const mp = await m.newPage()
  await mp.goto('http://localhost:3100/login', { waitUntil: 'networkidle' })
  await mp.waitForTimeout(2200)
  const mob = await mp.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    card: !!document.querySelector('.reg-card'),
  }))
  console.log('mobile:', JSON.stringify(mob))
  await mp.screenshot({ path: '.preview/login-bold-mobile.png' })

  console.log('page errors:', JSON.stringify(errs))
  await b.close()
})()
