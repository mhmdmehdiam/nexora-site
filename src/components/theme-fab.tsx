'use client'

import { usePathname } from 'next/navigation'
import { ThemeToggle } from './theme-toggle'

/**
 * Global theme switch.
 *
 * Every page needs a way to flip the theme, but some sections already render
 * an inline toggle inside their own chrome (the marketing nav, the dashboard
 * top bar, the admin top bar). Rendering a second one there would be noise, so
 * this component covers only the routes that have no header of their own:
 * pricing, blog, content pages, the auth screens and billing.
 *
 * Positioned at the top-left — the "end" side in RTL — where utility controls
 * live, and above page content but below modals.
 */

const HAS_INLINE_TOGGLE = [/^\/$/, /^\/dashboard(\/|$)/, /^\/admin(\/|$)/]

export function ThemeFab() {
  const pathname = usePathname() || '/'
  if (HAS_INLINE_TOGGLE.some((re) => re.test(pathname))) return null

  return (
    <div className="pointer-events-none fixed left-4 top-4 z-[70] print:hidden">
      <div className="pointer-events-auto">
        <ThemeToggle variant="pill" className="bg-ink-950/70 backdrop-blur-md" />
      </div>
    </div>
  )
}
