'use client'

import { useEffect, useState } from 'react'
import { Icon } from '../icons'
import { formatCurrency, formatNumber, cn } from '@/lib/utils'
import { ExportButton } from '@/components/dashboard/export-button'

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editProduct, setEditProduct] = useState<any>(null)
  const [form, setForm] = useState({
    name: '',
    sku: '',
    description: '',
    category: '',
    price: '',
    cost: '',
    stock: '',
    minStock: '',
    unit: 'عدد',
  })

  const load = async () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (category) params.set('category', category)
    const res = await fetch(`/api/products?${params}`)
    const data = await res.json()
    setProducts(data.products || [])
    setCategories(data.categories || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [search, category])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const url = editProduct ? `/api/products/${editProduct.id}` : '/api/products'

    const method = editProduct ? 'PUT' : 'POST'

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setShowModal(false)
    setEditProduct(null)
    resetForm()
    load()
  }

  const resetForm = () =>
    setForm({
      name: '',
      sku: '',
      description: '',
      category: '',
      price: '',
      cost: '',
      stock: '',
      minStock: '',
      unit: 'عدد',
    })

  const handleDelete = async (id: string) => {
    if (!confirm('آیا مطمئن هستید؟')) return
    await fetch(`/api/products/${id}`, { method: 'DELETE' })
    load()
  }

  const openEdit = (p: any) => {
    setEditProduct(p)
    setForm({
      name: p.name,
      sku: p.sku || '',
      description: p.description || '',
      category: p.category || '',
      price: String(p.price),
      cost: String(p.cost),
      stock: String(p.stock),
      minStock: String(p.minStock),
      unit: p.unit,
    })
    setShowModal(true)
  }

  return (
    <div className='space-y-6'>
      <div className='page-header animate-slide-in-up'>
        <div>
          <h1 className='page-title text-3xl'>مدیریت محصولات</h1>
          <p className='page-subtitle'>{formatNumber(products.length)} محصول فعال</p>
        </div>
        <div className='flex items-center gap-2'>
          <ExportButton entity='products' />
          <button
          onClick={() => {
            setEditProduct(null)
            resetForm()
            setShowModal(true)
          }}
          className='btn-primary flex items-center gap-2 ripple'
        >
          <Icon name='plus' className='w-5 h-5' /> محصول جدید
        </button>
        </div>
      </div>

      {/* Filters */}
      <div
        className='glass-card p-4 flex flex-col sm:flex-row gap-3 animate-slide-in-up'
        style={{ animationDelay: '0.1s', animationFillMode: 'backwards' }}
      >
        <div className='relative flex-1'>
          <Icon
            name='search'
            className='w-5 h-5 text-ink-500 absolute right-3 top-1/2 -translate-y-1/2'
          />
          <input
            type='text'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='input-field pr-10'
            placeholder='جستجوی نام یا کد...'
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className='input-field w-auto min-w-[160px]'
        >
          <option value=''>همه دسته‌ها</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Products grid */}
      {loading ? (
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
          {[...Array(8)].map((_, i) => (
            <div key={i} className='skeleton h-52 rounded-2xl' />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className='glass-card p-12 text-center text-ink-500'>محصولی یافت نشد</div>
      ) : (
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
          {products.map((p) => (
            <div key={p.id} className='glass-card-hover p-5'>
              <div className='flex items-start justify-between mb-3'>
                <div className='w-10 h-10 rounded-xl bg-purple-600/15 flex items-center justify-center text-purple-400'>
                  <Icon name='package' className='w-5 h-5' />
                </div>
                {p.stock <= p.minStock && (
                  <span className='badge text-red-400 bg-red-400/10 border-red-400/20 text-[10px]'>
                    موجودی کم
                  </span>
                )}
              </div>
              <h3 className='text-ink-50 font-semibold mb-1'>{p.name}</h3>
              {p.sku && (
                <p className='text-xs text-ink-500 mb-3' dir='ltr'>
                  {p.sku}
                </p>
              )}
              <div className='space-y-2 text-sm'>
                <div className='flex justify-between'>
                  <span className='text-ink-400'>قیمت فروش</span>
                  <span className='text-ink-50 font-medium'>{formatCurrency(p.price)}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-ink-400'>موجودی</span>
                  <span
                    className={cn(
                      'font-medium',
                      p.stock <= p.minStock ? 'text-red-400' : 'text-ink-50',
                    )}
                  >
                    {formatNumber(p.stock)} {p.unit}
                  </span>
                </div>
                {p.category && (
                  <div className='flex justify-between'>
                    <span className='text-ink-400'>دسته</span>
                    <span className='text-ink-300'>{p.category}</span>
                  </div>
                )}
              </div>
              <div className='flex gap-2 mt-4 pt-3 border-t border-ink-100/[0.08]'>
                <button onClick={() => openEdit(p)} className='btn-ghost text-xs flex-1 py-2'>
                  ویرایش
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className='btn-ghost text-xs py-2 text-red-400 hover:text-red-300'
                >
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          <div
            className='fixed inset-0 bg-black/60 backdrop-blur-sm'
            onClick={() => setShowModal(false)}
          />
          <div className='glass-card w-full max-w-lg p-6 relative animate-scale-in max-h-[90vh] overflow-y-auto'>
            <h2 className='text-xl font-bold text-ink-50 mb-6'>
              {editProduct ? 'ویرایش محصول' : 'محصول جدید'}
            </h2>
            <form onSubmit={handleSubmit} className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm text-ink-400 mb-1.5'>نام *</label>
                  <input
                    type='text'
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className='input-field'
                    required
                  />
                </div>
                <div>
                  <label className='block text-sm text-ink-400 mb-1.5'>کد محصول</label>
                  <input
                    type='text'
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className='input-field'
                    dir='ltr'
                  />
                </div>
              </div>
              <div>
                <label className='block text-sm text-ink-400 mb-1.5'>دسته‌بندی</label>
                <input
                  type='text'
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className='input-field'
                />
              </div>
              <div>
                <label className='block text-sm text-ink-400 mb-1.5'>توضیحات</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className='input-field min-h-[60px]'
                />
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm text-ink-400 mb-1.5'>قیمت فروش (تومان) *</label>
                  <input
                    type='number'
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className='input-field'
                    dir='ltr'
                    required
                  />
                </div>
                <div>
                  <label className='block text-sm text-ink-400 mb-1.5'>قیمت تمام‌شده</label>
                  <input
                    type='number'
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: e.target.value })}
                    className='input-field'
                    dir='ltr'
                  />
                </div>
              </div>
              <div className='grid grid-cols-3 gap-4'>
                <div>
                  <label className='block text-sm text-ink-400 mb-1.5'>موجودی *</label>
                  <input
                    type='number'
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    className='input-field'
                    dir='ltr'
                    required
                  />
                </div>
                <div>
                  <label className='block text-sm text-ink-400 mb-1.5'>حداقل موجودی</label>
                  <input
                    type='number'
                    value={form.minStock}
                    onChange={(e) => setForm({ ...form, minStock: e.target.value })}
                    className='input-field'
                    dir='ltr'
                  />
                </div>
                <div>
                  <label className='block text-sm text-ink-400 mb-1.5'>واحد</label>
                  <input
                    type='text'
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className='input-field'
                  />
                </div>
              </div>
              <div className='flex gap-3 pt-2'>
                <button type='submit' className='btn-primary flex-1'>
                  {editProduct ? 'بروزرسانی' : 'ایجاد'}
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
