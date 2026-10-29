import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/db'
import { resolveBaseUrl } from '@/lib/site-url'

/**
 * Sitemap.
 *
 * Regenerated every five minutes rather than per request — a sitemap is read
 * by crawlers, not users, so there is no reason to query the database on every
 * hit. Five minutes (not an hour) because a stale sitemap actively hurts: it
 * keeps pointing crawlers at posts that were unpublished or deleted since the
 * last regeneration, and every 404 it sends them to is wasted crawl budget.
 */
export const revalidate = 300

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = resolveBaseUrl()
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/pricing`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/about`, lastModified: now, changeFrequency: 'yearly', priority: 0.6 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: 'yearly', priority: 0.6 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/security`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]

  // A database hiccup must not take the whole sitemap down.
  try {
    const [posts, pages] = await Promise.all([
      prisma.post.findMany({
        where: { status: 'published' },
        select: { slug: true, updatedAt: true },
        orderBy: { publishedAt: 'desc' },
        take: 500,
      }),
      prisma.page.findMany({
        where: { status: 'published' },
        select: { slug: true, updatedAt: true },
        take: 200,
      }),
    ])

    return [
      ...staticPages,
      ...posts.map((p) => ({
        url: `${base}/blog/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      })),
      ...pages.map((p) => ({
        url: `${base}/p/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: 'monthly' as const,
        priority: 0.5,
      })),
    ]
  } catch {
    return staticPages
  }
}
