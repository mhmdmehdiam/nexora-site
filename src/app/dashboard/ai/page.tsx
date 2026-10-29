'use client'

import { useState } from 'react'
import { Icon } from '../icons'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useChartTheme } from '@/lib/use-chart-theme'

export default function AIPage() {
  const chart = useChartTheme()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [analysisType, setAnalysisType] = useState<'quick' | 'full'>('quick')

  const runAnalysis = async (type: 'quick' | 'full') => {
    setLoading(true)
    setAnalysisType(type)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      const result = await res.json()
      setData(result)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='space-y-6'>
      <div className='page-header'>
        <div>
          <h1 className='page-title'>تحلیل هوشمند</h1>
          <p className='page-subtitle'>تحلیل AI فروش و پیش‌بینی درآمد</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
        <button
          onClick={() => runAnalysis('quick')}
          disabled={loading}
          className='glass-card-hover p-6 text-right group'
        >
          <div className='flex items-center gap-4'>
            <div className='w-14 h-14 rounded-2xl bg-sand/12 flex items-center justify-center text-sand group-hover:bg-brand-600/25 transition-colors'>
              <Icon name='brain' className='w-7 h-7' />
            </div>
            <div>
              <h3 className='text-ink-50 font-semibold text-lg'>تحلیل سریع</h3>
              <p className='text-sm text-ink-400'>خلاصه عملکرد و پیش‌بینی درآمد</p>
            </div>
          </div>
        </button>
        <button
          onClick={() => runAnalysis('full')}
          disabled={loading}
          className='glass-card-hover p-6 text-right group'
        >
          <div className='flex items-center gap-4'>
            <div className='w-14 h-14 rounded-2xl bg-purple-600/15 flex items-center justify-center text-purple-400 group-hover:bg-purple-600/25 transition-colors'>
              <svg className='w-7 h-7' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={1.5}
                  d='M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605'
                />
              </svg>
            </div>
            <div>
              <h3 className='text-ink-50 font-semibold text-lg'>تحلیل کامل</h3>
              <p className='text-sm text-ink-400'>بررسی عمیق با تحلیل دسته‌بندی و سودآوری</p>
            </div>
          </div>
        </button>
      </div>

      {loading && (
        <div className='glass-card p-12 text-center'>
          <div className='w-16 h-16 border-2 border-sand/35 border-t-brand-500 rounded-full animate-spin mx-auto mb-4' />
          <p className='text-ink-300'>در حال تحلیل اطلاعات...</p>
        </div>
      )}

      {data && !loading && (
        <div className='space-y-4 animate-fade-in'>
          {/* Summary cards */}
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
            <div className='stat-card'>
              <p className='text-sm text-ink-400 mb-1'>درآمد ۳۰ روز اخیر</p>
              <p className='text-2xl font-bold text-ink-50'>
                {formatCurrency(data.summary.recentRevenue)}
              </p>
              {data.summary.growthRate !== undefined && (
                <p
                  className={`text-sm mt-1 ${data.summary.growthRate >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                >
                  {data.summary.growthRate >= 0 ? '' : ''} {Math.abs(data.summary.growthRate)}٪ نسبت
                  به ماه قبل
                </p>
              )}
            </div>
            <div className='stat-card'>
              <p className='text-sm text-ink-400 mb-1'>پیش‌بینی ماه آینده</p>
              <p className='text-2xl font-bold text-sand'>
                {formatCurrency(data.summary.predictedNextMonth)}
              </p>
              <p className='text-xs text-ink-500 mt-1'>بر اساس روند فعلی</p>
            </div>
            {data.summary.repeatCustomerCount !== undefined && (
              <div className='stat-card'>
                <p className='text-sm text-ink-400 mb-1'>مشتریان تکراری</p>
                <p className='text-2xl font-bold text-purple-400'>
                  {formatNumber(data.summary.repeatCustomerCount)}
                </p>
                <p className='text-xs text-ink-500 mt-1'>خرید بیش از یکبار</p>
              </div>
            )}
          </div>

          {/* Insights */}
          <div className='glass-card p-6'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-ink-50'>بینش‌ها</h3>
              <span
                className={`badge ${
                  data.insightsSource === 'llm'
                    ? 'text-purple-400 bg-purple-400/10 border-purple-400/20'
                    : 'text-ink-500 bg-ink-500/10 border-ink-500/20'
                }`}
                title={
                  data.insightsSource === 'llm'
                    ? `تولیدشده با ${data.model || 'مدل زبانی'}`
                    : 'تحلیل قاعده‌محور داخلی'
                }
              >
                {data.insightsSource === 'llm' ? 'هوش مصنوعی' : 'تحلیل آماری'}
              </span>
            </div>
            <div className='space-y-3'>
              {data.insights.map((insight: string, i: number) => {
                // insights may or may not start with an emoji — split safely
                const first = Array.from(insight)[0] || ''
                const hasEmoji = /\p{Extended_Pictographic}/u.test(first)
                const emoji = hasEmoji ? first : '•'
                const text = hasEmoji ? insight.slice(first.length).trim() : insight
                return (
                  <div key={i} className='flex items-start gap-3 p-3 bg-white/[0.02] rounded-xl'>
                    <span className='text-lg leading-none mt-0.5'>{emoji}</span>
                    <p className='text-sm text-ink-300'>{text}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Top products */}
          <div className='glass-card p-6'>
            <h3 className='text-lg font-semibold text-ink-50 mb-4'> پرفروش‌ترین محصولات</h3>
            <div className='space-y-3'>
              {data.topProducts.map((p: any, i: number) => (
                <div
                  key={i}
                  className='flex items-center justify-between p-3 bg-white/[0.02] rounded-xl'
                >
                  <div className='flex items-center gap-3'>
                    <span className='w-8 h-8 rounded-lg bg-sand/12 flex items-center justify-center text-sand text-sm font-bold'>
                      {i + 1}
                    </span>
                    <div>
                      <p className='text-ink-50 font-medium text-sm'>{p.name}</p>
                      <p className='text-xs text-ink-500'>{formatNumber(p.qty)} فروش</p>
                    </div>
                  </div>
                  <span className='text-ink-50 font-medium'>{formatCurrency(p.revenue)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Low stock alerts */}
          {data.lowStockProducts.length > 0 && (
            <div className='glass-card p-6 border-red-500/10'>
              <h3 className='text-lg font-semibold text-ink-50 mb-4'> هشدار موجودی</h3>
              <div className='space-y-2'>
                {data.lowStockProducts.map((p: any, i: number) => (
                  <div
                    key={i}
                    className='flex items-center justify-between p-3 bg-red-500/5 rounded-xl'
                  >
                    <span className='text-gray-200 text-sm'>{p.name}</span>
                    <span className='text-red-400 text-sm font-medium'>
                      {p.stock} از {p.minStock} حداقل
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Category breakdown (full analysis only) */}
          {analysisType === 'full' && data.categoryBreakdown && (
            <div className='glass-card p-6'>
              <h3 className='text-lg font-semibold text-ink-50 mb-4'> درآمد بر اساس دسته‌بندی</h3>
              <div className='flex flex-col lg:flex-row items-center gap-8'>
                <ResponsiveContainer width='100%' height={250}>
                  <PieChart>
                    <Pie
                      data={data.categoryBreakdown}
                      dataKey='revenue'
                      nameKey='category'
                      cx='50%'
                      cy='50%'
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                    >
                      {data.categoryBreakdown.map((_: any, i: number) => (
                        <Cell key={i} fill={chart.colors[i % chart.colors.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={chart.tooltip}
                      formatter={(v: number) => formatCurrency(v)}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className='space-y-3 w-full'>
                  {data.categoryBreakdown.map((c: any, i: number) => (
                    <div key={i} className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <div
                          className='w-3 h-3 rounded-full'
                          style={{ backgroundColor: chart.colors[i % chart.colors.length] }}
                        />
                        <span className='text-ink-300 text-sm'>{c.category || 'بدون دسته'}</span>
                      </div>
                      <span className='text-ink-50 text-sm font-medium'>
                        {formatCurrency(c.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!data && !loading && (
        <div className='glass-card p-12 text-center'>
          <Icon name='brain' className='w-16 h-16 text-gray-700 mx-auto mb-4' />
          <p className='text-ink-400 mb-2'>یکی از گزینه‌های بالا را انتخاب کنید</p>
          <p className='text-sm text-ink-500'>تحلیل هوشمند فروش و پیش‌بینی درآمد</p>
        </div>
      )}
    </div>
  )
}
