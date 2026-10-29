'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Field, Btn, Loading, toast, api } from '@/components/admin/ui'
import { RichTextEditor } from '@/components/admin/rich-text'
import { MediaPicker } from '@/components/admin/media-picker'

export default function PostEditor({ params }: { params: { id: string } }) {
  const isNew = params.id === 'new'

  const router = useRouter()
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [coverPicker, setCoverPicker] = useState(false)
  const [form, setForm] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    coverImage: '',
    category: '',
    status: 'draft',
    tags: '',
  })

  useEffect(() => {
    if (isNew) return
    api<any>(`/api/admin/posts/${params.id}`)
      .then(({ post }) =>
        setForm({
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt || '',
          content: post.content || '',
          coverImage: post.coverImage || '',
          category: post.category || '',
          status: post.status,
          tags: post.tags ? JSON.parse(post.tags).join(', ') : '',
        }),
      )
      .catch((e) => toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [params.id, isNew])

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }))

  const save = async (publish?: boolean) => {
    setSaving(true)
    try {
      const payload = {
        ...form,
        status: publish ? 'published' : form.status,
        tags: form.tags
          ? form.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
      }
      if (isNew) {
        const { post } = await api<any>('/api/admin/posts', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        toast('نوشته ایجاد شد')
        router.replace(`/admin/posts/${post.id}`)
      } else {
        await api(`/api/admin/posts/${params.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        toast('نوشته ذخیره شد')
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
          <h1 className='page-title text-3xl'>{isNew ? 'نوشته جدید' : 'ویرایش نوشته'}</h1>
          <p className='page-subtitle'>محتوای مقاله را وارد کنید</p>
        </div>
        <div className='flex gap-2'>
          <Btn variant='secondary' onClick={() => router.push('/admin/posts')}>
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
        <div className='lg:col-span-2 space-y-4'>
          <Card>
            <div className='space-y-4'>
              <Field label='عنوان'>
                <input
                  className='input-field text-lg'
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  placeholder='عنوان مقاله...'
                />
              </Field>
              <Field label='نامک (slug)' hint='آدرس یکتای نوشته؛ خالی بگذارید تا خودکار ساخته شود'>
                <input
                  className='input-field'
                  dir='ltr'
                  value={form.slug}
                  onChange={(e) => set('slug', e.target.value)}
                  placeholder='my-post'
                />
              </Field>
              <Field label='خلاصه'>
                <textarea
                  className='input-field min-h-[70px]'
                  value={form.excerpt}
                  onChange={(e) => set('excerpt', e.target.value)}
                />
              </Field>
              <Field
                label='محتوا'
                hint='ویرایشگر متن غنی — می‌توانید عنوان، لیست، لینک و تصویر اضافه کنید'
              >
                <RichTextEditor
                  value={form.content}
                  onChange={(v) => set('content', v)}
                  placeholder='متن مقاله را اینجا بنویسید…'
                  minHeight={420}
                />
              </Field>
            </div>
          </Card>
        </div>

        <div className='space-y-4'>
          <Card title='انتشار'>
            <div className='space-y-4'>
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
              <Field label='دسته‌بندی'>
                <input
                  className='input-field'
                  value={form.category}
                  onChange={(e) => set('category', e.target.value)}
                />
              </Field>
              <Field label='برچسب‌ها' hint='با کاما جدا کنید'>
                <input
                  className='input-field'
                  value={form.tags}
                  onChange={(e) => set('tags', e.target.value)}
                  placeholder='فروش, ai'
                />
              </Field>
            </div>
          </Card>
          <Card title='تصویر شاخص'>
            <div className='space-y-3'>
              <Field label='آدرس تصویر'>
                <input
                  className='input-field'
                  dir='ltr'
                  value={form.coverImage}
                  onChange={(e) => set('coverImage', e.target.value)}
                  placeholder='/uploads/...'
                />
              </Field>
              <Btn variant='secondary' size='sm' onClick={() => setCoverPicker(true)}>
                انتخاب از کتابخانه رسانه
              </Btn>
              {form.coverImage && (
                <div className='relative'>
                  <img
                    src={form.coverImage}
                    alt='تصویر شاخص'
                    className='max-h-40 w-full rounded-xl border border-ink-100/[0.10] object-cover'
                  />
                  <button
                    type='button'
                    onClick={() => set('coverImage', '')}
                    className='absolute left-2 top-2 rounded-lg bg-black/60 px-2 py-1 text-[10px] text-ink-50 backdrop-blur hover:bg-black/80'
                  >
                    حذف
                  </button>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <MediaPicker
        open={coverPicker}
        onClose={() => setCoverPicker(false)}
        onSelect={(url) => set('coverImage', url)}
      />
    </div>
  )
}
