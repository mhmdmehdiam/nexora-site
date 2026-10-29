import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { ContentMotion } from '@/components/site/content-motion'
import { MiniFooter } from '@/components/site/mini-footer'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'بلاگ',
  description: 'یادداشت‌های نکسورا درباره‌ی فروش، داده و رشد کسب‌وکار',
  alternates: { canonical: '/blog' },
  openGraph: {
    type: 'website',
    title: 'بلاگ نکسورا',
    description: 'یادداشت‌های نکسورا درباره‌ی فروش، داده و رشد کسب‌وکار',
    url: '/blog',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'بلاگ نکسورا' }],
  },
}

export default async function BlogIndex() {
  let posts: {
    id: string
    title: string
    slug: string
    excerpt: string | null
    category: string | null
    publishedAt: Date | null
  }[] = []

  try {
    posts = await prisma.post.findMany({
      where: { status: 'published' },
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        category: true,
        publishedAt: true,
      },
    })
  } catch {
    posts = []
  }

  return (
    <div className="min-h-screen bg-ink-950 text-ink-100">
      <header className="border-b border-ink-100/[0.08]">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 md:px-8 lg:px-12">
          <Link href="/" className="flex items-center gap-2.5" aria-label="بازگشت به صفحه اصلی">
            <span className="h-1.5 w-1.5 bg-sand" aria-hidden="true" />
            <span className="font-serif text-[22px] italic text-ink-50">Nexora</span>
          </Link>
          <Link
            href="/"
            className="inline-block py-1.5 text-[12.5px] text-ink-400 transition-colors hover:text-ink-50"
          >
            ← صفحه اصلی
          </Link>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-[1440px] px-5 py-20 md:px-8 md:py-28 lg:px-12">
        <ContentMotion>
          <div data-cm className="sec-num">[BLOG]</div>
          <h1 data-cm="clip" className="mt-6 text-display-md font-black text-ink-50">از دفترِ ما</h1>
          <p data-cm className="mt-5 max-w-xl text-[15px] leading-8 text-ink-400">
            یادداشت‌هایی درباره‌ی فروش، داده و رشد کسب‌وکارهای کوچک.
          </p>

          {posts.length === 0 ? (
            <div data-cm className="mt-16 border border-ink-100/[0.10] p-12 text-center">
              <p className="text-[14px] text-ink-400">هنوز نوشته‌ای منتشر نشده است.</p>
              <p className="mt-2 text-[12px] text-ink-600">
                از پنل مدیریت، بخش «نوشته‌ها» می‌توانید اولین مقاله را منتشر کنید.
              </p>
            </div>
          ) : (
            <div data-cm-stagger className="mt-14 grid gap-px border-t border-ink-100/[0.10] bg-ink-100/[0.10] md:grid-cols-2 lg:grid-cols-3">
              {posts.map((p, i) => (
                <Link
                  key={p.id}
                  href={`/blog/${p.slug}`}
                  className="group flex flex-col bg-ink-950 p-8 transition-colors hover:bg-ink-50/[0.025]"
                >
                <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.12em] text-ink-600">
                  <span>[{String(i + 1).padStart(2, '0')}]</span>
                  <span>
                    {p.publishedAt ? p.publishedAt.toLocaleDateString('fa-IR') : 'پیش‌نویس'}
                  </span>
                </div>
                {p.category ? (
                  <span className="mt-6 w-fit border border-ink-100/15 px-2 py-1 font-mono text-[9px] tracking-[0.12em] text-ink-400">
                    {p.category}
                  </span>
                ) : null}
                <h2 className="mt-4 text-[18px] font-semibold leading-8 text-ink-50 transition-colors group-hover:text-sand">
                  {p.title}
                </h2>
                {p.excerpt ? (
                  <p className="mt-3 line-clamp-3 text-[13px] leading-7 text-ink-400">
                    {p.excerpt}
                  </p>
                ) : null}
                <span className="mt-auto pt-7 text-[11.5px] text-ink-500">ادامه‌ی مطلب →</span>
              </Link>
            ))}
          </div>
        )}
        </ContentMotion>
      </main>
      <MiniFooter />
    </div>
  )
}
