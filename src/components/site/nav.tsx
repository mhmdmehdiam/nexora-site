'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import * as Dialog from '@radix-ui/react-dialog'
import { ThemeToggle } from '@/components/theme-toggle'

export interface NavLinkItem {
  label: string
  href: string
}

export function SiteNav({ links }: { links: NavLinkItem[] }) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-editorial ${
        scrolled
          ? 'bg-ink-950/80 backdrop-blur-xl border-b border-ink-100/[0.08]'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="mx-auto grid h-[72px] max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center px-5 md:px-8 lg:px-12">
        {/* Wordmark — start side (right in RTL) */}
        <Link
          href="/"
          className="group flex items-center gap-2.5 justify-self-start"
          aria-label="نکسورا — صفحه اصلی"
        >
          <span className="h-1.5 w-1.5 bg-sand transition-transform duration-500 group-hover:rotate-45" />
          <span className="font-serif text-[22px] italic leading-none text-ink-50">Nexora</span>
        </Link>

        {/* Numbered links — centre */}
        <nav aria-label="ناوبری اصلی" className="hidden items-center gap-9 lg:flex">
          {links.map((l, i) => (
            <a
              key={l.href + i}
              href={l.href}
              className="group flex items-baseline gap-1.5 text-[13px] text-ink-300 transition-colors duration-300 hover:text-ink-50"
            >
              <span className="font-mono text-[9px] tracking-[0.1em] text-ink-500 transition-colors group-hover:text-sand">
                [{String(i + 1).padStart(2, '0')}]
              </span>
              <span>{l.label}</span>
            </a>
          ))}
        </nav>

        {/* Actions — end side (left in RTL) */}
        <div className="flex items-center gap-3 justify-self-end">
          <ThemeToggle />
          <Link
            href="/login"
            className="hidden text-[13px] text-ink-300 transition-colors hover:text-ink-50 sm:block"
          >
            ورود
          </Link>
          <Link
            href="/register"
            className="hidden items-center gap-2 bg-ink-50 px-5 py-2.5 text-[12.5px] font-semibold text-ink-950 transition-all duration-300 ease-editorial hover:opacity-90 active:scale-[0.98] sm:inline-flex"
          >
            شروع رایگان
          </Link>

          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center border border-ink-100/15 text-ink-100 transition-colors hover:border-ink-100/40 lg:hidden"
                aria-label="باز کردن منو"
              >
                <span className="sr-only">منو</span>
                <svg width="16" height="10" viewBox="0 0 16 10" fill="none" aria-hidden="true">
                  <path d="M0 1h16M0 9h16" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              </button>
            </Dialog.Trigger>

            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-[60] bg-ink-950/70 backdrop-blur-sm data-[state=open]:animate-fade-in" />
              <Dialog.Content
                className="fixed inset-0 z-[61] flex flex-col bg-ink-950 px-6 py-6 data-[state=open]:animate-slide-down"
                aria-describedby={undefined}
              >
                <div className="flex items-center justify-between">
                  <Dialog.Title className="font-serif text-[22px] italic text-ink-50">
                    Nexora
                  </Dialog.Title>
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className="flex h-10 w-10 items-center justify-center border border-ink-100/15 text-ink-100"
                      aria-label="بستن منو"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                        <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.2" />
                      </svg>
                    </button>
                  </Dialog.Close>
                </div>

                <nav aria-label="ناوبری موبایل" className="mt-16 flex flex-col">
                  {links.map((l, i) => (
                    <a
                      key={l.href + i}
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="flex items-baseline gap-4 border-b border-ink-100/[0.08] py-5 text-2xl font-medium text-ink-100 transition-colors hover:text-sand"
                    >
                      <span className="font-mono text-[10px] tracking-[0.1em] text-ink-500">
                        [{String(i + 1).padStart(2, '0')}]
                      </span>
                      {l.label}
                    </a>
                  ))}
                </nav>

                <div className="mt-auto flex flex-col gap-3 pb-4">
                  <ThemeToggle variant="pill" className="justify-center" />
                  <Link
                    href="/register"
                    onClick={() => setOpen(false)}
                    className="flex w-full items-center justify-center bg-ink-50 py-4 text-sm font-semibold text-ink-950"
                  >
                    شروع رایگان
                  </Link>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="flex w-full items-center justify-center border border-ink-100/20 py-4 text-sm text-ink-100"
                  >
                    ورود به حساب
                  </Link>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>
    </header>
  )
}
