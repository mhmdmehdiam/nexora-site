'use client'

import { useCallback, useEffect, useState } from 'react'
import { Icon } from '../icons'
import { useApp } from '../app-context'
import { formatDate, cn } from '@/lib/utils'

interface TeamUser {
  id: string
  name: string
  email: string
  role: string
  phone: string | null
  isActive: boolean
  createdAt: string
}

interface Limits {
  plan: string
  maxUsers: number
  used: number
  remaining: number
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'مالک',
  admin: 'مدیر کل',
  manager: 'مدیر فروش',
  user: 'کاربر',
}

const ROLE_STYLES: Record<string, string> = {
  owner: 'text-sand bg-sand/10 border-sand/25',
  admin: 'text-red-400 bg-red-400/10 border-red-400/20',
  manager: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  user: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
}

const PLAN_LABELS: Record<string, string> = {
  free: 'رایگان',
  pro: 'حرفه‌ای',
  enterprise: 'سازمانی',
}

const EMPTY_FORM = { name: '', email: '', password: '', role: 'user', phone: '' }

export default function UsersPage() {
  const { user: me } = useApp()

  const [users, setUsers] = useState<TeamUser[]>([])
  const [limits, setLimits] = useState<Limits | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState<TeamUser | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const canManage = me?.role === 'owner' || me?.role === 'admin'

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/users?search=${encodeURIComponent(search)}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'خطا در دریافت کاربران')
        setUsers([])
        return
      }
      setUsers(data.users || [])
      setLimits(data.limits || null)
    } catch {
      setError('خطا در ارتباط با سرور')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    load()
  }, [load])

  const flash = (msg: string) => {
    setNotice(msg)
    setTimeout(() => setNotice(''), 3000)
  }

  const openCreate = () => {
    setEditUser(null)
    setForm({ ...EMPTY_FORM })
    setFormError('')
    setShowModal(true)
  }

  const openEdit = (u: TeamUser) => {
    setEditUser(u)
    setForm({ name: u.name, email: u.email, password: '', role: u.role, phone: u.phone || '' })
    setFormError('')
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFormError('')

    const url = editUser ? `/api/users/${editUser.id}` : '/api/users'
    const method = editUser ? 'PUT' : 'POST'

    // on edit an empty password means "leave it alone"
    const payload: any = {
      name: form.name,
      email: form.email,
      role: form.role,
      phone: form.phone || null,
    }
    if (form.password) payload.password = form.password

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error || 'خطا در ذخیره')
        return
      }
      setShowModal(false)
      flash(editUser ? 'کاربر بروزرسانی شد' : 'کاربر جدید اضافه شد')
      load()
    } catch {
      setFormError('خطا در ارتباط با سرور')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (u: TeamUser) => {
    const res = await fetch(`/api/users/${u.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !u.isActive }),
    })
    const data = await res.json()
    if (!res.ok) {
      flash(data.error || 'خطا در تغییر وضعیت')
      return
    }
    flash(u.isActive ? 'کاربر غیرفعال شد' : 'کاربر فعال شد')
    load()
  }

  const removeUser = async (u: TeamUser) => {
    if (!confirm(`کاربر «${u.name}» حذف شود؟ این کار برگشت‌پذیر نیست.`)) return
    const res = await fetch(`/api/users/${u.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      flash(data.error || 'خطا در حذف')
      return
    }
    flash('کاربر حذف شد')
    load()
  }

  const atLimit = limits ? limits.maxUsers !== -1 && limits.used >= limits.maxUsers : false

  return (
    <div className='space-y-6'>
      <div className='page-header animate-slide-in-up'>
        <div>
          <h1 className='page-title text-3xl'>مدیریت کاربران</h1>
          <p className='page-subtitle'>
            {loading
              ? 'در حال بارگذاری…'
              : limits
                ? `${limits.used} کاربر از ${limits.maxUsers === -1 ? 'نامحدود' : limits.maxUsers} کاربر پلن ${PLAN_LABELS[limits.plan] || limits.plan}`
                : `${users.length} کاربر`}
          </p>
        </div>
        {canManage && (
          <button
            onClick={openCreate}
            disabled={atLimit}
            title={atLimit ? 'سقف کاربران پلن شما پر شده است' : ''}
            className={cn('btn-primary flex items-center gap-2', atLimit && 'opacity-40 cursor-not-allowed')}
          >
            <Icon name='plus' className='w-5 h-5' /> کاربر جدید
          </button>
        )}
      </div>

      {notice && (
        <div className='glass-card px-5 py-3 text-sm text-emerald-400 border-emerald-400/20 animate-slide-in-up'>
          {notice}
        </div>
      )}

      {atLimit && (
        <div className='glass-card px-5 py-4 text-sm text-amber-400/90 border-amber-400/20'>
          سقف کاربران پلن «{PLAN_LABELS[limits!.plan] || limits!.plan}» ({limits!.maxUsers} نفر) پر شده است.
          برای افزودن کاربر بیشتر، پلن را ارتقا دهید.
        </div>
      )}

      {error && (
        <div className='glass-card px-5 py-4 text-sm text-red-400/90 border-red-400/20'>{error}</div>
      )}

      {/* Permissions reference */}
      <div className='glass-card p-6'>
        <h3 className='text-lg font-semibold text-ink-50 mb-4'>سطوح دسترسی</h3>
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
          <div className='p-4 bg-red-500/5 rounded-xl border border-red-500/10'>
            <h4 className='text-red-400 font-medium mb-2'>مدیر کل</h4>
            <ul className='text-sm text-ink-400 space-y-1'>
              <li>مدیریت کاربران</li>
              <li>تنظیمات سیستم</li>
              <li>گزارشات مالی</li>
            </ul>
          </div>
          <div className='p-4 bg-amber-500/5 rounded-xl border border-amber-500/10'>
            <h4 className='text-amber-400 font-medium mb-2'>مدیر فروش</h4>
            <ul className='text-sm text-ink-400 space-y-1'>
              <li>مدیریت مشتریان</li>
              <li>ثبت فروش</li>
              <li>مشاهده گزارشات</li>
            </ul>
          </div>
          <div className='p-4 bg-blue-500/5 rounded-xl border border-blue-500/10'>
            <h4 className='text-blue-400 font-medium mb-2'>کاربر</h4>
            <ul className='text-sm text-ink-400 space-y-1'>
              <li>مشاهده مشتریان</li>
              <li>ثبت فروش</li>
              <li>داشبورد</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className='glass-card p-4'>
        <div className='relative'>
          <Icon
            name='search'
            className='absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-500 pointer-events-none'
          />
          <input
            type='text'
            placeholder='جستجوی نام یا ایمیل…'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='input-field pr-12'
          />
        </div>
      </div>

      {/* Table */}
      <div className='glass-card overflow-hidden'>
        <table className='w-full'>
          <thead>
            <tr className='border-b border-ink-100/[0.08]'>
              <th className='text-right px-6 py-4 text-xs font-medium text-ink-400 uppercase'>کاربر</th>
              <th className='text-right px-6 py-4 text-xs font-medium text-ink-400 uppercase'>ایمیل</th>
              <th className='text-right px-6 py-4 text-xs font-medium text-ink-400 uppercase'>نقش</th>
              <th className='text-right px-6 py-4 text-xs font-medium text-ink-400 uppercase'>وضعیت</th>
              <th className='text-right px-6 py-4 text-xs font-medium text-ink-400 uppercase'>تاریخ عضویت</th>
              {canManage && (
                <th className='text-right px-6 py-4 text-xs font-medium text-ink-400 uppercase'>عملیات</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={canManage ? 6 : 5} className='px-6 py-12 text-center text-ink-500'>
                  در حال بارگذاری…
                </td>
              </tr>
            )}

            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={canManage ? 6 : 5} className='px-6 py-12 text-center text-ink-500'>
                  کاربری یافت نشد
                </td>
              </tr>
            )}

            {!loading &&
              users.map((u, idx) => {
                const isMe = u.id === me?.id
                return (
                  <tr key={u.id} className='table-row mv-in' style={{ ['--i' as string]: idx }}>
                    <td className='px-6 py-4'>
                      <div className='flex items-center gap-3'>
                        <div className='w-10 h-10 rounded-xl bg-sand/12 flex items-center justify-center text-sand font-bold'>
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <span className='text-ink-50 font-medium'>{u.name}</span>
                          {isMe && <span className='text-[10px] text-ink-500 mr-2'>(شما)</span>}
                        </div>
                      </div>
                    </td>
                    <td className='px-6 py-4 text-sm text-ink-400' dir='ltr'>
                      {u.email}
                    </td>
                    <td className='px-6 py-4'>
                      <span className={cn('badge', ROLE_STYLES[u.role] || ROLE_STYLES.user)}>
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </td>
                    <td className='px-6 py-4'>
                      <span
                        className={cn(
                          'badge',
                          u.isActive
                            ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                            : 'text-ink-500 bg-ink-500/10 border-ink-500/20'
                        )}
                      >
                        {u.isActive ? 'فعال' : 'غیرفعال'}
                      </span>
                    </td>
                    <td className='px-6 py-4 text-sm text-ink-500'>{formatDate(u.createdAt)}</td>
                    {canManage && (
                      <td className='px-6 py-4'>
                        <div className='flex items-center gap-1'>
                          {!isMe && (
                            <>
                              <button
                                onClick={() => openEdit(u)}
                                className='p-2 text-ink-400 hover:text-sand hover:bg-sand/10 rounded-lg transition-all'
                                title='ویرایش'
                              >
                                <Icon name='edit' className='w-4 h-4' />
                              </button>
                              <button
                                onClick={() => toggleActive(u)}
                                className={cn(
                                  'p-2 rounded-lg transition-all',
                                  u.isActive
                                    ? 'text-ink-400 hover:text-amber-400 hover:bg-amber-400/10'
                                    : 'text-ink-400 hover:text-emerald-400 hover:bg-emerald-400/10'
                                )}
                                title={u.isActive ? 'غیرفعال کردن' : 'فعال کردن'}
                              >
                                <Icon name={u.isActive ? 'eye-off' : 'eye'} className='w-4 h-4' />
                              </button>
                              <button
                                onClick={() => removeUser(u)}
                                className='p-2 text-ink-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all'
                                title='حذف'
                              >
                                <Icon name='trash' className='w-4 h-4' />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>

      {/* Create / edit modal */}
      {showModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          <div className='fixed inset-0 bg-black/60 backdrop-blur-sm' onClick={() => setShowModal(false)} />
          <div className='glass-card w-full max-w-lg p-6 relative animate-scale-in max-h-[90vh] overflow-y-auto'>
            <h2 className='text-xl font-bold text-ink-50 mb-6'>
              {editUser ? 'ویرایش کاربر' : 'کاربر جدید'}
            </h2>

            <form onSubmit={handleSubmit} className='space-y-4'>
              <div>
                <label className='block text-sm text-ink-400 mb-1.5'>نام *</label>
                <input
                  type='text'
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className='input-field'
                  required
                  minLength={2}
                />
              </div>

              <div>
                <label className='block text-sm text-ink-400 mb-1.5'>ایمیل *</label>
                <input
                  type='email'
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className='input-field'
                  dir='ltr'
                  required
                />
              </div>

              <div>
                <label className='block text-sm text-ink-400 mb-1.5'>
                  رمز عبور {editUser ? '(خالی = بدون تغییر)' : '*'}
                </label>
                <input
                  type='password'
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className='input-field'
                  dir='ltr'
                  minLength={8}
                  required={!editUser}
                  placeholder={editUser ? '••••••••' : 'حداقل ۸ کاراکتر با حرف و رقم'}
                />
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm text-ink-400 mb-1.5'>نقش</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className='input-field'
                  >
                    <option value='user'>کاربر</option>
                    <option value='manager'>مدیر فروش</option>
                    {me?.role === 'owner' && <option value='admin'>مدیر کل</option>}
                  </select>
                </div>
                <div>
                  <label className='block text-sm text-ink-400 mb-1.5'>تلفن</label>
                  <input
                    type='text'
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className='input-field'
                    dir='ltr'
                  />
                </div>
              </div>

              {formError && (
                <div className='text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3'>
                  {formError}
                </div>
              )}

              <div className='flex gap-3 pt-2'>
                <button type='submit' disabled={saving} className='btn-primary flex-1'>
                  {saving ? 'در حال ذخیره…' : editUser ? 'بروزرسانی' : 'ایجاد کاربر'}
                </button>
                <button
                  type='button'
                  onClick={() => setShowModal(false)}
                  className='btn-secondary flex-1'
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
