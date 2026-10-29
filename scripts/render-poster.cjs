/**
 * Render the print poster: A4 vector PDF (for the print shop) + a 300+ dpi
 * PNG (for preview / sharing). Opens the standalone poster.html which loads
 * Google Fonts + the QR image from the network.
 */
const PW =
  'C:/Users/TA/.workbuddy-ai/binaries/node/versions/22.22.2-6/node_modules/@playwright/cli/node_modules/playwright-core'
const { chromium } = require(PW)
const path = require('path')

;(async () => {
  const b = await chromium.launch({ headless: true })
  const c = await b.newContext({
    viewport: { width: 794, height: 1123 }, // A4 @96dpi
    deviceScaleFactor: 4, // ≈ 384 dpi output
  })
  const p = await c.newPage()

  const file = 'file:///' + path.resolve('poster/nexora-poster.html').replace(/\\/g, '/')
  await p.goto(file, { waitUntil: 'networkidle' })
  await p.evaluate(() => document.fonts.ready)
  await p.waitForTimeout(1500) // let fonts + QR settle

  // sanity: page geometry
  const geo = await p.evaluate(() => ({
    w: document.body.offsetWidth,
    h: document.body.offsetHeight,
    fonts: document.fonts.status,
    qrLoaded: (() => {
      const img = document.querySelector('.qr-box img')
      return img ? img.naturalWidth > 0 : false
    })(),
  }))
  console.log('geometry:', JSON.stringify(geo))

  await p.screenshot({ path: '.preview/nexora-poster.png', fullPage: true })
  await p.pdf({
    path: '.preview/nexora-poster.pdf',
    format: 'A4',
    printBackground: true,
    margin: { top: 0, bottom: 0, left: 0, right: 0 },
    preferCSSPageSize: true,
  })

  console.log('poster written: .preview/nexora-poster.pdf + .preview/nexora-poster.png')
  await b.close()
})()
