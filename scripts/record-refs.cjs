const PW = 'C:/Users/TA/.workbuddy-ai/binaries/node/versions/22.22.2-6/node_modules/@playwright/cli/node_modules/playwright-core'
const { chromium } = require(PW)
const fs = require('fs')
const path = require('path')

const OUT = 'D:/Projects/project4/design-refs/video'
fs.mkdirSync(OUT, { recursive: true })

const SITES = [
  { id: '1-pragenhatlen', url: 'https://www.pragenhatlen.com/' },
  { id: '2-belgradearbor', url: 'https://belgradearbor.rs/en' },
  { id: '3-funtech', url: 'https://experience2026.funtech.inc/' },
]

async function record(browser, site) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: OUT, size: { width: 1280, height: 720 } },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  })
  const page = await ctx.newPage()
  const video = page.video()

  await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(4000)

  const total = await page.evaluate(() => document.body.scrollHeight)
  const step = 420
  const frames = Math.min(Math.ceil(total / step), 40)

  for (let i = 0; i < frames; i++) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), i * step)
    await page.waitForTimeout(320)
  }
  await page.waitForTimeout(1200)

  await ctx.close()
  const src = await video.path()
  const dest = path.join(OUT, `${site.id}.webm`)
  fs.copyFileSync(src, dest)
  return `${site.id} -> ${dest}`
}

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const out = []
  for (const s of SITES) out.push(await record(browser, s))
  await browser.close()
  console.log(out.join('\n'))
})()
