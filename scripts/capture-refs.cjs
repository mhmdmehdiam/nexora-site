const path = require('path')
const fs = require('fs')

const PW = 'C:/Users/TA/.workbuddy-ai/binaries/node/versions/22.22.2-6/node_modules/@playwright/cli/node_modules/playwright-core'
const { chromium } = require(PW)

const OUT = 'D:/Projects/project4/design-refs'
fs.mkdirSync(OUT, { recursive: true })

const SITES = [
  { id: '1-pragenhatlen', url: 'https://www.pragenhatlen.com/' },
  { id: '2-belgradearbor', url: 'https://belgradearbor.rs/en' },
  { id: '3-funtech', url: 'https://experience2026.funtech.inc/' },
]

async function capture(browser, site) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  })
  const page = await ctx.newPage()
  const log = []

  try {
    await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(3500)

    // scroll through to trigger lazy loading / reveal animations
    const total = await page.evaluate(() => document.body.scrollHeight)
    for (let y = 0; y < total; y += 800) {
      await page.evaluate((v) => window.scrollTo(0, v), y)
      await page.waitForTimeout(320)
    }
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(1200)

    const height = await page.evaluate(() => document.body.scrollHeight)
    log.push(`height=${height}`)

    // full page
    await page.screenshot({ path: path.join(OUT, `${site.id}-full.png`), fullPage: true })

    // viewport slices for detail
    const slices = Math.min(Math.ceil(height / 900), 10)
    for (let i = 0; i < slices; i++) {
      await page.evaluate((v) => window.scrollTo(0, v), i * 900)
      await page.waitForTimeout(700)
      await page.screenshot({ path: path.join(OUT, `${site.id}-s${String(i + 1).padStart(2, '0')}.png`) })
    }

    // design tokens
    const tokens = await page.evaluate(() => {
      const uniq = (arr) => [...new Set(arr)]
      const els = [...document.querySelectorAll('h1,h2,h3,p,a,button,body')].slice(0, 400)
      const fonts = uniq(els.map((e) => getComputedStyle(e).fontFamily)).slice(0, 12)
      const sizes = uniq(els.map((e) => getComputedStyle(e).fontSize)).slice(0, 16)
      const bgs = uniq(els.map((e) => getComputedStyle(e).backgroundColor)).slice(0, 16)
      const colors = uniq(els.map((e) => getComputedStyle(e).color)).slice(0, 16)
      const h1 = document.querySelector('h1')
      const sections = [...document.querySelectorAll('section')].length
      return {
        title: document.title,
        fonts, sizes, bgs, colors,
        h1: h1 ? { text: h1.textContent.trim().slice(0, 80), size: getComputedStyle(h1).fontSize, weight: getComputedStyle(h1).fontWeight } : null,
        sections,
        hasVideo: !!document.querySelector('video'),
        hasCanvas: !!document.querySelector('canvas'),
        bodyBg: getComputedStyle(document.body).backgroundColor,
      }
    })

    fs.writeFileSync(path.join(OUT, `${site.id}-tokens.json`), JSON.stringify(tokens, null, 2))
    log.push(`slices=${slices}`)
  } catch (e) {
    log.push('ERROR ' + e.message)
  }

  await ctx.close()
  return `${site.id}: ${log.join(' | ')}`
}

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const results = []
  for (const site of SITES) {
    results.push(await capture(browser, site))
  }
  await browser.close()
  console.log(results.join('\n'))
})()
