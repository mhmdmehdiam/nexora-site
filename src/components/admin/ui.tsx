'use client'

import { useEffect, useState, useCallback } from 'react'
import * as Dialog from '@radix-ui/react-dialog'

// ===== fetch helper =====
export async function api<T = any>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: options?.body && !(options.body instanceof FormData)
      ? { 'Content-Type': 'application/json', ...(options?.headers || {}) }
      : options?.headers,
    ...options,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as any)?.error || 'خطای سرور')
  return data as T
}

// ===== toast system =====
type ToastItem = { id: number; message: string; type: 'success' | 'error' | 'info' }
type Listener = (t: ToastItem) => void
let listeners: Listener[] = []
let counter = 0

export function toast(message: string, type: ToastItem['type'] = 'success') {
  const item = { id: ++counter, message, type }
  listeners.forEach(l => l(item))
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([])
  useEffect(() => {
    const fn: Listener = (t) => {
      setItems(prev => [...prev, t])
      setTimeout(() => setItems(prev => prev.filter(x => x.id !== t.id)), 3500)
    }
    listeners.push(fn)
    return () => { listeners = listeners.filter(l => l !== fn) }
  }, [])

  const styles: Record<string, string> = {
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    error: 'border-red-500/30 bg-red-500/10 text-red-300',
    info: 'border-brand-500/30 bg-brand-500/10 text-brand-200',
  }
  const icons: Record<string, string> = { success: '✓', error: '⚠', info: 'ℹ' }

  return (
    <div className="fixed bottom-6 left-6 z-[100] space-y-2">
      {items.map(t => (
        <div key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-xl animate-slide-in-up min-w-[240px] ${styles[t.type]}`}>
          <span className="text-lg">{icons[t.type]}</span>
          <span className="text-sm">{t.message}</span>
        </div>
      ))}
    </div>
  )
}

// ===== buttons =====
export function Btn({
  children, onClick, variant = 'primary', type = 'button', disabled, className = '', size = 'md',
}: {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  type?: 'button' | 'submit'
  disabled?: boolean
  className?: string
  size?: 'sm' | 'md'
}) {
  const base = variant === 'primary' ? 'btn-primary'
    : variant === 'secondary' ? 'btn-secondary'
    : variant === 'danger' ? 'btn-danger'
    : 'btn-ghost'
  const sizing = size === 'sm' ? 'text-xs px-3 py-1.5' : 'text-sm'
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`${base} ${sizing} inline-flex items-center justify-center gap-2 ${className}`}>
      {children}
    </button>
  )
}

// ===== card =====
export function Card({ title, subtitle, action, children, className = '' }: {
  title?: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; className?: string
}) {
  return (
    <div className={`glass-card ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-ink-100/[0.08] px-6 py-4">
          <div>
            {title && <h3 className="font-semibold tracking-tight text-ink-50">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-[11.5px] text-ink-500">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  )
}

// ===== form field =====
export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[12px] font-medium text-ink-300">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[11px] leading-5 text-ink-600">{hint}</span>}
    </label>
  )
}

// ===== modal (Radix: focus trap, Esc, aria, scroll lock) =====
export function Modal({ open, onClose, title, children, footer, wide }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <Dialog.Content
          aria-describedby={undefined}
          className={`fixed left-1/2 top-1/2 z-[91] flex max-h-[88vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-ink-100/[0.10] bg-ink-950-900/95 shadow-2xl backdrop-blur-xl data-[state=open]:animate-slide-in-up ${
            wide ? 'max-w-3xl' : 'max-w-lg'
          }`}
        >
          <div className="flex items-center justify-between border-b border-ink-100/[0.08] px-6 py-4">
            <Dialog.Title className="font-semibold text-ink-50">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-50/[0.06] hover:text-ink-50"
                aria-label="بستن"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto p-6">{children}</div>
          {footer && (
            <div className="flex items-center justify-end gap-3 border-t border-ink-100/[0.08] px-6 py-4">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ===== confirm =====
export function Confirm({ open, onClose, onConfirm, title, message, danger = true }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; danger?: boolean
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>انصراف</Btn>
          <Btn variant={danger ? 'danger' : 'primary'} onClick={() => { onConfirm(); onClose() }}>تایید</Btn>
        </>
      }>
      <p className="text-ink-300 text-sm leading-relaxed">{message}</p>
    </Modal>
  )
}

// ===== badges =====
export function Badge({ children, color = 'gray' }: { children: React.ReactNode; color?: 'gray' | 'green' | 'red' | 'amber' | 'blue' | 'purple' }) {
  const colors: Record<string, string> = {
    gray: 'text-ink-400 bg-gray-400/10 border-gray-400/20',
    green: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    red: 'text-red-400 bg-red-400/10 border-red-400/20',
    amber: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    blue: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    purple: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  }
  return <span className={`badge ${colors[color]}`}>{children}</span>
}

export function EmptyState({ icon = '◻', title, subtitle, action }: { icon?: string; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="py-16 text-center">
      <div className="mb-4 text-2xl text-ink-700">{icon}</div>
      <p className="mb-1 font-medium text-ink-50">{title}</p>
      {subtitle && <p className="mb-5 text-[13px] text-ink-500">{subtitle}</p>}
      {action}
    </div>
  )
}

// ===== table helpers =====
export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="-mx-6 overflow-x-auto px-6">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-ink-100/[0.10]">
            {head.map((h, i) => (
              <th key={i} className="whitespace-nowrap px-4 py-3 text-right font-mono text-[10px] font-normal uppercase tracking-[0.12em] text-ink-500">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

// ===== loading skeleton =====
export function Loading({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(rows)].map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
    </div>
  )
}

// ===== hooks =====
export function useAsync<T>(fn: () => Promise<T>, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(() => {
    setLoading(true)
    fn().then(setData).catch(e => setError(e.message)).finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => { reload() }, [reload])
  return { data, loading, error, reload, setData }
}

export const faNum = (n: number) => new Intl.NumberFormat('fa-IR').format(n)
export const faDate = (d: string | Date) => new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(d))
