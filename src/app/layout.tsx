import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { ThemeFab } from '@/components/theme-fab'
import { resolveBaseUrl } from '@/lib/site-url'
import { JsonLdGraph } from '@/components/seo/json-ld'
import { organizationLd, websiteLd } from '@/lib/seo'
import { GlobalMotion } from '@/components/motion/global'

export const metadata: Metadata = {
  metadataBase: new URL(resolveBaseUrl()),
  title: {
    default: 'نکسورا | مدیریت هوشمند فروش و مشتری',
    template: '%s | نکسورا',
  },
  description:
    'پلتفرم جامع مدیریت فروش، مشتری و موجودی برای کسب‌وکارها. داشبورد هوشمند، فاکتور حرفه‌ای، تحلیل AI و پیامک خودکار.',
  keywords: ['مدیریت فروش', 'CRM', 'فاکتور', 'نرم‌افزار حسابداری', 'مدیریت مشتری', 'نکسورا'],
  authors: [{ name: 'Nexora' }],
  openGraph: {
    type: 'website',
    locale: 'fa_IR',
    siteName: 'نکسورا',
    title: 'نکسورا | مدیریت هوشمند فروش و مشتری',
    description: 'از ثبت اولین فروش تا تحلیل هوشمند کسب‌وکار — همه در یک پلتفرم.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'نکسورا' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'نکسورا | مدیریت هوشمند فروش و مشتری',
    description: 'از ثبت اولین فروش تا تحلیل هوشمند کسب‌وکار — همه در یک پلتفرم.',
    images: ['/og.png'],
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/apple-icon.png' }],
  },
  manifest: '/manifest.webmanifest',
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0b' },
    { media: '(prefers-color-scheme: light)', color: '#f2ebdd' },
  ],
  width: 'device-width',
  initialScale: 1,
}

/**
 * Applies the stored theme before the first paint so there is no flash of
 * the wrong theme. Kept inline (not a module) because it must run before
 * React hydrates — any deferred script would be too late.
 */
const THEME_BOOTSTRAP = `
(function(){
  try {
    var t = localStorage.getItem('nexora-theme');
    if (t !== 'light' && t !== 'dark') t = 'dark';
    document.documentElement.classList.remove('dark','light');
    document.documentElement.classList.add(t);
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();
`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fa" dir="rtl" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Vazirmatn — Persian UI + display face */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css"
        />
        {/* Instrument Serif — Latin display accent */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=IBM+Plex+Mono:wght@400;500&display=swap"
        />
      </head>
      <body className="bg-surface text-ink-100 font-sans antialiased min-h-screen">
        <ThemeProvider>
          <a href="#main" className="skip-link">
            رفتن به محتوای اصلی
          </a>
          <ThemeFab />
          {/* entity + site markup, read by every crawler on every page */}
          <JsonLdGraph items={[organizationLd(), websiteLd()]} />
          {/* route curtain, reading progress, cursor + inertial scroll.
              Self-disables on /admin. */}
          <GlobalMotion />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
