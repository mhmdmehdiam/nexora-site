'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const useIso = typeof window !== 'undefined' ? useLayoutEffect : useEffect

/**
 * Editorial motion for the CMS surfaces (blog index, article, product page).
 *
 * Server components render the HTML; this client wrapper scans its subtree
 * for markers and wires GSAP + ScrollTrigger:
 *
 *   data-cm              → fade + rise reveal when scrolled into view
 *   data-cm="clip"       → baseline clip wipe, for display headlines
 *   data-cm-stagger      → cascade the element's direct children
 *   data-cm-parallax     → gentle vertical parallax (scrubbed both ways)
 *
 * Content stays visible if JS/motion is unavailable.
 */
export function ContentMotion({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useIso(() => {
    const root = ref.current
    if (!root) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.registerPlugin(ScrollTrigger)

    const ctx = gsap.context(() => {
      /* headlines first — they own the first beat of every CMS page */
      root.querySelectorAll<HTMLElement>('[data-cm="clip"]').forEach((el) => {
        gsap.fromTo(
          el,
          { clipPath: 'inset(0 0 105% 0)', yPercent: 10, autoAlpha: 0 },
          {
            clipPath: 'inset(0 0 -5% 0)',
            yPercent: 0,
            autoAlpha: 1,
            duration: 1.05,
            ease: 'power4.out',
            clearProps: 'clipPath,transform',
            scrollTrigger: { trigger: el, start: 'top 92%', once: true },
          }
        )
      })

      root.querySelectorAll<HTMLElement>('[data-cm]').forEach((el, i) => {
        if (el.dataset.cm === 'clip') return
        gsap.fromTo(
          el,
          { autoAlpha: 0, y: 36 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.95,
            delay: (i % 3) * 0.06,
            ease: 'power3.out',
            clearProps: 'transform',
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          }
        )
      })

      root.querySelectorAll<HTMLElement>('[data-cm-stagger]').forEach((el) => {
        const items = Array.from(el.children) as HTMLElement[]
        if (!items.length) return
        gsap.fromTo(
          items,
          { autoAlpha: 0, y: 30 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.85,
            stagger: 0.07,
            ease: 'power3.out',
            clearProps: 'transform',
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          }
        )
      })

      root.querySelectorAll<HTMLElement>('[data-cm-parallax]').forEach((el) => {
        gsap.fromTo(
          el,
          { yPercent: -5 },
          {
            yPercent: 5,
            ease: 'none',
            scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
          }
        )
      })
    }, root)

    // Persian webfonts land after hydration and change every measurement.
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => ScrollTrigger.refresh()).catch(() => {})
    }

    return () => ctx.revert()
  }, [])

  return <div ref={ref}>{children}</div>
}
