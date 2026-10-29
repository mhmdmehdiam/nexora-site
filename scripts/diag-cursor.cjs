const PW = 'C:/Users/TA/.workbuddy-ai/binaries/node/versions/22.22.2-6/node_modules/@playwright/cli/node_modules/playwright-core'
const { chromium } = require(PW)

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()

  await page.goto('http://localhost:3100/', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(5000)

  const measure = () =>
    page.evaluate(() => {
      const frame = document.querySelector('.cursor-frame')
      const dot = frame?.parentElement?.lastElementChild
      const fr = frame?.getBoundingClientRect()
      const dr = dot?.getBoundingClientRect()
      const cs = frame ? getComputedStyle(frame) : null
      return {
        frame: fr ? { x: Math.round(fr.x + fr.width / 2), y: Math.round(fr.y + fr.height / 2), w: Math.round(fr.width), h: Math.round(fr.height) } : null,
        dot: dr ? { x: Math.round(dr.x + dr.width / 2), y: Math.round(dr.y + dr.height / 2) } : null,
        active: frame?.classList.contains('is-active'),
        opacity: cs?.opacity,
      }
    })

  // 1) alignment in empty space
  await page.mouse.move(400, 300)
  await page.waitForTimeout(900)
  const idle = await measure()

  // 2) hover a nav link
  const link = page.locator('nav a').nth(1)
  const lb = await link.boundingBox()
  await page.mouse.move(lb.x + lb.width / 2, lb.y + lb.height / 2)
  await page.waitForTimeout(900)
  const hover = await measure()

  // 3) move away to empty space
  await page.mouse.move(700, 620)
  await page.waitForTimeout(1100)
  const away = await measure()

  // 4) hover the product mockup then scroll
  await page.evaluate(() => window.scrollTo(0, 700))
  await page.waitForTimeout(900)
  const mock = page.locator('[data-cursor-label]').first()
  const mb = await mock.boundingBox()
  await page.mouse.move(mb.x + mb.width / 2, mb.y + 100)
  await page.waitForTimeout(900)
  const beforeScroll = await measure()
  await page.mouse.wheel(0, 400)
  await page.waitForTimeout(1200)
  const afterScroll = await measure()

  console.log(
    JSON.stringify(
      { pointer: { idle: [400, 300], hoverLink: [Math.round(lb.x + lb.width / 2), Math.round(lb.y + lb.height / 2)], away: [700, 620] }, idle, hover, away, beforeScroll, afterScroll },
      null,
      2
    )
  )
  await browser.close()
})()
