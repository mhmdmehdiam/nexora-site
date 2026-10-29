/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Vazirmatn', 'var(--font-vazirmatn)', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        // ===== Editorial neutrals (marketing) =====
        // Driven by CSS variables so the SAME class names work in both
        // themes: `text-ink-50` is always "primary text", `bg-ink-950` is
        // always "page background". The variable VALUES flip in light mode.
        ink: {
          50: 'rgb(var(--ink-50) / <alpha-value>)',
          100: 'rgb(var(--ink-100) / <alpha-value>)',
          200: 'rgb(var(--ink-200) / <alpha-value>)',
          300: 'rgb(var(--ink-300) / <alpha-value>)',
          400: 'rgb(var(--ink-400) / <alpha-value>)',
          500: 'rgb(var(--ink-500) / <alpha-value>)',
          600: 'rgb(var(--ink-600) / <alpha-value>)',
          700: 'rgb(var(--ink-700) / <alpha-value>)',
          800: 'rgb(var(--ink-800) / <alpha-value>)',
          900: 'rgb(var(--ink-900) / <alpha-value>)',
          950: 'rgb(var(--ink-950) / <alpha-value>)',
        },
        sand: {
          DEFAULT: 'rgb(var(--sand) / <alpha-value>)',
          light: 'rgb(var(--sand-light) / <alpha-value>)',
          dark: 'rgb(var(--sand-dark) / <alpha-value>)',
        },
        // ===== Product UI (dashboard / admin) =====
        brand: {
          50: '#eef4ff',
          100: '#dbe6fe',
          200: '#bfd3fe',
          300: '#93b4fd',
          400: '#6090fa',
          500: '#3b6cf5',
          600: '#2550ea',
          700: '#1d3fd7',
          800: '#1e35ae',
          900: '#1e3189',
          950: '#172054',
        },
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#1a2a3a',
          900: '#0f1923',
          950: 'rgb(var(--surface-deep) / <alpha-value>)',
        },
      },
      fontSize: {
        'display-xl': ['clamp(3rem, 9vw, 8.5rem)', { lineHeight: '0.92', letterSpacing: '-0.035em' }],
        'display-lg': ['clamp(2.5rem, 6.5vw, 5.5rem)', { lineHeight: '0.95', letterSpacing: '-0.03em' }],
        'display-md': ['clamp(2rem, 4.5vw, 3.5rem)', { lineHeight: '1.02', letterSpacing: '-0.025em' }],
        'eyebrow': ['0.6875rem', { lineHeight: '1', letterSpacing: '0.18em' }],
      },
      boxShadow: {
        'glow': '0 0 20px rgba(59, 108, 245, 0.15)',
        'glow-lg': '0 0 40px rgba(59, 108, 245, 0.2)',
        'card': '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
        'card-hover': '0 10px 30px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.2)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'mesh': 'radial-gradient(at 40% 20%, hsla(228,68%,55%,0.15) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(189,100%,56%,0.08) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(355,85%,63%,0.05) 0px, transparent 50%)',
      },
      transitionTimingFunction: {
        'editorial': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'marquee': 'marquee 38s linear infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideDown: { '0%': { opacity: '0', transform: 'translateY(-10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        scaleIn: { '0%': { opacity: '0', transform: 'scale(0.95)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        pulseSoft: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.7' } },
        marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
      },
    },
  },
  plugins: [],
}
