/** Probe emotion-agency.com + hidokmeh.com for creative WebGL/shape techniques. */
const PW =
  'C:/Users/TA/.workbuddy-ai/binaries/node/versions/22.22.2-6/node_modules/@playwright/cli/node_modules/playwright-core'
const { chromium } = require(PW)

;(async () => {
  const b = await chromium.launch({ headless: true })
  const p = await b.newContext({ viewport: { width: 1440, height: 900 } }).then((c) => c.newPage())
  for (const [tag, url] of [
    ['EMOTION', 'https://emotion-agency.com/'],
    ['HIDOKMEH', 'https://hidokmeh.com/'],
  ]) {
    try {
      await p.goto(url, { waitUntil: 'networkidle', timeout: 45000 })
    } catch {
      await p.waitForTimeout(4000)
    }
    await p.waitForTimeout(4000)
    const tech = await p.evaluate(() => {
      const q = (s) => document.querySelectorAll(s).length
      const canvases = [...document.querySelectorAll('canvas')].map((cv) => {
        const r = cv.getBoundingClientRect()
        return { w: Math.round(r.width), h: Math.round(r.height), pos: getComputedStyle(cv).position }
      })
      const gl = [...document.querySelectorAll('canvas')].filter((cv) => {
        try {
          return !!(cv.getContext('webgl2') || cv.getContext('webgl'))
        } catch {
          return false
        }
      }).length
      const html = document.documentElement.outerHTML
      return {
        canvases,
        webglCanvases: gl,
        three: /three|THREE/i.test(html) || !!window.THREE,
        gsap: typeof window.gsap !== 'undefined' || /gsap/i.test(html),
        lenis: /lenis/i.test(html) || !!window.lenis,
        shaderHints: (html.match(/uniform|vertex|fragment|glsl/gi) || []).length,
        svgCount: q('svg'),
        filters: q('filter'),
        gradients: (html.match(/gradient/gi) || []).length,
        videoCount: q('video'),
        bigRadius: (html.match(/border-radius:\s*\d{2,}/gi) || []).length,
        title: document.title.slice(0, 50),
        sections: q('section'),
      }
    })
    console.log('=====', tag, '=====')
    console.log(JSON.stringify(tech, null, 1))
  }
  await b.close()
})()
