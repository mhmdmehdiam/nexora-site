import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatMoney } from './money'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Money is always an integer; formatting goes through the shared money module
 * so a stray float can never render as "۱۲٬۳۴۵٫۶۷ تومان".
 */
export function formatCurrency(amount: number): string {
  return formatMoney(amount)
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('fa-IR').format(num)
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d)
}

export function formatShortDate(date: Date | string): string {
  const d = new Date(date)
  return new Intl.DateTimeFormat('fa-IR', {
    month: 'short',
    day: 'numeric',
  }).format(d)
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    paid: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    pending: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    partial: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    unpaid: 'text-red-400 bg-red-400/10 border-red-400/20',
    overdue: 'text-red-400 bg-red-400/10 border-red-400/20',
    cancelled: 'text-gray-400 bg-gray-400/10 border-gray-400/20',
    sent: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    failed: 'text-red-400 bg-red-400/10 border-red-400/20',
  }
  return colors[status] || 'text-gray-400 bg-gray-400/10 border-gray-400/20'
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    paid: 'پرداخت شده',
    pending: 'در انتظار',
    partial: 'پرداخت جزئی',
    unpaid: 'پرداخت نشده',
    overdue: 'سررسید گذشته',
    cancelled: 'لغو شده',
    sent: 'ارسال شده',
    failed: 'ناموفق',
  }
  return labels[status] || status
}

export function generateInvoiceNumber(): string {
  const now = new Date()
  const prefix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `INV-${prefix}${random}`
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}
