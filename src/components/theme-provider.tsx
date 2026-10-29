'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

/**
 * Theme provider — dark (default) ↔ light/cream.
 *
 * How the swap works:
 *   - the `light` class on <html> flips every CSS variable in globals.css
 *   - every component keeps using `bg-ink-950` / `text-ink-50`; nothing
 *     else in the codebase needs to know a theme exists
 *
 * FOUC is prevented by a tiny inline script in layout.tsx that applies the
 * stored theme before React hydrates. This provider only takes over after
 * mount, so the first paint is already correct.
 */

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'nexora-theme'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggle: () => void
  mounted: boolean
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  setTheme: () => {},
  toggle: () => {},
  mounted: false,
})

export const useTheme = () => useContext(ThemeContext)

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.remove('dark', 'light')
  root.classList.add(theme)

  // update the browser chrome colour (mobile address bar)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0a0a0b' : '#f2ebdd')
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Default is ALWAYS dark — the editorial identity of the site. We only
    // deviate when the visitor explicitly picked light before. The OS
    // preference is deliberately ignored so a first-time visitor always
    // sees the design as intended.
    let initial: Theme = 'dark'
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'light' || stored === 'dark') initial = stored
    } catch {
      /* localStorage blocked — stay dark */
    }
    setThemeState(initial)
    applyTheme(initial)
    setMounted(true)
  }, [])

  const setTheme = useCallback((next: Theme) => {
    // brief transition class so colours cross-fade instead of snapping
    const root = document.documentElement
    root.classList.add('theme-transition')
    window.setTimeout(() => root.classList.remove('theme-transition'), 400)

    setThemeState(next)
    applyTheme(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  const toggle = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle, mounted }}>
      {children}
    </ThemeContext.Provider>
  )
}
