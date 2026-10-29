'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import gsap from 'gsap'
import GoogleButton from '@/components/auth/google-button'
import { Counter } from '@/components/site/motion'
import { RegisterDecor, RegisterIntro, LiveFeed } from '@/components/auth/register-decor'

const DEMOS = [
  { label: 'مدیر پلتفرم', email: 'admin@nexora.ir', pass: 'admin123', meta: 'platform' },
  { label: 'دیجی‌لند', email: 'ali@digiland.ir', pass: 'demo1234', meta: 'pro' },
  { label: 'مُدا استایل', email: 'sara@modastyle.ir', pass: 'demo1234', meta: 'free' },
]

const GOOGLE_ERRORS: Record<string, string> = {
  google_not_configured: 'ورود با گوگل هنوز روی سرور پیکربندی نشده است.',
  google_denied: 'اجازه‌ی دسترسی به حساب گوگل داده نشد.',
  google_state: 'نشست ورود منقضی شده؛ دوباره تلاش کن.',
  google_email_unverified: 'ایمیل حساب گوگلت تأیید نشده است.',
  google_inactive: 'حساب کاربری غیرفعال است.',
  google_failed: 'ورود با گوگل ناموفق بود. دوباره تلاش کن.',
}

const MARQUEE_ITEMS = [
  'ورود با گوگل با یک کلیک',
  '۲٬۰۰۰+ کسب‌وکار فعال',
  'داده‌هات مال خودت است',
  'پشتیبانی ۲۴/۷',
  'همه‌ی اعداد، زنده',
  'بدون هزینه شروع کن',
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [introDone, setIntroDone] = useState(false)

  const rootRef = useRef<HTMLDivElement>(null)
  const magnetRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  /* ---------- surface errors passed back from the Google OAuth callback ---------- */
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('error')
    if (code && GOOGLE_ERRORS[code]) setError(GOOGLE_ERRORS[code])
  }, [])

  /* ---------- entrance choreography — starts as the curtain lifts ---------- */
  useEffect(() => {
    if (!introDone) return
    const root = rootRef.current
    if (!root) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const q = gsap.utils.selector(root)
    gsap.set(q('[data-ent]'), { autoAlpha: 0, y: 28 })
    gsap.set(q('[data-ent-line]'), { yPercent: 118 })

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
    tl.to(q('[data-ent-brand]'), { autoAlpha: 1, y: 0, duration: 0.6 })
      .to(
        q('[data-ent-line]'),
        { yPercent: 0, duration: 1.15, stagger: 0.12, ease: 'power4.out' },
        0.1
      )
      .to(q('[data-ent]'), { autoAlpha: 1, y: 0, duration: 0.85, stagger: 0.07 }, 0.45)

    return () => {
      tl.kill()
    }
  }, [introDone])

  /* ---------- magnetic submit button ---------- */
  useEffect(() => {
    const wrap = magnetRef.current
    if (!wrap) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!window.matchMedia('(pointer: fine)').matches) return

    const btn = wrap.querySelector('button')
    if (!btn) return

    const onMove = (e: MouseEvent) => {
      const r = wrap.getBoundingClientRect()
      const dx = e.clientX - (r.left + r.width / 2)
      const dy = e.clientY - (r.top + r.height / 2)
      const dist = Math.hypot(dx, dy)
      const max = 130
      if (dist < max && dist > 1) {
        const f = (1 - dist / max) * 9
        btn.style.transform = `translate3d(${(dx / dist) * f}px, ${(dy / dist) * f}px, 0)`
      } else {
        btn.style.transform = ''
      }
    }
    const onLeave = () => {
      btn.style.transform = ''
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    document.addEventListener('mouseleave', onLeave)
    return () => {
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', onLeave)
      onLeave()
    }
  }, [])

  /* ---------- subtle 3D tilt on the form card ---------- */
  useEffect(() => {
    const card = cardRef.current
    if (!card) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!window.matchMedia('(pointer: fine)').matches) return

    const onMove = (e: MouseEvent) => {
      const r = card.getBoundingClientRect()
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2)
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2)
      const near = Math.max(0, 1 - Math.hypot(dx, dy) / 2.6)
      const rx = -dy * 3.4 * near
      const ry = dx * 3.4 * near
      card.style.transform = `perspective(1200px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`
    }
    const reset = () => {
      card.style.transform = ''
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    document.addEventListener('mouseleave', reset)
    return () => {
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', reset)
      reset()
    }
  }, [])

  const signIn = async (mail: string, pass: string) => {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: mail, password: pass }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'ایمیل یا رمز عبور نادرست است')
        return
      }
      localStorage.setItem('user', JSON.stringify(data.user))
      router.push(data.user?.businessSlug === 'nexora-platform' ? '/admin' : '/dashboard')
    } catch {
      setError('خطا در اتصال به سرور')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    signIn(email, password)
  }

  const useDemo = (mail: string, pass: string) => {
    setEmail(mail)
    setPassword(pass)
    signIn(mail, pass)
  }

  return (
    <div ref={rootRef} className="grain relative min-h-screen bg-ink-950 text-ink-100">
      {/* one-session intro curtain */}
      <RegisterIntro onLift={() => setIntroDone(true)} />

      {/* motion backdrop: aurora + orbs + particles + watermark + parallax */}
      <RegisterDecor />

      {/* the landing's custom cursor, form-safe on inputs */}

      {/* static gradient + grid */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_0%,rgba(201,183,156,0.10),transparent_55%)]" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'linear-gradient(rgba(247,245,240,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(247,245,240,0.03) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
            maskImage: 'radial-gradient(ellipse 70% 60% at 60% 30%, black 10%, transparent 75%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 70% 60% at 60% 30%, black 10%, transparent 75%)',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto grid min-h-screen max-w-[1400px] grid-cols-1 items-center gap-10 px-5 py-12 lg:grid-cols-[1.05fr_1fr] lg:gap-0 lg:px-0 lg:py-0">
        {/* ===== Brand panel ===== */}
        <section className="hidden min-w-0 flex-col justify-center gap-10 border-l border-ink-100/[0.08] p-12 lg:flex xl:p-16">
          <div data-ent-brand className="flex items-center gap-3">
            <span className="h-1.5 w-1.5 bg-sand" aria-hidden="true" />
            <span className="font-serif text-[24px] italic leading-none text-ink-50">Nexora</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-600">
              console
            </span>
          </div>

          <div>
            <div data-ent className="mb-6 flex items-center gap-3">
              <span className="sec-num">[ACCESS]</span>
              <span className="h-px w-10 bg-ink-100/20" />
            </div>
            <h1 className="text-[clamp(2.5rem,4.4vw,4rem)] font-black leading-[0.98] tracking-[-0.03em] text-ink-50">
              <span className="block overflow-hidden">
                <span data-ent-line className="block">
                  دفترت را
                </span>
              </span>
              <span className="block overflow-hidden">
                <span data-ent-line className="block">
                  <span className="shimmer-text">دیجیتال</span> کن.
                </span>
              </span>
            </h1>
            <p data-ent className="mt-7 max-w-sm text-[14px] leading-8 text-ink-400">
              وارد کنسول شو و فروش، مشتری و موجودی را از یک‌جا مدیریت کن. هر عددی که می‌بینی، زنده
              است.
            </p>

            {/* animated stats */}
            <dl data-ent className="mt-9 flex gap-10">
              {[
                ['۲٬۰۰۰+', 'کسب‌وکار فعال'],
                ['۹۹.۹٪', 'آپتایم'],
                ['۲۴/۷', 'داده'],
              ].map(([k, v], i) => (
                <div key={v}>
                  <dt className="font-mono text-[13px] text-ink-200" dir="ltr">
                    {i === 0 ? (
                      <>
                        <Counter end={2000} duration={2.4} />+
                      </>
                    ) : (
                      k
                    )}
                  </dt>
                  <dd className="mt-1 text-[10.5px] text-ink-600">{v}</dd>
                </div>
              ))}
            </dl>

            {/* scrolling marquee strip */}
            <div
              data-ent
              className="mt-9 w-full overflow-hidden border-y border-ink-100/[0.08] py-3"
              aria-hidden="true"
            >
              <div className="marquee-track items-center gap-10" style={{ animationDuration: '26s' }}>
                {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((t, i) => (
                  <span key={i} className="flex shrink-0 items-center gap-10">
                    <span className="whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500">
                      {t}
                    </span>
                    <span className="h-1 w-1 shrink-0 bg-sand/60" />
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div data-ent>
            <LiveFeed />
          </div>
        </section>

        {/* ===== Form panel — glass card with a chasing light rim ===== */}
        <section className="relative flex min-w-0 items-center justify-center py-24 md:px-10 lg:py-0">
          <div
            ref={cardRef}
            className="reg-card relative z-[1] w-full max-w-[430px] rounded-3xl will-change-transform"
            style={{ transition: 'transform 0.25s ease-out' }}
          >
            <div className="reg-card-glow" aria-hidden="true" />
            <div className="reg-card-inner rounded-[22px] px-6 py-10 md:px-9">
              <div className="w-full">
                <div className="mb-10 flex items-center gap-2.5 lg:hidden">
                  <span className="h-1.5 w-1.5 bg-sand" aria-hidden="true" />
                  <span className="font-serif text-[22px] italic text-ink-50">Nexora</span>
                </div>

                <div data-ent className="mb-9">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="sec-num">[SIGN IN]</span>
                    <span className="h-px w-8 bg-ink-100/20" />
                  </div>
                  <h2 className="text-[26px] font-bold tracking-tight text-ink-50">ورود به حساب</h2>
                  <p className="mt-2 text-[12.5px] text-ink-500">
                    ایمیل و رمز عبورت را وارد کن.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                  <div data-field>
                    <label
                      htmlFor="email"
                      className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500"
                    >
                      ایمیل
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-field"
                      placeholder="you@example.com"
                      required
                      dir="ltr"
                      autoComplete="email"
                      aria-invalid={!!error}
                      aria-describedby={error ? 'login-error' : undefined}
                    />
                  </div>

                  <div data-field>
                    <div className="mb-2 flex items-baseline justify-between gap-3">
                      <label
                        htmlFor="password"
                        className="block font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500"
                      >
                        رمز عبور
                      </label>
                      <Link
                        href="/forgot-password"
                        className="text-[11px] text-ink-500 underline underline-offset-4 transition-colors hover:text-sand"
                      >
                        فراموش کردی؟
                      </Link>
                    </div>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPass ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input-field pl-11"
                        placeholder="••••••••"
                        required
                        dir="ltr"
                        autoComplete="current-password"
                        aria-invalid={!!error}
                        aria-describedby={error ? 'login-error' : undefined}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass((v) => !v)}
                        className="absolute left-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-ink-600 transition-colors hover:text-ink-200"
                        aria-label={showPass ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'}
                        aria-pressed={showPass}
                      >
                        {showPass ? (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.4 5.3A9.5 9.5 0 0121 12a9.7 9.7 0 01-2.2 2.9M6.2 6.2A9.6 9.6 0 003 12a9.7 9.7 0 006.6 4.6" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
                            <circle cx="12" cy="12" r="2.6" strokeWidth={1.6} />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div data-field aria-live="polite" aria-atomic="true">
                    {error && (
                      <div
                        id="login-error"
                        className="flex items-start gap-2 border border-red-500/25 bg-red-500/[0.08] px-3 py-2.5 text-[12.5px] text-red-300"
                      >
                        <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 bg-red-400" />
                        {error}
                      </div>
                    )}
                  </div>

                  <div data-field className="relative" ref={magnetRef}>
                    <button
                      type="submit"
                      disabled={loading}
                      data-cursor-label="ورود"
                      className="btn-ink w-full py-3.5 transition-transform duration-200 will-change-transform"
                    >
                      {loading ? 'در حال ورود…' : 'ورود'}
                      {!loading && (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                          <path d="M9 3L4 7l5 4" stroke="currentColor" strokeWidth="1.3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </form>

                {/* Google sign-in */}
                <div data-ent className="mt-6">
                  <GoogleButton label="ورود با گوگل" />
                </div>

                {/* Demo accounts */}
                <div data-ent className="mt-8">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-600">
                      demo access
                    </span>
                    <span className="h-px flex-1 bg-ink-100/[0.08]" />
                  </div>
                  <div className="border border-ink-100/[0.09]">
                    {DEMOS.map((d, i) => (
                      <button
                        key={d.email}
                        type="button"
                        onClick={() => useDemo(d.email, d.pass)}
                        disabled={loading}
                        className={`group flex w-full items-center justify-between gap-3 px-3.5 py-3 text-right transition-colors hover:bg-ink-50/[0.04] disabled:opacity-50 ${
                          i > 0 ? 'border-t border-ink-100/[0.07]' : ''
                        }`}
                      >
                        <span className="flex items-baseline gap-2">
                          <span className="text-[12.5px] text-ink-200">{d.label}</span>
                          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-600">
                            {d.meta}
                          </span>
                        </span>
                        <span
                          className="font-mono text-[10px] text-ink-600 transition-colors group-hover:text-sand"
                          dir="ltr"
                        >
                          {d.email}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <p data-ent className="mt-8 text-center text-[12px] text-ink-500">
                  حساب نداری؟{' '}
                  <Link
                    href="/register"
                    className="link-line inline-block py-1 text-ink-200 hover:text-sand"
                  >
                    ثبت‌نام کن
                  </Link>
                </p>
                <p data-ent className="mt-2 text-center">
                  <Link
                    href="/"
                    className="inline-block px-2 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-700 transition-colors hover:text-ink-400"
                  >
                    ← back to site
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
