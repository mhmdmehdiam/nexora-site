'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ThemeFab } from '@/components/theme-fab'
import { MotionPage } from '@/components/motion/motion-page'
import { ClipReveal } from '@/components/motion/kit'

/**
 * Minimal auth shell for the recovery flows.
 *
 * Deliberately calmer than /login and /register (no WebGL, no scroll
 * choreography): someone resetting a password is already frustrated — the page
 * should just work, including on a slow connection.
 *
 * What it does get is one entrance beat and a focus glow on the card, so the
 * surface feels finished rather than static. Nothing moves after that.
 */
export function AuthShell({
  index,
  title,
  subtitle,
  children,
  footer,
}: {
  index: string
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <MotionPage className="min-h-screen bg-ink-950">
      <main id="main" className="flex min-h-screen items-center justify-center px-5 py-16">
        <ThemeFab />

        <div className="relative z-10 w-full max-w-[430px]">
          <Link
            data-mv="hero"
            href="/"
            className="mb-8 flex items-center gap-2.5"
            aria-label="نکسورا — صفحه اصلی"
          >
            <span className="h-1.5 w-1.5 bg-sand" aria-hidden="true" />
            <span className="font-serif text-[22px] italic text-ink-50">Nexora</span>
          </Link>

          <div
            data-mv="hero"
            className="auth-card border border-ink-100/[0.14] bg-ink-900/70 px-6 py-9 backdrop-blur-sm md:px-8"
          >
            <div className="mb-7 flex items-center gap-3">
              <span className="sec-num">[{index}]</span>
              <span className="h-px flex-1 bg-ink-100/15" aria-hidden="true" />
            </div>

            <ClipReveal
              as="h1"
              className="block text-[24px] font-semibold leading-snug tracking-tight text-ink-50"
            >
              {title}
            </ClipReveal>
            {subtitle && (
              <p data-mv="0.08" className="mt-2.5 text-[13px] leading-7 text-ink-400">
                {subtitle}
              </p>
            )}

            <div data-mv="0.14" className="mt-8">
              {children}
            </div>
          </div>

          {footer && (
            <div data-mv="0.2" className="mt-6 text-center text-[12.5px] text-ink-500">
              {footer}
            </div>
          )}
        </div>
      </main>
    </MotionPage>
  )
}

export function Field({
  label,
  id,
  children,
  hint,
}: {
  label: string
  id: string
  children: ReactNode
  hint?: string
}) {
  return (
    <div className="mb-5">
      <label htmlFor={id} className="mb-2 block text-[11.5px] tracking-wide text-ink-400">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-[11px] text-ink-500">{hint}</p>}
    </div>
  )
}

export function Alert({ tone, children }: { tone: 'error' | 'success'; children: ReactNode }) {
  const cls =
    tone === 'error'
      ? 'border-red-500/25 bg-red-500/[0.08] text-red-300'
      : 'border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-300'
  return (
    <div role="alert" className={`mv-in mb-5 flex items-start gap-2 border px-3 py-2.5 text-[12.5px] ${cls}`}>
      <span
        aria-hidden="true"
        className={`mt-1.5 h-1 w-1 shrink-0 ${tone === 'error' ? 'bg-red-400' : 'bg-emerald-400'}`}
      />
      <div className="leading-6">{children}</div>
    </div>
  )
}
