'use client'

import { useEffect, useRef, useState } from 'react'

/* ------------------------------------------------------------------ */
/*  Intro curtain — the landing's opening language, one session only   */
/* ------------------------------------------------------------------ */

/**
 * Short dramatic opener for /register: ink curtain with the serif wordmark
 * and a growing sand hairline, then the curtain lifts. Runs once per
 * browser session; skipped entirely for reduced motion. Calls `onLift`
 * the moment the curtain starts moving so the page choreography can begin.
 */
export function RegisterIntro({ onLift }: { onLift: () => void }) {
  const [show, setShow] = useState(false)
  const [lifting, setLifting] = useState(false)
  const [pct, setPct] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    // React StrictMode double-invokes effects: the first pass schedules the
    // sequence, its cleanup would cancel it, and the second pass would see
    // the sessionStorage flag and skip — leaving the curtain stuck. So the
    // one-shot timers are deliberately fire-and-forget (no cleanup): the ref
    // guard makes the whole sequence run exactly once per mount.
    if (started.current) return
    started.current = true

    if (sessionStorage.getItem('nx_reg_seen')) {
      onLift()
      return
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onLift()
      return
    }
    sessionStorage.setItem('nx_reg_seen', '1')
    setShow(true)

    // 0 → 100 Persian counter, same language as the landing preloader
    const t0 = performance.now()
    const DUR = 800
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / DUR)
      setPct(Math.round(p * 100))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    setTimeout(() => setLifting(true), 900)
    setTimeout(onLift, 1000)
    setTimeout(() => setShow(false), 1950)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!show) return null

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[400] flex flex-col items-center justify-center bg-ink-950 transition-transform duration-[900ms] ease-[cubic-bezier(0.76,0,0.24,1)] ${
        lifting ? '-translate-y-full' : ''
      }`}
    >
      <span className="font-serif text-[40px] italic leading-none text-ink-50">Nexora</span>
      <span
        className="mt-5 block h-px origin-left bg-sand/70 transition-[width] duration-150 ease-linear"
        style={{ width: `${pct}%`, maxWidth: 160 }}
      />
      <div className="mt-4 flex items-baseline gap-1" dir="ltr">
        <span className="font-mono text-[13px] tabular-nums text-sand">
          {new Intl.NumberFormat('fa-IR').format(pct)}
        </span>
        <span className="font-mono text-[9px] text-ink-600">٪</span>
      </div>
      <span className="mt-3 font-mono text-[9px] uppercase tracking-[0.22em] text-ink-600">
        create your space
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Ambient backdrop                                                    */
/* ------------------------------------------------------------------ */

const PARTICLES = [
  { left: 6, dur: 17, delay: 0, size: 3 },
  { left: 13, dur: 22, delay: 4, size: 4 },
  { left: 21, dur: 19, delay: 9, size: 3 },
  { left: 28, dur: 24, delay: 2, size: 4 },
  { left: 36, dur: 18, delay: 12, size: 3 },
  { left: 44, dur: 21, delay: 6, size: 4 },
  { left: 52, dur: 20, delay: 14, size: 3 },
  { left: 61, dur: 23, delay: 1, size: 4 },
  { left: 69, dur: 18, delay: 8, size: 3 },
  { left: 77, dur: 22, delay: 5, size: 4 },
  { left: 84, dur: 19, delay: 11, size: 3 },
  { left: 91, dur: 21, delay: 3, size: 4 },
  { left: 96, dur: 24, delay: 10, size: 3 },
]

/**
 * Bold ambient backdrop: bright drifting sand orbs, rising particles, a
 * giant outlined vertical watermark, scanning hairlines, corner brackets
 * and a soft pointer parallax. Fully decorative.
 */
export function RegisterDecor() {
  const layerRef = useRef<HTMLDivElement>(null)
  const [parallax, setParallax] = useState(false)

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setParallax(true)
  }, [])

  useEffect(() => {
    if (!parallax) return
    const layer = layerRef.current
    if (!layer) return

    let raf = 0
    let tx = 0
    let ty = 0
    let x = 0
    let y = 0

    const onMove = (e: MouseEvent) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1
      ty = (e.clientY / window.innerHeight) * 2 - 1
    }

    const loop = () => {
      x += (tx - x) * 0.04
      y += (ty - y) * 0.04
      layer.style.transform = `translate3d(${x * 26}px, ${y * 20}px, 0)`
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    window.addEventListener('mousemove', onMove, { passive: true })

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
    }
  }, [parallax])

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* aurora washes — warm, slow, alive */}
      <div
        className="reg-aurora left-[-10%] top-[-15%] h-[560px] w-[560px]"
        style={{
          background: 'radial-gradient(circle, rgba(201,183,156,0.16), transparent 70%)',
          animation: 'aurora-a 16s ease-in-out infinite',
        }}
      />
      <div
        className="reg-aurora bottom-[-20%] right-[-8%] h-[640px] w-[640px]"
        style={{
          background: 'radial-gradient(circle, rgba(146,140,108,0.14), transparent 70%)',
          animation: 'aurora-b 19s ease-in-out infinite',
        }}
      />

      {/* drifting sand orbs — brighter than before */}
      <div ref={layerRef} className="absolute inset-[-60px]" style={{ willChange: 'transform' }}>
        <div
          className="reg-orb absolute -top-28 right-[6%] h-[480px] w-[480px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(201,183,156,0.24), transparent 65%)',
            filter: 'blur(6px)',
          }}
        />
        <div
          className="reg-orb absolute bottom-[-140px] left-[2%] h-[560px] w-[560px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(201,183,156,0.18), transparent 62%)',
            filter: 'blur(10px)',
            animationDelay: '-5.5s',
          }}
        />
        <div
          className="reg-orb absolute left-[42%] top-[38%] h-[300px] w-[300px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(201,183,156,0.12), transparent 60%)',
            filter: 'blur(14px)',
            animationDelay: '-3s',
          }}
        />

        {/* giant vertical watermark riding the parallax layer */}
        <span
          className="reg-watermark absolute left-[-14px] top-1/2 -translate-y-1/2 font-serif italic"
          style={{ writingMode: 'vertical-rl', fontSize: 'clamp(90px, 12vw, 170px)', letterSpacing: '0.08em' }}
        >
          Nexora
        </span>
      </div>

      {/* rising sand particles */}
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="reg-particle"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            ['--dur' as any]: `${p.dur}s`,
            animationDelay: `-${p.delay}s`,
          }}
        />
      ))}

      {/* vertical hairlines with a scanning shimmer */}
      {[18, 50, 82].map((left, i) => (
        <div
          key={left}
          className="absolute top-0 h-full w-px bg-ink-100/[0.06]"
          style={{ left: `${left}%` }}
        >
          <div
            className="reg-scan absolute left-0 h-28 w-px"
            style={{
              background:
                'linear-gradient(to bottom, transparent, rgba(201,183,156,0.6), transparent)',
              animationDelay: `${i * 3.2}s`,
            }}
          />
        </div>
      ))}

      {/* corner brackets — the site's selection-tool motif */}
      <span className="absolute left-6 top-6 h-5 w-5 border-l border-t border-ink-100/20" />
      <span className="absolute right-6 top-6 h-5 w-5 border-r border-t border-ink-100/20" />
      <span className="absolute bottom-6 left-6 h-5 w-5 border-b border-l border-ink-100/20" />
      <span className="absolute bottom-6 right-6 h-5 w-5 border-b border-r border-ink-100/20" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Live activity feed                                                  */
/* ------------------------------------------------------------------ */

const FEED_LINES = [
  'فروشگاه پارسیان — اولین فاکتورش را زد',
  'دیجی‌لند — ۳ محصول جدید اضافه کرد',
  'مُدا استایل — مشتری شماره ۱۰۰ ثبت شد',
  'بوتیک آفتاب — فروش امروز: ۴٫۲ میلیون',
  'کافیه لمیز — یادآور پرداخت ارسال شد',
  'لوازم یدکی مرکزی — موجودی به‌روز شد',
  'گالری مهر — پرداخت کامل ثبت شد',
]

/**
 * Terminal-style activity feed (the funtech boot-text motif, in our
 * language): mono lines that fade in one after another, forever.
 * Reduced motion / no-JS → a quiet static line.
 */
export function LiveFeed() {
  const [idx, setIdx] = useState(0)
  const [on, setOn] = useState(true)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setOn(false)
      return
    }
    const t = setInterval(() => setIdx((i) => (i + 1) % FEED_LINES.length), 4800)
    return () => clearInterval(t)
  }, [])

  const line = FEED_LINES[idx % FEED_LINES.length]

  return (
    <div className="border-t border-ink-100/[0.08] pt-5">
      <div className="mb-2.5 flex items-center gap-2.5">
        <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sand opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sand" />
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-600">
          live — همین حالا در نکسورا
        </span>
      </div>
      <p
        key={idx}
        className={
          on
            ? 'feed-line font-mono text-[11.5px] text-ink-500'
            : 'font-mono text-[11.5px] text-ink-500'
        }
        aria-live="off"
      >
        {on ? `> ${line}` : '> ۲٬۰۰۰+ کسب‌وکار همین حالا با نکسورا می‌فروشند'}
      </p>
    </div>
  )
}
