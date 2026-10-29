'use client'

import { useState } from 'react'
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
  faDate,
} from '@/components/admin/ui'
import { formatCurrency } from '@/lib/utils'

const PLAN_LABELS: Record<string, string> = {
  free: 'رایگان',
  pro: 'حرفه‌ای',
  enterprise: 'سازمانی',
}
const STATUS: Record<string, { label: string; color: any }> = {
  active: { label: 'فعال', color: 'green' },
  expired: { label: 'منقضی', color: 'amber' },
  cancelled: { label: 'لغو شده', color: 'red' },
}

export default function SubscriptionsPage() {
  const { data, loading, reload } = useAsync<{ subscriptions: any[] }>(
    () => api('/api/admin/subscriptions'),
    [],
  )
  const { data: bizData } = useAsync<{ businesses: any[] }>(() => api('/api/admin/businesses'), [])
  const [modal, setModal] = useState<any>(null)
  const [del, setDel] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  const subs = data?.subscriptions || []
  const businesses = bizData?.businesses || []

  const openNew = () =>
    setModal({
      businessId: businesses[0]?.id || '',
      plan: 'pro',
      amount: 499000,
      status: 'active',
      endDate: '',
    })

  const save = async () => {
    setSaving(true)
    try {
      if (modal.id) {
        await api(`/api/admin/subscriptions/${modal.id}`, {
          method: 'PUT',
          body: JSON.stringify(modal),
        })
      } else {
        await api('/api/admin/subscriptions', { method: 'POST', body: JSON.stringify(modal) })
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
      await api(`/api/admin/subscriptions/${del.id}`, { method: 'DELETE' })
      toast('اشتراک حذف شد')
      reload()
    } catch (e: any) {
      toast(e.message, 'error')
    }
  }

  return (
    <div className='space-y-6'>
      <div className='page-header'>
        <div>
          <h1 className='page-title text-3xl'>اشتراک‌ها</h1>
          <p className='page-subtitle'>مدیریت پلن و اشتراک کسب‌وکارها</p>
        </div>
        <Btn onClick={openNew}>+ اشتراک جدید</Btn>
      </div>

      <Card>
        {loading ? (
          <Loading />
        ) : subs.length === 0 ? (
          <EmptyState icon='' title='اشتراکی ثبت نشده' />
        ) : (
          <Table head={['کسب‌وکار', 'پلن', 'مبلغ', 'شروع', 'پایان', 'وضعیت', 'عملیات']}>
            {subs.map((s) => (
              <tr key={s.id} className='table-row'>
                <td className='px-4 py-3 text-ink-50'>{s.business?.name || '—'}</td>
                <td className='px-4 py-3'>
                  <Badge color='blue'>{PLAN_LABELS[s.plan] || s.plan}</Badge>
                </td>
                <td className='px-4 py-3 text-ink-300'>{formatCurrency(s.amount)}</td>
                <td className='px-4 py-3 text-ink-400 text-xs whitespace-nowrap'>
                  {faDate(s.startDate)}
                </td>
                <td className='px-4 py-3 text-ink-400 text-xs whitespace-nowrap'>
                  {s.endDate ? faDate(s.endDate) : '—'}
                </td>
                <td className='px-4 py-3'>
                  <Badge color={STATUS[s.status]?.color || 'gray'}>
                    {STATUS[s.status]?.label || s.status}
                  </Badge>
                </td>
                <td className='px-4 py-3'>
                  <div className='flex items-center gap-2'>
                    <button
                      onClick={() =>
                        setModal({
                          ...s,
                          businessId: s.business?.id,
                          endDate: s.endDate ? s.endDate.slice(0, 10) : '',
                        })
                      }
                      className='text-sand hover:text-sand-light text-xs'
                    >
                      ویرایش
                    </button>
                    <button
                      onClick={() => setDel(s)}
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
        title={modal?.id ? 'ویرایش اشتراک' : 'اشتراک جدید'}
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
            {!modal.id && (
              <Field label='کسب‌وکار'>
                <select
                  className='input-field'
                  value={modal.businessId}
                  onChange={(e) => setModal({ ...modal, businessId: e.target.value })}
                >
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <div className='grid grid-cols-2 gap-4'>
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
              <Field label='مبلغ (تومان)'>
                <input
                  type='number'
                  className='input-field'
                  value={modal.amount}
                  onChange={(e) => setModal({ ...modal, amount: Number(e.target.value) })}
                />
              </Field>
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <Field label='وضعیت'>
                <select
                  className='input-field'
                  value={modal.status}
                  onChange={(e) => setModal({ ...modal, status: e.target.value })}
                >
                  {Object.entries(STATUS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label='تاریخ پایان'>
                <input
                  type='date'
                  className='input-field'
                  dir='ltr'
                  value={modal.endDate || ''}
                  onChange={(e) => setModal({ ...modal, endDate: e.target.value })}
                />
              </Field>
            </div>
          </div>
        )}
      </Modal>

      <Confirm
        open={!!del}
        onClose={() => setDel(null)}
        onConfirm={remove}
        title='حذف اشتراک'
        message='آیا از حذف این اشتراک مطمئن هستید؟'
      />
    </div>
  )
}
