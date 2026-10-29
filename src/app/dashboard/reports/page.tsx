'use client'

import { useEffect, useState } from 'react'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { useChartTheme } from '@/lib/use-chart-theme'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts'

export default function ReportsPage() {
  const chart = useChartTheme()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/reports')
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading)
    return (
      <div className='space-y-6'>
        {[...Array(3)].map((_, i) => (
          <div key={i} className='skeleton h-64 rounded-2xl' />
        ))}
      </div>
    )
  if (!data) return <p className='text-ink-400 text-center py-20'>خطا در بارگذاری</p>

  return (
    <div className='space-y-6'>
      <div className='page-header animate-slide-in-up'>
        <div>
          <h1 className='page-title'>گزارشات</h1>
          <p className='page-subtitle'>تحلیل عملکرد کسب‌وکار</p>
        </div>
      </div>

      {/* Monthly comparison */}
      <div className='glass-card p-6 animate-slide-in-up' style={{ animationDelay: '0.08s', animationFillMode: 'backwards' }}>
        <h3 className='text-lg font-semibold text-ink-50 mb-6'>مقایسه ماهانه</h3>
        <ResponsiveContainer width='100%' height={350}>
          <BarChart data={data.monthlyComparison}>
            <CartesianGrid strokeDasharray='3 3' stroke={chart.grid} />
            <XAxis dataKey='month' stroke={chart.axis} fontSize={12} />
            <YAxis
              stroke={chart.axis}
              fontSize={11}
              tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
            />
            <Tooltip
              contentStyle={chart.tooltip}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Bar
              dataKey='revenue'
              fill='#C9B79C'
              radius={[6, 6, 0, 0]}
              name='درآمد'
              animationBegin={180}
              animationDuration={950}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 animate-slide-in-up' style={{ animationDelay: '0.14s', animationFillMode: 'backwards' }}>
        {/* Customer segments */}
        <div className='glass-card p-6'>
          <h3 className='text-lg font-semibold text-ink-50 mb-6'>بخش‌بندی مشتریان</h3>
          <ResponsiveContainer width='100%' height={250}>
            <PieChart>
              <Pie
                data={[
                  { name: 'VIP', value: data.customerSegments.vip },
                  { name: 'عادی', value: data.customerSegments.regular },
                  { name: 'جدید', value: data.customerSegments.new },
                ]}
                dataKey='value'
                nameKey='name'
                cx='50%'
                cy='50%'
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
              >
                {chart.colors.map((c, i) => (
                  <Cell key={i} fill={c} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={chart.tooltip}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className='flex justify-center gap-6 mt-4'>
            <div className='text-center'>
              <p className='text-2xl font-bold text-ink-50'>{data.customerSegments.vip}</p>
              <p className='text-xs text-ink-400'>VIP</p>
            </div>
            <div className='text-center'>
              <p className='text-2xl font-bold text-ink-50'>{data.customerSegments.regular}</p>
              <p className='text-xs text-ink-400'>عادی</p>
            </div>
            <div className='text-center'>
              <p className='text-2xl font-bold text-ink-50'>{data.customerSegments.new}</p>
              <p className='text-xs text-ink-400'>جدید</p>
            </div>
          </div>
        </div>

        {/* Profit analysis */}
        <div className='glass-card p-6'>
          <h3 className='text-lg font-semibold text-ink-50 mb-6'>تحلیل سودآوری</h3>
          <div className='space-y-4'>
            {data.profitAnalysis.slice(0, 6).map((p: any, i: number) => (
              <div key={i} className='space-y-2'>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-gray-200 truncate ml-4'>{p.name}</span>
                  <div className='flex items-center gap-4'>
                    <span className='text-emerald-400 text-xs'>{p.margin}٪ سود</span>
                    <span className='text-ink-50 font-medium'>{formatCurrency(p.profit)}</span>
                  </div>
                </div>
                <div className='w-full h-2 bg-ink-50/[0.06] rounded-full overflow-hidden flex'>
                  <div
                    className='h-full bg-emerald-500/80'
                    style={{ width: `${(p.cost / p.revenue) * 100}%` }}
                  />
                  <div
                    className='h-full bg-brand-500'
                    style={{ width: `${((p.revenue - p.cost) / p.revenue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className='flex gap-4 mt-4 text-xs text-ink-400'>
            <div className='flex items-center gap-1'>
              <div className='w-3 h-3 bg-emerald-500/80 rounded-sm' /> هزینه
            </div>
            <div className='flex items-center gap-1'>
              <div className='w-3 h-3 bg-brand-500 rounded-sm' /> سود
            </div>
          </div>
        </div>
      </div>

      {/* Daily revenue */}
      {data.dailyRevenue.length > 0 && (
        <div className='glass-card p-6'>
          <h3 className='text-lg font-semibold text-ink-50 mb-6'>درآمد روزانه (ماه جاری)</h3>
          <ResponsiveContainer width='100%' height={250}>
            <LineChart data={data.dailyRevenue}>
              <CartesianGrid strokeDasharray='3 3' stroke={chart.grid} />
              <XAxis dataKey='date' stroke={chart.axis} fontSize={11} />
              <YAxis
                stroke={chart.axis}
                fontSize={11}
                tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
              />
              <Tooltip
                contentStyle={chart.tooltip}
                formatter={(v: number) => formatCurrency(v)}
              />
              <Line
                type='monotone'
                dataKey='total'
                stroke='#C9B79C'
                strokeWidth={2.5}
                dot={{ fill: '#C9B79C', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
