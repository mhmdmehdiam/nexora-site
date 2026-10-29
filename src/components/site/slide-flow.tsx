'use client'

import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/**
 * Chapter deck — the endurosat/carter pattern.
 *
 * Every section marked [data-chapter] is a full-viewport scene. On desktop,
 * each scene pins at the top and the NEXT scene slides up over it
 * (pinSpacing: false → no layout holes), rising slightly as it sweeps in.
 * Scrolling back un-pins in reverse. Sections keep solid ink backgrounds so
 * the overlap reads as a clean slide swap; hero and the final CTA stay
 * transparent so the particle field opens and closes the journey.
 * Mobile (<1024px) flows normally — pinning large content there would trap
 * it above the fold.
 */
export function ChapterDeck() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.registerPlugin(ScrollTrigger)

    const mm = gsap.matchMedia()
    mm.add('(min-width: 1024px)', () => {
      const secs = gsap.utils.toArray<HTMLElement>('#main > section[data-chapter]')
      const vh = window.innerHeight

      // tell the particle engine which chapter owns the stage
      secs.forEach((sec, i) => {
        ScrollTrigger.create({
          trigger: sec,
          start: 'top 55%',
          end: 'bottom 45%',
          onToggle: (self) => {
            if (self.isActive) {
              window.dispatchEvent(new CustomEvent('nexora:chapter', { detail: i }))
            }
          },
        })
      })

      secs.forEach((sec, i) => {
        const next = secs[i + 1]
        if (!next) return // the finale flows out naturally

        // pin only scenes that fit the viewport — taller chapters keep
        // scrolling normally so no content is ever trapped above the fold
        if (sec.offsetHeight <= vh + 4) {
          ScrollTrigger.create({
            trigger: sec,
            start: 'top top',
            endTrigger: next,
            end: 'top top',
            pin: sec,
            pinSpacing: false,
            anticipatePin: 1,
          })
        }

        // incoming chapter rises as it sweeps in (scrub: true — Lenis already
        // smooths the input; double-smoothing made content drift after lock) — applied to the inner
        // container, NOT the section, so the pin's start measurement
        // stays exact (a transformed section would shift its own trigger)
        const inner = (Array.from(next.children).find(
          (k) => !(k.className as string).includes('absolute')
        ) as HTMLElement | undefined) || null
        gsap.fromTo(
          inner || next,
          { y: 70 },
          {
            y: 0,
            ease: 'none',
            scrollTrigger: { trigger: next, start: 'top bottom', end: 'top top', scrub: true },
          }
        )

              })
    })

    return () => mm.revert()
  }, [])

  return null
}
