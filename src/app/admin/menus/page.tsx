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
} from '@/components/admin/ui'

export default function MenusPage() {
  const { data, loading, reload } = useAsync<{ items: any[] }>(() => api('/api/admin/menus'), [])
  const [modal, setModal] = useState<any>(null)
  const [del, setDel] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  const items = data?.items || []
  const header = items.filter((i) => i.location === 'header')
  const footer = items.filter((i) => i.location === 'footer')

  const save = async () => {
    setSaving(true)
    try {
      if (modal.id) {
        await api(`/api/admin/menus/${modal.id}`, { method: 'PUT', body: JSON.stringify(modal) })
      } else {
        await api('/api/admin/menus', { method: 'POST', body: JSON.stringify(modal) })
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
      await api(`/api/admin/menus/${del.id}`, { method: 'DELETE' })
      toast('آیتم حذف شد')
      reload()
    } catch (e: any) {
      toast(e.message, 'error')
    }
  }

  const renderTable = (list: any[], location: string) => (
    <Card
      title={location === 'header' ? 'منوی هدر (بالا)' : 'منوی فوتر (پایین)'}
      action={
        <Btn
          size='sm'
          variant='secondary'
          onClick={() =>
            setModal({ label: '', url: '#', location, order: list.length, isActive: true })
          }
        >
          + آیتم
        </Btn>
      }
    >
      {list.length === 0 ? (
        <p className='text-sm text-ink-500'>آیتمی ثبت نشده</p>
      ) : (
        <Table head={['عنوان', 'لینک', 'ترتیب', 'وضعیت', 'عملیات']}>
          {list.map((it) => (
            <tr key={it.id} className='table-row'>
              <td className='px-4 py-3 text-ink-50'>{it.label}</td>
              <td className='px-4 py-3 text-ink-400 text-xs' dir='ltr'>
                {it.url}
              </td>
              <td className='px-4 py-3 text-ink-400'>{it.order}</td>
              <td className='px-4 py-3'>
                <Badge color={it.isActive ? 'green' : 'red'}>
                  {it.isActive ? 'فعال' : 'غیرفعال'}
                </Badge>
              </td>
              <td className='px-4 py-3'>
                <div className='flex items-center gap-2'>
                  <button
                    onClick={() => setModal({ ...it })}
                    className='text-sand hover:text-sand-light text-xs'
                  >
                    ویرایش
                  </button>
                  <button
                    onClick={() => setDel(it)}
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
  )

  return (
    <div className='space-y-6'>
      <div className='page-header'>
        <div>
          <h1 className='page-title text-3xl'>منوها</h1>
          <p className='page-subtitle'>مدیریت لینک‌های منوی هدر و فوتر</p>
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <div className='space-y-4'>
          {renderTable(header, 'header')}
          {renderTable(footer, 'footer')}
        </div>
      )}

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.id ? 'ویرایش آیتم منو' : 'آیتم منو جدید'}
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
            <Field label='عنوان'>
              <input
                className='input-field'
                value={modal.label}
                onChange={(e) => setModal({ ...modal, label: e.target.value })}
              />
            </Field>
            <Field label='لینک'>
              <input
                className='input-field'
                dir='ltr'
                value={modal.url}
                onChange={(e) => setModal({ ...modal, url: e.target.value })}
              />
            </Field>
            <div className='grid grid-cols-2 gap-4'>
              <Field label='محل نمایش'>
                <select
                  className='input-field'
                  value={modal.location}
                  onChange={(e) => setModal({ ...modal, location: e.target.value })}
                >
                  <option value='header'>هدر</option>
                  <option value='footer'>فوتر</option>
                </select>
              </Field>
              <Field label='ترتیب'>
                <input
                  type='number'
                  className='input-field'
                  value={modal.order}
                  onChange={(e) => setModal({ ...modal, order: Number(e.target.value) })}
                />
              </Field>
            </div>
            <label className='flex items-center gap-2 text-sm text-ink-300'>
              <input
                type='checkbox'
                checked={modal.isActive}
                onChange={(e) => setModal({ ...modal, isActive: e.target.checked })}
              />
              فعال باشد
            </label>
          </div>
        )}
      </Modal>

      <Confirm
        open={!!del}
        onClose={() => setDel(null)}
        onConfirm={remove}
        title='حذف آیتم منو'
        message={`آیا از حذف «${del?.label}» مطمئن هستید؟`}
      />
    </div>
  )
}
