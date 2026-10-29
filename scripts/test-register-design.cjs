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

  await p.goto('http://localhost:3100/register', { waitUntil: 'networkidle' })
  await p.waitForTimeout(2600) // let the entrance timeline finish

  // 1. entrance end-state: everything visible
  const invisible = await p.evaluate(() => {
    const out = []
    document.querySelectorAll('[data-ent], [data-ent-line], [data-ent-brand]').forEach((el) => {
      const cs = getComputedStyle(el)
      if (cs.opacity !== '1' || cs.visibility === 'hidden') out.push(el.textContent?.slice(0, 24))
    })
    return out
  })
  console.log('entrance end-state: hidden elements =', JSON.stringify(invisible))

  // 2. decor present
  const decor = await p.evaluate(() => ({
    orbs: document.querySelectorAll('.reg-orb').length,
    scans: document.querySelectorAll('.reg-scan').length,
    feed: !!document.querySelector('.feed-line, [class*="live"]'),
    brackets: document.querySelectorAll('[aria-hidden] span[class*="border-l border-t"]').length,
  }))
  console.log('decor:', JSON.stringify(decor))

  // 3. cursor active + native cursor preserved on inputs
  await p.mouse.move(700, 450)
  await p.waitForTimeout(600)
  const cursor = await p.evaluate(() => ({
    frameExists: !!document.querySelector('.cursor-frame'),
    hasCustomClass: document.documentElement.classList.contains('has-custom-cursor'),
    inputCursor: getComputedStyle(document.querySelector('#businessName')).cursor,
    selectCursor: getComputedStyle(document.querySelector('#industry')).cursor,
    bodyCursor: getComputedStyle(document.querySelector('h2')).cursor,
  }))
  console.log('cursor:', JSON.stringify(cursor))

  // 4. hover the submit button -> frame expands with label
  const btn = p.locator('button[type="submit"]')
  const bb = await btn.boundingBox()
  await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2)
  await p.waitForTimeout(900)
  const hover = await p.evaluate(() => {
    const f = document.querySelector('.cursor-frame')
    const l = document.querySelector('.cursor-label')
    return {
      active: f.classList.contains('is-active'),
      label: l.textContent,
      w: Math.round(f.getBoundingClientRect().width),
    }
  })
  console.log('hover submit:', JSON.stringify(hover))
  await p.screenshot({ path: '.preview/reg-step1.png' })

  // 5. step transition
  await btn.click()
  await p.waitForTimeout(1000)
  const step2 = await p.evaluate(() => ({
    heading: document.querySelector('h2')?.textContent,
    ownerFieldVisible: !!document.querySelector('#ownerName'),
    fieldOpacity: getComputedStyle(document.querySelector('[data-field]')).opacity,
  }))
  console.log('step2:', JSON.stringify(step2))
  await p.screenshot({ path: '.preview/reg-step2.png' })

  // 6. mobile
  const m = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const mp = await m.newPage()
  await mp.goto('http://localhost:3100/register', { waitUntil: 'networkidle' })
  await mp.waitForTimeout(2000)
  const mob = await mp.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    cursorClass: document.documentElement.classList.contains('has-custom-cursor'),
  }))
  console.log('mobile:', JSON.stringify(mob))
  await mp.screenshot({ path: '.preview/reg-mobile.png' })

  console.log('page errors:', JSON.stringify(errs))
  await b.close()
})()
