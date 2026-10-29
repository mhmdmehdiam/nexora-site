'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import gsap from 'gsap'
import GoogleButton from '@/components/auth/google-button'
import { Counter } from '@/components/site/motion'
import { RegisterDecor, RegisterIntro, LiveFeed } from '@/components/auth/register-decor'

const INDUSTRIES = [
  { value: 'electronics', label: 'الکترونیک و دیجیتال' },
  { value: 'fashion', label: 'پوشاک و مد' },
  { value: 'food', label: 'خوراکی و مواد غذایی' },
  { value: 'retail', label: 'خرده‌فروشی عمومی' },
  { value: 'wholesale', label: 'عمده‌فروشی' },
  { value: 'services', label: 'خدماتی' },
  { value: 'other', label: 'سایر' },
]

const MARQUEE_ITEMS = [
  'ثبت‌نام در ۵ دقیقه',
  'بدون نیاز به کارت بانکی',
  'ورود با گوگل با یک کلیک',
  '۲٬۰۰۰+ کسب‌وکار فعال',
  'اولین فاکتور، همان امروز',
  'پشتیبانی ۲۴/۷',
]

const BURST_DOTS = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2
  const dist = 46 + (i % 3) * 18
  return {
    x: Math.cos(angle) * dist,
    y: Math.sin(angle) * dist,
    s: 3 + (i % 3),
    d: (i % 4) * 0.03,
  }
})

const STRENGTH = [
  { c: '', t: '' },
  { c: 'bg-red-400/80', t: 'ضعیف' },
  { c: 'bg-amber-400/80', t: 'متوسط' },
  { c: 'bg-sand', t: 'خوب' },
  { c: 'bg-emerald-400/90', t: 'عالی' },
]

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500"
    >
      {children}
    </label>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    businessName: '',
    ownerName: '',
    email: '',
    password: '',
    phone: '',
    industry: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [introDone, setIntroDone] = useState(false)

  const rootRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLDivElement>(null)
  const magnetRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const firstStepRender = useRef(true)
  const [burst, setBurst] = useState(0)

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  /* burst dots self-destruct once the animation is done */
  useEffect(() => {
    if (!burst) return
    const t = setTimeout(() => setBurst(0), 1100)
    return () => clearTimeout(t)
  }, [burst])

  /* live address preview from the business name (mirrors the API's slug logic) */
  const slug = useMemo(() => {
    const s = form.businessName
      .replace(/[^\w؀-ۿ\s]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .slice(0, 30)
    return s || null
  }, [form.businessName])

  /* password strength 0..4 */
  const strength = useMemo(() => {
    const p = form.password
    if (!p) return 0
    let s = 0
    if (p.length >= 6) s++
    if (p.length >= 10) s++
    if (/\d/.test(p) && /[a-zA-Z]/.test(p)) s++
    if (/[^a-zA-Z0-9]/.test(p)) s++
    return s
  }, [form.password])

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
      // gently fade the influence out with distance so it never snaps
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

  /* ---------- step transition: fields slide in from the inline side ---------- */
  useEffect(() => {
    if (firstStepRender.current) {
      firstStepRender.current = false
      return
    }
    const formEl = formRef.current
    if (!formEl) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const q = gsap.utils.selector(formEl)
    gsap.fromTo(
      q('[data-field]'),
      { autoAlpha: 0, x: -26 },
      { autoAlpha: 1, x: 0, duration: 0.55, stagger: 0.08, ease: 'power3.out' }
    )
  }, [step])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (step === 1) {
      setStep(2)
      setBurst(Date.now())
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'خطا در ایجاد حساب')
        return
      }
      router.push('/login?registered=true')
    } catch {
      setError('خطا در اتصال به سرور')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={rootRef} className="grain relative min-h-screen bg-ink-950 text-ink-100">
      {/* one-session intro curtain */}
      <RegisterIntro onLift={() => setIntroDone(true)} />

      {/* motion backdrop: orbs + particles + watermark + parallax */}
      <RegisterDecor />

      {/* the landing's custom cursor, now with form-safe native cursors */}

      {/* static gradient + grid (kept from the original design) */}
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
              <span className="sec-num">[START]</span>
              <span className="h-px w-10 bg-ink-100/20" />
            </div>
            <h1 className="text-[clamp(2.5rem,4.4vw,4rem)] font-black leading-[0.98] tracking-[-0.03em] text-ink-50">
              <span className="block overflow-hidden">
                <span data-ent-line className="block">
                  پنج دقیقه،
                </span>
              </span>
              <span className="block overflow-hidden">
                <span data-ent-line className="block">
                  تا <span className="shimmer-text">کنترل</span> کامل.
                </span>
              </span>
            </h1>
            <p data-ent className="mt-7 max-w-sm text-[14px] leading-8 text-ink-400">
              کسب‌وکارت را بساز، محصولات و مشتری‌ها را وارد کن و همان روز اولین فاکتور را بزن. پلن
              رایگان کارت بانکی نمی‌خواهد.
            </p>

            {/* animated stats */}
            <dl data-ent className="mt-9 flex gap-10">
              {[
                ['۲٬۰۰۰+', 'کسب‌وکار فعال'],
                ['۹۹.۹٪', 'آپتایم'],
                ['۲۴/۷', 'پشتیبانی'],
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

          <div data-ent className="space-y-5">
            <ol className="flex flex-col gap-3">
              {[
                'اطلاعات کسب‌وکار',
                'حساب کاربری',
                'ورود به داشبورد',
              ].map((t, i) => (
                <li key={t} className="flex items-center gap-3">
                  <span
                    className={`font-mono text-[10px] transition-colors duration-500 ${
                      i < step ? 'text-sand' : 'text-ink-700'
                    }`}
                  >
                    [{String(i + 1).padStart(2, '0')}]
                  </span>
                  <span
                    className={`text-[12px] transition-colors duration-500 ${
                      i < step ? 'text-ink-200' : 'text-ink-600'
                    }`}
                  >
                    {t}
                  </span>
                  {i < step && (
                    <span className="h-px flex-1 origin-right bg-sand/30" aria-hidden="true" />
                  )}
                </li>
              ))}
            </ol>

            {/* terminal-style live activity */}
            <LiveFeed />
          </div>
        </section>

        {/* ===== Form panel — glass card with a chasing light rim ===== */}
        <section className="relative flex min-w-0 items-center justify-center py-24 md:px-10 lg:py-0">
          {/* giant step watermark behind the card */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 z-0 hidden -translate-x-1/2 -translate-y-1/2 md:block"
          >
            <span key={step} dir="ltr" className="reg-step-num block text-[230px] font-bold">
              {String(step).padStart(2, '0')}
            </span>
          </span>

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

                <div className="mb-8" ref={formRef}>
                  <div data-ent className="mb-4 flex items-center gap-3">
                    <span className="sec-num">
                      [STEP {String(step).padStart(2, '0')} / 02]
                    </span>
                    <span className="h-px w-8 bg-ink-100/20" />
                  </div>
                  <h2 data-ent className="text-[26px] font-bold tracking-tight text-ink-50">
                    {step === 1 ? 'ثبت‌نام کسب‌وکار' : 'ساخت حساب کاربری'}
                  </h2>
                  <p data-ent className="mt-2 text-[12.5px] text-ink-500">
                    {step === 1
                      ? 'اول بگو کسب‌وکارت چیست.'
                      : 'حالا حساب مدیر را بساز.'}
                  </p>

                  {/* step bar */}
                  <div data-ent className="mb-8 mt-6 flex gap-1" aria-hidden="true">
                    {[1, 2].map((s) => (
                      <span
                        key={s}
                        className={`h-[2px] flex-1 origin-right transition-colors duration-500 ${
                          step >= s ? 'bg-sand' : 'bg-ink-100/[0.12]'
                        }`}
                      />
                    ))}
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                    {step === 1 ? (
                      <>
                    <div data-field>
                      <Label htmlFor="businessName">نام کسب‌وکار *</Label>
                      <input
                        id="businessName"
                        type="text"
                        value={form.businessName}
                        onChange={(e) => set('businessName', e.target.value)}
                        className="input-field"
                        placeholder="مثال: فروشگاه پارسیان"
                        required
                        autoComplete="organization"
                      />
                      {slug && (
                        <p
                          key="on"
                          className="slug-chip mt-2 flex items-center gap-1 font-mono text-[10.5px] text-ink-600"
                          dir="ltr"
                        >
                          <span className="text-sand/80">nexora.ir</span>
                          <span>/</span>
                          <span>{slug}…</span>
                        </p>
                      )}
                    </div>
                        <div data-field>
                          <Label htmlFor="industry">زمینه فعالیت</Label>
                          <select
                            id="industry"
                            value={form.industry}
                            onChange={(e) => set('industry', e.target.value)}
                            className="input-field"
                          >
                            <option value="">انتخاب کنید</option>
                            {INDUSTRIES.map((i) => (
                              <option key={i.value} value={i.value}>
                                {i.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div data-field>
                          <Label htmlFor="phone">شماره تماس</Label>
                          <input
                            id="phone"
                            type="tel"
                            value={form.phone}
                            onChange={(e) => set('phone', e.target.value)}
                            className="input-field"
                            placeholder="09121234567"
                            dir="ltr"
                            autoComplete="tel"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div data-field>
                          <Label htmlFor="ownerName">نام مدیر *</Label>
                          <input
                            id="ownerName"
                            type="text"
                            value={form.ownerName}
                            onChange={(e) => set('ownerName', e.target.value)}
                            className="input-field"
                            placeholder="نام و نام خانوادگی"
                            required
                            autoComplete="name"
                          />
                        </div>
                        <div data-field>
                          <Label htmlFor="email">ایمیل *</Label>
                          <input
                            id="email"
                            type="email"
                            value={form.email}
                            onChange={(e) => set('email', e.target.value)}
                            className="input-field"
                            placeholder="you@example.com"
                            required
                            dir="ltr"
                            autoComplete="email"
                          />
                        </div>
                    <div data-field>
                      <Label htmlFor="password">رمز عبور *</Label>
                      <input
                        id="password"
                        type="password"
                        value={form.password}
                        onChange={(e) => set('password', e.target.value)}
                        className="input-field"
                        placeholder="حداقل ۸ کاراکتر، شامل حرف و رقم"
                        required
                        dir="ltr"
                        minLength={8}
                        autoComplete="new-password"
                      />
                      {form.password && (
                        <div className="mt-2.5 flex items-center gap-2" aria-live="polite">
                          <div className="flex flex-1 gap-1" aria-hidden="true">
                            {[1, 2, 3, 4].map((i) => (
                              <span
                                key={i}
                                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                                  i <= strength ? STRENGTH[strength].c : 'bg-ink-100/[0.1]'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="w-12 text-left font-mono text-[10px] text-ink-500">
                            {STRENGTH[strength].t}
                          </span>
                        </div>
                      )}
                    </div>
                      </>
                    )}

                    <div data-field aria-live="polite" aria-atomic="true">
                      {error && (
                        <div className="flex items-start gap-2 border border-red-500/25 bg-red-500/[0.08] px-3 py-2.5 text-[12.5px] text-red-300">
                          <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 bg-red-400" />
                          {error}
                        </div>
                      )}
                    </div>

                    <div data-field className="relative flex gap-2" ref={magnetRef}>
                      {burst > 0 && (
                        <span key={burst} className="pointer-events-none absolute inset-0" aria-hidden="true">
                          {BURST_DOTS.map((d, i) => (
                            <span
                              key={i}
                              className="burst-dot"
                              style={{
                                left: '50%',
                                top: '50%',
                                width: d.s,
                                height: d.s,
                                ['--bx' as any]: `${d.x}px`,
                                ['--by' as any]: `${d.y}px`,
                                animationDelay: `${d.d}s`,
                              }}
                            />
                          ))}
                        </span>
                      )}
                      {step === 2 && (
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="btn-outline flex-1 py-3.5"
                        >
                          مرحله قبل
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={loading}
                        data-cursor-label={step === 1 ? 'ادامه' : 'ساختن حساب'}
                        className="btn-ink flex-1 py-3.5 transition-transform duration-200 will-change-transform"
                      >
                        {step === 1 ? 'مرحله بعد' : loading ? 'در حال ایجاد…' : 'ایجاد حساب'}
                      </button>
                    </div>
                  </form>

                  {/* Google sign-up (one click provisions the business) */}
                  <div data-ent className="mt-6">
                    <GoogleButton label="ثبت‌نام با گوگل" />
                  </div>

                  <p data-ent className="mt-8 text-center text-[12px] text-ink-500">
                    قبلاً ثبت‌نام کردی؟{' '}
                    <Link
                      href="/login"
                      className="link-line inline-block py-1 text-ink-200 hover:text-sand"
                    >
                      وارد شو
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
          </div>
        </section>
      </div>
    </div>
  )
}
