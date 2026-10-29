'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import gsap from 'gsap'
import { prefersReduced, ensureGsap } from './kit'
import { SmoothScroll } from '@/components/site/smooth-scroll'
import { Cursor } from '@/components/site/cursor'

/* ---------------------------------------------------------------------------
 * Route classes.
 *
 * /admin is the operator console: no decorative motion, ever. It is a dense
 * form surface and every animation there is a delay between the operator and
 * the number they are trying to read.
 *
 * /dashboard is a work surface too, so it gets the page transition and the
 * scroll bar but NOT the custom cursor or the inertial scroll — chasing a
 * lagging pointer across a data table is the opposite of useful.
 * ------------------------------------------------------------------------- */
export function isAdminPath(pathname: string): boolean {
  return pathname.startsWith('/admin')
}

export function isMarketingPath(pathname: string): boolean {
  if (isAdminPath(pathname)) return false
  if (pathname.startsWith('/dashboard')) return false
  if (pathname.startsWith('/billing')) return false
  return true
}

/* ---------------------------------------------------------------------------
 * Ambient — the atmosphere every marketing page shares.
 *
 * Two slow aurora fields and one hairline that sweeps the viewport every
 * twelve seconds. CSS only: no JS, no layout, no paint cost beyond a blurred
 * gradient, and it stops dead under prefers-reduced-motion.
 * ------------------------------------------------------------------------- */
export function Ambient({ className = '' }: { className?: string }) {
  return (
    <div className={`mv-ambient ${className}`} aria-hidden="true">
      <div className="mv-aurora mv-aurora-a" />
      <div className="mv-aurora mv-aurora-b" />
      <div className="mv-scan" />
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * ScrollProgress — a sand hairline that fills as the page is read.
 *
 * Written straight to the element's transform inside rAF; no React state, so
 * it never re-renders the tree while scrolling.
 * ------------------------------------------------------------------------- */
export function ScrollProgress() {
  const bar = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = bar.current
    if (!el) return

    let frame = 0
    const paint = () => {
      frame = 0
      const doc = document.documentElement
      const max = doc.scrollHeight - doc.clientHeight
      const p = max > 4 ? doc.scrollTop / max : 0
      el.style.transform = `scaleX(${Math.min(1, Math.max(0, p))})`
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(paint)
    }

    paint()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div className="mv-progress" aria-hidden="true">
      <div ref={bar} className="mv-progress-bar" />
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * PageTransition — a themed curtain that wipes across on every route change.
 *
 * The panel is the page's own background colour with a sand leading edge, so
 * it reads as the page folding over rather than a loading screen. Direction
 * follows RTL: in from the right, out to the left.
 *
 * Skipped on the first paint (the landing intro owns that moment) and under
 * prefers-reduced-motion.
 * ------------------------------------------------------------------------- */
export function PageTransition() {
  const pathname = usePathname()
  const panel = useRef<HTMLDivElement>(null)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const el = panel.current
    if (!el) return
    if (isAdminPath(pathname)) return
    if (prefersReduced()) return

    ensureGsap()
    gsap.killTweensOf(el)

    const tl = gsap.timeline({
      onComplete: () => gsap.set(el, { autoAlpha: 0 }),
    })
    gsap.set(el, { autoAlpha: 1, clipPath: 'inset(0 0 0 100%)' })
    tl.to(el, { clipPath: 'inset(0 0 0 0%)', duration: 0.38, ease: 'power3.inOut' })
      .to(el, { clipPath: 'inset(0 100% 0 0%)', duration: 0.46, ease: 'power3.inOut' }, '+=0.04')

    return () => {
      tl.kill()
    }
  }, [pathname])

  return <div ref={panel} className="mv-transition" aria-hidden="true" />
}

/* ---------------------------------------------------------------------------
 * GlobalMotion — mounted once in the root layout.
 * ------------------------------------------------------------------------- */
export function GlobalMotion() {
  const pathname = usePathname()
  const marketing = isMarketingPath(pathname)
  const admin = isAdminPath(pathname)

  if (admin) return null

  return (
    <>
      <ScrollProgress />
      <PageTransition />
      {marketing && (
        <>
          <SmoothScroll />
          <Cursor />
        </>
      )}
    </>
  )
}
