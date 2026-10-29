export type Locale = 'fa' | 'en'

const translations: Record<Locale, Record<string, string>> = {
  fa: {
    // General
    'app.name': 'نکسورا',
    'app.tagline': 'مدیریت هوشمند فروش و مشتری',
    'app.version': 'نسخه ۲.۰',

    // Auth
    'auth.login': 'ورود به سیستم',
    'auth.email': 'ایمیل',
    'auth.password': 'رمز عبور',
    'auth.login_button': 'ورود',
    'auth.logging_in': 'در حال ورود...',
    'auth.demo_accounts': 'حساب‌های آزمایشی',
    'auth.register': 'ثبت‌نام کسب‌وکار',
    'auth.register_subtitle': 'کسب‌وکارت رو آنلاین مدیریت کن',
    'auth.business_name': 'نام کسب‌وکار',
    'auth.owner_name': 'نام مدیر',
    'auth.phone': 'شماره تماس',
    'auth.create_account': 'ایجاد حساب',
    'auth.already_have': 'قبلاً ثبت‌نام کردی؟',
    'auth.no_account': 'حساب نداری؟',

    // Nav
    'nav.dashboard': 'داشبورد',
    'nav.customers': 'مشتریان',
    'nav.products': 'محصولات',
    'nav.sales': 'فروش‌ها',
    'nav.invoices': 'فاکتورها',
    'nav.reports': 'گزارشات',
    'nav.reminders': 'یادآوری‌ها',
    'nav.sms': 'پیامک',
    'nav.ai': 'تحلیل هوشمند',
    'nav.users': 'کاربران',
    'nav.settings': 'تنظیمات',
    'nav.more': 'بیشتر',
    'nav.logout': 'خروج',

    // Dashboard
    'dashboard.title': 'داشبورد',
    'dashboard.subtitle': 'نمای کلی کسب‌وکارت',
    'dashboard.revenue': 'درآمد این ماه',
    'dashboard.sales_count': 'تعداد فروش',
    'dashboard.customers': 'مشتریان',
    'dashboard.low_stock': 'موجودی کم',
    'dashboard.revenue_trend': 'روند درآمد',
    'dashboard.top_products': 'پرفروش‌ترین محصولات',
    'dashboard.recent_sales': 'آخرین فروش‌ها',
    'dashboard.pending': 'پرداخت‌های معوق',

    // Common actions
    'action.new': 'جدید',
    'action.edit': 'ویرایش',
    'action.delete': 'حذف',
    'action.save': 'ذخیره',
    'action.cancel': 'انصراف',
    'action.search': 'جستجو...',
    'action.filter': 'فیلتر',
    'action.export': 'خروجی',
    'action.all': 'همه',

    // Status
    'status.paid': 'پرداخت شده',
    'status.pending': 'در انتظار',
    'status.partial': 'پرداخت جزئی',
    'status.unpaid': 'پرداخت نشده',
    'status.overdue': 'سررسید گذشته',
    'status.cancelled': 'لغو شده',
    'status.active': 'فعال',
    'status.inactive': 'غیرفعال',

    // Plans
    'plan.free': 'رایگان',
    'plan.pro': 'حرفه‌ای',
    'plan.enterprise': 'سازمانی',
    'plan.upgrade': 'ارتقا',
    'plan.current': 'پلن فعلی',

    // Landing
    'landing.hero_title': 'مدیریت فروشت رو هوشمند کن',
    'landing.hero_subtitle': 'پلتفرم جامع مدیریت فروش، مشتری و موجودی برای کسب‌وکارهای کوچک و بزرگ',
    'landing.cta': 'شروع رایگان',
    'landing.cta_pro': 'مشاهده پلن‌ها',
    'landing.features_title': 'همه چیز برای مدیریت فروش',
    'landing.pricing_title': 'پلن مناسب کسب‌وکارت',
  },
  en: {
    'app.name': 'Nexora',
    'app.tagline': 'Smart Sales & Customer Management',
    'app.version': 'Version 2.0',

    'auth.login': 'Sign In',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.login_button': 'Sign In',
    'auth.logging_in': 'Signing in...',
    'auth.demo_accounts': 'Demo Accounts',
    'auth.register': 'Register Your Business',
    'auth.register_subtitle': 'Manage your business online',
    'auth.business_name': 'Business Name',
    'auth.owner_name': 'Owner Name',
    'auth.phone': 'Phone Number',
    'auth.create_account': 'Create Account',
    'auth.already_have': 'Already have an account?',
    'auth.no_account': "Don't have an account?",

    'nav.dashboard': 'Dashboard',
    'nav.customers': 'Customers',
    'nav.products': 'Products',
    'nav.sales': 'Sales',
    'nav.invoices': 'Invoices',
    'nav.reports': 'Reports',
    'nav.reminders': 'Reminders',
    'nav.sms': 'SMS',
    'nav.ai': 'AI Analysis',
    'nav.users': 'Users',
    'nav.settings': 'Settings',
    'nav.more': 'More',
    'nav.logout': 'Logout',

    'dashboard.title': 'Dashboard',
    'dashboard.subtitle': 'Your business overview',
    'dashboard.revenue': 'Monthly Revenue',
    'dashboard.sales_count': 'Sales Count',
    'dashboard.customers': 'Customers',
    'dashboard.low_stock': 'Low Stock',
    'dashboard.revenue_trend': 'Revenue Trend',
    'dashboard.top_products': 'Top Products',
    'dashboard.recent_sales': 'Recent Sales',
    'dashboard.pending': 'Pending Payments',

    'action.new': 'New',
    'action.edit': 'Edit',
    'action.delete': 'Delete',
    'action.save': 'Save',
    'action.cancel': 'Cancel',
    'action.search': 'Search...',
    'action.filter': 'Filter',
    'action.export': 'Export',
    'action.all': 'All',

    'status.paid': 'Paid',
    'status.pending': 'Pending',
    'status.partial': 'Partial',
    'status.unpaid': 'Unpaid',
    'status.overdue': 'Overdue',
    'status.cancelled': 'Cancelled',
    'status.active': 'Active',
    'status.inactive': 'Inactive',

    'plan.free': 'Free',
    'plan.pro': 'Professional',
    'plan.enterprise': 'Enterprise',
    'plan.upgrade': 'Upgrade',
    'plan.current': 'Current Plan',

    'landing.hero_title': 'Smarten Up Your Sales',
    'landing.hero_subtitle': 'Complete sales, customer & inventory management for businesses of all sizes',
    'landing.cta': 'Start Free',
    'landing.cta_pro': 'View Plans',
    'landing.features_title': 'Everything You Need to Manage Sales',
    'landing.pricing_title': 'Plans That Fit Your Business',
  },
}

export function t(key: string, locale: Locale = 'fa'): string {
  return translations[locale]?.[key] || translations['fa']?.[key] || key
}

export function getLocale(locale?: string): Locale {
  if (locale === 'en') return 'en'
  return 'fa'
}
