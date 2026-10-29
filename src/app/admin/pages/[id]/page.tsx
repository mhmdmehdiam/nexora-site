'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Field, Btn, Loading, toast, api } from '@/components/admin/ui'
import { RichTextEditor } from '@/components/admin/rich-text'

export default function PageEditor({ params }: { params: { id: string } }) {
  const isNew = params.id === 'new'

  const router = useRouter()
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    slug: '',
    content: '',
    status: 'draft',
    seoTitle: '',
    seoDesc: '',
  })

  useEffect(() => {
    if (isNew) return
    api<any>(`/api/admin/pages/${params.id}`)
      .then(({ page }) =>
        setForm({
          title: page.title,
          slug: page.slug,
          content: page.content || '',
          status: page.status,
          seoTitle: page.seoTitle || '',
          seoDesc: page.seoDesc || '',
        }),
      )
      .catch((e) => toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [params.id, isNew])

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }))

  const save = async (publish?: boolean) => {
    setSaving(true)
    try {
      const payload = { ...form, status: publish ? 'published' : form.status }
      if (isNew) {
        const { page } = await api<any>('/api/admin/pages', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        toast('برگه ایجاد شد')
        router.replace(`/admin/pages/${page.id}`)
      } else {
        await api(`/api/admin/pages/${params.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        toast('برگه ذخیره شد')
        if (publish) set('status', 'published')
      }
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading rows={6} />

  return (
    <div className='space-y-6'>
      <div className='page-header'>
        <div>
          <h1 className='page-title text-3xl'>{isNew ? 'برگه جدید' : 'ویرایش برگه'}</h1>
          <p className='page-subtitle'>محتوای صفحه را وارد کنید</p>
        </div>
        <div className='flex gap-2'>
          <Btn variant='secondary' onClick={() => router.push('/admin/pages')}>
            بازگشت
          </Btn>
          <Btn variant='secondary' onClick={() => save(false)} disabled={saving}>
            ذخیره پیش‌نویس
          </Btn>
          <Btn onClick={() => save(true)} disabled={saving}>
            {saving ? '...' : ' انتشار'}
          </Btn>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
        <div className='lg:col-span-2'>
          <Card>
            <div className='space-y-4'>
              <Field label='عنوان'>
                <input
                  className='input-field text-lg'
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                />
              </Field>
              <Field label='نامک (slug)'>
                <input
                  className='input-field'
                  dir='ltr'
                  value={form.slug}
                  onChange={(e) => set('slug', e.target.value)}
                  placeholder='about-us'
                />
              </Field>
              <Field label='محتوا'>
                <RichTextEditor
                  value={form.content}
                  onChange={(v) => set('content', v)}
                  minHeight={420}
                />
              </Field>
            </div>
          </Card>
        </div>
        <div className='space-y-4'>
          <Card title='انتشار'>
            <Field label='وضعیت'>
              <select
                className='input-field'
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
              >
                <option value='draft'>پیش‌نویس</option>
                <option value='published'>منتشر شده</option>
              </select>
            </Field>
          </Card>
          <Card title='سئوی صفحه'>
            <div className='space-y-4'>
              <Field label='عنوان سئو'>
                <input
                  className='input-field'
                  value={form.seoTitle}
                  onChange={(e) => set('seoTitle', e.target.value)}
                />
              </Field>
              <Field label='توضیحات متا'>
                <textarea
                  className='input-field min-h-[70px]'
                  value={form.seoDesc}
                  onChange={(e) => set('seoDesc', e.target.value)}
                />
              </Field>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
