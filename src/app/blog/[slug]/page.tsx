import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { RichBody } from '@/components/site/rich-body'
import { ContentMotion } from '@/components/site/content-motion'
import { JsonLdGraph } from '@/components/seo/json-ld'
import { blogPostingLd, breadcrumbLd } from '@/lib/seo'

export const dynamic = 'force-dynamic'

type Params = { params: { slug: string } }

async function getPost(slug: string) {
  try {
    return await prisma.post.findFirst({
      where: { slug, status: 'published' },
    })
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const post = await getPost(params.slug)
  if (!post) return { title: 'نوشته یافت نشد' }

  const description = post.excerpt || post.content.replace(/<[^>]+>/g, '').slice(0, 155)

  return {
    title: post.title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description,
      url: `/blog/${post.slug}`,
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: post.authorName ? [post.authorName] : undefined,
      images: [{ url: post.coverImage || '/og.png', width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description,
      images: [post.coverImage || '/og.png'],
    },
  }
}

export default async function BlogPost({ params }: Params) {
  const post = await getPost(params.slug)
  if (!post) notFound()

  let tags: string[] = []
  if (post.tags) {
    try {
      const parsed = JSON.parse(post.tags)
      if (Array.isArray(parsed)) tags = parsed.filter((t) => typeof t === 'string')
    } catch {
      tags = post.tags.split(',').map((t) => t.trim()).filter(Boolean)
    }
  }

  return (
    <div className="min-h-screen bg-ink-950 text-ink-100">
      <header className="border-b border-ink-100/[0.08]">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 md:px-8 lg:px-12">
          <Link href="/" className="flex items-center gap-2.5" aria-label="صفحه اصلی نکسورا">
            <span className="h-1.5 w-1.5 bg-sand" aria-hidden="true" />
            <span className="font-serif text-[22px] italic text-ink-50">Nexora</span>
          </Link>
          <Link
            href="/blog"
            className="inline-block py-1.5 text-[12.5px] text-ink-400 transition-colors hover:text-ink-50"
          >
            ← همه‌ی نوشته‌ها
          </Link>
        </div>
      </header>

      <main id="main">
        <JsonLdGraph
          items={[
            blogPostingLd(post),
            breadcrumbLd([
              { name: 'خانه', path: '/' },
              { name: 'بلاگ', path: '/blog' },
              { name: post.title, path: `/blog/${post.slug}` },
            ]),
          ]}
        />
        <ContentMotion>
        <article className="mx-auto max-w-3xl px-5 pb-24 pt-16 md:pt-24">
          <div data-cm className="flex flex-wrap items-center gap-3 font-mono text-[10px] tracking-[0.14em] text-ink-600">
            <span>ARTICLE</span>
            <span className="h-px w-6 bg-ink-100/20" aria-hidden="true" />
            <time dateTime={post.publishedAt?.toISOString()}>
              {post.publishedAt ? post.publishedAt.toLocaleDateString('fa-IR') : ''}
            </time>
            {post.category ? <span className="text-sand">/ {post.category}</span> : null}
          </div>

          <h1 data-cm="clip" className="mt-7 text-display-md font-black leading-tight text-ink-50">
            {post.title}
          </h1>

          {post.excerpt ? (
            <p className="mt-6 border-r-2 border-sand/40 pr-5 text-[15px] leading-8 text-ink-300">
              {post.excerpt}
            </p>
          ) : null}

          <div className="mt-10 flex items-center gap-3 border-y border-ink-100/[0.08] py-4">
            <span className="flex h-8 w-8 items-center justify-center border border-ink-100/15 text-[11px] text-ink-300">
              {(post.authorName || 'ن')[0]}
            </span>
            <span className="text-[12px] text-ink-400">{post.authorName || 'تیم نکسورا'}</span>
            <span className="mr-auto font-mono text-[10px] text-ink-600">
              {post.views.toLocaleString('fa-IR')} بازدید
            </span>
          </div>

          {post.coverImage ? (
            <img
              src={post.coverImage}
              alt={post.title}
              className="mt-10 w-full border border-ink-100/[0.08] object-cover"
            />
          ) : null}

          <div data-cm className="mt-10">
            <RichBody content={post.content} />
          </div>

          {tags.length > 0 ? (
            <div className="mt-14 flex flex-wrap gap-2 border-t border-ink-100/[0.08] pt-8">
              {tags.map((t) => (
                <span
                  key={t}
                  className="border border-ink-100/15 px-2.5 py-1.5 font-mono text-[10px] text-ink-400"
                >
                  {t}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-16 border border-ink-100/[0.10] p-8">
            <p className="text-[15px] font-semibold text-ink-50">
              همین حالا فروشت را از دفتر بیرون بیاور
            </p>
            <p className="mt-2 text-[13px] leading-7 text-ink-400">
              پلن رایگان نکسورا همیشگی است و نیازی به کارت بانکی ندارد.
            </p>
            <Link href="/register" className="btn-ink mt-6">
              شروع رایگان
            </Link>
          </div>
        </article>
      </ContentMotion>
      </main>
    </div>
  )
}
