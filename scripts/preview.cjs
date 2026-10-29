const PW = 'C:/Users/TA/.workbuddy-ai/binaries/node/versions/22.22.2-6/node_modules/@playwright/cli/node_modules/playwright-core'
const { chromium } = require(PW)
const path = require('path')
const fs = require('fs')

const OUT = 'D:/Projects/project4/.preview'
fs.mkdirSync(OUT, { recursive: true })

const url = process.argv[2] || 'http://localhost:3100/'
const prefix = process.argv[3] || 'home'
const steps = Number(process.argv[4] || 6)

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message))

  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch((e) => errors.push('GOTO ' + e.message))
  await page.waitForTimeout(2500)

  const height = await page.evaluate(() => document.body.scrollHeight)
  await page.screenshot({ path: path.join(OUT, `${prefix}-full.png`), fullPage: true })

  for (let i = 0; i < steps; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), i * 900)
    await page.waitForTimeout(650)
    await page.screenshot({ path: path.join(OUT, `${prefix}-s${String(i + 1).padStart(2, '0')}.png`) })
  }

  console.log(JSON.stringify({ height, errors: errors.slice(0, 12) }, null, 2))
  await browser.close()
})()
