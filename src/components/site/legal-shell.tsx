import Link from 'next/link'
import type { ReactNode } from 'react'
import { ThemeFab } from '@/components/theme-fab'
import { MotionPage } from '@/components/motion/motion-page'

/**
 * Shared shell for the static marketing/legal pages.
 *
 * These pages must stay readable in both themes and print cleanly — they are
 * what a payment-gateway reviewer and an Enamad inspector actually read. So the
 * motion here is deliberately the quietest in the site: headings wipe in, each
 * block rises once as you reach it, and nothing moves while you are reading a
 * sentence.
 *
 * The per-block markers live on the H2/P/UL primitives below rather than on the
 * article container: on a long document a container-level stagger would fire
 * everything at once the moment the top of the page entered view.
 */
export function LegalShell({
  index,
  title,
  updated,
  intro,
  children,
}: {
  index: string
  title: string
  updated?: string
  intro?: string
  children: ReactNode
}) {
  return (
    <MotionPage className="min-h-screen bg-ink-950">
      <main id="main">
      <ThemeFab />

      <header data-mv="hero" className="relative z-10 border-b border-ink-100/[0.08]">
        <div className="mx-auto flex max-w-[900px] items-center justify-between px-5 py-5 md:px-8">
          <Link href="/" className="flex items-center gap-2.5" aria-label="نکسورا — صفحه اصلی">
            <span className="h-1.5 w-1.5 bg-sand" aria-hidden="true" />
            <span className="font-serif text-[20px] italic text-ink-50">Nexora</span>
          </Link>
          <Link
            href="/"
            className="mv-link font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500 transition-colors hover:text-sand"
          >
            ← بازگشت
          </Link>
        </div>
      </header>

      <article className="relative z-10 mx-auto max-w-[760px] px-5 py-16 md:px-8 md:py-24">
        <div data-mv="hero" className="mb-6 flex items-center gap-3">
          <span className="sec-num">[{index}]</span>
          <span className="h-px flex-1 bg-ink-100/15" aria-hidden="true" />
          {updated && (
            <span className="font-mono text-[10px] tracking-[0.12em] text-ink-600">
              آخرین به‌روزرسانی: {updated}
            </span>
          )}
        </div>

        <h1
          data-mv="clip"
          className="text-[30px] font-bold leading-[1.35] tracking-tight text-ink-50 md:text-[38px]"
        >
          {title}
        </h1>

        {intro && (
          <p data-mv="0.08" className="mt-5 text-[14.5px] leading-9 text-ink-300">
            {intro}
          </p>
        )}

        <div className="prose-legal mt-12">{children}</div>

        <div
          data-mv
          className="mt-16 border-t border-ink-100/[0.1] pt-8 text-[12.5px] leading-7 text-ink-500"
        >
          سؤالی داری؟{' '}
          <Link href="/contact" className="mv-link text-ink-200 underline underline-offset-4 hover:text-sand">
            با ما تماس بگیر
          </Link>{' '}
          یا به{' '}
          <a href="mailto:support@nexora.ir" dir="ltr" className="mv-link text-ink-200 underline underline-offset-4 hover:text-sand">
            support@nexora.ir
          </a>{' '}
          ایمیل بزن.
        </div>
      </article>
      </main>
    </MotionPage>
  )
}

export function H2({ children }: { children: ReactNode }) {
  return (
    <h2
      data-mv="clip"
      className="mt-11 border-t border-ink-100/[0.08] pt-8 text-[18px] font-bold text-ink-50 first:mt-0 first:border-0 first:pt-0"
    >
      {children}
    </h2>
  )
}

export function P({ children }: { children: ReactNode }) {
  return (
    <p data-mv className="mt-3.5 text-[13.5px] leading-8 text-ink-300">
      {children}
    </p>
  )
}

export function UL({ children }: { children: ReactNode }) {
  return (
    <ul data-mv className="mt-4 space-y-2.5">
      {children}
    </ul>
  )
}

export function LI({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3 text-[13.5px] leading-8 text-ink-300">
      <span className="mt-[13px] h-1 w-1 shrink-0 bg-sand" aria-hidden="true" />
      <span>{children}</span>
    </li>
  )
}
