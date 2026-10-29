'use client'

import { useState } from 'react'
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

export default function PagesPage() {
  const [del, setDel] = useState<any>(null)
  const { data, loading, reload } = useAsync<{ pages: any[] }>(() => api('/api/admin/pages'), [])

  const remove = async () => {
    try {
      await api(`/api/admin/pages/${del.id}`, { method: 'DELETE' })
      toast('برگه حذف شد')
      reload()
    } catch (e: any) {
      toast(e.message, 'error')
    }
  }

  const pages = data?.pages || []

  return (
    <div className='space-y-6'>
      <div className='page-header'>
        <div>
          <h1 className='page-title text-3xl'>برگه‌ها</h1>
          <p className='page-subtitle'>صفحات ثابت سایت مانند «درباره ما» و «تماس»</p>
        </div>
        <Link href='/admin/pages/new'>
          <Btn>+ برگه جدید</Btn>
        </Link>
      </div>

      <Card>
        {loading ? (
          <Loading />
        ) : pages.length === 0 ? (
          <EmptyState
            icon=''
            title='هنوز برگه‌ای ندارید'
            subtitle='یک صفحه ثابت بسازید'
            action={
              <Link href='/admin/pages/new'>
                <Btn>+ برگه جدید</Btn>
              </Link>
            }
          />
        ) : (
          <Table head={['عنوان', 'نامک', 'وضعیت', 'تاریخ', 'عملیات']}>
            {pages.map((p) => (
              <tr key={p.id} className='table-row'>
                <td className='px-4 py-3 text-ink-50 font-medium'>{p.title}</td>
                <td className='px-4 py-3 text-ink-400 text-xs' dir='ltr'>
                  /{p.slug}
                </td>
                <td className='px-4 py-3'>
                  <Badge color={p.status === 'published' ? 'green' : 'amber'}>
                    {p.status === 'published' ? 'منتشر شده' : 'پیش‌نویس'}
                  </Badge>
                </td>
                <td className='px-4 py-3 text-ink-400 text-xs whitespace-nowrap'>
                  {faDate(p.createdAt)}
                </td>
                <td className='px-4 py-3'>
                  <div className='flex items-center gap-2'>
                    <Link
                      href={`/admin/pages/${p.id}`}
                      className='text-sand hover:text-sand-light text-xs'
                    >
                      ویرایش
                    </Link>
                    <button
                      onClick={() => setDel(p)}
                      className='text-red-400 hover:text-red-300 text-xs'
                    >
                      حذف
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Confirm
        open={!!del}
        onClose={() => setDel(null)}
        onConfirm={remove}
        title='حذف برگه'
        message={`آیا از حذف «${del?.title}» مطمئن هستید؟`}
      />
    </div>
  )
}
