import type { Metadata } from 'next'
import Link from 'next/link'
import { PLANS } from '@/lib/plans'
import CheckoutButton from '@/components/billing/checkout-button'
import { MiniFooter } from '@/components/site/mini-footer'
import { MotionPage } from '@/components/motion/motion-page'
import { ClipReveal, Stagger, Tilt, CountUp, Magnetic } from '@/components/motion/kit'

export const metadata: Metadata = {
  title: 'تعرفه‌ها و قیمت‌گذاری',
  description: 'پلن‌های نکسورا: رایگان شروع کن، حرفه‌ای رشد کن. قیمت شفاف به تومان، بدون هزینه‌ی پنهان.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    type: 'website',
    title: 'تعرفه‌ها و قیمت‌گذاری — نکسورا',
    description: 'پلن‌های نکسورا: رایگان شروع کن، حرفه‌ای رشد کن.',
    url: '/pricing',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'تعرفه‌های نکسورا' }],
  },
}

export default function PricingPage() {
  return (
    <MotionPage className="grain min-h-screen bg-ink-950 text-ink-100">
      {/* grid backdrop — kept, it is what makes the cards read as objects */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(201,183,156,0.12),transparent_55%)]" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'linear-gradient(rgba(247,245,240,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(247,245,240,0.03) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
            maskImage: 'radial-gradient(ellipse 70% 55% at 50% 25%, black 10%, transparent 75%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 70% 55% at 50% 25%, black 10%, transparent 75%)',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-[1100px] px-5 py-16 md:px-8 md:py-24">
        {/* header */}
        <div className="text-center">
          <div data-mv="hero" className="mb-5 flex items-center justify-center gap-3">
            <span className="sec-num">[PLANS]</span>
            <span className="h-px w-10 bg-ink-100/20" />
          </div>
          <ClipReveal
            as="h1"
            className="block text-[clamp(2.2rem,5vw,3.4rem)] font-black leading-tight tracking-tight text-ink-50"
          >
            ساده شروع کن، <span className="text-sand">جدی</span> رشد کن.
          </ClipReveal>
          <p
            data-mv="hero"
            className="mx-auto mt-5 max-w-xl text-[14px] leading-8 text-ink-400"
          >
            هر پلن، ماهانه است و هر زمان می‌توانی ارتقا دهی یا لغو کنی. شروع همیشه رایگان است.
          </p>
        </div>

        {/* plans */}
        <Stagger className="mt-14 grid gap-5 md:grid-cols-3" step={0.09} y={40}>
          {PLANS.map((plan) => {
            return (
              <div key={plan.id} className="h-full">
                <Tilt max={5} className="h-full rounded-3xl">
                  <div
                    className={`relative flex h-full flex-col rounded-3xl border p-7 transition-colors ${
                      plan.highlight
                        ? 'border-sand/40 bg-ink-50/[0.04]'
                        : 'border-ink-100/[0.1] bg-ink-50/[0.015] hover:border-ink-100/[0.18]'
                    }`}
                  >
                    {/* the recommended plan breathes — one card only, so it
                        stays a signal rather than decoration */}
                    {plan.highlight && (
                      <span className="mv-glow-ring pointer-events-none absolute -inset-px rounded-3xl" aria-hidden="true" />
                    )}

                    {plan.highlight && (
                      <span className="absolute -top-3 right-6 rounded-full bg-sand px-3 py-1 font-mono text-[8.5px] uppercase tracking-[0.14em] text-ink-950">
                        پیشنهاد ما
                      </span>
                    )}

                    <h2 className="text-[17px] font-bold text-ink-50">{plan.name}</h2>
                    <p className="mt-1.5 text-[11.5px] text-ink-500">{plan.tagline}</p>

                    <div className="mt-6 flex items-baseline gap-1.5">
                      <span className="text-[34px] font-black leading-none text-ink-50">
                        {plan.price === 0 ? (
                          '۰'
                        ) : (
                          <CountUp end={plan.price} duration={1.4} />
                        )}
                      </span>
                      <span className="text-[12px] text-ink-500">
                        {plan.price === 0 ? '' : 'تومان / ماه'}
                      </span>
                    </div>

                    <ul className="mt-7 flex flex-1 flex-col gap-3">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-[12.5px] text-ink-300">
                          <span
                            className="mt-[7px] h-1 w-1 shrink-0 bg-sand"
                            aria-hidden="true"
                          />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-8">
                      {plan.id === 'free' ? (
                        <Magnetic strength={0.16}>
                          <Link
                            href="/register"
                            className="btn-outline block w-full py-3 text-center text-[13px]"
                          >
                            شروع رایگان
                          </Link>
                        </Magnetic>
                      ) : (
                        <Magnetic strength={0.16}>
                          <CheckoutButton
                            plan={plan.id}
                            label={`ارتقا به ${plan.name}`}
                            className="btn-ink w-full py-3 text-[13px]"
                          />
                        </Magnetic>
                      )}
                    </div>
                  </div>
                </Tilt>
              </div>
            )
          })}
        </Stagger>

        {/* trust strip */}
        <div
          data-mv-stagger="0.08"
          className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-600"
        >
          <span>پرداخت امن زرین‌پال</span>
          <span className="h-1 w-1 bg-sand/50" aria-hidden="true" />
          <span>لغو در هر زمان</span>
          <span className="h-1 w-1 bg-sand/50" aria-hidden="true" />
          <span>داده‌های هر کسب‌وکار کاملاً جداست</span>
        </div>

        <p data-mv="0.1" className="mt-10 text-center">
          <Link
            href="/"
            className="mv-link inline-block px-2 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-700 transition-colors hover:text-ink-400"
          >
            ← back to site
          </Link>
        </p>
      </div>
      <MiniFooter />
    </MotionPage>
  )
}
