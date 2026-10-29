import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { RichBody } from '@/components/site/rich-body'
import { ContentMotion } from '@/components/site/content-motion'

export const dynamic = 'force-dynamic'

type Params = { params: { slug: string } }

async function getPage(slug: string) {
  try {
    return await prisma.page.findFirst({ where: { slug, status: 'published' } })
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const page = await getPage(params.slug)
  if (!page) return { title: 'برگه یافت نشد' }
  const description = page.seoDesc || page.content.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, 155)

  return {
    title: page.seoTitle || page.title,
    description,
    alternates: { canonical: `/p/${page.slug}` },
    openGraph: {
      type: 'article',
      title: page.seoTitle || page.title,
      description,
      url: `/p/${page.slug}`,
      modifiedTime: page.updatedAt.toISOString(),
      images: [{ url: '/og.png', width: 1200, height: 630, alt: page.title }],
    },
  }
}

export default async function CmsPage({ params }: Params) {
  const page = await getPage(params.slug)
  if (!page) notFound()

  return (
    <div className="min-h-screen bg-ink-950 text-ink-100">
      <header className="border-b border-ink-100/[0.08]">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 md:px-8 lg:px-12">
          <Link href="/" className="flex items-center gap-2.5" aria-label="صفحه اصلی نکسورا">
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

      <main id="main" className="mx-auto max-w-3xl px-5 pb-24 pt-16 md:pt-24">
        <ContentMotion>
        <div data-cm className="sec-num">[PAGE]</div>
        <h1 data-cm="clip" className="mt-6 text-display-md font-black text-ink-50">{page.title}</h1>
        <div data-cm className="mt-10">
          <RichBody content={page.content} />
        </div>
      </ContentMotion>
      </main>
    </div>
  )
}
