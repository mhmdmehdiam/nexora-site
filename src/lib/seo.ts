import { prisma } from './db'
import { resolveBaseUrl } from './site-url'
import { PLANS } from './plans'

/**
 * Structured data (schema.org).
 *
 * Google uses JSON-LD to build rich results: the site name under a search
 * result, the star/price block for software, FAQ accordions, breadcrumb
 * trails. None of it needs a live domain — the `url` fields just have to be
 * absolute, which resolveBaseUrl() already guarantees.
 */

export type JsonLd = Record<string, unknown>

const ORG_NAME = 'نکسورا'
const ORG_NAME_EN = 'Nexora'

function abs(path: string): string {
  const base = resolveBaseUrl()
  return path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`
}

/** Organization — the entity behind the site. */
export function organizationLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${resolveBaseUrl()}/#organization`,
    name: ORG_NAME,
    alternateName: ORG_NAME_EN,
    url: resolveBaseUrl(),
    logo: abs('/icon.svg'),
    email: 'support@nexora.ir',
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: 'support@nexora.ir',
        availableLanguage: ['fa'],
      },
    ],
  }
}

/** WebSite — enables the sitelinks search box and ties pages to the site. */
export function websiteLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${resolveBaseUrl()}/#website`,
    url: resolveBaseUrl(),
    name: ORG_NAME,
    inLanguage: 'fa-IR',
    publisher: { '@id': `${resolveBaseUrl()}/#organization` },
  }
}

/** SoftwareApplication — what the product actually is, with its price range. */
export function softwareAppLd(opts: { description: string }): JsonLd {
  // Prices come from PLANS rather than being typed in here: structured data
  // that disagrees with the pricing table on the page is worse than none at
  // all — Google treats it as misleading markup.
  const prices = PLANS.map((p) => p.price)
  const paid = prices.filter((p) => p > 0)

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: ORG_NAME,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: opts.description,
    url: resolveBaseUrl(),
    inLanguage: 'fa-IR',
    offers: {
      '@type': 'AggregateOffer',
      // IRT = Iranian Toman, the unit the pricing table is in. (IRR is the
      // official ISO 4217 code, but for the Rial — 10× — and quoting Rial
      // amounts next to a page that says تومان would be wrong.)
      priceCurrency: 'IRT',
      lowPrice: Math.min(...paid),
      highPrice: Math.max(...paid),
      offerCount: PLANS.length,
      availability: 'https://schema.org/InStock',
    },
  }
}

/** FAQPage — the only reliable way to get an accordion in the SERP. */
export function faqLd(items: { question: string; answer: string }[]): JsonLd | null {
  if (!items.length) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((i) => ({
      '@type': 'Question',
      name: i.question,
      acceptedAnswer: { '@type': 'Answer', text: i.answer },
    })),
  }
}

/** BlogPosting — article rich results. */
export function blogPostingLd(post: {
  title: string
  slug: string
  excerpt: string | null
  content: string
  coverImage: string | null
  publishedAt: Date | null
  updatedAt: Date
  authorName: string | null
}): JsonLd {
  const url = abs(`/blog/${post.slug}`)
  const description = post.excerpt || stripHtml(post.content).slice(0, 160)

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title.slice(0, 110),
    description,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    image: post.coverImage ? abs(post.coverImage) : abs('/og.png'),
    datePublished: (post.publishedAt || post.updatedAt).toISOString(),
    dateModified: post.updatedAt.toISOString(),
    inLanguage: 'fa-IR',
    author: { '@type': 'Person', name: post.authorName || ORG_NAME },
    publisher: { '@id': `${resolveBaseUrl()}/#organization` },
  }
}

/** BreadcrumbList — replaces the raw URL in the SERP with a readable trail. */
export function breadcrumbLd(trail: { name: string; path: string }[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.name,
      item: abs(t.path),
    })),
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * Admin-editable SEO overrides.
 *
 * /admin/seo has been writing seo_title / seo_description / seo_og_image into
 * the Setting table since the beginning, but nothing ever read them back — the
 * form was decorative. These helpers are the missing consumer.
 */
export async function getSeoOverrides(): Promise<{
  title?: string
  description?: string
  ogImage?: string
  keywords?: string[]
  robots?: { index: boolean; follow: boolean }
}> {
  try {
    const rows = await prisma.setting.findMany({
      where: {
        key: { in: ['seo_title', 'seo_description', 'seo_og_image', 'seo_keywords', 'seo_robots'] },
      },
      select: { key: true, value: true },
    })
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]))

    // /admin/seo stores robots as one of a few fixed strings (see the select
    // in that page). Anything unparseable falls back to indexable — the safer
    // default is to keep the page in the index rather than drop it.
    let robots: { index: boolean; follow: boolean } | undefined
    if (map.seo_robots) {
      const index = !/noindex/i.test(map.seo_robots)
      const follow = !/nofollow/i.test(map.seo_robots)
      robots = { index, follow }
    }

    return {
      title: map.seo_title || undefined,
      description: map.seo_description || undefined,
      ogImage: map.seo_og_image || undefined,
      keywords: map.seo_keywords
        ? map.seo_keywords.split(/[,،]/).map((k) => k.trim()).filter(Boolean)
        : undefined,
      robots,
    }
  } catch {
    return {}
  }
}
