const PW = 'C:/Users/TA/.workbuddy-ai/binaries/node/versions/22.22.2-6/node_modules/@playwright/cli/node_modules/playwright-core'
const { chromium } = require(PW)

const FONTS = `
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=IBM+Plex+Mono:wght@400;500&display=swap">
`

const ogHtml = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8">${FONTS}
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:1200px;height:630px;background:#0A0A0B;font-family:Vazirmatn,sans-serif;
       color:#F7F5F0;position:relative;overflow:hidden;display:flex;flex-direction:column;
       justify-content:space-between;padding:72px 80px}
  .grid{position:absolute;inset:0;opacity:.6;
    background-image:linear-gradient(rgba(247,245,240,.035) 1px,transparent 1px),
                     linear-gradient(90deg,rgba(247,245,240,.035) 1px,transparent 1px);
    background-size:88px 88px;
    mask-image:radial-gradient(ellipse 80% 60% at 50% 10%,black 20%,transparent 75%);
    -webkit-mask-image:radial-gradient(ellipse 80% 60% at 50% 10%,black 20%,transparent 75%)}
  .glow{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 0%,rgba(201,183,156,.16),transparent 55%)}
  .top{display:flex;align-items:center;justify-content:space-between;position:relative;z-index:2}
  .brand{display:flex;align-items:center;gap:10px}
  .dot{width:8px;height:8px;background:#C9B79C}
  .word{font-family:'Instrument Serif',serif;font-style:italic;font-size:30px}
  .mono{font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:.22em;color:#6E685B}
  h1{font-size:86px;font-weight:900;line-height:1.02;letter-spacing:-.03em;position:relative;z-index:2}
  h1 span{color:#C9B79C}
  .sub{font-size:19px;color:#918A7B;margin-top:22px;position:relative;z-index:2;line-height:1.7;max-width:760px}
  .bot{display:flex;align-items:flex-end;justify-content:space-between;position:relative;z-index:2}
  .rule{height:1px;background:rgba(247,245,240,.14);width:100%;position:absolute;bottom:118px;right:80px;left:80px}
  .stats{display:flex;gap:56px;font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.14em;color:#5F5E5A}
</style></head><body>
  <div class="glow"></div><div class="grid"></div>
  <div class="top">
    <div class="brand"><span class="dot"></span><span class="word">Nexora</span></div>
    <div class="mono">PLATFORM / 2026</div>
  </div>
  <div>
    <h1>فروشت را <span>هوشمند</span><br>مدیریت کن</h1>
    <p class="sub">مدیریت فروش، مشتری و موجودی — با تحلیل هوشمند و گزارش‌های زنده.</p>
  </div>
  <div class="bot">
    <div class="stats"><span>2000+ BUSINESS</span><span>99.9% UPTIME</span><span>24/7 DATA</span></div>
    <div class="mono">nexora.ir</div>
  </div>
</body></html>`

const iconHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">${FONTS}
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:180px;height:180px;background:#0A0A0B;display:flex;align-items:center;
       justify-content:center;position:relative;overflow:hidden}
  .n{font-family:'Instrument Serif',serif;font-style:italic;font-size:104px;color:#F7F5F0;line-height:1}
  .bar{position:absolute;bottom:34px;left:50%;transform:translateX(-50%);width:34px;height:4px;background:#C9B79C}
</style></head><body><div class="n">N</div><div class="bar"></div></body></html>`

;(async () => {
  const browser = await chromium.launch({ headless: true })

  const og = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
  await og.setContent(ogHtml, { waitUntil: 'networkidle' })
  await og.evaluate(() => document.fonts.ready)
  await og.waitForTimeout(900)
  await og.screenshot({ path: 'D:/Projects/project4/public/og.png' })

  const icon = await browser.newPage({ viewport: { width: 180, height: 180 }, deviceScaleFactor: 1 })
  await icon.setContent(iconHtml, { waitUntil: 'networkidle' })
  await icon.evaluate(() => document.fonts.ready)
  await icon.waitForTimeout(700)
  await icon.screenshot({ path: 'D:/Projects/project4/public/apple-icon.png' })

  await browser.close()
  console.log('ok')
})()
