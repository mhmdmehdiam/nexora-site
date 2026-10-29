'use client'

import { useState } from 'react'
import { Card, Btn, Field, Loading, toast, api, useAsync } from '@/components/admin/ui'

const FIELDS = [
  { key: 'platform_name', label: 'نام سایت (فارسی)', hint: 'مثال: نکسورا' },
  { key: 'platform_name_en', label: 'نام سایت (انگلیسی)', dir: 'ltr' },
  { key: 'platform_phone', label: 'تلفن پشتیبانی', dir: 'ltr' },
  { key: 'platform_email', label: 'ایمیل پشتیبانی', dir: 'ltr' },
  { key: 'currency', label: 'واحد پول' },
  { key: 'tax_rate', label: 'نرخ مالیات (٪)', dir: 'ltr' },
  { key: 'free_plan_max_customers', label: 'سقف مشتری پلن رایگان', dir: 'ltr' },
  { key: 'free_plan_max_products', label: 'سقف محصول پلن رایگان', dir: 'ltr' },
  { key: 'pro_plan_price', label: 'قیمت پلن حرفه‌ای (تومان)', dir: 'ltr' },
  { key: 'enterprise_plan_price', label: 'قیمت پلن سازمانی (تومان)', dir: 'ltr' },
]

export default function SettingsPage() {
  const { data, loading, reload } = useAsync<{ settings: Record<string, string> }>(
    () => api('/api/admin/settings'),
    [],
  )
  const [form, setForm] = useState<Record<string, string> | null>(null)
  const [saving, setSaving] = useState(false)

  if (data && !form) {
    const init: Record<string, string> = {}
    for (const f of FIELDS) init[f.key] = data.settings[f.key] ?? ''
    setForm(init)
  }
  if (loading || !form) return <Loading rows={8} />

  const save = async () => {
    setSaving(true)
    try {
      await api('/api/admin/settings', { method: 'PUT', body: JSON.stringify({ settings: form }) })
      toast('تنظیمات ذخیره شد')
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
          <h1 className='page-title text-3xl'>تنظیمات سایت</h1>
          <p className='page-subtitle'>تنظیمات عمومی پلتفرم</p>
        </div>
        <Btn onClick={save} disabled={saving}>
          {saving ? 'در حال ذخیره...' : ' ذخیره'}
        </Btn>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
        <Card title='اطلاعات پلتفرم'>
          <div className='space-y-4'>
            {FIELDS.slice(0, 4).map((f) => (
              <Field key={f.key} label={f.label} hint={f.hint}>
                <input
                  className='input-field'
                  dir={f.dir as any}
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              </Field>
            ))}
          </div>
        </Card>
        <Card title='پلن‌ها و مالی'>
          <div className='space-y-4'>
            {FIELDS.slice(4).map((f) => (
              <Field key={f.key} label={f.label} hint={f.hint}>
                <input
                  className='input-field'
                  dir={f.dir as any}
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              </Field>
            ))}
          </div>
        </Card>
      </div>

      <div className='flex justify-end'>
        <Btn onClick={save} disabled={saving}>
          {saving ? 'در حال ذخیره...' : ' ذخیره تنظیمات'}
        </Btn>
      </div>
    </div>
  )
}
