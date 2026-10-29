const PW = 'C:/Users/TA/.workbuddy-ai/binaries/node/versions/22.22.2-6/node_modules/@playwright/cli/node_modules/playwright-core'
const { chromium } = require(PW)
const fs = require('fs')

const OUT = 'D:/Projects/project4/.preview/mobile'
fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })

const PAGES = [
  { path: '/', name: 'home' },
  { path: '/blog', name: 'blog' },
  { path: '/login', name: 'login' },
  { path: '/register', name: 'register' },
]

const VIEWPORTS = [
  { w: 390, h: 844, label: 'iphone14' },
  { w: 360, h: 640, label: 'android-small' },
]

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const results = []

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.w, height: vp.h },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    })
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message))

    for (const p of PAGES) {
      await page.goto('http://localhost:3100' + p.path, { waitUntil: 'networkidle' })
      await page.waitForTimeout(p.path === '/' ? 5200 : 1800)

      const audit = await page.evaluate(() => {
        const vw = window.innerWidth
        const docW = document.documentElement.scrollWidth
        const offenders = []
        for (const el of document.querySelectorAll('body *')) {
          const r = el.getBoundingClientRect()
          if (r.width === 0 || r.height === 0) continue
          if (r.right > vw + 1.5 || r.left < -1.5) {
            const cs = getComputedStyle(el)
            if (cs.position === 'fixed') continue
            offenders.push({
              tag: el.tagName,
              cls: (el.className || '').toString().slice(0, 46),
              left: Math.round(r.left),
              right: Math.round(r.right),
              w: Math.round(r.width),
            })
          }
        }
        // tap targets smaller than 32px
        const smallTargets = []
        for (const el of document.querySelectorAll('a, button')) {
          const r = el.getBoundingClientRect()
          if (r.width === 0 || r.height === 0) continue
          if (r.height < 30 || r.width < 30) {
            smallTargets.push({
              text: (el.textContent || '').trim().slice(0, 18),
              w: Math.round(r.width),
              h: Math.round(r.height),
            })
          }
        }
        return {
          vw,
          docW,
          overflowX: docW - vw,
          offenders: offenders.slice(0, 8),
          smallTargets: smallTargets.slice(0, 8),
          h1Count: document.querySelectorAll('h1').length,
          cursorActive: document.documentElement.classList.contains('has-custom-cursor'),
        }
      })

      const height = await page.evaluate(() => document.body.scrollHeight)
      await page.screenshot({ path: `${OUT}/${vp.label}-${p.name}-full.png`, fullPage: true })

      // section slices for the landing page
      if (p.path === '/') {
        const slices = Math.min(Math.ceil(height / vp.h), 12)
        for (let i = 0; i < slices; i++) {
          await page.evaluate((y) => window.scrollTo(0, y), i * vp.h)
          await page.waitForTimeout(420)
          await page.screenshot({
            path: `${OUT}/${vp.label}-home-s${String(i + 1).padStart(2, '0')}.png`,
          })
        }
      }

      results.push({ viewport: vp.label, page: p.path, height, ...audit })
    }

    // mobile menu on the landing
    await page.goto('http://localhost:3100/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(5200)
    const burger = page.locator('button[aria-label="باز کردن منو"]')
    if (await burger.count()) {
      await burger.click()
      await page.waitForTimeout(700)
      await page.screenshot({ path: `${OUT}/${vp.label}-menu.png` })
    }

    results.push({ viewport: vp.label, errors })
    await ctx.close()
  }

  fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
  await browser.close()
})()
