import type { Metadata } from 'next'
import { prisma } from '@/lib/db'
import { getSettings } from '@/lib/settings'
import { DEFAULT_SITE_CONTENT, mergeSiteContent, SITE_CONTENT_KEY, type SiteContent } from '@/lib/site-content'
import { Landing, type PostTeaser } from '@/components/site/landing'
import type { NavLinkItem } from '@/components/site/nav'
import { JsonLdGraph } from '@/components/seo/json-ld'
import {
  organizationLd,
  websiteLd,
  softwareAppLd,
  faqLd,
  getSeoOverrides,
} from '@/lib/seo'

/**
 * Cached for a minute instead of re-rendered per visit.
 *
 * The landing page reads site content, menus and the latest posts from the
 * database. With force-dynamic that was three queries on every hit — for a
 * page whose content changes a few times a month. ISR keeps it fast while
 * still picking up edits; the admin save path calls revalidatePath('/') so
 * changes appear immediately rather than after the window.
 */
export const revalidate = 60

const DEFAULT_NAV: NavLinkItem[] = [
  { label: 'امکانات', href: '#features' },
  { label: 'تعرفه‌ها', href: '/pricing' },
  { label: 'نظرات', href: '#testimonials' },
  { label: 'سوالات', href: '#faq' },
]

const DEFAULT_TITLE = 'نکسورا | مدیریت هوشمند فروش و مشتری'
const DEFAULT_DESC =
  'پلتفرم جامع مدیریت فروش، مشتری و موجودی برای کسب‌وکارها. داشبورد هوشمند، فاکتور حرفه‌ای، تحلیل AI و پیامک خودکار.'

/**
 * The landing page is the one place where the admin's SEO overrides win over
 * the layout defaults — that is what /admin/seo is for.
 */
export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoOverrides()
  const title = seo.title || DEFAULT_TITLE
  const description = seo.description || DEFAULT_DESC

  return {
    title,
    description,
    keywords: seo.keywords,
    robots: seo.robots,
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      locale: 'fa_IR',
      siteName: 'نکسورا',
      title,
      description,
      url: '/',
      images: [{ url: seo.ogImage || '/og.png', width: 1200, height: 630, alt: 'نکسورا' }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [seo.ogImage || '/og.png'] },
  }
}

export default async function HomePage() {
  let content: SiteContent = DEFAULT_SITE_CONTENT
  let navLinks: NavLinkItem[] = DEFAULT_NAV
  let posts: PostTeaser[] = []

  try {
    const settings = await getSettings()
    if (settings[SITE_CONTENT_KEY]) {
      try {
        content = mergeSiteContent(JSON.parse(settings[SITE_CONTENT_KEY]))
      } catch {
        content = DEFAULT_SITE_CONTENT
      }
    }

    const headerMenu = await prisma.menuItem.findMany({
      where: { location: 'header', isActive: true },
      orderBy: { order: 'asc' },
    })
    if (headerMenu.length) {
      navLinks = headerMenu.map((m) => ({ label: m.label, href: m.url }))
    }

    const rows = await prisma.post.findMany({
      where: { status: 'published' },
      orderBy: { publishedAt: 'desc' },
      take: 3,
      select: { title: true, slug: true, excerpt: true, publishedAt: true },
    })
    posts = rows.map((p) => ({
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
    }))
  } catch {
    // Database not ready — fall back to static defaults so the site still renders.
  }

  return (
    <>
      {/* Organization + WebSite live in the layout; these two are page-specific.
          The FAQ markup mirrors the accordion already rendered below, which is
          what makes the page eligible for an FAQ rich result. */}
      <JsonLdGraph
        items={[
          softwareAppLd({ description: content.hero.subtitle }),
          faqLd(content.faq.items.map((i) => ({ question: i.q, answer: i.a }))),
        ]}
      />
      <Landing content={content} navLinks={navLinks} posts={posts} />
    </>
  )
}
