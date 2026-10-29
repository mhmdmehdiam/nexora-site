'use client'

import { useTheme } from './theme-provider'
import { cn } from '@/lib/utils'

/**
 * Theme toggle — sun in dark mode, moon in light mode.
 *
 * Renders a fixed-size placeholder until mounted so the header never
 * jumps (and hydration never mismatches, since the server can't know
 * the visitor's stored preference).
 */

interface ThemeToggleProps {
  className?: string
  /** 'icon' = compact round button (headers), 'pill' = label + icon */
  variant?: 'icon' | 'pill'
}

export function ThemeToggle({ className, variant = 'icon' }: ThemeToggleProps) {
  const { theme, toggle, mounted } = useTheme()

  const isDark = theme === 'dark'
  const label = isDark ? 'روشن کردن تم' : 'تیره کردن تم'

  const icon = isDark ? (
    // sun — clicking will switch TO light
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" />
      <path
        strokeLinecap="round"
        d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"
      />
    </svg>
  ) : (
    // moon — clicking will switch TO dark
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 12.8A8.5 8.5 0 1111.2 3a7 7 0 009.8 9.8z"
      />
    </svg>
  )

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        title={label}
        className={cn(
          'inline-flex items-center gap-2 rounded-full border border-ink-100/[0.12] px-3 py-1.5',
          'text-[12px] text-ink-400 transition-colors',
          'hover:border-sand/40 hover:text-ink-50',
          className
        )}
      >
        <span className="h-4 w-4 shrink-0">{icon}</span>
        <span className="hidden sm:inline">{isDark ? 'تم روشن' : 'تم تیره'}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      disabled={!mounted}
      className={cn(
        'group relative inline-flex h-9 w-9 items-center justify-center rounded-full',
        'border border-ink-100/[0.12] text-ink-400',
        'transition-all duration-300 hover:border-sand/45 hover:text-sand',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sand/40',
        !mounted && 'opacity-0',
        className
      )}
    >
      <span className="h-[17px] w-[17px] transition-transform duration-500 group-hover:rotate-45">
        {icon}
      </span>
    </button>
  )
}
