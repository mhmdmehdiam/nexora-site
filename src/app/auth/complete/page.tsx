'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'

/**
 * Landing pad after the Google callback — the bridge between Google and the
 * console. The server already set the httpOnly JWT cookie; here we mirror
 * the session into localStorage (same as the normal login flow) and route.
 *
 * Cinematic by design: wordmark → progress → personal welcome → curtain
 * lifts. Motion for React drives the choreography.
 */
export default function AuthCompletePage() {
  const router = useRouter()
  const [phase, setPhase] = useState<'loading' | 'welcome' | 'error'>('loading')
  const [name, setName] = useState('')
  const [target, setTarget] = useState('/dashboard')
  const [pct, setPct] = useState(0)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    // progress ticker runs while the session request is in flight
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min(92, ((now - t0) / 1400) * 100)
      setPct(Math.round(p))
      if (p < 92) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        const user = data?.user
        if (!user) throw new Error()
        cancelAnimationFrame(raf)
        setPct(100)
        localStorage.setItem('user', JSON.stringify(user))
        setName(user.name || '')
        setTarget(user.businessSlug === 'nexora-platform' ? '/admin' : '/dashboard')
        setTimeout(() => setPhase('welcome'), 350)
        // hold the welcome beat, then hand off
        setTimeout(() => router.replace(user.businessSlug === 'nexora-platform' ? '/admin' : '/dashboard'), 2100)
      })
      .catch(() => {
        cancelAnimationFrame(raf)
        setPhase('error')
      })
    return () => cancelAnimationFrame(raf)
  }, [router])

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-950 text-ink-100">
      {/* same ambient language as the auth pages, stripped down */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(201,183,156,0.12),transparent_55%)]" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'linear-gradient(rgba(247,245,240,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(247,245,240,0.03) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
            maskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black 10%, transparent 75%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 70% 60% at 50% 40%, black 10%, transparent 75%)',
          }}
        />
      </div>

      <AnimatePresence mode="wait">
        {phase === 'loading' && (
          <motion.div
            key="loading"
            className="relative z-10 flex flex-col items-center gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -24, transition: { duration: 0.4 } }}
          >
            <span className="font-serif text-[34px] italic leading-none text-ink-50">Nexora</span>
            <div className="h-px w-44 overflow-hidden bg-ink-100/10">
              <div
                className="h-full bg-sand transition-[width] duration-150 ease-linear"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-ink-600">
              signing you in
            </span>
          </motion.div>
        )}

        {phase === 'welcome' && (
          <motion.div
            key="welcome"
            className="relative z-10 flex flex-col items-center gap-4 text-center"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.45, ease: 'easeIn' } }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.span
              className="sec-num"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
            >
              [ACCESS GRANTED]
            </motion.span>
            <motion.h1
              className="font-serif text-[clamp(2rem,4vw,3.2rem)] italic leading-tight text-ink-50"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              خوش آمدی{name ? `، ${name}` : ''}.
            </motion.h1>
            <motion.span
              className="mt-2 h-px w-24 bg-sand/60"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.6, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            />
            <motion.span
              className="font-mono text-[9px] uppercase tracking-[0.22em] text-ink-600"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.85 }}
            >
              entering the console
            </motion.span>
          </motion.div>
        )}

        {phase === 'error' && (
          <motion.div
            key="error"
            className="relative z-10 max-w-xs text-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-[13.5px] text-red-300">ورود با گوگل ناموفق بود. دوباره تلاش کن.</p>
            <a
              href="/login"
              className="link-line mt-4 inline-block py-1 text-[12.5px] text-ink-200 hover:text-sand"
            >
              بازگشت به صفحه ورود
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* noscript / JS-off fallback link is unnecessary — the callback itself redirects */}
      <noscript>
        <meta httpEquiv="refresh" content="0;url=/login" />
      </noscript>
    </div>
  )
}
