'use client'

import { useTheme } from '@/components/theme-provider'

/**
 * Chart colours that follow the active theme.
 *
 * Recharts takes plain SVG attributes (`stroke`, `fill`) and inline style
 * objects, so CSS variables can't be used directly — the value has to be a
 * concrete colour. This hook resolves them from the current theme instead,
 * which keeps grid lines and tooltips readable in both modes.
 */

export function useChartTheme() {
  const { theme } = useTheme()
  const dark = theme === 'dark'

  return {
    dark,
    /** horizontal/vertical grid lines — barely-there in dark, a hairline in light */
    grid: dark ? 'rgba(255,255,255,0.05)' : 'rgba(26,24,20,0.09)',
    /** axis ticks + labels */
    axis: dark ? '#6B6558' : '#6E685E',
    /** tooltip surface */
    tooltip: {
      background: dark ? '#1a2a3a' : 'rgba(249,244,233,0.98)',
      border: dark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(26,24,20,0.12)',
      borderRadius: '12px',
      direction: 'rtl' as const,
      color: dark ? '#EDEAE3' : '#1A1814',
      boxShadow: dark ? 'none' : '0 10px 30px rgba(26,24,20,0.10)',
    },
    /** categorical palette for pie / bar series */
    colors: dark
      ? ['#C9B79C', '#9C8A70', '#E4D7C3', '#8A8375', '#B8B1A1', '#D9D4C8', '#6B6558', '#F7F5F0']
      : ['#A6885E', '#7A6444', '#C9B79C', '#8A7C68', '#B9A98F', '#D8CCB6', '#5E564A', '#3A342C'],
  }
}
