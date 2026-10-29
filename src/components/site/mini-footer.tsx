import Link from 'next/link'

/**
 * Compact footer for pages that are not the landing page.
 *
 * Legal links must be reachable from every public page — payment-gateway
 * verification and Enamad both check this.
 */
export function MiniFooter() {
  return (
    <footer className="relative z-10 mt-20 border-t border-ink-100/[0.08]">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-6 px-5 py-10 md:flex-row md:items-center md:justify-between md:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label="نکسورا — صفحه اصلی">
          <span className="h-1.5 w-1.5 bg-sand" aria-hidden="true" />
          <span className="font-serif text-[20px] italic text-ink-50">Nexora</span>
        </Link>

        <nav aria-label="لینک‌های قانونی" className="flex flex-wrap gap-x-6 gap-y-2">
          {[
            { href: '/about', label: 'درباره ما' },
            { href: '/contact', label: 'تماس' },
            { href: '/terms', label: 'شرایط استفاده' },
            { href: '/privacy', label: 'حریم خصوصی' },
            { href: '/security', label: 'امنیت' },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[12px] text-ink-500 transition-colors hover:text-ink-100"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <span className="font-mono text-[10px] tracking-[0.12em] text-ink-600">
          © ۲۰۲۶ NEXORA
        </span>
      </div>
    </footer>
  )
}
