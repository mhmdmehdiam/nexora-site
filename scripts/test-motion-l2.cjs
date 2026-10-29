const PW =
  'C:/Users/TA/.workbuddy-ai/binaries/node/versions/22.22.2-6/node_modules/@playwright/cli/node_modules/playwright-core'
const { chromium } = require(PW)

;(async () => {
  const b = await chromium.launch({ headless: true })
  const c = await b.newContext({ viewport: { width: 1440, height: 900 } })
  const p = await c.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push('landing: ' + e.message))

  /* ---------- landing: HeroSpace ---------- */
  await p.goto('http://localhost:3100/', { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(6000) // intro + webgl init
  const hero = await p.evaluate(() => {
    const holder = document.querySelector('div.pointer-events-none.fixed.inset-0.z-0')
    const canvas = holder?.querySelector('canvas')
    return {
      holder: !!holder,
      canvas: !!canvas,
      opacity: holder ? getComputedStyle(holder).opacity : null,
    }
  })
  console.log('landing hero-space:', JSON.stringify(hero))
  // scroll → fades
  await p.evaluate(() => window.scrollTo(0, 900))
  await p.waitForTimeout(1200)
  const faded = await p.evaluate(() => {
    const holder = document.querySelector('div.pointer-events-none.fixed.inset-0.z-0')
    return getComputedStyle(holder).opacity
  })
  console.log('hero opacity after scroll:', faded)
  await p.screenshot({ path: '.preview/l2-hero-space.png' })

  /* ---------- blog ---------- */
  const pb = await c.newPage()
  pb.on('pageerror', (e) => errs.push('blog: ' + e.message))
  await pb.goto('http://localhost:3100/blog', { waitUntil: 'networkidle' })
  await pb.waitForTimeout(1200)
  const blogTop = await pb.evaluate(() => {
    const el = document.querySelector('[data-cm]')
    return el ? getComputedStyle(el).opacity : 'none'
  })
  await pb.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await pb.waitForTimeout(1500)
  const blogCards = await pb.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-cm]')]
    return { total: cards.length, revealed: cards.filter((c) => getComputedStyle(c).opacity === '1').length }
  })
  console.log('blog top visible:', blogTop, '| cards:', JSON.stringify(blogCards))

  /* ---------- product page ---------- */
  const pp = await c.newPage()
  pp.on('pageerror', (e) => errs.push('product: ' + e.message))
  await pp.goto('http://localhost:3100/p/about', { waitUntil: 'networkidle' }).catch(() => {})
  await pp.waitForTimeout(1200)
  const prod = await pp.evaluate(() => ({
    cms: document.querySelectorAll('[data-cm]').length,
    content: document.body.textContent.includes('نکسورا'),
  }))
  console.log('product page:', JSON.stringify(prod))

  /* ---------- dashboard (with session) ---------- */
  const pd = await c.newPage()
  pd.on('pageerror', (e) => errs.push('dash: ' + e.message))
  await pd.goto('http://localhost:3100/login', { waitUntil: 'networkidle' })
  await pd.evaluate(async () => {
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ali@digiland.ir', password: 'demo123' }),
    })
    const j = await r.json()
    localStorage.setItem('user', JSON.stringify(j.user))
  })
  await pd.goto('http://localhost:3100/dashboard', { waitUntil: 'networkidle' })
  await pd.waitForTimeout(1800)
  const dash = await pd.evaluate(() => {
    const cards = [...document.querySelectorAll('.stat-card')]
    return {
      statCards: cards.length,
      firstOpacity: cards[0] ? getComputedStyle(cards[0]).opacity : null,
      glassCards: document.querySelectorAll('.glass-card').length,
      revenue: document.body.textContent.includes('درآمد این ماه'),
    }
  })
  console.log('dashboard:', JSON.stringify(dash))
  await pd.screenshot({ path: '.preview/l2-dashboard.png' })

  /* ---------- /auth/complete ---------- */
  const pa = await c.newPage()
  pa.on('pageerror', (e) => errs.push('complete: ' + e.message))
  // without session → error phase
  await pa.goto('http://localhost:3100/auth/complete', { waitUntil: 'domcontentloaded' })
  await pa.waitForTimeout(1000)
  const errPhase = await pa.evaluate(() => document.body.textContent.includes('ورود با گوگل ناموفق بود'))
  console.log('complete (no session) error phase:', errPhase)
  // with session → welcome
  await pa.evaluate(async () => {
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ali@digiland.ir', password: 'demo123' }),
    })
    await r.text()
  })
  await pa.goto('http://localhost:3100/auth/complete', { waitUntil: 'domcontentloaded' })
  await pa.waitForTimeout(1400)
  const welcome = await pa.evaluate(() => document.body.textContent.includes('خوش آمدی'))
  await pa.screenshot({ path: '.preview/l2-complete.png' })
  await pa.waitForTimeout(1500)
  const routed = pa.url()
  console.log('complete welcome:', welcome, '| routed to:', routed)

  console.log('page errors:', JSON.stringify(errs))
  await b.close()
})()
