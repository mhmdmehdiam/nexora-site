'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/**
 * Motion kit.
 *
 * The house language, in one place:
 *   - things rise and fade, never slide sideways (RTL reads top-down)
 *   - easing is expo/power — fast out, long settle
 *   - sand is the only accent; motion never introduces a new colour
 *   - everything degrades to "visible, just still" under
 *     prefers-reduced-motion, and to plain HTML without JS
 *
 * The older primitives (Reveal/SplitRise/Counter/Parallax) live in
 * components/site/motion and are re-exported here so pages only ever import
 * from one path.
 */

const useIso = typeof window !== 'undefined' ? useLayoutEffect : useEffect

let registered = false
export function ensureGsap() {
  if (registered) return
  gsap.registerPlugin(ScrollTrigger)
  registered = true
}

export function prefersReduced(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export { Reveal, SplitRise, Counter, Parallax } from '@/components/site/motion'

/* ---------------------------------------------------------------------------
 * Stagger — cascade a group of direct children into view.
 *
 * Use for card grids and list blocks. Children keep their own hover
 * transforms because GSAP writes to `y`/`opacity` only, and the wrapper
 * clears the inline transform once the tween lands.
 * ------------------------------------------------------------------------- */
export function Stagger({
  children,
  className = '',
  step = 0.07,
  y = 30,
  duration = 0.85,
  start = 'top 88%',
}: {
  children: React.ReactNode
  className?: string
  step?: number
  y?: number
  duration?: number
  start?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useIso(() => {
    const el = ref.current
    if (!el || prefersReduced()) return
    ensureGsap()
    const items = Array.from(el.children) as HTMLElement[]
    if (!items.length) return

    const tween = gsap.fromTo(
      items,
      { autoAlpha: 0, y },
      {
        autoAlpha: 1,
        y: 0,
        duration,
        stagger: step,
        ease: 'power3.out',
        clearProps: 'transform',
        scrollTrigger: { trigger: el, start, once: true },
      }
    )
    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [step, y, duration, start])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * ClipReveal — a heading wiped in from the baseline.
 *
 * Persian headlines do not split into words cleanly (joined script, mixed
 * direction), so this reveals the block as a unit with a clip-path instead of
 * animating individual glyphs. The result reads as typographic rather than
 * decorative, which is what the editorial direction wants.
 * ------------------------------------------------------------------------- */
export function ClipReveal({
  children,
  className = '',
  delay = 0,
  duration = 1.05,
  as: Tag = 'span',
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  duration?: number
  as?: 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'p'
}) {
  const ref = useRef<HTMLElement>(null)

  useIso(() => {
    const el = ref.current
    if (!el || prefersReduced()) return
    ensureGsap()
    const tween = gsap.fromTo(
      el,
      { clipPath: 'inset(0 0 105% 0)', yPercent: 12, autoAlpha: 0 },
      {
        clipPath: 'inset(0 0 -5% 0)',
        yPercent: 0,
        autoAlpha: 1,
        duration,
        delay,
        ease: 'power4.out',
        clearProps: 'clipPath,transform',
      }
    )
    return () => {
      tween.kill()
    }
  }, [delay, duration])

  return (
    <Tag ref={ref as never} className={className}>
      {children}
    </Tag>
  )
}

/* ---------------------------------------------------------------------------
 * Magnetic — the element leans toward the pointer, then springs home.
 * Pointer-only: touch devices skip it entirely (no hover, no point).
 * ------------------------------------------------------------------------- */
export function Magnetic({
  children,
  className = '',
  strength = 0.25,
  scale = 1.02,
}: {
  children: React.ReactNode
  className?: string
  strength?: number
  scale?: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || prefersReduced()) return
    if (window.matchMedia('(hover: none)').matches) return

    ensureGsap()
    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' })
    const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' })
    const sTo = gsap.quickTo(el, 'scale', { duration: 0.5, ease: 'power3.out' })

    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect()
      xTo((e.clientX - (r.left + r.width / 2)) * strength)
      yTo((e.clientY - (r.top + r.height / 2)) * strength)
    }
    const onEnter = () => sTo(scale)
    const onLeave = () => {
      xTo(0)
      yTo(0)
      sTo(1)
    }

    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseenter', onEnter)
    el.addEventListener('mouseleave', onLeave)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseenter', onEnter)
      el.removeEventListener('mouseleave', onLeave)
    }
  }, [strength, scale])

  return (
    <div ref={ref} className={className} style={{ willChange: 'transform' }}>
      {children}
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * Tilt — 3D card tilt with a sand glare that tracks the pointer.
 *
 * max is deliberately small (6–8deg). Anything more reads as a demo, not a
 * product.
 * ------------------------------------------------------------------------- */
export function Tilt({
  children,
  className = '',
  max = 6,
  glare = true,
}: {
  children: React.ReactNode
  className?: string
  max?: number
  glare?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || prefersReduced()) return
    if (window.matchMedia('(hover: none)').matches) return

    ensureGsap()
    gsap.set(el, { transformPerspective: 900, transformStyle: 'preserve-3d' })
    const rx = gsap.quickTo(el, 'rotationX', { duration: 0.55, ease: 'power3.out' })
    const ry = gsap.quickTo(el, 'rotationY', { duration: 0.55, ease: 'power3.out' })
    const glareEl = glare ? (el.querySelector('[data-tilt-glare]') as HTMLElement | null) : null

    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect()
      const px = (e.clientX - r.left) / r.width
      const py = (e.clientY - r.top) / r.height
      ry((px - 0.5) * max * 2)
      rx(-(py - 0.5) * max * 2)
      if (glareEl) {
        glareEl.style.opacity = '1'
        glareEl.style.background = `radial-gradient(circle at ${px * 100}% ${py * 100}%, rgb(var(--sand) / 0.16), transparent 55%)`
      }
    }
    const onLeave = () => {
      rx(0)
      ry(0)
      if (glareEl) glareEl.style.opacity = '0'
    }

    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
    }
  }, [max, glare])

  return (
    <div ref={ref} className={`relative ${className}`} style={{ willChange: 'transform' }}>
      {children}
      {glare && (
        <div
          data-tilt-glare
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-500"
        />
      )}
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * Marquee — an infinite strip.
 *
 * Pure CSS: the track is rendered twice and translated by exactly -50%, so the
 * loop is seamless at any width and costs no JS. `direction: ltr` on the track
 * keeps the maths independent of the page's RTL flow.
 * ------------------------------------------------------------------------- */
export function Marquee({
  children,
  className = '',
  speed = 32,
  reverse = false,
  pauseOnHover = true,
}: {
  children: React.ReactNode
  className?: string
  speed?: number
  reverse?: boolean
  pauseOnHover?: boolean
}) {
  return (
    <div
      className={`mv-marquee ${pauseOnHover ? 'mv-marquee-pause' : ''} ${className}`}
      style={{ ['--mv-speed' as string]: `${speed}s` }}
    >
      <div className={`mv-marquee-track ${reverse ? 'mv-marquee-rev' : ''}`} dir="ltr">
        <div className="mv-marquee-group">{children}</div>
        <div className="mv-marquee-group" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * CountUp — integer count-up, Persian digits, fires when scrolled into view.
 *
 * Same contract as Counter but takes a formatter so callers can render
 * currency or percentages instead of a bare number.
 * ------------------------------------------------------------------------- */
export function CountUp({
  end,
  duration = 1.6,
  suffix = '',
  className = '',
}: {
  end: number
  duration?: number
  /** Rendered after the number, e.g. "٪" or "تومان". */
  suffix?: string
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)

  useIso(() => {
    const el = ref.current
    if (!el) return
    // No formatter prop on purpose: this component is rendered from server
    // components, and a function prop cannot cross that boundary.
    const render = (v: number) => {
      el.textContent = new Intl.NumberFormat('fa-IR').format(Math.round(v)) + suffix
    }
    if (prefersReduced()) {
      render(end)
      return
    }
    ensureGsap()
    const obj = { v: 0 }
    const tween = gsap.to(obj, {
      v: end,
      duration,
      ease: 'power2.out',
      onUpdate: () => render(obj.v),
      scrollTrigger: { trigger: el, start: 'top bottom', once: true },
    })
    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [end, duration, suffix])

  return (
    <span ref={ref} className={className} dir="ltr">
      ۰
    </span>
  )
}
