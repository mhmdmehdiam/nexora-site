const PW = 'C:/Users/TA/.workbuddy-ai/binaries/node/versions/22.22.2-6/node_modules/@playwright/cli/node_modules/playwright-core'
const { chromium } = require(PW)

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  await page.goto('http://localhost:3100/', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(5000)

  const read = () =>
    page.evaluate(() => {
      const f = document.querySelector('.cursor-frame').getBoundingClientRect()
      const d = document.querySelector('.cursor-dot').getBoundingClientRect()
      const fr = document.querySelector('.cursor-frame')
      return {
        frame: [Math.round(f.x + f.width / 2), Math.round(f.y + f.height / 2), Math.round(f.width), Math.round(f.height)],
        dot: [Math.round(d.x + d.width / 2), Math.round(d.y + d.height / 2)],
        dotSize: [Math.round(d.width), Math.round(d.height)],
        active: fr.classList.contains('is-active'),
      }
    })

  const out = {}

  // 1) hover a nav link, exactly at its centre
  const link = page.locator('nav a').nth(2)
  const lb = await link.boundingBox()
  await page.mouse.move(lb.x + lb.width / 2, lb.y + lb.height / 2)
  await page.waitForTimeout(900)
  out.hoverCentre = { pointer: [Math.round(lb.x + lb.width / 2), Math.round(lb.y + lb.height / 2)], ...(await read()) }

  // 2) hover the same link near its edge
  await page.mouse.move(lb.x + 4, lb.y + 4)
  await page.waitForTimeout(900)
  out.hoverEdge = { pointer: [Math.round(lb.x + 4), Math.round(lb.y + 4)], ...(await read()) }

  // 3) hover a link, then wheel-scroll while the pointer stays put
  await page.mouse.move(lb.x + lb.width / 2, lb.y + lb.height / 2)
  await page.waitForTimeout(600)
  await page.mouse.wheel(0, 500)
  await page.waitForTimeout(1200)
  out.scrollWhileHover = {
    pointer: [Math.round(lb.x + lb.width / 2), Math.round(lb.y + lb.height / 2)],
    scrollY: await page.evaluate(() => Math.round(window.scrollY)),
    ...(await read()),
  }

  // 4) after that scroll, what element is actually under the pointer?
  out.underPointer = await page.evaluate(([x, y]) => {
    const el = document.elementFromPoint(x, y)
    return el ? { tag: el.tagName, cls: (el.className || '').toString().slice(0, 40), text: (el.textContent || '').trim().slice(0, 24) } : null
  }, [Math.round(lb.x + lb.width / 2), Math.round(lb.y + lb.height / 2)])

  console.log(JSON.stringify(out, null, 2))
  await browser.close()
})()
