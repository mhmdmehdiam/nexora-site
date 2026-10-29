'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Icon } from '../icons'
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '@/lib/utils'

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    fetch(`/api/invoices?status=${statusFilter}`)
      .then((r) => r.json())
      .then((data) => {
        setInvoices(data.invoices || [])
        setLoading(false)
      })
  }, [statusFilter])

  return (
    <div className='space-y-6'>
      <div className='page-header animate-slide-in-up'>
        <div>
          <h1 className='page-title'>فاکتورها</h1>
          <p className='page-subtitle'>مدیریت فاکتورها و صورتحساب‌ها</p>
        </div>
      </div>

      <div className='glass-card p-4 flex gap-2 animate-slide-in-up' style={{ animationDelay: '0.08s', animationFillMode: 'backwards' }}>
        {['', 'unpaid', 'paid', 'overdue'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-xl text-sm transition-all ${statusFilter === s ? 'bg-brand-600 text-ink-50' : 'bg-ink-50/[0.04] text-ink-400 hover:text-ink-50'}`}
          >
            {s === '' ? 'همه' : getStatusLabel(s)}
          </button>
        ))}
      </div>

      <div className='glass-card overflow-hidden animate-slide-in-up' style={{ animationDelay: '0.14s', animationFillMode: 'backwards' }}>
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead>
              <tr className='border-b border-ink-100/[0.08]'>
                <th className='text-right px-6 py-4 text-xs font-medium text-ink-400 uppercase'>
                  شماره
                </th>
                <th className='text-right px-6 py-4 text-xs font-medium text-ink-400 uppercase'>
                  مشتری
                </th>
                <th className='text-right px-6 py-4 text-xs font-medium text-ink-400 uppercase'>
                  سررسید
                </th>
                <th className='text-right px-6 py-4 text-xs font-medium text-ink-400 uppercase'>
                  مبلغ کل
                </th>
                <th className='text-right px-6 py-4 text-xs font-medium text-ink-400 uppercase'>
                  پرداختی
                </th>
                <th className='text-right px-6 py-4 text-xs font-medium text-ink-400 uppercase'>
                  وضعیت
                </th>
                <th className='text-left px-6 py-4 text-xs font-medium text-ink-400 uppercase'>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className='table-row'>
                    <td colSpan={6} className='px-6 py-4'>
                      <div className='skeleton h-5 w-full' />
                    </td>
                  </tr>
                ))
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className='text-center py-12 text-ink-500'>
                    فاکتوری یافت نشد
                  </td>
                </tr>
              ) : (
                invoices.map((inv, idx) => (
                  <tr
                    key={inv.id}
                    className='table-row mv-in'
                    style={{ ['--i' as string]: idx }}
                  >
                    <td className='px-6 py-4 text-sm text-sand font-mono'>
                      <Link href={`/dashboard/invoices/${inv.id}`} className='hover:underline'>
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className='px-6 py-4 text-sm text-ink-50'>{inv.customer.name}</td>
                    <td className='px-6 py-4 text-sm text-ink-400'>{formatDate(inv.dueDate)}</td>
                    <td className='px-6 py-4 text-sm font-medium text-ink-50'>
                      {formatCurrency(inv.totalAmount)}
                    </td>
                    <td className='px-6 py-4 text-sm text-ink-300'>
                      {formatCurrency(inv.paidAmount)}
                    </td>
                    <td className='px-6 py-4'>
                      <span className={`badge ${getStatusColor(inv.status)}`}>
                        {getStatusLabel(inv.status)}
                      </span>
                    </td>
                    <td className='px-6 py-4 text-left'>
                      <Link
                        href={`/dashboard/invoices/${inv.id}`}
                        className='text-[12px] text-ink-400 transition-colors hover:text-sand'
                      >
                        مشاهده / چاپ
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
