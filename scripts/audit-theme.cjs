/**
 * Light-theme audit — walks every page and reports elements that still render
 * with a dark background or light text on a light surface.
 *
 *   node scripts/audit-theme.cjs
 *   node scripts/audit-theme.cjs /pricing /blog
 *
 * Requires the cluster to be running on :3100.
 */
const PW = 'C:/Users/TA/.workbuddy-ai/binaries/node/versions/22.22.2-6/node_modules/@playwright/cli/node_modules/playwright-core'
const { chromium } = require(PW)

const BASE = 'http://localhost:3100'

// Pages that need a session
const DASHBOARD = [
  '/dashboard',
  '/dashboard/ai',
  '/dashboard/customers',
  '/dashboard/invoices',
  '/dashboard/products',
  '/dashboard/reminders',
  '/dashboard/reports',
  '/dashboard/sales',
  '/dashboard/settings',
  '/dashboard/sms',
  '/dashboard/users',
]
const ADMIN = [
  '/admin',
  '/admin/businesses',
  '/admin/content',
  '/admin/media',
  '/admin/menus',
  '/admin/pages',
  '/admin/posts',
  '/admin/seo',
  '/admin/settings',
  '/admin/subscriptions',
  '/admin/users',
]
const PUBLIC = ['/', '/pricing', '/blog', '/login', '/register', '/p/demo']

const DARK_ACCOUNTS = [
  { email: 'ali@digiland.ir', password: 'demo123', pages: DASHBOARD },
  { email: 'admin@nexora.ir', password: 'admin123', pages: ADMIN },
]

async function login(page, email, password) {
  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(900)
  await page.fill('input[type=email]', email)
  await page.fill('input[type=password]', password)
  await page.click('button[type=submit]')
  await page.waitForTimeout(3200)
}

/** Runs in the browser: collect elements whose paint fights the light theme. */
const SCAN = () => {
  const lum = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255

  const parse = (c) => {
    const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/)
    if (!m) return null
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] }
  }

  // Is any ancestor a dark surface? (means the element is legitimately dark-on-dark)
  const hasDarkAncestor = (el) => {
    let p = el.parentElement
    while (p && p !== document.body) {
      const bg = parse(getComputedStyle(p).backgroundColor)
      if (bg && bg.a > 0.5 && lum(bg.r, bg.g, bg.b) < 0.28) return true
      p = p.parentElement
    }
    return false
  }

  const darkSurfaces = []
  const lightText = []

  // Deliberately dark in both themes: inverted CTAs and the focus-only skip link.
  const INTENTIONAL = /skip-link|btn-primary|btn-ink|cursor-dot|cursor-frame/

  document.querySelectorAll('body *').forEach((el) => {
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden') return
    const rect = el.getBoundingClientRect()
    if (rect.width < 120 || rect.height < 40) return

    const cls = (el.className || '').toString().slice(0, 110)
    if (INTENTIONAL.test(cls)) return

    const bg = parse(cs.backgroundColor)
    if (bg && bg.a > 0.5 && lum(bg.r, bg.g, bg.b) < 0.16 && !hasDarkAncestor(el)) {
      darkSurfaces.push({
        tag: el.tagName,
        cls,
        bg: cs.backgroundColor,
        size: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
      })
    }

    // Light text sitting on a light background → invisible
    const fg = parse(cs.color)
    if (fg && fg.a > 0.5 && lum(fg.r, fg.g, fg.b) > 0.86) {
      // find the effective backdrop
      let p = el
      let backdrop = null
      while (p && p !== document.documentElement) {
        const b2 = parse(getComputedStyle(p).backgroundColor)
        if (b2 && b2.a > 0.4) {
          backdrop = b2
          break
        }
        p = p.parentElement
      }
      if (backdrop && lum(backdrop.r, backdrop.g, backdrop.b) > 0.8) {
        lightText.push({
          tag: el.tagName,
          cls,
          color: cs.color,
          text: (el.textContent || '').trim().slice(0, 40),
        })
      }
    }
  })

  const uniq = (arr) => {
    const seen = new Set()
    return arr.filter((o) => {
      const k = o.cls + o.tag + (o.text || '')
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
  }

  return {
    darkSurfaces: uniq(darkSurfaces).slice(0, 6),
    lightText: uniq(lightText).slice(0, 6),
    counts: { dark: darkSurfaces.length, light: lightText.length },
  }
}

;(async () => {
  const extra = process.argv.slice(2)
  const browser = await chromium.launch({ headless: true })

  const audit = async (pages, label, creds) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } })
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message.slice(0, 110)))

    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
    await page.evaluate(() => localStorage.setItem('nexora-theme', 'light'))

    if (creds) await login(page, creds.email, creds.password)

    let bad = 0
    for (const path of pages) {
      const res = await page.goto(BASE + path, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1800)
      const report = await page.evaluate(SCAN)
      const status = report.counts.dark === 0 && report.counts.light === 0 ? 'OK ' : '!! '
      if (status === '!! ') bad++
      console.log(`${status}${label} ${path}  (dark:${report.counts.dark} lightText:${report.counts.light}) http:${res && res.status()}`)
      if (report.counts.dark) {
        report.darkSurfaces.forEach((d) => console.log(`      dark  <${d.tag}> ${d.size} ${d.bg}  ${d.cls}`))
      }
      if (report.counts.light) {
        report.lightText.forEach((d) => console.log(`      text  <${d.tag}> "${d.text}" ${d.color}  ${d.cls}`))
      }
    }
    if (errors.length) console.log(`  pageerrors: ${JSON.stringify(errors.slice(0, 3))}`)
    await ctx.close()
    return bad
  }

  let total = 0
  total += await audit(extra.length ? extra : PUBLIC, 'public', null)
  for (const acc of DARK_ACCOUNTS) total += await audit(acc.pages, acc.email.split('@')[0], acc)

  await browser.close()
  console.log(`\n${total === 0 ? 'PASS' : `${total} page(s) with issues`}`)
})()
