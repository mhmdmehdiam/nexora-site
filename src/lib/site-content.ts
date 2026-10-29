// ===== Editable site content (WordPress-like) =====
// Default values mirror the original hard-coded landing page, so nothing
// changes on the public site until an admin edits it from /admin/content.

export interface HeroStat { value: number; suffix: string; label: string }
export interface HeroContent {
  eyebrow: string
  badge: string
  titlePrefix: string
  titleHighlight: string
  titleSuffix: string
  subtitle: string
  ctaPrimary: string
  ctaSecondary: string
  stats: HeroStat[]
}
export interface LogosContent { title: string; items: string[] }
export interface HowStep { title: string; desc: string }
export interface HowItWorksContent { title: string; subtitle: string; steps: HowStep[] }
export interface CtaContent { title: string; subtitle: string; primary: string; secondary: string }
export interface FeatureItem { icon: string; title: string; desc: string; color: string }
export interface FeaturesContent { title: string; subtitle: string; items: FeatureItem[] }
export interface PlanFeature { text: string; included: boolean }
export interface PlanItem {
  name: string; nameEn: string; desc: string; color: string; popular: boolean
  monthlyPrice: number; yearlyPrice: number; cta: string; badge: string | null
  features: PlanFeature[]
}
export interface PricingContent { title: string; subtitle: string; plans: PlanItem[] }
export interface TestimonialItem { name: string; role: string; avatar: string; text: string; rating: number }
export interface TestimonialsContent { title: string; subtitle: string; items: TestimonialItem[] }
export interface FaqItem { q: string; a: string }
export interface FaqContent { title: string; subtitle: string; items: FaqItem[] }
export interface FooterColumn { title: string; links: { label: string; href: string }[] }
export interface FooterContent {
  about: string
  columns: FooterColumn[]
  copyright: string
  socials: { label: string; href: string }[]
}

export interface SiteContent {
  hero: HeroContent
  logos: LogosContent
  howItWorks: HowItWorksContent
  features: FeaturesContent
  pricing: PricingContent
  testimonials: TestimonialsContent
  faq: FaqContent
  cta: CtaContent
  footer: FooterContent
}

export const DEFAULT_SITE_CONTENT: SiteContent = {
  hero: {
    eyebrow: 'پلتفرم مدیریت کسب‌وکار',
    badge: 'بیش از ۲,۰۰۰ کسب‌وکار به نکسورا اعتماد کرده‌اند',
    titlePrefix: 'فروشت رو',
    titleHighlight: 'هوشمند',
    titleSuffix: 'مدیریت کن',
    subtitle: 'پلتفرم جامع مدیریت فروش، مشتری و موجودی. با تحلیل هوشمند AI، پیامک خودکار و گزارشات حرفه‌ای.',
    ctaPrimary: 'شروع رایگان',
    ctaSecondary: 'بیشتر ببین',
    stats: [
      { value: 2000, suffix: '+', label: 'کسب‌وکار فعال' },
      { value: 500, suffix: 'K+', label: 'تراکنش ماهانه' },
      { value: 99, suffix: '.9%', label: 'آپتایم' },
      { value: 40, suffix: '%', label: 'افزایش فروش' },
    ],
  },
  logos: {
    title: 'مورد اعتماد تیم‌هایی که با سرعت رشد می‌کنند',
    items: ['دیجی‌لند', 'مُدا استایل', 'نوین تک', 'آرمان گروپ', 'کافه رُز', 'پارس تجارت', 'ایده‌پرداز', 'شهر لوازم'],
  },
  howItWorks: {
    title: 'سه قدم تا کنترل کامل',
    subtitle: 'بدون نصب، بدون آموزش طولانی. در کمتر از پنج دقیقه راه می‌افتد.',
    steps: [
      { title: 'ثبت‌نام کن', desc: 'با ایمیل ثبت‌نام کن و کسب‌وکارت را بساز. پلن رایگان نیازی به کارت بانکی ندارد.' },
      { title: 'داده‌هایت را وارد کن', desc: 'محصولات و مشتریان را دستی وارد کن یا فایل اکسل قبلی‌ات را یک‌جا آپلود کن.' },
      { title: 'فروش را مدیریت کن', desc: 'فاکتور بزن، موجودی را ببین و گزارش سود را همان لحظه دریافت کن.' },
    ],
  },
  features: {
    title: 'همه چیز برای مدیریت فروش',
    subtitle: 'از ثبت اولین فروش تا تحلیل هوشمند کسب‌وکار — همه در یک پلتفرم',
    items: [
      { icon: '📊', title: 'داشبورد هوشمند', desc: 'آمار زنده فروش، نمودارهای تعاملی و خلاصه عملکرد در یک نگاه', color: 'brand' },
      { icon: '👥', title: 'CRM مشتریان', desc: 'سابقه خرید، برچسب‌گذاری، بخش‌بندی و مدیریت ارتباط با مشتری', color: 'purple' },
      { icon: '📦', title: 'مدیریت موجودی', desc: 'ثبت محصولات، هشدار موجودی کم، دسته‌بندی و کدگذاری', color: 'cyan' },
      { icon: '🧾', title: 'فاکتور حرفه‌ای', desc: 'صدور فاکتور با لوگو، محاسبه خودکار مالیات و تخفیف', color: 'amber' },
      { icon: '📈', title: 'گزارشات مالی', desc: 'تحلیل سودآوری، مقایسه ماهانه، خروجی Excel و PDF', color: 'emerald' },
      { icon: '🤖', title: 'تحلیل AI', desc: 'پیش‌بینی فروش ماه آینده، شناسایی روندها و بینش‌های خودکار', color: 'brand' },
      { icon: '💬', title: 'ارسال پیامک', desc: 'پیامک انبوه، تبریک تولد، یادآوری سررسید و پیام سفارشی', color: 'purple' },
      { icon: '🔔', title: 'یادآوری پرداخت', desc: 'یادآوری خودکار بدهی، تکرار دوره‌ای و پیگیری وضعیت', color: 'amber' },
      { icon: '🛡️', title: 'سطوح دسترسی', desc: 'مدیر، فروشنده، انباردار — هر نقش دسترسی خودش را دارد', color: 'cyan' },
    ],
  },
  pricing: {
    title: 'پلن مناسب کسب‌وکارت',
    subtitle: 'با پلن رایگان شروع کن. بدون نیاز به کارت بانکی. هر وقت خواستی ارتقا بده.',
    plans: [
      {
        name: 'رایگان', nameEn: 'Free', desc: 'برای شروع کسب‌وکار', color: 'gray', popular: false,
        monthlyPrice: 0, yearlyPrice: 0, cta: 'شروع رایگان', badge: null,
        features: [
          { text: '۵۰ مشتری', included: true },
          { text: '۳۰ محصول', included: true },
          { text: '۲ کاربر', included: true },
          { text: 'فاکتور و فروش', included: true },
          { text: 'داشبورد پایه', included: true },
          { text: 'گزارشات ساده', included: true },
          { text: 'تحلیل AI', included: false },
          { text: 'ارسال پیامک', included: false },
          { text: 'سطوح دسترسی پیشرفته', included: false },
          { text: 'خروجی Excel/PDF', included: false },
          { text: 'پشتیبانی اختصاصی', included: false },
        ],
      },
      {
        name: 'حرفه‌ای', nameEn: 'Pro', desc: 'برای کسب‌وکارهای در حال رشد', color: 'brand', popular: true,
        monthlyPrice: 499000, yearlyPrice: 4490000, cta: 'شروع آزمایشی ۱۴ روزه', badge: 'محبوب‌ترین',
        features: [
          { text: '۵۰۰ مشتری', included: true },
          { text: '۳۰۰ محصول', included: true },
          { text: '۱۰ کاربر', included: true },
          { text: 'فاکتور و فروش', included: true },
          { text: 'داشبورد کامل', included: true },
          { text: 'گزارشات پیشرفته', included: true },
          { text: 'تحلیل AI', included: true },
          { text: 'ارسال پیامک', included: true },
          { text: 'سطوح دسترسی پیشرفته', included: true },
          { text: 'خروجی Excel/PDF', included: true },
          { text: 'پشتیبانی ایمیلی', included: true },
        ],
      },
      {
        name: 'سازمانی', nameEn: 'Enterprise', desc: 'برای سازمان‌ها و شرکت‌های بزرگ', color: 'purple', popular: false,
        monthlyPrice: 1499000, yearlyPrice: 14990000, cta: 'تماس با تیم فروش', badge: 'بهترین ارزش',
        features: [
          { text: 'نامحدود مشتری', included: true },
          { text: 'نامحدود محصول', included: true },
          { text: 'نامحدود کاربر', included: true },
          { text: 'فاکتور و فروش', included: true },
          { text: 'داشبورد اختصاصی', included: true },
          { text: 'گزارشات سفارشی', included: true },
          { text: 'تحلیل AI پیشرفته', included: true },
          { text: 'ارسال پیامک نامحدود', included: true },
          { text: 'سطوح دسترسی سفارشی', included: true },
          { text: 'API دسترسی', included: true },
          { text: 'پشتیبانی تلفنی ۲۴/۷', included: true },
        ],
      },
    ],
  },
  testimonials: {
    title: 'مشتریان ما چی میگن',
    subtitle: 'نظرات مشتریان',
    items: [
      { name: 'علی محمدی', role: 'مدیر فروشگاه دیجی‌لند', avatar: 'ع', text: 'از وقتی نکسورا رو استفاده می‌کنیم، فروشمون ۴۰٪ رشد داشته. تحلیل AI واقعاً فوق‌العاده‌ست.', rating: 5 },
      { name: 'سارا کریمی', role: 'مدیر مُدا استایل', avatar: 'س', text: 'ساده‌ترین نرم‌افزار فروشی که استفاده کردم. فقط ۵ دقیقه طول کشید تا همه چیز رو راه بندازم.', rating: 5 },
      { name: 'رضا نوری', role: 'مدیر شرکت نوین تک', avatar: 'ر', text: 'پلن سازمانی نکسورا برای ما عالی بود. پشتیبانی سریع و امکانات کامل.', rating: 5 },
    ],
  },
  faq: {
    title: 'سوالی داری؟',
    subtitle: 'سوالات متداول',
    items: [
      { q: 'آیا نکسورا واقعاً رایگانه؟', a: 'بله! پلن رایگان ما برای همیشه رایگانه و هیچ نیازی به کارت بانکی نداره. می‌تونید باهاش شروع کنید و هر وقت نیاز بود ارتقا بدید.' },
      { q: 'انتقال اطلاعات از نرم‌افزار قبلی چطوریه؟', a: 'ما ابزار وارد کردن اطلاعات از Excel داریم. فقط کافیه فایلتون رو آپلود کنید. تیم پشتیبانی هم کمکتون می‌کنه.' },
      { q: 'آیا می‌تونم پلن رو بعداً تغییر بدم؟', a: 'بله، هر زمان می‌تونید پلنتون رو ارتقا یا کاهش بدید. تغییرات فوری اعمال میشه.' },
      { q: 'آیا اطلاعاتم امنه؟', a: 'ارتباط با سرویس روی HTTPS رمزنگاری می‌شه، رمز عبورها با bcrypt هش می‌شن و داده‌ی هر کسب‌وکار جدا نگهداری می‌شه. ما اطلاعاتتون رو به شخص ثالث نمی‌فروشیم. جزئیات کامل در صفحه‌ی امنیت هست.' },
      { q: 'پشتیبانی به چه صورته؟', a: 'پلن رایگان: پشتیبانی ایمیلی. پلن حرفه‌ای: ایمیل + چت. پلن سازمانی: پشتیبانی تلفنی ۲۴/۷ و مدیر اختصاصی.' },
      { q: 'آیا روی موبایل هم کار می‌کنه؟', a: 'بله! نکسورا هم روی وب و هم روی موبایل (اندروید و iOS) کار می‌کنه. اپ موبایل ما به زودی منتشر میشه.' },
    ],
  },
  cta: {
    title: 'آماده‌ای دفترت را ببندی؟',
    subtitle: 'همین امروز شروع کن. پلن رایگان همیشگی است و ارتقا هر وقت که خواستی.',
    primary: 'شروع رایگان',
    secondary: 'گفتگو با تیم فروش',
  },
  footer: {
    about: 'پلتفرم مدیریت هوشمند فروش و مشتری برای کسب‌وکارها',
    columns: [
      { title: 'محصول', links: [{ label: 'امکانات', href: '#features' }, { label: 'قیمت‌گذاری', href: '#pricing' }, { label: 'API', href: '#' }, { label: 'به‌روزرسانی‌ها', href: '#' }] },
      { title: 'شرکت', links: [{ label: 'درباره ما', href: '/about' }, { label: 'بلاگ', href: '/blog' }, { label: 'تماس با ما', href: '/contact' }] },
      { title: 'قانونی', links: [{ label: 'حریم خصوصی', href: '/privacy' }, { label: 'شرایط استفاده', href: '/terms' }, { label: 'امنیت', href: '/security' }] },
    ],
    copyright: '© ۲۰۲۶ Nexora — تمام حقوق محفوظ است',
    socials: [{ label: 'Twitter', href: '#' }, { label: 'LinkedIn', href: '#' }, { label: 'Instagram', href: '#' }],
  },
}

export const SITE_CONTENT_KEY = 'site_content'

// Deep-ish merge: saved content overrides defaults section by section,
// so newly added default fields keep working after an upgrade.
export function mergeSiteContent(saved: Partial<SiteContent> | null | undefined): SiteContent {
  if (!saved) return DEFAULT_SITE_CONTENT
  const base = DEFAULT_SITE_CONTENT
  return {
    hero: { ...base.hero, ...(saved.hero || {}) },
    logos: { ...base.logos, ...(saved.logos || {}) },
    howItWorks: { ...base.howItWorks, ...(saved.howItWorks || {}) },
    features: { ...base.features, ...(saved.features || {}) },
    pricing: { ...base.pricing, ...(saved.pricing || {}) },
    testimonials: { ...base.testimonials, ...(saved.testimonials || {}) },
    faq: { ...base.faq, ...(saved.faq || {}) },
    cta: { ...base.cta, ...(saved.cta || {}) },
    footer: { ...base.footer, ...(saved.footer || {}) },
  }
}
