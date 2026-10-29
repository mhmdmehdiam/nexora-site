/**
 * Subscription plans — single source of truth for pricing (Toman, integer).
 * The pricing page, checkout and the admin panel all read from here.
 */

export type PlanId = 'free' | 'pro' | 'enterprise'

export interface PlanDef {
  id: PlanId
  name: string
  /** Monthly price in Toman (integer). */
  price: number
  tagline: string
  features: string[]
  highlight?: boolean
}

export const PLANS: PlanDef[] = [
  {
    id: 'free',
    name: 'رایگان',
    price: 0,
    tagline: 'برای شروع و امتحان کردن',
    features: [
      'تا ۵۰ مشتری',
      'تا ۳۰ محصول',
      'ثبت فروش و فاکتور',
      'داشبورد و گزارش پایه',
      '۲ کاربر',
    ],
  },
  {
    id: 'pro',
    name: 'حرفه‌ای',
    price: 299_000,
    tagline: 'برای کسب‌وکارهایی که جدی رشد می‌کنند',
    features: [
      'تا ۵۰۰ مشتری',
      'تا ۳۰۰ محصول',
      'یادآوری پرداخت و پیامک',
      'گزارش‌های پیشرفته + تحلیل هوشمند',
      '۱۰ کاربر',
      'پشتیبانی اولویت‌دار',
    ],
    highlight: true,
  },
  {
    id: 'enterprise',
    name: 'سازمانی',
    price: 899_000,
    tagline: 'برای تیم‌ها و فروشگاه‌های بزرگ',
    features: [
      'مشتری و محصول نامحدود',
      'همه‌ی امکانات حرفه‌ای',
      'کاربران نامحدود',
      'پشتیبانی اختصاصی',
      'راه‌اندازی و انتقال داده',
    ],
  },
]

export function getPlan(id: string): PlanDef | undefined {
  return PLANS.find((p) => p.id === id)
}

export function isPaidPlan(id: string): id is 'pro' | 'enterprise' {
  return id === 'pro' || id === 'enterprise'
}

export const faNum = (n: number) => new Intl.NumberFormat('fa-IR').format(n)
