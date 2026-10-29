'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import gsap from 'gsap'
import type { SiteContent } from '@/lib/site-content'
import { SiteNav, type NavLinkItem } from './nav'
import { FaqAccordion } from './faq'
import { Reveal, SplitRise, Counter, Parallax } from './motion'
import { Intro } from './intro'
import dynamic from 'next/dynamic'

/**
 * Three.js is ~600 kB of the landing bundle. Deferring it means the hero
 * headline, nav and CTA paint on the first frame instead of waiting for a
 * WebGL library most visitors never look at closely. The canvas fades in
 * when it is ready; nothing shifts because it sits behind the text.
 */
const HeroSpace = dynamic(() => import('./hero-space').then((m) => m.HeroSpace), {
  ssr: false,
  loading: () => null,
})
import { ChapterDeck } from './slide-flow'

export interface PostTeaser {
  title: string
  slug: string
  excerpt: string | null
  publishedAt: string | null
}

const faNum = (n: number) => new Intl.NumberFormat('fa-IR').format(n)

function SectionHead({
  index,
  title,
  subtitle,
  align = 'start',
}: {
  index: string
  title: string
  subtitle?: string
  align?: 'start' | 'center'
}) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-3xl'}>
      <Reveal>
        <div
          className={`mb-6 flex items-center gap-3 ${
            align === 'center' ? 'justify-center' : ''
          }`}
        >
          <span className="sec-num">[{index}]</span>
          <span className="h-px w-8 bg-ink-100/20" />
        </div>
      </Reveal>
      <Reveal delay={0.05}>
        <h2 className="text-display-md font-bold text-ink-50">{title}</h2>
      </Reveal>
      {subtitle ? (
        <Reveal delay={0.1}>
          <p className="mt-5 max-w-xl text-[15px] leading-8 text-ink-400">{subtitle}</p>
        </Reveal>
      ) : null}
    </div>
  )
}

/* =========================================================
   Product mockup — a credible CSS rendering of the dashboard
   ========================================================= */
function ProductFrame() {
  const bars = [38, 62, 45, 78, 56, 88, 70, 94, 66, 82, 74, 96]
  return (
    <div className="relative mx-auto w-full max-w-[1080px]">
      <div className="absolute -inset-x-6 -top-6 bottom-0 bg-gradient-to-b from-ink-50/[0.04] to-transparent blur-2xl" />
      <div className="relative border border-ink-100/[0.12] bg-ink-900/90 backdrop-blur-sm">
        {/* chrome */}
        <div className="flex items-center gap-3 border-b border-ink-100/[0.08] px-4 py-3">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="h-2 w-2 rounded-full bg-ink-100/20" />
            <span className="h-2 w-2 rounded-full bg-ink-100/20" />
            <span className="h-2 w-2 rounded-full bg-ink-100/20" />
          </div>
          <div className="mx-auto font-mono text-[10px] tracking-[0.12em] text-ink-500">
            app.nexora.ir / dashboard
          </div>
          <span className="font-mono text-[10px] text-ink-600">۱۴۰۵</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[180px_1fr]">
          {/* sidebar */}
          <aside className="hidden flex-col gap-1 border-l border-ink-100/[0.08] p-4 md:flex">
            {['داشبورد', 'فروش', 'مشتریان', 'محصولات', 'فاکتورها', 'گزارش‌ها'].map((x, i) => (
              <div
                key={x}
                className={`flex items-center gap-2 px-2 py-2 text-[11.5px] ${
                  i === 0 ? 'bg-ink-50/[0.06] text-ink-100' : 'text-ink-500'
                }`}
              >
                <span
                  className={`h-1 w-1 ${i === 0 ? 'bg-sand' : 'bg-ink-600'}`}
                  aria-hidden="true"
                />
                {x}
              </div>
            ))}
            <div className="mt-auto border-t border-ink-100/[0.08] pt-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center bg-ink-50/10 text-[10px] text-ink-300">
                  ع
                </span>
                <div className="leading-tight">
                  <div className="text-[10px] text-ink-200">علی محمدی</div>
                  <div className="text-[9px] text-ink-600">مدیر فروشگاه</div>
                </div>
              </div>
            </div>
          </aside>

          {/* main */}
          <div className="p-4 md:p-6">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <div className="font-mono text-[9px] tracking-[0.14em] text-ink-500">
                  OVERVIEW
                </div>
                <div className="mt-1 text-[13px] text-ink-100">خلاصه‌ی امروز</div>
              </div>
              <div className="font-mono text-[9px] text-ink-500">LIVE</div>
            </div>

            <div className="grid grid-cols-3 gap-2 md:gap-3">
              {[
                { l: 'فروش امروز', v: '۱۲,۴۸۰,۰۰۰', d: '+۱۸٪' },
                { l: 'فاکتور باز', v: '۲۳', d: '−۴' },
                { l: 'مشتری جدید', v: '۹', d: '+۲' },
              ].map((s) => (
                <div key={s.l} className="border border-ink-100/[0.08] bg-ink-950/40 p-2.5 md:p-3">
                  <div className="text-[9.5px] text-ink-500">{s.l}</div>
                  <div className="mt-1 text-[12px] font-semibold text-ink-100 md:text-[15px]">
                    {s.v}
                  </div>
                  <div className="mt-0.5 font-mono text-[9px] text-sand">{s.d}</div>
                </div>
              ))}
            </div>

            <div className="mt-3 border border-ink-100/[0.08] bg-ink-950/40 p-3 md:p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-[10px] text-ink-400">فروش ۱۲ ماه</div>
                <div className="font-mono text-[9px] text-ink-600">TOTAL 84.2M</div>
              </div>
              <div className="flex h-20 items-end gap-1 md:h-24 md:gap-1.5" aria-hidden="true">
                {bars.map((h, i) => (
                  <div
                    key={i}
                    className={`flex-1 ${i === bars.length - 1 ? 'bg-sand' : 'bg-ink-50/20'}`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>

            <div className="mt-3 hidden border border-ink-100/[0.08] bg-ink-950/40 md:block">
              {[
                ['INV-1042', 'دیجی‌لند', '۴,۲۰۰,۰۰۰', 'پرداخت شد'],
                ['INV-1041', 'مُدا استایل', '۱,۸۵۰,۰۰۰', 'در انتظار'],
              ].map((r, i) => (
                <div
                  key={r[0]}
                  className={`grid grid-cols-[70px_1fr_90px_70px] items-center gap-2 px-3 py-2 text-[10px] ${
                    i === 0 ? '' : 'border-t border-ink-100/[0.06]'
                  }`}
                >
                  <span className="font-mono text-ink-600">{r[0]}</span>
                  <span className="text-ink-300">{r[1]}</span>
                  <span className="font-mono text-ink-400">{r[2]}</span>
                  <span className={i === 0 ? 'text-sand' : 'text-ink-500'}>{r[3]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ========================================================= */

export function Landing({
  content,
  navLinks,
  posts = [],
}: {
  content: SiteContent
  navLinks: NavLinkItem[]
  posts?: PostTeaser[]
}) {
  const [yearly, setYearly] = useState(false)
  const { hero, logos, howItWorks, features, pricing, testimonials, faq, cta, footer } = content

  const featuresList = useMemo(() => features.items.slice(0, 9), [features.items])

  const heroRef = useRef<HTMLElement>(null)
  const played = useRef(false)
  const [introDone, setIntroDone] = useState(false)

  const motionOff = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Put the hero in its start state while the curtain still covers it.
  useEffect(() => {
    const root = heroRef.current
    if (!root || motionOff()) return
    const q = gsap.utils.selector(root)
    gsap.set(q('[data-line]'), { yPercent: 112 })
    gsap.set(q('[data-hero="fade"]'), { autoAlpha: 0, y: 22 })
    gsap.set(q('[data-hero="frame"]'), { autoAlpha: 0, y: 70, scale: 0.985 })
  }, [])

  // Play once the curtain starts lifting.
  const playHero = () => {
    const root = heroRef.current
    if (!root || played.current || motionOff()) return
    played.current = true

    const q = gsap.utils.selector(root)
    gsap
      .timeline()
      .to(q('[data-line]'), {
        yPercent: 0,
        duration: 1.15,
        stagger: 0.1,
        ease: 'power4.out',
      })
      .to(
        q('[data-hero="fade"]'),
        { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out' },
        '-=0.85'
      )
      .to(
        q('[data-hero="frame"]'),
        { autoAlpha: 1, y: 0, scale: 1, duration: 1.15, ease: 'power3.out' },
        '-=0.9'
      )
  }

  useEffect(() => {
    if (!introDone) return
    playHero()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [introDone])

  // Safety net: never leave the hero hidden if the intro never reports back.
  useEffect(() => {
    const t = window.setTimeout(() => playHero(), 6000)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="relative min-h-screen overflow-x-clip bg-ink-950 text-ink-100">
      <Intro onDone={() => setIntroDone(true)} />
      <HeroSpace />
      <ChapterDeck />
      <SiteNav links={navLinks} />

      <main id="main">
        {/* ================= HERO ================= */}
        <section ref={heroRef} data-chapter className="chapter--ghost relative grain overflow-hidden pt-28 md:pt-32">
          {/* background */}
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(201,183,156,0.10),transparent_55%)]" />
            <div
              className="absolute inset-0 opacity-[0.55]"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(247,245,240,0.028) 1px, transparent 1px), linear-gradient(90deg, rgba(247,245,240,0.028) 1px, transparent 1px)',
                backgroundSize: '88px 88px',
                maskImage: 'radial-gradient(ellipse 80% 60% at 50% 20%, black 20%, transparent 75%)',
                WebkitMaskImage:
                  'radial-gradient(ellipse 80% 60% at 50% 20%, black 20%, transparent 75%)',
              }}
            />
          </div>

          <div className="relative z-10 mx-auto max-w-[1440px] px-5 md:px-8 lg:px-12">
            <div data-hero="fade" className="flex items-center gap-3">
              <span className="h-1 w-1 bg-sand" aria-hidden="true" />
              <span className="eyebrow">{hero.eyebrow}</span>
              <span className="hidden h-px flex-1 bg-ink-100/10 sm:block" />
              <span className="hidden font-mono text-[10px] tracking-[0.14em] text-ink-600 sm:block">
                EST. 2024 — TEHRAN
              </span>
            </div>

            <h1 className="mt-10 text-display-xl font-black leading-[0.95] text-ink-50 md:mt-14">
              <span className="-mb-[0.16em] block overflow-hidden pb-[0.16em]">
                <span data-line className="block">
                  {hero.titlePrefix}{' '}
                </span>
              </span>
              <span className="-mb-[0.16em] mt-2 block overflow-hidden pb-[0.16em] text-sand">
                <span data-line className="block">
                  {hero.titleHighlight}{' '}
                  <span className="inline-block">{hero.titleSuffix}</span>
                </span>
              </span>
            </h1>

            <div className="mt-10 grid gap-10 md:mt-14 md:grid-cols-[1fr_auto] md:items-end">
              <div data-hero="fade">
                <p className="max-w-xl text-[15px] leading-8 text-ink-400 md:text-base">
                  {hero.subtitle}
                </p>
              </div>

              <div data-hero="fade">
                <div className="flex flex-wrap items-center gap-3">
                  <Link href="/register" className="btn-ink group">
                    {hero.ctaPrimary}
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      aria-hidden="true"
                      className="transition-transform duration-300 group-hover:-translate-x-1"
                    >
                      <path d="M9 3L4 7l5 4" stroke="currentColor" strokeWidth="1.3" />
                    </svg>
                  </Link>
                  <a href="#features" className="btn-outline">
                    {hero.ctaSecondary}
                  </a>
                </div>
              </div>
            </div>

            {/* stats */}
            <div className="mt-16 grid grid-cols-2 border-t border-ink-100/[0.10] md:mt-24 md:grid-cols-4">
              {hero.stats.map((s, i) => (
                <div
                  key={s.label}
                  data-hero="fade"
                  className={`px-1 py-6 md:px-6 md:py-8 ${
                    i > 0 ? 'md:border-r md:border-ink-100/[0.10]' : ''
                  } ${i % 2 === 1 ? 'border-r border-ink-100/[0.10] md:border-r' : ''}`}
                >
                  <div className="text-3xl font-bold tabular-nums text-ink-50 md:text-[42px]">
                    <Counter end={s.value} suffix={s.suffix} />
                  </div>
                  <div className="mt-2 text-[11.5px] text-ink-500">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* product frame */}
          <div className="relative z-10 mx-auto mt-16 max-w-[1440px] px-5 md:mt-20 md:px-8 lg:px-12">
            <div data-hero="frame" data-cursor data-cursor-label="پیش‌نمایش محصول">
              <Parallax strength={26}>
                <ProductFrame />
              </Parallax>
            </div>
          </div>

          <div className="h-20 md:h-28" />
        </section>

        {/* ================= LOGOS ================= */}
        <section aria-label="مشتریان" className="border-y border-ink-100/[0.08] py-8">
          <div className="mx-auto flex max-w-[1440px] items-center gap-6 px-5 md:px-8 lg:px-12">
            <p className="hidden shrink-0 text-[11px] text-ink-600 md:block">{logos.title}</p>
            <div className="relative flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
              <div className="marquee-track gap-14">
                {[...logos.items, ...logos.items].map((name, i) => (
                  <span
                    key={i}
                    className="whitespace-nowrap font-mono text-[12px] uppercase tracking-[0.18em] text-ink-500"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ================= STATEMENT ================= */}
        <section data-chapter className="chapter relative">
          <div className="mx-auto w-full max-w-[1440px] px-5 py-16 md:px-8 md:py-28 lg:px-12 lg:py-36">
          <div className="grid gap-10 lg:grid-cols-[220px_1fr] lg:gap-16">
            <div className="lg:sticky lg:top-32 lg:self-start">
              <Reveal>
                <div className="sec-num">[02]</div>
                <div className="mt-3 h-px w-10 bg-ink-100/20" />
                <p className="mt-4 max-w-[180px] text-[12px] leading-6 text-ink-600">
                  چرا نکسورا
                </p>
              </Reveal>
            </div>

            <div>
              <Reveal>
                <p className="text-display-md font-bold leading-[1.25] text-ink-200">
                  بیشتر کسب‌وکارهای کوچک، فروششان را در{' '}
                  <span className="text-ink-500">دفتر و اکسل</span> نگه می‌دارند. نتیجه‌اش؟
                  تصمیم‌هایی که بر پایه‌ی حدس گرفته می‌شوند.
                </p>
              </Reveal>
              <Reveal delay={0.1}>
                <p className="mt-8 max-w-2xl text-[15px] leading-9 text-ink-400">
                  نکسورا همان دفتر را به یک سیستم زنده تبدیل می‌کند: هر فروش، هر فاکتور و هر
                  مشتری در یک جا ثبت می‌شود و بلافاصله به عدد، نمودار و پیش‌بینی تبدیل می‌شود.
                  دیگر لازم نیست آخر ماه بنشینی و جمع بزنی.
                </p>
              </Reveal>

              <Reveal delay={0.15}>
                <div className="mt-12 grid gap-px overflow-hidden border border-ink-100/[0.08] bg-ink-100/[0.08] sm:grid-cols-3">
                  {[
                    { k: '۴۰٪', v: 'میانگین رشد فروش' },
                    { k: '۵ دقیقه', v: 'زمان راه‌اندازی' },
                    { k: '۲۴/۷', v: 'دسترسی به داده‌ها' },
                  ].map((s) => (
                    <div key={s.k} className="bg-ink-950 p-6">
                      <div className="text-2xl font-bold text-ink-50">{s.k}</div>
                      <div className="mt-1.5 text-[11.5px] text-ink-500">{s.v}</div>
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>
          </div>
          </div>
        </section>

        {/* ================= FEATURES ================= */}
        <section id="features" data-chapter className="chapter scroll-mt-24 border-t border-ink-100/[0.08]">
          <div className="mx-auto max-w-[1440px] px-5 py-16 md:px-8 md:py-28 lg:px-12">
            <SectionHead index="03" title={features.title} subtitle={features.subtitle} />

            <div className="mt-16 grid border-t border-ink-100/[0.10] sm:grid-cols-2 lg:grid-cols-3">
              {featuresList.map((f, i) => (
                <Reveal key={f.title} delay={0.03 * (i % 3)}>
                  <div className="group relative border-b border-ink-100/[0.10] p-7 transition-colors duration-500 hover:bg-ink-50/[0.025] sm:border-l sm:[&:nth-child(2n+1)]:border-l-0 lg:[&:nth-child(2n+1)]:border-l lg:[&:nth-child(3n+1)]:border-l-0">
                    <div className="flex items-start justify-between">
                      <span className="font-mono text-[10px] tracking-[0.12em] text-ink-600 transition-colors group-hover:text-sand">
                        [{String(i + 1).padStart(2, '0')}]
                      </span>
                      <span
                        className="h-1 w-1 bg-ink-700 transition-all duration-500 group-hover:w-6 group-hover:bg-sand"
                        aria-hidden="true"
                      />
                    </div>
                    <h3 className="mt-8 text-[17px] font-semibold text-ink-50">{f.title}</h3>
                    <p className="mt-3 text-[13.5px] leading-7 text-ink-400">{f.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ================= HOW IT WORKS ================= */}
        <section data-chapter className="chapter border-t border-ink-100/[0.08]">
          <div className="mx-auto max-w-[1440px] px-5 py-16 md:px-8 md:py-28 lg:px-12">
            <SectionHead index="04" title={howItWorks.title} subtitle={howItWorks.subtitle} />

            <div className="mt-16 grid gap-px border-t border-ink-100/[0.10] bg-ink-100/[0.10] md:grid-cols-3">
              {howItWorks.steps.map((s, i) => (
                <Reveal key={s.title} delay={0.08 * i}>
                  <div className="h-full bg-ink-950 p-8 md:p-10">
                    <div className="font-serif text-[56px] italic leading-none text-ink-700">
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <h3 className="mt-6 text-lg font-semibold text-ink-50">{s.title}</h3>
                    <p className="mt-3 text-[13.5px] leading-7 text-ink-400">{s.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ================= PRICING ================= */}
        <section id="pricing" data-chapter className="chapter scroll-mt-24 border-t border-ink-100/[0.08]">
          <div className="mx-auto max-w-[1440px] px-5 py-16 md:px-8 md:py-28 lg:px-12">
            <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
              <SectionHead index="05" title={pricing.title} subtitle={pricing.subtitle} />

              <Reveal delay={0.1}>
                <div
                  className="inline-flex items-center border border-ink-100/15 p-1"
                  role="group"
                  aria-label="دوره‌ی پرداخت"
                >
                  <button
                    type="button"
                    onClick={() => setYearly(false)}
                    aria-pressed={!yearly}
                    className={`px-4 py-2 text-[12px] transition-colors duration-300 ${
                      !yearly ? 'bg-ink-50 text-ink-950' : 'text-ink-400 hover:text-ink-100'
                    }`}
                  >
                    ماهانه
                  </button>
                  <button
                    type="button"
                    onClick={() => setYearly(true)}
                    aria-pressed={yearly}
                    className={`flex items-center gap-1.5 px-4 py-2 text-[12px] transition-colors duration-300 ${
                      yearly ? 'bg-ink-50 text-ink-950' : 'text-ink-400 hover:text-ink-100'
                    }`}
                  >
                    سالانه
                    <span
                      className={`font-mono text-[9px] ${
                        yearly ? 'text-ink-700' : 'text-sand'
                      }`}
                    >
                      −۱۰٪
                    </span>
                  </button>
                </div>
              </Reveal>
            </div>

            <div className="mt-14 grid gap-4 lg:grid-cols-3">
              {pricing.plans.map((p, i) => {
                const price = yearly ? p.yearlyPrice : p.monthlyPrice
                return (
                  <Reveal key={p.name} delay={0.06 * i}>
                    <div
                      className={`relative flex h-full flex-col border p-7 transition-colors duration-500 md:p-9 ${
                        p.popular
                          ? 'border-sand/50 bg-ink-50/[0.03]'
                          : 'border-ink-100/[0.10] hover:border-ink-100/25'
                      }`}
                    >
                      {p.badge ? (
                        <span className="absolute -top-3 right-7 bg-sand px-2.5 py-1 font-mono text-[9px] tracking-[0.14em] text-ink-950">
                          {p.badge}
                        </span>
                      ) : null}

                      <div className="flex items-baseline justify-between">
                        <h3 className="text-lg font-semibold text-ink-50">{p.name}</h3>
                        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-600">
                          {p.nameEn}
                        </span>
                      </div>
                      <p className="mt-2 text-[12.5px] text-ink-500">{p.desc}</p>

                      <div className="mt-8 flex items-end gap-2">
                        <span className="text-[34px] font-bold leading-none tabular-nums text-ink-50">
                          {price === 0 ? 'رایگان' : faNum(price)}
                        </span>
                        {price !== 0 ? (
                          <span className="pb-1 text-[11.5px] text-ink-500">
                            تومان / {yearly ? 'سال' : 'ماه'}
                          </span>
                        ) : null}
                      </div>

                      <div className="my-7 h-px bg-ink-100/[0.10]" />

                      <ul className="flex flex-col gap-3">
                        {p.features.map((f) => (
                          <li key={f.text} className="flex items-start gap-2.5 text-[13px]">
                            <span
                              aria-hidden="true"
                              className={`mt-2 h-1 w-1 shrink-0 ${
                                f.included ? 'bg-sand' : 'bg-ink-700'
                              }`}
                            />
                            <span
                              className={f.included ? 'text-ink-300' : 'text-ink-600 line-through'}
                            >
                              {f.text}
                            </span>
                          </li>
                        ))}
                      </ul>

                      <Link
                        href={p.monthlyPrice === 0 ? '/register' : '/register'}
                        className={`mt-9 flex w-full items-center justify-center py-3.5 text-[12.5px] font-semibold transition-all duration-300 ease-editorial ${
                          p.popular
                            ? 'bg-ink-50 text-ink-950 hover:opacity-90'
                            : 'border border-ink-100/20 text-ink-100 hover:border-ink-100/45 hover:bg-ink-50/[0.04]'
                        }`}
                      >
                        {p.cta}
                      </Link>
                    </div>
                  </Reveal>
                )
              })}
            </div>

            <Reveal delay={0.1}>
              <p className="mt-8 text-center text-[11.5px] text-ink-600">
                همه‌ی پلن‌ها شامل رمزنگاری داده، پشتیبان‌گیری روزانه و به‌روزرسانی رایگان هستند.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ================= TESTIMONIALS ================= */}
        <section
          id="testimonials"
          data-chapter
          className="chapter scroll-mt-24 border-t border-ink-100/[0.08]"
        >
          <div className="mx-auto max-w-[1440px] px-5 py-16 md:px-8 md:py-28 lg:px-12">
            <SectionHead index="06" title={testimonials.title} subtitle={testimonials.subtitle} />

            <div className="mt-14 grid gap-px border-t border-ink-100/[0.10] bg-ink-100/[0.10] md:grid-cols-3">
              {testimonials.items.map((t, i) => (
                <Reveal key={t.name} delay={0.08 * i}>
                  <figure className="flex h-full flex-col bg-ink-950 p-8 md:p-9">
                    <div
                      className="font-serif text-[44px] leading-none text-sand/60"
                      aria-hidden="true"
                    >
                      &rdquo;
                    </div>
                    <blockquote className="mt-3 flex-1 text-[14.5px] leading-8 text-ink-200">
                      {t.text}
                    </blockquote>
                    <figcaption className="mt-7 flex items-center gap-3 border-t border-ink-100/[0.08] pt-5">
                      <span className="flex h-9 w-9 items-center justify-center border border-ink-100/15 text-[12px] text-ink-200">
                        {t.avatar}
                      </span>
                      <div>
                        <div className="text-[12.5px] font-medium text-ink-100">{t.name}</div>
                        <div className="mt-0.5 text-[11px] text-ink-500">{t.role}</div>
                      </div>
                      <span className="mr-auto flex items-center gap-1" aria-label={`امتیاز ${t.rating} از ۵`}>
                        {Array.from({ length: 5 }).map((_, si) => (
                          <span
                            key={si}
                            aria-hidden="true"
                            className={`h-1 w-1 ${si < t.rating ? 'bg-sand' : 'bg-ink-700'}`}
                          />
                        ))}
                      </span>
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ================= FAQ ================= */}
        <section id="faq" data-chapter className="chapter scroll-mt-24 border-t border-ink-100/[0.08]">
          <div className="mx-auto max-w-[1440px] px-5 py-16 md:px-8 md:py-28 lg:px-12">
            <div className="grid gap-12 lg:grid-cols-[380px_1fr] lg:gap-20">
              <div className="lg:sticky lg:top-32 lg:self-start">
                <SectionHead index="07" title={faq.title} subtitle={faq.subtitle} />
                <Reveal delay={0.15}>
                  <a
                    href="#cta"
                    className="mt-8 inline-flex items-center gap-2 text-[12.5px] text-ink-300 transition-colors hover:text-sand"
                  >
                    <span className="link-line">سوال دیگری داری؟ بنویس</span>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path d="M8 2L3 6l5 4" stroke="currentColor" strokeWidth="1.2" />
                    </svg>
                  </a>
                </Reveal>
              </div>

              <Reveal delay={0.1}>
                <FaqAccordion items={faq.items} />
              </Reveal>
            </div>
          </div>
        </section>

        {/* ================= BLOG ================= */}
        {posts.length > 0 ? (
          <section data-chapter className="chapter border-t border-ink-100/[0.08]">
            <div className="mx-auto max-w-[1440px] px-5 py-16 md:px-8 md:py-28 lg:px-12">
              <div className="flex items-end justify-between gap-6">
                <SectionHead index="08" title="از دفترِ ما" subtitle="یادداشت‌هایی درباره‌ی فروش، داده و رشد." />
                <Reveal delay={0.1}>
                  <Link
                    href="/blog"
                    className="hidden shrink-0 items-center gap-2 text-[12.5px] text-ink-300 transition-colors hover:text-sand sm:flex"
                  >
                    <span className="link-line">همه‌ی نوشته‌ها</span>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path d="M8 2L3 6l5 4" stroke="currentColor" strokeWidth="1.2" />
                    </svg>
                  </Link>
                </Reveal>
              </div>

              <div className="mt-14 grid gap-px border-t border-ink-100/[0.10] bg-ink-100/[0.10] md:grid-cols-3">
                {posts.slice(0, 3).map((p, i) => (
                  <Reveal key={p.slug} delay={0.07 * i}>
                    <Link
                      href={`/blog/${p.slug}`}
                      className="group flex h-full flex-col bg-ink-950 p-8 transition-colors hover:bg-ink-50/[0.025]"
                    >
                      <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.12em] text-ink-600">
                        <span>[{String(i + 1).padStart(2, '0')}]</span>
                        <span>
                          {p.publishedAt
                            ? new Date(p.publishedAt).toLocaleDateString('fa-IR')
                            : ''}
                        </span>
                      </div>
                      <h3 className="mt-8 text-[17px] font-semibold leading-8 text-ink-50 transition-colors group-hover:text-sand">
                        {p.title}
                      </h3>
                      {p.excerpt ? (
                        <p className="mt-3 line-clamp-3 text-[13px] leading-7 text-ink-400">
                          {p.excerpt}
                        </p>
                      ) : null}
                      <span className="mt-auto pt-7 text-[11.5px] text-ink-500">ادامه‌ی مطلب →</span>
                    </Link>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* ================= CTA ================= */}
        <section id="cta" data-chapter className="chapter relative scroll-mt-24 overflow-hidden border-t border-ink-100/[0.08]">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(201,183,156,0.14),transparent_60%)]" />
          </div>
          <div className="relative z-20 mx-auto max-w-[1440px] px-5 py-20 text-center md:px-8 md:py-36 lg:px-12">
            <Reveal>
              <div className="sec-num mb-8">[09]</div>
            </Reveal>
            <h2 className="mx-auto max-w-4xl text-display-lg font-black text-ink-50">
              <SplitRise text={cta.title} />
            </h2>
            <Reveal delay={0.15}>
              <p className="mx-auto mt-6 max-w-xl text-[15px] leading-8 text-ink-400">
                {cta.subtitle}
              </p>
            </Reveal>
            <Reveal delay={0.25}>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <Link href="/register" className="btn-ink">
                  {cta.primary}
                </Link>
                <a href="mailto:sales@nexora.ir" className="btn-outline">
                  {cta.secondary}
                </a>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-ink-100/[0.08]">
        <div className="mx-auto max-w-[1440px] px-5 py-16 md:px-8 lg:px-12">
          <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="h-1.5 w-1.5 bg-sand" aria-hidden="true" />
                <span className="font-serif text-[22px] italic text-ink-50">Nexora</span>
              </div>
              <p className="mt-5 max-w-xs text-[12.5px] leading-7 text-ink-500">
                {footer.about}
              </p>
              <div className="mt-6 flex gap-4">
                {footer.socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    className="inline-block py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500 transition-colors hover:text-sand"
                  >
                    {s.label}
                  </a>
                ))}
              </div>
            </div>

            {footer.columns.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-600">
                  {col.title}
                </h3>
                <ul className="mt-3 flex flex-col gap-0.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="inline-block py-1.5 text-[12.5px] text-ink-400 transition-colors hover:text-ink-50"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>

          <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-ink-100/[0.08] pt-7 md:flex-row md:items-center">
            <p className="text-[11.5px] text-ink-600">{footer.copyright}</p>
            <p className="font-mono text-[10px] tracking-[0.12em] text-ink-700">
              DESIGNED IN TEHRAN
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
