'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Card,
  Btn,
  Badge,
  Table,
  Loading,
  Field,
  toast,
  api,
  useAsync,
  faNum,
  faDate,
} from '@/components/admin/ui'
import { formatCurrency } from '@/lib/utils'

const PLAN_LABELS: Record<string, string> = {
  free: 'رایگان',
  pro: 'حرفه‌ای',
  enterprise: 'سازمانی',
}
const ROLES: Record<string, string> = {
  owner: 'مالک',
  admin: 'مدیر',
  manager: 'سرپرست',
  user: 'کاربر',
}

export default function BusinessDetail({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { data, loading, reload } = useAsync<{ business: any }>(
    () => api(`/api/admin/businesses/${params.id}`),
    [params.id],
  )
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>(null)

  const b = data?.business
  if (data && !form)
    setForm({
      name: b.name,
      email: b.email || '',
      phone: b.phone || '',
      city: b.city || '',
      industry: b.industry || '',
      plan: b.plan,
      isActive: b.isActive,
      website: b.website || '',
      address: b.address || '',
    })
  if (loading || !b) return <Loading rows={6} />

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  const save = async () => {
    setSaving(true)
    try {
      await api(`/api/admin/businesses/${params.id}`, { method: 'PUT', body: JSON.stringify(form) })
      toast('ذخیره شد')
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
          <div className='flex items-center gap-3'>
            <Link href='/admin/businesses' className='text-ink-500 hover:text-ink-50'></Link>
            <h1 className='page-title text-3xl'>{b.name}</h1>
            <Badge color={b.plan === 'enterprise' ? 'purple' : b.plan === 'pro' ? 'blue' : 'gray'}>
              {PLAN_LABELS[b.plan] || b.plan}
            </Badge>
            <Badge color={b.isActive ? 'green' : 'red'}>{b.isActive ? 'فعال' : 'غیرفعال'}</Badge>
          </div>
          <p className='page-subtitle' dir='ltr'>
            /{b.slug}
          </p>
        </div>
      </div>

      <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
        {[
          { label: 'کاربران', value: b._count?.users || 0, icon: '' },
          { label: 'مشتریان', value: b._count?.customers || 0, icon: '' },
          { label: 'محصولات', value: b._count?.products || 0, icon: '' },
          { label: 'فروش‌ها', value: b._count?.sales || 0, icon: '' },
        ].map((s, i) => (
          <div key={i} className='stat-card'>
            <div className='relative z-10'>
              <div className='text-2xl mb-2'>{s.icon}</div>
              <p className='text-sm text-ink-400'>{s.label}</p>
              <p className='text-2xl font-bold text-ink-50'>{faNum(s.value)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
        <Card
          title='اطلاعات کسب‌وکار'
          action={
            <Btn size='sm' onClick={save} disabled={saving}>
              {saving ? '...' : 'ذخیره'}
            </Btn>
          }
        >
          {form && (
            <div className='space-y-4'>
              <Field label='نام'>
                <input
                  className='input-field'
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                />
              </Field>
              <div className='grid grid-cols-2 gap-4'>
                <Field label='ایمیل'>
                  <input
                    className='input-field'
                    dir='ltr'
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                  />
                </Field>
                <Field label='تلفن'>
                  <input
                    className='input-field'
                    dir='ltr'
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                  />
                </Field>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <Field label='شهر'>
                  <input
                    className='input-field'
                    value={form.city}
                    onChange={(e) => set('city', e.target.value)}
                  />
                </Field>
                <Field label='صنعت'>
                  <input
                    className='input-field'
                    dir='ltr'
                    value={form.industry}
                    onChange={(e) => set('industry', e.target.value)}
                  />
                </Field>
              </div>
              <Field label='وب‌سایت'>
                <input
                  className='input-field'
                  dir='ltr'
                  value={form.website}
                  onChange={(e) => set('website', e.target.value)}
                />
              </Field>
              <Field label='آدرس'>
                <input
                  className='input-field'
                  value={form.address}
                  onChange={(e) => set('address', e.target.value)}
                />
              </Field>
              <div className='grid grid-cols-2 gap-4'>
                <Field label='پلن'>
                  <select
                    className='input-field'
                    value={form.plan}
                    onChange={(e) => set('plan', e.target.value)}
                  >
                    {Object.entries(PLAN_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </Field>
                <label className='flex items-center gap-2 text-sm text-ink-300 mt-8'>
                  <input
                    type='checkbox'
                    checked={form.isActive}
                    onChange={(e) => set('isActive', e.target.checked)}
                  />
                  فعال
                </label>
              </div>
            </div>
          )}
        </Card>

        <div className='space-y-4'>
          <Card title={`کاربران (${b.users?.length || 0})`}>
            {b.users?.length ? (
              <Table head={['نام', 'ایمیل', 'نقش', 'وضعیت']}>
                {b.users.map((u: any) => (
                  <tr key={u.id} className='table-row'>
                    <td className='px-4 py-3 text-ink-50'>{u.name}</td>
                    <td className='px-4 py-3 text-ink-400 text-xs' dir='ltr'>
                      {u.email}
                    </td>
                    <td className='px-4 py-3'>
                      <Badge color='purple'>{ROLES[u.role] || u.role}</Badge>
                    </td>
                    <td className='px-4 py-3'>
                      <Badge color={u.isActive ? 'green' : 'red'}>
                        {u.isActive ? 'فعال' : 'غیرفعال'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </Table>
            ) : (
              <p className='text-sm text-ink-500'>کاربری ثبت نشده</p>
            )}
          </Card>

          <Card
            title={`اشتراک‌ها (${b.subscriptions?.length || 0})`}
            action={
              <Link href='/admin/subscriptions' className='text-xs text-sand hover:text-sand-light'>
                مدیریت
              </Link>
            }
          >
            {b.subscriptions?.length ? (
              <div className='space-y-2'>
                {b.subscriptions.map((s: any) => (
                  <div
                    key={s.id}
                    className='flex items-center justify-between p-3 rounded-xl bg-white/[0.02]'
                  >
                    <div>
                      <p className='text-sm text-ink-50'>
                        {PLAN_LABELS[s.plan] || s.plan} — {formatCurrency(s.amount)}
                      </p>
                      <p className='text-xs text-ink-500'>
                        {faDate(s.startDate)}
                        {s.endDate ? ` تا ${faDate(s.endDate)}` : ''}
                      </p>
                    </div>
                    <Badge
                      color={
                        s.status === 'active' ? 'green' : s.status === 'expired' ? 'amber' : 'red'
                      }
                    >
                      {s.status === 'active'
                        ? 'فعال'
                        : s.status === 'expired'
                          ? 'منقضی'
                          : 'لغو شده'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className='text-sm text-ink-500'>اشتراکی ثبت نشده</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
