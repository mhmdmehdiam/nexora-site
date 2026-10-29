'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { prefersReduced, ensureGsap } from './kit'
import { Ambient } from './global'

const useIso = typeof window !== 'undefined' ? useLayoutEffect : useEffect

/**
 * MotionPage — the one wrapper a page needs.
 *
 * Server components can stay server components: they render plain HTML with
 * `data-mv*` markers, and this client wrapper walks its own subtree once on
 * mount and wires the timeline. No marker is required — a page wrapped with
 * no markers still gets the ambient layer and the page entrance.
 *
 * Markers
 *   data-mv              fade + rise on scroll (value = extra delay, seconds)
 *   data-mv="clip"       baseline clip wipe, for headlines
 *   data-mv="hero"       entrance choreography, plays immediately
 *   data-mv-parallax     gentle scrubbed parallax (value = strength)
 *   data-mv-stagger      cascade the element's direct children
 *
 * Everything stays visible without JS: the animations set `autoAlpha` FROM 0,
 * they never leave content at 0 if the script fails to run.
 */
export function MotionPage({
  children,
  ambient = true,
  className = '',
}: {
  children: React.ReactNode
  ambient?: boolean
  className?: string
}) {
  const root = useRef<HTMLDivElement>(null)

  useIso(() => {
    const el = root.current
    if (!el) return
    if (prefersReduced()) return
    ensureGsap()

    const ctx = gsap.context(() => {
      /* hero — plays on mount, not on scroll */
      const hero = el.querySelectorAll<HTMLElement>('[data-mv="hero"]')
      if (hero.length) {
        gsap.fromTo(
          hero,
          { autoAlpha: 0, y: 26 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.95,
            stagger: 0.09,
            delay: 0.12,
            ease: 'power3.out',
            clearProps: 'transform',
          }
        )
      }

      /* clip — headline wipe */
      el.querySelectorAll<HTMLElement>('[data-mv="clip"]').forEach((node) => {
        const delay = Number(node.dataset.mvDelay || 0)
        gsap.fromTo(
          node,
          { clipPath: 'inset(0 0 105% 0)', yPercent: 10, autoAlpha: 0 },
          {
            clipPath: 'inset(0 0 -5% 0)',
            yPercent: 0,
            autoAlpha: 1,
            duration: 1.05,
            delay,
            ease: 'power4.out',
            clearProps: 'clipPath,transform',
            scrollTrigger: { trigger: node, start: 'top 92%', once: true },
          }
        )
      })

      /* default reveal */
      el.querySelectorAll<HTMLElement>('[data-mv]').forEach((node) => {
        const kind = node.dataset.mv
        if (kind === 'clip' || kind === 'hero') return
        const delay = Number(kind || 0)
        gsap.fromTo(
          node,
          { autoAlpha: 0, y: 30 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.9,
            delay,
            ease: 'power3.out',
            clearProps: 'transform',
            scrollTrigger: { trigger: node, start: 'top 90%', once: true },
          }
        )
      })

      /* stagger groups */
      el.querySelectorAll<HTMLElement>('[data-mv-stagger]').forEach((node) => {
        const items = Array.from(node.children) as HTMLElement[]
        if (!items.length) return
        const step = Number(node.dataset.mvStagger || 0.07)
        gsap.fromTo(
          items,
          { autoAlpha: 0, y: 30 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.85,
            stagger: step,
            ease: 'power3.out',
            clearProps: 'transform',
            scrollTrigger: { trigger: node, start: 'top 88%', once: true },
          }
        )
      })

      /* parallax */
      el.querySelectorAll<HTMLElement>('[data-mv-parallax]').forEach((node) => {
        const strength = Number(node.dataset.mvParallax || 5)
        gsap.fromTo(
          node,
          { yPercent: -strength },
          {
            yPercent: strength,
            ease: 'none',
            scrollTrigger: {
              trigger: node,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          }
        )
      })
    }, el)

    // Fonts landing late change every measurement ScrollTrigger took.
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => ScrollTrigger.refresh()).catch(() => {})
    }

    return () => ctx.revert()
  }, [])

  return (
    <div ref={root} className={`relative ${className}`}>
      {ambient && <Ambient />}
      <div className="relative z-10">{children}</div>
    </div>
  )
}
