/** Deep DOM probe: extract motion patterns from the two reference sites. */
const PW =
  'C:/Users/TA/.workbuddy-ai/binaries/node/versions/22.22.2-6/node_modules/@playwright/cli/node_modules/playwright-core'
const { chromium } = require(PW)

async function probe(browser, url, tag) {
  const c = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const p = await c.newPage()
  try {
    await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
  } catch {}
  await p.waitForTimeout(4000)

  const data = await p.evaluate(() => {
    const pick = (el) => {
      const cs = getComputedStyle(el)
      return {
        bg: cs.backgroundColor,
        color: cs.color,
        fs: cs.fontSize,
        pos: cs.position,
        radius: cs.borderRadius,
      }
    }
    // sticky/fixed elements — the pinned storytelling units
    const pinned = [...document.querySelectorAll('*')]
      .filter((el) => ['sticky', 'fixed'].includes(getComputedStyle(el).position))
      .slice(0, 10)
      .map((el) => ({ tag: el.tagName, cls: String(el.className).slice(0, 80), ...pick(el) }))

    // canvases — where is webgl used
    const canvases = [...document.querySelectorAll('canvas')].map((c) => {
      const r = c.getBoundingClientRect()
      const wrap = c.closest('section,div')
      return {
        size: [Math.round(r.width), Math.round(r.height)],
        fixed: getComputedStyle(c).position,
        parent: wrap ? String(wrap.className).slice(0, 60) : null,
      }
    })

    // big display numbers / progress UI
    const counters = [...document.querySelectorAll('*')].filter((el) =>
      /^\s*[\d.,]+\s*(%|\+|k)?\s*$/i.test(el.textContent || '') && el.children.length === 0
    ).slice(0, 8).map((el) => el.textContent.trim())

    // background images / gradients on sections
    const sections = [...document.querySelectorAll('section')].slice(0, 12).map((s) => {
      const cs = getComputedStyle(s)
      return { bg: cs.backgroundImage.slice(0, 60) || cs.backgroundColor, h: Math.round(s.getBoundingClientRect().height) }
    })

    // any marquee / infinite loops
    const marquees = [...document.querySelectorAll('*')].filter((el) => {
      const a = getComputedStyle(el).animationName
      return a && /marquee|scroll|infinite|loop/i.test(a)
    }).length

    return { pinned, canvases, counters, sections: sections.slice(0, 8), marquees }
  })

  console.log(`\n===== ${tag} =====`)
  console.log(JSON.stringify(data, null, 1))
  await c.close()
}

;(async () => {
  const b = await chromium.launch({ headless: true })
  await probe(b, 'https://www.endurosat.com/space-service/', 'ENDURO')
  await probe(b, 'https://carterogunsola.com/', 'CARTER')
  await b.close()
})()
