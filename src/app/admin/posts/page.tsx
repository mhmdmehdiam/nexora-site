'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Card,
  Btn,
  Badge,
  Table,
  EmptyState,
  Loading,
  Confirm,
  toast,
  api,
  useAsync,
  faDate,
} from '@/components/admin/ui'

export default function PostsPage() {
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [del, setDel] = useState<any>(null)

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search)
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(1)
    setSelected([])
  }, [status])

  const { data, loading, reload } = useAsync<{
    posts: any[]
    total: number
    page: number
    pages: number
  }>(
    () =>
      api(
        `/api/admin/posts?search=${encodeURIComponent(debounced)}&status=${status}&page=${page}&perPage=10`,
      ),
    [debounced, status, page],
  )

  const posts = data?.posts || []
  const pages = data?.pages || 1
  const total = data?.total || 0

  const remove = async () => {
    try {
      await api(`/api/admin/posts/${del.id}`, { method: 'DELETE' })
      toast('نوشته حذف شد')
      reload()
    } catch (e: any) {
      toast(e.message, 'error')
    }
  }

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const allSelected = posts.length > 0 && selected.length === posts.length

  const bulkDelete = async () => {
    if (!selected.length) return
    setBusy(true)
    try {
      await Promise.all(selected.map((id) => api(`/api/admin/posts/${id}`, { method: 'DELETE' })))
      toast(`${selected.length} نوشته حذف شد`)
      setSelected([])
      reload()
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const bulkPublish = async () => {
    if (!selected.length) return
    setBusy(true)
    try {
      await Promise.all(
        selected.map((id) =>
          api(`/api/admin/posts/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'published' }),
          }),
        ),
      )
      toast(`${selected.length} نوشته منتشر شد`)
      setSelected([])
      reload()
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className='space-y-6'>
      <div className='page-header'>
        <div>
          <h1 className='page-title text-3xl'>نوشته‌ها</h1>
          <p className='page-subtitle'>
            مدیریت مقالات و مطالب بلاگ{total > 0 ? ` — ${total.toLocaleString('fa-IR')} نوشته` : ''}
          </p>
        </div>
        <Link href='/admin/posts/new'>
          <Btn>+ نوشته جدید</Btn>
        </Link>
      </div>

      <Card>
        <div className='mb-5 flex flex-wrap items-center gap-3'>
          <div className='relative max-w-xs flex-1'>
            <input
              className='input-field pl-9'
              placeholder='جستجوی عنوان یا نامک…'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label='جستجوی نوشته‌ها'
            />
            <svg
              className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
              aria-hidden='true'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={1.8}
                d='M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z'
              />
            </svg>
          </div>
          <select
            className='input-field max-w-[170px]'
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label='فیلتر وضعیت'
          >
            <option value=''>همه وضعیت‌ها</option>
            <option value='published'>منتشر شده</option>
            <option value='draft'>پیش‌نویس</option>
          </select>
          {search !== debounced ? (
            <span className='text-[11px] text-ink-500'>در حال جستجو…</span>
          ) : null}
        </div>

        {selected.length > 0 && (
          <div className='mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-brand-500/30 bg-brand-500/10 px-4 py-2.5'>
            <span className='text-xs text-brand-200'>
              {selected.length.toLocaleString('fa-IR')} مورد انتخاب شده
            </span>
            <div className='mr-auto flex items-center gap-2'>
              <Btn variant='secondary' size='sm' onClick={bulkPublish} disabled={busy}>
                انتشار
              </Btn>
              <Btn variant='danger' size='sm' onClick={bulkDelete} disabled={busy}>
                حذف
              </Btn>
              <button
                type='button'
                onClick={() => setSelected([])}
                className='text-xs text-ink-400 hover:text-ink-50'
              >
                لغو
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <Loading />
        ) : posts.length === 0 ? (
          <EmptyState
            icon=''
            title={debounced ? 'نتیجه‌ای پیدا نشد' : 'هنوز نوشته‌ای ندارید'}
            subtitle={debounced ? 'عبارت دیگری را جستجو کنید' : 'اولین مقاله سایت را ایجاد کنید'}
            action={
              !debounced ? (
                <Link href='/admin/posts/new'>
                  <Btn>+ نوشته جدید</Btn>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <>
            <Table head={['', 'عنوان', 'دسته', 'وضعیت', 'تاریخ', 'عملیات']}>
              {posts.map((p) => (
                <tr key={p.id} className='table-row'>
                  <td className='w-10 px-4 py-3'>
                    <input
                      type='checkbox'
                      checked={selected.includes(p.id)}
                      onChange={() => toggle(p.id)}
                      className='h-4 w-4 rounded border-white/20 bg-ink-50/[0.04] accent-brand-500'
                      aria-label={`انتخاب ${p.title}`}
                    />
                  </td>
                  <td className='px-4 py-3'>
                    <p className='font-medium text-ink-50'>{p.title}</p>
                    <p className='text-xs text-ink-500' dir='ltr'>
                      /{p.slug}
                    </p>
                  </td>
                  <td className='px-4 py-3 text-ink-400'>{p.category || '—'}</td>
                  <td className='px-4 py-3'>
                    <Badge color={p.status === 'published' ? 'green' : 'amber'}>
                      {p.status === 'published' ? 'منتشر شده' : 'پیش‌نویس'}
                    </Badge>
                  </td>
                  <td className='whitespace-nowrap px-4 py-3 text-xs text-ink-400'>
                    {faDate(p.createdAt)}
                  </td>
                  <td className='px-4 py-3'>
                    <div className='flex items-center gap-2'>
                      <Link
                        href={`/admin/posts/${p.id}`}
                        className='text-xs text-sand hover:text-sand-light'
                      >
                        ویرایش
                      </Link>
                      <button
                        type='button'
                        onClick={() => setDel(p)}
                        className='text-xs text-red-400 hover:text-red-300'
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>

            <div className='mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100/[0.08] pt-4'>
              <label className='flex cursor-pointer items-center gap-2 text-xs text-ink-400'>
                <input
                  type='checkbox'
                  checked={allSelected}
                  onChange={() => setSelected(allSelected ? [] : posts.map((p) => p.id))}
                  className='h-4 w-4 rounded border-white/20 bg-ink-50/[0.04] accent-brand-500'
                />
                انتخاب همه در این صفحه
              </label>

              <div className='flex items-center gap-2'>
                <button
                  type='button'
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className='rounded-lg border border-ink-100/[0.10] px-3 py-1.5 text-xs text-ink-300 transition-colors hover:border-white/25 disabled:opacity-40'
                >
                  قبلی
                </button>
                <span className='text-xs text-ink-400'>
                  صفحه {page.toLocaleString('fa-IR')} از {pages.toLocaleString('fa-IR')}
                </span>
                <button
                  type='button'
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page >= pages}
                  className='rounded-lg border border-ink-100/[0.10] px-3 py-1.5 text-xs text-ink-300 transition-colors hover:border-white/25 disabled:opacity-40'
                >
                  بعدی
                </button>
              </div>
            </div>
          </>
        )}
      </Card>

      <Confirm
        open={!!del}
        onClose={() => setDel(null)}
        onConfirm={remove}
        title='حذف نوشته'
        message={`آیا از حذف «${del?.title}» مطمئن هستید؟ این عمل بازگشت‌پذیر نیست.`}
      />
    </div>
  )
}
