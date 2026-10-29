'use client'

import { useState } from 'react'
import { Card, Btn, Field, Loading, toast, api, useAsync } from '@/components/admin/ui'

const KEYS = [
  'seo_title',
  'seo_description',
  'seo_keywords',
  'seo_og_image',
  'seo_robots',
  'site_url',
]

export default function SeoPage() {
  const { data, loading, reload } = useAsync<{ seo: Record<string, string> }>(
    () => api('/api/admin/seo'),
    [],
  )
  const [form, setForm] = useState<Record<string, string> | null>(null)
  const [saving, setSaving] = useState(false)

  if (data && !form) {
    const init: Record<string, string> = {}
    for (const k of KEYS) init[k] = data.seo[k] ?? ''
    setForm(init)
  }
  if (loading || !form) return <Loading rows={6} />

  const save = async () => {
    setSaving(true)
    try {
      await api('/api/admin/seo', { method: 'PUT', body: JSON.stringify({ seo: form }) })
      toast('تنظیمات سئو ذخیره شد')
      reload()
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='space-y-6'>
      <div className='page-header'>
        <div>
          <h1 className='page-title text-3xl'>سئو</h1>
          <p className='page-subtitle'>تنظیمات بهینه‌سازی موتور جستجو</p>
        </div>
        <Btn onClick={save} disabled={saving}>
          {saving ? 'در حال ذخیره...' : ' ذخیره'}
        </Btn>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
        <div className='lg:col-span-2 space-y-4'>
          <Card title='متا تگ‌های اصلی'>
            <div className='space-y-4'>
              <Field label='عنوان سئو (Title)' hint='۵۰ تا ۶۰ کاراکتر توصیه می‌شود'>
                <input
                  className='input-field'
                  value={form.seo_title}
                  onChange={(e) => setForm({ ...form, seo_title: e.target.value })}
                />
              </Field>
              <Field label='توضیحات متا (Description)' hint='۱۵۰ تا ۱۶۰ کاراکتر'>
                <textarea
                  className='input-field min-h-[90px]'
                  value={form.seo_description}
                  onChange={(e) => setForm({ ...form, seo_description: e.target.value })}
                />
              </Field>
              <Field label='کلمات کلیدی' hint='با کاما جدا کنید'>
                <input
                  className='input-field'
                  value={form.seo_keywords}
                  onChange={(e) => setForm({ ...form, seo_keywords: e.target.value })}
                />
              </Field>
            </div>
          </Card>

          <Card title='پیشرفته'>
            <div className='space-y-4'>
              <Field label='تصویر اشتراک‌گذاری (OG Image)'>
                <input
                  className='input-field'
                  dir='ltr'
                  value={form.seo_og_image}
                  onChange={(e) => setForm({ ...form, seo_og_image: e.target.value })}
                />
              </Field>
              <div className='grid grid-cols-2 gap-4'>
                <Field label='دستور robots'>
                  <select
                    className='input-field'
                    value={form.seo_robots}
                    onChange={(e) => setForm({ ...form, seo_robots: e.target.value })}
                  >
                    <option value=''>پیش‌فرض</option>
                    <option value='index, follow'>index, follow</option>
                    <option value='noindex, nofollow'>noindex, nofollow</option>
                  </select>
                </Field>
                <Field label='آدرس سایت'>
                  <input
                    className='input-field'
                    dir='ltr'
                    value={form.site_url}
                    onChange={(e) => setForm({ ...form, site_url: e.target.value })}
                    placeholder='https://nexora.ir'
                  />
                </Field>
              </div>
            </div>
          </Card>
        </div>

        <Card title='پیش‌نمایش گوگل'>
          <div className='p-4 rounded-xl bg-ink-50/[0.03] border border-ink-100/[0.08]'>
            <p className='text-xs text-emerald-400 mb-1' dir='ltr'>
              {form.site_url || 'https://nexora.ir'}
            </p>
            <p className='text-sand-light text-lg font-medium mb-1 leading-snug'>
              {form.seo_title || 'عنوان سئوی سایت'}
            </p>
            <p className='text-sm text-ink-400 leading-relaxed'>
              {form.seo_description || 'توضیحات متای سایت اینجا نمایش داده می‌شود.'}
            </p>
          </div>
          <p className='text-xs text-ink-500 mt-4'>این پیش‌نمایش تقریبی است.</p>
        </Card>
      </div>

      <div className='flex justify-end'>
        <Btn onClick={save} disabled={saving}>
          {saving ? 'در حال ذخیره...' : ' ذخیره تنظیمات سئو'}
        </Btn>
      </div>
    </div>
  )
}
