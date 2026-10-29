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
  Modal,
  Field,
  toast,
  api,
  useAsync,
  faNum,
} from '@/components/admin/ui'

const PLAN_LABELS: Record<string, string> = {
  free: 'رایگان',
  pro: 'حرفه‌ای',
  enterprise: 'سازمانی',
}
const planColor = (p: string) => (p === 'enterprise' ? 'purple' : p === 'pro' ? 'blue' : 'gray')

export default function BusinessesPage() {
  const [search, setSearch] = useState('')
  const { data, loading, reload } = useAsync<{ businesses: any[] }>(
    () => api(`/api/admin/businesses?search=${encodeURIComponent(search)}`),
    [search],
  )
  const [modal, setModal] = useState<any>(null)
  const [del, setDel] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  const businesses = data?.businesses || []

  const openNew = () =>
    setModal({
      name: '',
      slug: '',
      email: '',
      phone: '',
      city: '',
      industry: '',
      plan: 'free',
      isActive: true,
      ownerName: '',
      ownerEmail: '',
      ownerPassword: '',
    })

  const save = async () => {
    setSaving(true)
    try {
      if (modal.id) {
        await api(`/api/admin/businesses/${modal.id}`, {
          method: 'PUT',
          body: JSON.stringify(modal),
        })
      } else {
        await api('/api/admin/businesses', { method: 'POST', body: JSON.stringify(modal) })
      }
      toast('ذخیره شد')
      setModal(null)
      reload()
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    try {
      await api(`/api/admin/businesses/${del.id}`, { method: 'DELETE' })
      toast('کسب‌وکار حذف شد')
      reload()
    } catch (e: any) {
      toast(e.message, 'error')
    }
  }

  return (
    <div className='space-y-6'>
      <div className='page-header'>
        <div>
          <h1 className='page-title text-3xl'>کسب‌وکارها</h1>
          <p className='page-subtitle'>مدیریت مستأجرها (مشتریان پلتفرم)</p>
        </div>
        <Btn onClick={openNew}>+ کسب‌وکار جدید</Btn>
      </div>

      <Card>
        <input
          className='input-field max-w-xs mb-5'
          placeholder='جستجوی نام یا نامک...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loading ? (
          <Loading />
        ) : businesses.length === 0 ? (
          <EmptyState icon='' title='کسب‌وکاری یافت نشد' />
        ) : (
          <Table head={['کسب‌وکار', 'پلن', 'کاربران', 'مشتریان', 'فروش‌ها', 'وضعیت', 'عملیات']}>
            {businesses.map((b) => (
              <tr key={b.id} className='table-row'>
                <td className='px-4 py-3'>
                  <Link
                    href={`/admin/businesses/${b.id}`}
                    className='text-ink-50 font-medium hover:text-sand-light'
                  >
                    {b.name}
                  </Link>
                  <p className='text-xs text-ink-500' dir='ltr'>
                    {b.slug}
                  </p>
                </td>
                <td className='px-4 py-3'>
                  <Badge color={planColor(b.plan) as any}>{PLAN_LABELS[b.plan] || b.plan}</Badge>
                </td>
                <td className='px-4 py-3 text-ink-400'>{faNum(b._count?.users || 0)}</td>
                <td className='px-4 py-3 text-ink-400'>{faNum(b._count?.customers || 0)}</td>
                <td className='px-4 py-3 text-ink-400'>{faNum(b._count?.sales || 0)}</td>
                <td className='px-4 py-3'>
                  <Badge color={b.isActive ? 'green' : 'red'}>
                    {b.isActive ? 'فعال' : 'غیرفعال'}
                  </Badge>
                </td>
                <td className='px-4 py-3'>
                  <div className='flex items-center gap-2'>
                    <Link
                      href={`/admin/businesses/${b.id}`}
                      className='text-sand hover:text-sand-light text-xs'
                    >
                      جزئیات
                    </Link>
                    <button
                      onClick={() => setModal({ ...b })}
                      className='text-ink-400 hover:text-ink-50 text-xs'
                    >
                      ویرایش
                    </button>
                    <button
                      onClick={() => setDel(b)}
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

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        wide
        title={modal?.id ? 'ویرایش کسب‌وکار' : 'کسب‌وکار جدید'}
        footer={
          <>
            <Btn variant='secondary' onClick={() => setModal(null)}>
              انصراف
            </Btn>
            <Btn onClick={save} disabled={saving}>
              {saving ? '...' : 'ذخیره'}
            </Btn>
          </>
        }
      >
        {modal && (
          <div className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <Field label='نام'>
                <input
                  className='input-field'
                  value={modal.name}
                  onChange={(e) => setModal({ ...modal, name: e.target.value })}
                />
              </Field>
              <Field label='نامک (slug)'>
                <input
                  className='input-field'
                  dir='ltr'
                  value={modal.slug || ''}
                  onChange={(e) => setModal({ ...modal, slug: e.target.value })}
                  placeholder='auto'
                />
              </Field>
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <Field label='ایمیل'>
                <input
                  className='input-field'
                  dir='ltr'
                  value={modal.email || ''}
                  onChange={(e) => setModal({ ...modal, email: e.target.value })}
                />
              </Field>
              <Field label='تلفن'>
                <input
                  className='input-field'
                  dir='ltr'
                  value={modal.phone || ''}
                  onChange={(e) => setModal({ ...modal, phone: e.target.value })}
                />
              </Field>
            </div>
            <div className='grid grid-cols-3 gap-4'>
              <Field label='شهر'>
                <input
                  className='input-field'
                  value={modal.city || ''}
                  onChange={(e) => setModal({ ...modal, city: e.target.value })}
                />
              </Field>
              <Field label='صنعت'>
                <input
                  className='input-field'
                  dir='ltr'
                  value={modal.industry || ''}
                  onChange={(e) => setModal({ ...modal, industry: e.target.value })}
                />
              </Field>
              <Field label='پلن'>
                <select
                  className='input-field'
                  value={modal.plan}
                  onChange={(e) => setModal({ ...modal, plan: e.target.value })}
                >
                  {Object.entries(PLAN_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <label className='flex items-center gap-2 text-sm text-ink-300'>
              <input
                type='checkbox'
                checked={modal.isActive}
                onChange={(e) => setModal({ ...modal, isActive: e.target.checked })}
              />
              کسب‌وکار فعال باشد
            </label>

            {!modal.id && (
              <div className='pt-4 border-t border-ink-100/[0.08]'>
                <p className='text-sm text-ink-300 mb-3'>ساخت کاربر مالک (اختیاری)</p>
                <div className='grid grid-cols-3 gap-3'>
                  <Field label='نام مالک'>
                    <input
                      className='input-field'
                      value={modal.ownerName}
                      onChange={(e) => setModal({ ...modal, ownerName: e.target.value })}
                    />
                  </Field>
                  <Field label='ایمیل مالک'>
                    <input
                      className='input-field'
                      dir='ltr'
                      value={modal.ownerEmail}
                      onChange={(e) => setModal({ ...modal, ownerEmail: e.target.value })}
                    />
                  </Field>
                  <Field label='رمز'>
                    <input
                      className='input-field'
                      dir='ltr'
                      value={modal.ownerPassword}
                      onChange={(e) => setModal({ ...modal, ownerPassword: e.target.value })}
                    />
                  </Field>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Confirm
        open={!!del}
        onClose={() => setDel(null)}
        onConfirm={remove}
        title='حذف کسب‌وکار'
        message={`با حذف «${del?.name}» تمام داده‌های مرتبط (کاربران، مشتریان، فروش‌ها) هم حذف می‌شوند. مطمئن هستید؟`}
      />
    </div>
  )
}
