'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const useIso = typeof window !== 'undefined' ? useLayoutEffect : useEffect

let registered = false
function ensure() {
  if (registered) return
  gsap.registerPlugin(ScrollTrigger)
  registered = true
}

function reduced() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Fade + rise on scroll. Content stays visible if JS/motion is unavailable. */
export function Reveal({
  children,
  delay = 0,
  y = 26,
  className = '',
  as: Tag = 'div',
}: {
  children: React.ReactNode
  delay?: number
  y?: number
  className?: string
  as?: any
}) {
  const ref = useRef<HTMLElement>(null)

  useIso(() => {
    const el = ref.current
    if (!el || reduced()) return
    ensure()
    const tween = gsap.fromTo(
      el,
      { autoAlpha: 0, y },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.95,
        delay,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      }
    )
    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [delay, y])

  return (
    <Tag ref={ref as any} className={className}>
      {children}
    </Tag>
  )
}

/** Word-by-word rise, used for large display headlines. */
export function SplitRise({
  text,
  className = '',
  delay = 0,
  stagger = 0.055,
}: {
  text: string
  className?: string
  delay?: number
  stagger?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)

  useIso(() => {
    const el = ref.current
    if (!el || reduced()) return
    ensure()
    const words = el.querySelectorAll<HTMLElement>('[data-word]')
    const tween = gsap.fromTo(
      words,
      { yPercent: 115, opacity: 0 },
      {
        yPercent: 0,
        opacity: 1,
        duration: 1.05,
        delay,
        stagger,
        ease: 'power4.out',
      }
    )
    return () => {
      tween.kill()
    }
  }, [text, delay, stagger])

  return (
    <span ref={ref} className={className}>
      {text.split(' ').map((w, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom">
          <span data-word className="inline-block">
            {w}
            {i < text.split(' ').length - 1 ? '\u00A0' : ''}
          </span>
        </span>
      ))}
    </span>
  )
}

/** Counts up when scrolled into view. */
export function Counter({
  end,
  suffix = '',
  duration = 1.8,
  className = '',
}: {
  end: number
  suffix?: string
  duration?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)

  useIso(() => {
    const el = ref.current
    if (!el) return
    const render = (v: number) => {
      el.textContent = new Intl.NumberFormat('fa-IR').format(Math.round(v)) + suffix
    }
    if (reduced()) {
      render(end)
      return
    }
    ensure()
    const obj = { v: 0 }
    const tween = gsap.to(obj, {
      v: end,
      duration,
      ease: 'power2.out',
      onUpdate: () => render(obj.v),
      // 'top bottom' fires as soon as the element is anywhere in view, so the
      // hero counters start counting even when they sit right at the fold.
      scrollTrigger: { trigger: el, start: 'top bottom', once: true },
    })
    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [end, suffix, duration])

  return (
    <span ref={ref} className={`inline-block ${className}`} dir="ltr" aria-label={String(end) + suffix}>
      ۰
    </span>
  )
}

/** Subtle vertical parallax driven by scroll. */
export function Parallax({
  children,
  strength = 40,
  className = '',
}: {
  children: React.ReactNode
  strength?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useIso(() => {
    const el = ref.current
    if (!el || reduced()) return
    ensure()
    const tween = gsap.fromTo(
      el,
      { yPercent: -strength / 10 },
      {
        yPercent: strength / 10,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
      }
    )
    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [strength])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
