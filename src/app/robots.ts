import type { MetadataRoute } from 'next'
import { resolveBaseUrl } from '@/lib/site-url'

/**
 * robots.txt
 *
 * Private areas are disallowed, but /blog and the legal pages must stay
 * crawlable — they are what a merchant-verification reviewer looks for.
 */
export default function robots(): MetadataRoute.Robots {
  const base = resolveBaseUrl()

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/admin',
          '/api/',
          '/login',
          '/register',
          '/forgot-password',
          '/reset-password',
          '/auth/',
          '/billing/',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
