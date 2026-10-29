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

  // 1. intro curtain shows on first visit
  await p.waitForTimeout(400)
  const introVisible = await p.evaluate(() => {
    const el = document.querySelector('.fixed.inset-0.z-\\[400\\]')
    return el ? getComputedStyle(el).opacity !== '0' : false
  })
  console.log('intro curtain shown (first visit):', introVisible)

  // 2. curtain lifts, page choreography completes
  await p.waitForTimeout(4000)
  const hidden = await p.evaluate(() => {
    const out = []
    document
      .querySelectorAll('[data-ent], [data-ent-line], [data-ent-brand]')
      .forEach((el) => {
        const cs = getComputedStyle(el)
        if (cs.opacity !== '1' || cs.visibility === 'hidden') out.push(el.textContent?.slice(0, 20))
      })
    return out
  })
  console.log('after intro — hidden elements:', JSON.stringify(hidden))

  // 3. bold decor inventory
  const decor = await p.evaluate(() => ({
    glow: !!document.querySelector('.reg-card-glow'),
    glowAnim: getComputedStyle(document.querySelector('.reg-card-glow')).animationName,
    particles: document.querySelectorAll('.reg-particle').length,
    watermark: !!document.querySelector('.reg-watermark'),
    marquee: !!document.querySelector('.marquee-track'),
    marqueeAnim: document.querySelector('.marquee-track')
      ? getComputedStyle(document.querySelector('.marquee-track')).animationName
      : null,
    orbs: document.querySelectorAll('.reg-orb').length,
    shimmer: !!document.querySelector('.shimmer-text'),
  }))
  console.log('decor:', JSON.stringify(decor))

  // 4. magnetic button reacts to nearby cursor
  const btn = p.locator('button[type="submit"]')
  const bb = await btn.boundingBox()
  await p.mouse.move(bb.x + bb.width / 2 - 30, bb.y + bb.height / 2 + 10)
  await p.waitForTimeout(120)
  const mag = await p.evaluate(() => {
    const b = document.querySelector('button[type="submit"]')
    return { transform: b.style.transform || '(none)' }
  })
  await p.mouse.move(1200, 100)
  await p.waitForTimeout(200)
  const magReset = await p.evaluate(() => document.querySelector('button[type="submit"]').style.transform || '(none)')
  console.log('magnet near:', JSON.stringify(mag), '| far:', magReset)

  // 5. step transition still works
  await p.mouse.move(0, 0)
  await p.locator('button[type="submit"]').click()
  await p.waitForTimeout(900)
  const step2 = await p.evaluate(() => ({
    heading: document.querySelector('h2')?.textContent,
    fields: getComputedStyle(document.querySelector('[data-field]')).opacity,
  }))
  console.log('step2:', JSON.stringify(step2))
  await p.screenshot({ path: '.preview/reg-bold-step2.png' })

  // 6. second visit in the SAME tab — no curtain (sessionStorage is per-tab)
  await p.goto('http://localhost:3100/register', { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(500)
  const intro2 = await p.evaluate(() => !!document.querySelector('.z-\\[400\\]'))
  console.log('second visit intro absent:', !intro2)

  // 7. mobile
  const m = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const mp = await m.newPage()
  await mp.goto('http://localhost:3100/register', { waitUntil: 'networkidle' })
  await mp.waitForTimeout(2200)
  const mob = await mp.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    card: !!document.querySelector('.reg-card'),
  }))
  console.log('mobile:', JSON.stringify(mob))
  await mp.screenshot({ path: '.preview/reg-bold-mobile.png' })

  console.log('page errors:', JSON.stringify(errs))
  await b.close()
})()
