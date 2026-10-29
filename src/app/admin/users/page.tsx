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

const ROLES: Record<string, string> = {
  owner: 'مالک',
  admin: 'مدیر',
  manager: 'سرپرست',
  user: 'کاربر',
}

export default function UsersPage() {
  const [search, setSearch] = useState('')
  const { data, loading, reload } = useAsync<{ users: any[] }>(
    () => api(`/api/admin/users?search=${encodeURIComponent(search)}`),
    [search],
  )
  const { data: bizData } = useAsync<{ businesses: any[] }>(() => api('/api/admin/businesses'), [])
  const [modal, setModal] = useState<any>(null)
  const [del, setDel] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  const users = data?.users || []
  const businesses = bizData?.businesses || []

  const openNew = () =>
    setModal({
      name: '',
      email: '',
      password: '',
      role: 'user',
      phone: '',
      businessId: businesses[0]?.id || '',
    })

  const save = async () => {
    setSaving(true)
    try {
      if (modal.id) {
        const payload: any = {
          name: modal.name,
          role: modal.role,
          phone: modal.phone,
          isActive: modal.isActive,
          email: modal.email,
        }
        if (modal.password) payload.password = modal.password
        await api(`/api/admin/users/${modal.id}`, { method: 'PUT', body: JSON.stringify(payload) })
      } else {
        await api('/api/admin/users', { method: 'POST', body: JSON.stringify(modal) })
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
      await api(`/api/admin/users/${del.id}`, { method: 'DELETE' })
      toast('کاربر حذف شد')
      reload()
    } catch (e: any) {
      toast(e.message, 'error')
    }
  }

  return (
    <div className='space-y-6'>
      <div className='page-header'>
        <div>
          <h1 className='page-title text-3xl'>کاربران</h1>
          <p className='page-subtitle'>مدیریت کاربران و سطوح دسترسی</p>
        </div>
        <Btn onClick={openNew}>+ کاربر جدید</Btn>
      </div>

      <Card>
        <input
          className='input-field max-w-xs mb-5'
          placeholder='جستجوی نام یا ایمیل...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loading ? (
          <Loading />
        ) : users.length === 0 ? (
          <EmptyState icon='' title='کاربری یافت نشد' />
        ) : (
          <Table head={['نام', 'ایمیل', 'کسب‌وکار', 'نقش', 'وضعیت', 'عملیات']}>
            {users.map((u) => (
              <tr key={u.id} className='table-row'>
                <td className='px-4 py-3'>
                  <div className='flex items-center gap-2'>
                    <div className='w-8 h-8 rounded-lg bg-brand-600/15 flex items-center justify-center text-sand text-xs font-bold'>
                      {u.name?.charAt(0)}
                    </div>
                    <span className='text-ink-50'>{u.name}</span>
                  </div>
                </td>
                <td className='px-4 py-3 text-ink-400 text-xs' dir='ltr'>
                  {u.email}
                </td>
                <td className='px-4 py-3 text-ink-400'>{u.business?.name || '—'}</td>
                <td className='px-4 py-3'>
                  <Badge color='purple'>{ROLES[u.role] || u.role}</Badge>
                </td>
                <td className='px-4 py-3'>
                  <Badge color={u.isActive ? 'green' : 'red'}>
                    {u.isActive ? 'فعال' : 'غیرفعال'}
                  </Badge>
                </td>
                <td className='px-4 py-3'>
                  <div className='flex items-center gap-2'>
                    <button
                      onClick={() => setModal({ ...u, password: '' })}
                      className='text-sand hover:text-sand-light text-xs'
                    >
                      ویرایش
                    </button>
                    <button
                      onClick={() => setDel(u)}
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
        title={modal?.id ? 'ویرایش کاربر' : 'کاربر جدید'}
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
            <Field label='نام'>
              <input
                className='input-field'
                value={modal.name}
                onChange={(e) => setModal({ ...modal, name: e.target.value })}
              />
            </Field>
            <Field label='ایمیل'>
              <input
                className='input-field'
                dir='ltr'
                value={modal.email}
                onChange={(e) => setModal({ ...modal, email: e.target.value })}
              />
            </Field>
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
              <Field label='نقش'>
                <select
                  className='input-field'
                  value={modal.role}
                  onChange={(e) => setModal({ ...modal, role: e.target.value })}
                >
                  {Object.entries(ROLES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
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
            <Field label={modal.id ? 'رمز عبور جدید (خالی = بدون تغییر)' : 'رمز عبور'}>
              <input
                className='input-field'
                type='password'
                dir='ltr'
                value={modal.password}
                onChange={(e) => setModal({ ...modal, password: e.target.value })}
              />
            </Field>
            {modal.id && (
              <label className='flex items-center gap-2 text-sm text-ink-300'>
                <input
                  type='checkbox'
                  checked={modal.isActive}
                  onChange={(e) => setModal({ ...modal, isActive: e.target.checked })}
                />
                حساب فعال باشد
              </label>
            )}
          </div>
        )}
      </Modal>

      <Confirm
        open={!!del}
        onClose={() => setDel(null)}
        onConfirm={remove}
        title='حذف کاربر'
        message={`آیا از حذف «${del?.name}» مطمئن هستید؟`}
      />
    </div>
  )
}
