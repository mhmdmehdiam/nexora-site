/**
 * Reference-site study: scroll endurosat.com/space-service/ and
 * carterogunsola.com, screenshotting at intervals + logging the DOM
 * motion tech each uses (canvas, webgl, video, transform-heavy nodes).
 */
const PW =
  'C:/Users/TA/.workbuddy-ai/binaries/node/versions/22.22.2-6/node_modules/@playwright/cli/node_modules/playwright-core'
const { chromium } = require(PW)

async function study(browser, url, tag, stops) {
  const c = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const p = await c.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))

  try {
    await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
  } catch {
    await p.waitForTimeout(5000)
  }
  await p.waitForTimeout(4000)

  // tech fingerprint
  const tech = await p.evaluate(() => {
    const q = (s) => document.querySelectorAll(s).length
    return {
      canvas: q('canvas'),
      webgl: [...document.querySelectorAll('canvas')].some(
        (c) => c.getContext('webgl2') || c.getContext('webgl')
      ),
      videos: q('video'),
      gsap: typeof window.gsap !== 'undefined' || !!window.ScrollTrigger,
      three: typeof window.THREE !== 'undefined' || !!window.__THREE__,
      framer: q('[data-framer-appear-id], [data-projection-id]'),
      lenis: !!document.querySelector('html.lenis, [data-lenis]'),
      sections: q('section'),
      h1: document.querySelector('h1')?.textContent?.slice(0, 60),
      sticky: [...document.querySelectorAll('*')].filter((el) =>
        ['sticky', 'fixed'].includes(getComputedStyle(el).position)
      ).length,
    }
  })
  console.log(`\n===== ${tag} =====`)
  console.log('tech:', JSON.stringify(tech))

  // scroll stops
  const H = await p.evaluate(() => document.body.scrollHeight)
  for (let i = 0; i < stops; i++) {
    const y = Math.round(((H - 900) / (stops - 1)) * i)
    await p.evaluate((yy) => window.scrollTo(0, yy), y)
    await p.waitForTimeout(1600)
    await p.screenshot({ path: `.preview/refs/${tag}-${String(i).padStart(2, '0')}.png` })
  }

  // headings + section texts for structure
  const outline = await p.evaluate(() =>
    [...document.querySelectorAll('h1,h2,h3')]
      .slice(0, 14)
      .map((h) => `${h.tagName}: ${h.textContent.trim().slice(0, 70)}`)
  )
  console.log('outline:', JSON.stringify(outline, null, 1))
  if (errs.length) console.log('pageerrors:', JSON.stringify(errs.slice(0, 3)))
  await c.close()
}

;(async () => {
  const b = await chromium.launch({ headless: true })
  await study(b, 'https://www.endurosat.com/space-service/', 'enduro', 6)
  await study(b, 'https://carterogunsola.com/', 'carter', 6)
  await b.close()
  console.log('\nDONE')
})()
