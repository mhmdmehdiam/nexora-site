'use client'

import { useState } from 'react'
import { Card, Badge, Table, EmptyState, Loading, api, useAsync, faDate } from '@/components/admin/ui'

/**
 * Activity log viewer.
 *
 * audit() has been writing every security-relevant event since the beginning
 * (logins, role changes, deletions, plan changes, password resets) but nothing
 * could read it. This is the missing half.
 */

const ACTION_TONE: { test: RegExp; color: 'green' | 'red' | 'amber' | 'blue' | 'gray' | 'purple' }[] = [
  { test: /failed|blocked|rate_limited|denied|unauthorized/i, color: 'red' },
  { test: /reset|password|role|delete|suspend/i, color: 'amber' },
  { test: /success|created|completed/i, color: 'green' },
  { test: /login|logout|session/i, color: 'blue' },
  { test: /billing|payment|subscription|plan/i, color: 'purple' },
]

const ACTION_LABEL: Record<string, string> = {
  'login.success': 'ورود موفق',
  'login.failed': 'ورود ناموفق',
  'login.blocked': 'ورود مسدود',
  'login.rate_limited': 'محدودیت تلاش ورود',
  'login.google_only': 'حساب فقط گوگل',
  'password.reset_requested': 'درخواست بازیابی رمز',
  'password.reset_completed': 'تغییر رمز',
  'contact.message': 'پیام فرم تماس',
}

function toneFor(action: string) {
  return ACTION_TONE.find((t) => t.test.test(action))?.color || 'gray'
}

function labelFor(action: string) {
  return ACTION_LABEL[action] || action
}

export default function AuditPage() {
  const [action, setAction] = useState('')
  const { data, loading } = useAsync<{ logs: any[] }>(
    () => api(`/api/admin/audit?action=${encodeURIComponent(action)}&take=150`),
    [action],
  )

  const logs = data?.logs || []

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-ink-50">گزارش رویدادها</h1>
        <p className="mt-1 text-[13px] text-ink-400">
          هر ورود، تغییر نقش، حذف و پرداخت اینجا ثبت می‌شود.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {[
          { v: '', l: 'همه' },
          { v: 'login', l: 'ورود' },
          { v: 'password', l: 'رمز عبور' },
          { v: 'billing', l: 'پرداخت' },
          { v: 'contact', l: 'تماس' },
        ].map((f) => (
          <button
            key={f.v}
            onClick={() => setAction(f.v)}
            className={`rounded-lg border px-3 py-1.5 text-[12px] transition-colors ${
              action === f.v
                ? 'border-sand/50 bg-sand/10 text-ink-50'
                : 'border-ink-100/12 text-ink-400 hover:border-ink-100/30'
            }`}
          >
            {f.l}
          </button>
        ))}
      </div>

      <Card>
        {loading ? (
          <Loading rows={8} />
        ) : logs.length === 0 ? (
          <EmptyState icon="◎" title="رویدادی ثبت نشده" subtitle="با اولین ورود یا تغییر، اینجا پر می‌شود." />
        ) : (
          <Table head={['زمان', 'رویداد', 'کسب‌وکار', 'کاربر', 'جزئیات']}>
            {logs.map((l) => (
              <tr key={l.id} className="table-row">
                <td className="whitespace-nowrap px-2 py-3 text-[12px] text-ink-500">
                  {faDate(l.createdAt)}
                </td>
                <td className="px-2 py-3">
                  <Badge color={toneFor(l.action)}>{labelFor(l.action)}</Badge>
                </td>
                <td className="px-2 py-3 text-[12.5px] text-ink-200">
                  {l.business?.name || <span className="text-ink-600">—</span>}
                </td>
                <td className="px-2 py-3 text-[12px] text-ink-400">
                  {l.user?.name || <span className="text-ink-600">—</span>}
                </td>
                <td className="px-2 py-3 text-[11.5px] text-ink-500">
                  <span className="line-clamp-2 block max-w-[320px] break-words">
                    {l.details || '—'}
                  </span>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  )
}
