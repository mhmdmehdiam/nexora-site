'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * A cursor built from the site's own visual language: a small sand square for
 * precision plus a hairline bracket frame that expands to outline whatever
 * interactive element you're hovering — like a designer's selection tool.
 *
 * Position is driven by a single rAF loop (dot lerps fast, frame lerps slow)
 * and the geometry is re-read on scroll/resize so the frame never drifts away
 * from the element it is outlining.
 *
 * Only enabled on fine pointers, and never for `prefers-reduced-motion`.
 */
export function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLDivElement>(null)
  const [on, setOn] = useState(false)

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setOn(true)
  }, [])

  useEffect(() => {
    if (!on) return
    const dot = dotRef.current
    const frame = frameRef.current
    const label = labelRef.current
    if (!dot || !frame || !label) return

    const root = document.documentElement
    root.classList.add('has-custom-cursor')

    const PAD = 9
    const IDLE = 26

    let raf = 0
    let mx = -300
    let my = -300
    let dx = -300
    let dy = -300
    let fx = -300
    let fy = -300
    let ftx = -300
    let fty = -300
    let visible = false
    let current: HTMLElement | null = null

    const applySize = (w: number, h: number) => {
      frame.style.width = `${w}px`
      frame.style.height = `${h}px`
    }

    const clearTarget = () => {
      current = null
      frame.classList.remove('is-active', 'has-label')
      label.textContent = ''
      applySize(IDLE, IDLE)
      dot.classList.remove('is-shrunk')
    }

    const place = (el: HTMLElement) => {
      const rect = el.getBoundingClientRect()
      if (rect.width < 8 || rect.height < 8) {
        clearTarget()
        return
      }
      current = el
      frame.classList.add('is-active')
      applySize(rect.width + PAD * 2, rect.height + PAD * 2)
      ftx = rect.left + rect.width / 2
      fty = rect.top + rect.height / 2
      dot.classList.add('is-shrunk')

      const text = el.getAttribute('data-cursor-label')
      if (text) {
        label.textContent = text
        frame.classList.add('has-label')
      } else {
        label.textContent = ''
        frame.classList.remove('has-label')
      }
    }

    const syncTarget = () => {
      if (!current) return
      const rect = current.getBoundingClientRect()
      const offscreen =
        rect.bottom < -40 || rect.top > window.innerHeight + 40 || rect.width === 0
      if (offscreen) {
        clearTarget()
        return
      }
      applySize(rect.width + PAD * 2, rect.height + PAD * 2)
      ftx = rect.left + rect.width / 2
      fty = rect.top + rect.height / 2
    }

    let lastMove = 0

    const loop = () => {
      dx += (mx - dx) * 0.62
      dy += (my - dy) * 0.62
      fx += (ftx - fx) * 0.16
      fy += (fty - fy) * 0.16

      dot.style.transform = `translate3d(${dx}px, ${dy}px, 0) translate(-50%, -50%)`
      frame.style.transform = `translate3d(${fx}px, ${fy}px, 0) translate(-50%, -50%)`

      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const onMove = (e: MouseEvent) => {
      mx = e.clientX
      my = e.clientY
      lastMove = performance.now()

      if (!visible) {
        visible = true
        root.classList.add('cursor-visible')
        // jump straight to the pointer on first move so it doesn't fly in
        dx = mx
        dy = my
        fx = mx
        fy = my
      }

      // While hovering we keep the frame locked to the element, but if the
      // pointer has left that element's box we release it immediately.
      if (current) {
        const r = current.getBoundingClientRect()
        if (mx < r.left - 4 || mx > r.right + 4 || my < r.top - 4 || my > r.bottom + 4) {
          clearTarget()
          ftx = mx
          fty = my
        }
      } else {
        ftx = mx
        fty = my
        // Re-attach when the pointer is back over something interactive —
        // `mouseover` won't fire if it never left that element.
        const under = (e.target as HTMLElement)?.closest?.(
          'a, button, [role="button"], [data-cursor]'
        ) as HTMLElement | null
        if (under) place(under)
      }
    }

    const onOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest?.(
        'a, button, [role="button"], [data-cursor]'
      ) as HTMLElement | null

      if (!target) {
        if (current) {
          clearTarget()
          ftx = mx
          fty = my
        }
        return
      }
      if (target === current) return
      place(target)
    }

    // Scrolling changes what sits under the pointer, so a stale selection is
    // released and the frame returns to the cursor. We only do this when the
    // pointer is stationary (wheel / scrollbar), otherwise moving the mouse
    // while the page settles would cause flicker.
    const onScroll = () => {
      if (!current) return
      if (performance.now() - lastMove < 140) return
      clearTarget()
      ftx = mx
      fty = my
    }
    const onResize = () => syncTarget()

    const onDown = () => frame.classList.add('is-pressed')
    const onUp = () => frame.classList.remove('is-pressed')

    const onLeave = () => {
      visible = false
      root.classList.remove('cursor-visible')
      clearTarget()
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('mouseover', onOver, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)
    document.addEventListener('mouseleave', onLeave)

    return () => {
      cancelAnimationFrame(raf)
      root.classList.remove('has-custom-cursor', 'cursor-visible')
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseover', onOver)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      document.removeEventListener('mouseleave', onLeave)
    }
  }, [on])

  if (!on) return null

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[300]">
      <div ref={frameRef} className="cursor-frame" style={{ width: 26, height: 26 }}>
        <span className="cf-corner cf-tl" />
        <span className="cf-corner cf-tr" />
        <span className="cf-corner cf-bl" />
        <span className="cf-corner cf-br" />
        <div ref={labelRef} className="cursor-label" />
      </div>
      <div ref={dotRef} className="cursor-dot" />
    </div>
  )
}
