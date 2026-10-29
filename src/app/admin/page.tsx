'use client'

import Link from 'next/link'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts'
import { Card, Badge, Loading, useAsync, faNum } from '@/components/admin/ui'
import { formatCurrency } from '@/lib/utils'
import { useChartTheme } from '@/lib/use-chart-theme'

const PLAN_LABELS: Record<string, string> = {
  free: 'رایگان',
  pro: 'حرفه‌ای',
  enterprise: 'سازمانی',
}

/** 1,698,427,500  [۱٫۷, میلیارد] so big numbers never overflow a stat tile. */
function compactMoney(n: number): [string, string] {
  const fmt = (v: number) => new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 }).format(v)
  if (n >= 1_000_000_000) return [fmt(n / 1_000_000_000), 'میلیارد تومان']
  if (n >= 1_000_000) return [fmt(n / 1_000_000), 'میلیون تومان']
  if (n >= 1_000) return [fmt(n / 1_000), 'هزار تومان']
  return [fmt(n), 'تومان']
}

export default function AdminDashboard() {
  const chart = useChartTheme()
  // plan accents — "enterprise" is near-white in dark mode and near-black in
  // light mode, otherwise its legend dot vanishes into the page
  const PLAN_COLORS: Record<string, string> = {
    free: chart.dark ? '#6B6558' : '#7A7264',
    pro: '#C9B79C',
    enterprise: chart.dark ? '#F7F5F0' : '#3A342C',
  }
  const { data, loading } = useAsync<any>(() => fetch('/api/admin/stats').then((r) => r.json()), [])

  if (loading) {
    return (
      <div className='space-y-6'>
        <div className='grid grid-cols-2 gap-px border border-ink-100/[0.08] bg-ink-100/[0.08] lg:grid-cols-4'>
          {[...Array(4)].map((_, i) => (
            <div key={i} className='h-32 bg-ink-950 p-6'>
              <div className='skeleton mb-4 h-2 w-16' />
              <div className='skeleton h-7 w-24' />
            </div>
          ))}
        </div>
        <div className='skeleton h-80 rounded-2xl' />
      </div>
    )
  }
  if (!data) return <p className='text-ink-500'>خطا در بارگذاری</p>

  const { stats, monthly, subscriptions, recentBusinesses, planBreakdown } = data

  const cards = [
    { title: 'کسب‌وکارها', value: stats.businesses, sub: `${faNum(stats.activeBusinesses)} فعال` },
    { title: 'کاربران', value: stats.users, sub: 'کل کاربران' },
    { title: 'درآمد کل', value: stats.totalRevenue, sub: 'همه فروش‌ها', currency: true },
    { title: 'مشتریان', value: stats.customers, sub: `${faNum(stats.products)} محصول` },
  ]

  return (
    <div className='space-y-8'>
      {/* Header */}
      <div className='flex flex-wrap items-end justify-between gap-4 border-b border-ink-100/[0.08] pb-6'>
        <div>
          <div className='mb-3 flex items-center gap-3'>
            <span className='sec-num'>[DASHBOARD]</span>
            <span className='h-px w-8 bg-ink-100/20' />
          </div>
          <h1 className='text-[28px] font-bold tracking-tight text-ink-50'>داشبورد مدیریت</h1>
          <p className='mt-1.5 text-[13px] text-ink-500'>نمای کلی کل پلتفرم نکسورا</p>
        </div>
        <span className='flex items-center gap-2 border border-emerald-400/25 px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-emerald-300'>
          <span className='h-1 w-1 bg-emerald-400' />
          all systems operational
        </span>
      </div>

      {/* Stat grid */}
      <div className='grid grid-cols-2 gap-px border border-ink-100/[0.08] bg-ink-100/[0.08] lg:grid-cols-4'>
        {cards.map((c, i) => (
          <div
            key={i}
            className='group bg-ink-950 p-5 transition-colors hover:bg-ink-900/40 md:p-6'
          >
            <div className='flex items-center justify-between'>
              <span className='font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-600'>
                [{String(i + 1).padStart(2, '0')}]
              </span>
              <span
                className='h-1 w-1 bg-ink-700 transition-all duration-500 group-hover:w-5 group-hover:bg-sand'
                aria-hidden='true'
              />
            </div>
            <p className='mt-6 text-[11.5px] text-ink-500'>{c.title}</p>
            {c.currency ? (
              <p className='mt-1.5 flex flex-wrap items-baseline gap-x-1.5 leading-none'>
                <span className='text-[26px] font-bold tabular-nums text-ink-50 md:text-[30px]'>
                  {compactMoney(c.value)[0]}
                </span>
                <span className='text-[11px] text-ink-500'>{compactMoney(c.value)[1]}</span>
              </p>
            ) : (
              <p className='mt-1.5 text-[26px] font-bold leading-none tabular-nums text-ink-50 md:text-[30px]'>
                {faNum(c.value)}
              </p>
            )}
            <p className='mt-2 font-mono text-[10px] tracking-[0.08em] text-ink-600'>{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
        <Card title='درآمد ۶ ماه اخیر' subtitle='مجموع فروش ماهانه' className='lg:col-span-2'>
          <ResponsiveContainer width='100%' height={280}>
            <AreaChart data={monthly}>
              <defs>
                <linearGradient id='aRev' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='5%' stopColor='#C9B79C' stopOpacity={0.28} />
                  <stop offset='95%' stopColor='#C9B79C' stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray='2 4'
                stroke={chart.grid}
                vertical={false}
              />
              <XAxis
                dataKey='month'
                stroke={chart.axis}
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke={chart.axis}
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
              />
              <Tooltip
                contentStyle={chart.tooltip}
                labelStyle={{ color: chart.tooltip.color }}
                formatter={(v: number) => [formatCurrency(v), 'درآمد']}
              />
              <Area
                type='monotone'
                dataKey='total'
                stroke='#C9B79C'
                fill='url(#aRev)'
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title='توزیع پلن‌ها' subtitle='کسب‌وکارها بر اساس پلن'>
          <ResponsiveContainer width='100%' height={180}>
            <BarChart data={planBreakdown}>
              <CartesianGrid
                strokeDasharray='2 4'
                stroke={chart.grid}
                vertical={false}
              />
              <XAxis
                dataKey='plan'
                stroke={chart.axis}
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => PLAN_LABELS[v] || v}
              />
              <YAxis
                stroke={chart.axis}
                fontSize={10}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={chart.tooltip}
                labelStyle={{ color: chart.tooltip.color }}
                formatter={(v: number) => [faNum(v), 'کسب‌وکار']}
              />
              <Bar dataKey='count'>
                {planBreakdown.map((p: any, i: number) => (
                  <Cell key={i} fill={PLAN_COLORS[p.plan] || '#C9B79C'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className='mt-5 space-y-2.5 border-t border-ink-100/[0.08] pt-4'>
            {planBreakdown.map((p: any, i: number) => (
              <div key={i} className='flex items-center justify-between text-[12.5px]'>
                <div className='flex items-center gap-2'>
                  <span
                    className='h-1.5 w-1.5'
                    style={{ background: PLAN_COLORS[p.plan] || '#C9B79C' }}
                    aria-hidden='true'
                  />
                  <span className='text-ink-400'>{PLAN_LABELS[p.plan] || p.plan}</span>
                </div>
                <span className='tabular-nums text-ink-50'>{faNum(p.count)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Lists */}
      <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
        <Card
          title='آخرین کسب‌وکارها'
          action={
            <Link
              href='/admin/businesses'
              className='font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500 transition-colors hover:text-sand'
            >
              all
            </Link>
          }
        >
          {recentBusinesses.length === 0 ? (
            <p className='text-[13px] text-ink-500'>موردی نیست</p>
          ) : (
            <div className='-mx-2'>
              {recentBusinesses.map((b: any) => (
                <div
                  key={b.id}
                  className='flex items-center justify-between border-b border-ink-100/[0.06] px-2 py-3 last:border-0'
                >
                  <div className='flex items-center gap-3'>
                    <span className='flex h-8 w-8 items-center justify-center border border-ink-100/[0.12] text-[11px] text-ink-200'>
                      {b.name?.charAt(0)}
                    </span>
                    <div>
                      <p className='text-[13px] text-ink-50'>{b.name}</p>
                      <p className='font-mono text-[10px] text-ink-600' dir='ltr'>
                        {b.slug}
                      </p>
                    </div>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Badge
                      color={
                        b.plan === 'enterprise' ? 'purple' : b.plan === 'pro' ? 'amber' : 'gray'
                      }
                    >
                      {PLAN_LABELS[b.plan] || b.plan}
                    </Badge>
                    <Badge color={b.isActive ? 'green' : 'red'}>
                      {b.isActive ? 'فعال' : 'غیرفعال'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          title='آخرین اشتراک‌ها'
          action={
            <Link
              href='/admin/subscriptions'
              className='font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500 transition-colors hover:text-sand'
            >
              all
            </Link>
          }
        >
          {subscriptions.length === 0 ? (
            <p className='text-[13px] text-ink-500'>موردی نیست</p>
          ) : (
            <div className='-mx-2'>
              {subscriptions.map((s: any) => (
                <div
                  key={s.id}
                  className='flex items-center justify-between border-b border-ink-100/[0.06] px-2 py-3 last:border-0'
                >
                  <div>
                    <p className='text-[13px] text-ink-50'>{s.business?.name}</p>
                    <p className='mt-0.5 font-mono text-[10px] text-ink-600'>
                      {PLAN_LABELS[s.plan] || s.plan} — {formatCurrency(s.amount)}
                    </p>
                  </div>
                  <Badge
                    color={
                      s.status === 'active' ? 'green' : s.status === 'expired' ? 'amber' : 'red'
                    }
                  >
                    {s.status === 'active' ? 'فعال' : s.status === 'expired' ? 'منقضی' : 'لغو شده'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
