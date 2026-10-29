'use client'

import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

const INTRO_KEY = 'nx_intro_seen'
export const INTRO_DONE_EVENT = 'nx:intro-done'

/**
 * Module-level flag so anything that mounts later can tell whether the intro
 * has already run. Also broadcasts a DOM event for non-React listeners.
 */
let introFinished = false

export function markIntroFinished() {
  if (introFinished) return
  introFinished = true
  window.dispatchEvent(new Event(INTRO_DONE_EVENT))
}

/**
 * Full-screen intro curtain: percentage counter + hairline progress,
 * then a clip-path wipe that reveals the hero.
 *
 * Rendered only on the client (so no-JS users never see a stuck overlay),
 * skipped entirely for `prefers-reduced-motion` and for repeat visits in the
 * same session.
 */
export function Intro({ onDone }: { onDone?: () => void }) {
  const [active, setActive] = useState(false)
  const [pct, setPct] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const doneRef = useRef(false)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  const finish = () => {
    if (doneRef.current) return
    doneRef.current = true
    try {
      sessionStorage.setItem(INTRO_KEY, '1')
    } catch {
      /* private mode */
    }
    document.documentElement.style.overflow = ''
    markIntroFinished()
    onDoneRef.current?.()
    setActive(false)
  }

  // Decide whether to run
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let seen = false
    try {
      seen = sessionStorage.getItem(INTRO_KEY) === '1'
    } catch {
      /* ignore */
    }
    // Deep links (e.g. /#pricing) shouldn't be gated by an intro.
    const deepLink = window.location.hash.length > 1

    if (reduce || seen || deepLink) {
      doneRef.current = true
      markIntroFinished()
      onDoneRef.current?.()
      return
    }

    setActive(true)
  }, [])

  useEffect(() => {
    if (!active) return
    const root = rootRef.current
    if (!root) return

    document.documentElement.style.overflow = 'hidden'

    const counter = { v: 0 }
    const tl = gsap.timeline({ onComplete: finish })

    // 1) counter fills 0 → 100 with a couple of natural hesitations
    tl.to(counter, {
      v: 100,
      duration: 1.1,
      ease: 'power2.inOut',
      onUpdate: () => setPct(Math.round(counter.v)),
    })

    // 2) the readout leaves, then the curtain wipes up
    tl.to(root.querySelector('[data-intro-center]'), {
      autoAlpha: 0,
      y: -14,
      duration: 0.28,
      ease: 'power2.in',
    })
    tl.to(root.querySelector('[data-intro-meta]'), { autoAlpha: 0, duration: 0.2 }, '<')

    tl.to(
      root,
      {
        clipPath: 'inset(0% 0% 100% 0%)',
        duration: 0.9,
        ease: 'power4.inOut',
        onStart: () => {
          markIntroFinished()
          // Start the hero underneath as the curtain lifts, not after it lands.
          onDoneRef.current?.()
        },
      },
      '-=0.04'
    )

    return () => {
      tl.kill()
      document.documentElement.style.overflow = ''
    }
  }, [active])

  if (!active) return null

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      onClick={finish}
      className="fixed inset-0 z-[200] flex cursor-pointer flex-col justify-between bg-ink-950 p-6 md:p-10"
      style={{ clipPath: 'inset(0% 0% 0% 0%)' }}
    >
      {/* top meta */}
      <div data-intro-meta className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="h-1.5 w-1.5 bg-sand" />
          <span className="font-serif text-[20px] italic leading-none text-ink-50">Nexora</span>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-600">
          loading
        </span>
      </div>

      {/* centre readout */}
      <div data-intro-center className="mx-auto w-full max-w-[420px]">
        <div className="mb-5 flex items-end justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">
            در حال آماده‌سازی
          </span>
          <span className="font-mono text-[28px] leading-none tabular-nums text-ink-50">
            {new Intl.NumberFormat('fa-IR').format(pct)}
            <span className="ml-1 text-[11px] text-ink-600">٪</span>
          </span>
        </div>

        <div className="h-px w-full bg-ink-100/[0.12]">
          <div
            className="h-px bg-sand transition-[width] duration-150 ease-linear"
            style={{ width: `${pct}%` }}
          />
        </div>

        <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-700">
          sales · customers · inventory
        </p>
      </div>

      {/* bottom meta */}
      <div data-intro-meta className="flex items-end justify-between">
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-700">
          tehran · 2026
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-600">
          click to skip
        </span>
      </div>
    </div>
  )
}
