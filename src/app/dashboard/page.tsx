'use client'

import { useEffect, useState, useRef } from 'react'
import { Icon } from './icons'
import { motion, useReducedMotion } from 'motion/react'
import { useChartTheme } from '@/lib/use-chart-theme'
import {
  formatCurrency,
  formatNumber,
  formatDate,
  getStatusColor,
  getStatusLabel,
} from '@/lib/utils'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts'

/** Motion-for-React entrance+hover wrapper, reduced-motion aware. */
function Rise({
  children,
  delay = 0,
  className = '',
  style,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
  style?: React.CSSProperties
}) {
  const rm = useReducedMotion()
  return (
    <motion.div
      className={className}
      style={style}
      initial={rm ? false : { opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      whileHover={rm ? undefined : { y: -4 }}
    >
      {children}
    </motion.div>
  )
}

// Animated counter hook
function useCountUp(end: number, duration = 1200) {
  const [count, setCount] = useState(0)
  const ref = useRef<number>(0)

  useEffect(() => {
    if (!end) return
    const start = ref.current
    const startTime = performance.now()

    function animate(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // easeOutCubic
      const current = Math.round(start + (end - start) * eased)
      setCount(current)
      if (progress < 1) requestAnimationFrame(animate)
      else ref.current = end
    }

    requestAnimationFrame(animate)
  }, [end, duration])

  return count
}

interface DashboardData {
  stats: {
    currentRevenue: number
    lastRevenue: number
    revenueChange: number
    currentSalesCount: number
    totalCustomers: number
    lowStockCount: number
    pendingAmount: number
  }
  monthlySales: { month: string; total: number; count: number }[]
  recentSales: any[]
  topProducts: { name: string; total: number; qty: number }[]
  salesByCategory: { category: string; total: number }[]
  paymentMethods: { method: string; count: number; total: number }[]
}

export default function DashboardPage() {
  const chart = useChartTheme()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isFreePlan, setIsFreePlan] = useState(false)

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}')
      setIsFreePlan(u?.businessPlan === 'free')
    } catch {
      /* ignore */
    }
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className='space-y-6'>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
          {[...Array(4)].map((_, i) => (
            <div key={i} className='skeleton h-32 rounded-2xl' />
          ))}
        </div>
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
          <div className='skeleton h-80 rounded-2xl lg:col-span-2' />
          <div className='skeleton h-80 rounded-2xl' />
        </div>
      </div>
    )
  }

  if (!data) return <p className='text-ink-400 text-center py-20'>خطا در بارگذاری اطلاعات</p>

  const methodLabels: Record<string, string> = {
    cash: 'نقدی',
    card: 'کارت',
    transfer: 'حواله',
    credit: 'اعتباری',
  }

  return (
    <div className='space-y-6'>
      {/* upgrade hint for free-plan businesses */}
      {isFreePlan && (
        <div className='flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sand/25 bg-sand/[0.06] px-5 py-3.5'>
          <div className='flex items-center gap-3'>
            <span className='h-1.5 w-1.5 bg-sand' aria-hidden='true' />
            <p className='text-[12.5px] text-ink-200'>
              تحلیل هوشمند، پیامک و یادآوری پرداخت در پلن حرفه‌ای فعال می‌شود.
            </p>
          </div>
          <a href='/pricing' className='btn-outline px-4 py-2 text-[12px]'>
            مشاهده تعرفه‌ها
          </a>
        </div>
      )}

      {/* Page header */}
      <div className='page-header animate-slide-in-up'>
        <div>
          <h1 className='page-title text-3xl'>داشبورد</h1>
          <p className='page-subtitle'>نمای کلی کسب‌وکار شما</p>
        </div>
        <div className='flex items-center gap-2'>
          <div className='w-2 h-2 rounded-full bg-emerald-400 animate-glow-pulse' />
          <span className='text-xs text-emerald-400'>آنلاین</span>
        </div>
      </div>

      {/* Stats cards with animated counters */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        <StatCardAnimated
          title='درآمد این ماه'
          value={data.stats.currentRevenue}
          format='currency'
          change={data.stats.revenueChange}
          icon='bar-chart'
          color='brand'
          delay={0}
        />
        <StatCardAnimated
          title='تعداد فروش'
          value={data.stats.currentSalesCount}
          format='number'
          subtitle='فروش این ماه'
          icon='shopping-cart'
          color='purple'
          delay={1}
        />
        <StatCardAnimated
          title='مشتریان'
          value={data.stats.totalCustomers}
          format='number'
          subtitle='مشتری فعال'
          icon='users'
          color='cyan'
          delay={2}
        />
        <StatCardAnimated
          title='موجودی کم'
          value={data.stats.lowStockCount}
          format='number'
          subtitle='محصول نیاز به تامین'
          icon='package'
          color='amber'
          delay={3}
        />
      </div>

      {/* Charts row */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
        {/* Revenue chart */}
        <Rise delay={0.15} className='glass-card p-6 lg:col-span-2'>
          <div className='flex items-center justify-between mb-6'>
            <h3 className='text-lg font-semibold text-ink-50'>روند درآمد</h3>
            <div className='flex items-center gap-2 text-xs text-ink-500'>
              <div className='w-3 h-1 rounded-full bg-sand' />
              <span>درآمد</span>
            </div>
          </div>
          <ResponsiveContainer width='100%' height={300}>
            <AreaChart data={data.monthlySales}>
              <defs>
                <linearGradient id='colorRevenue' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='5%' stopColor='#C9B79C' stopOpacity={0.3} />
                  <stop offset='95%' stopColor='#C9B79C' stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray='3 3' stroke={chart.grid} />
              <XAxis dataKey='month' stroke={chart.axis} fontSize={12} tickLine={false} />
              <YAxis
                stroke={chart.axis}
                fontSize={11}
                tickLine={false}
                tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
              />
              <Tooltip
                contentStyle={chart.tooltip}
                formatter={(value: number) => [formatCurrency(value), 'درآمد']}
              />
              <Area
                type='monotone'
                dataKey='total'
                stroke='#C9B79C'
                fill='url(#colorRevenue)'
                strokeWidth={2.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Rise>

        {/* Category pie chart */}
        <Rise delay={0.25} className='glass-card p-6'>
          <h3 className='text-lg font-semibold text-ink-50 mb-6'>فروش بر اساس دسته</h3>
          <ResponsiveContainer width='100%' height={220}>
            <PieChart>
              <Pie
                data={data.salesByCategory}
                dataKey='total'
                nameKey='category'
                cx='50%'
                cy='50%'
                innerRadius={55}
                outerRadius={85}
                paddingAngle={4}
              >
                {data.salesByCategory.map((_, index) => (
                  <Cell key={index} fill={chart.colors[index % chart.colors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={chart.tooltip}
                formatter={(value: number) => formatCurrency(value)}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className='space-y-2 mt-2'>
            {data.salesByCategory.map((cat, i) => (
              <div
                key={i}
                className='flex items-center justify-between text-sm group cursor-default'
              >
                <div className='flex items-center gap-2'>
                  <div
                    className='w-2.5 h-2.5 rounded-full transition-transform group-hover:scale-125'
                    style={{ backgroundColor: chart.colors[i % chart.colors.length] }}
                  />
                  <span className='text-ink-400 group-hover:text-gray-200 transition-colors'>
                    {cat.category || 'بدون دسته'}
                  </span>
                </div>
                <span className='text-ink-500 group-hover:text-ink-50 transition-colors'>
                  {formatCurrency(cat.total)}
                </span>
              </div>
            ))}
          </div>
        </Rise>
      </div>

      {/* Second row */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
        {/* Top products with progress bars */}
        <Rise delay={0.35} className='glass-card p-6'>
          <h3 className='text-lg font-semibold text-ink-50 mb-6'> پرفروش‌ترین محصولات</h3>
          <div className='space-y-5'>
            {data.topProducts.map((product, i) => {
              const maxTotal = data.topProducts[0]?.total || 1
              const percentage = (product.total / maxTotal) * 100
              return (
                <div key={i} className='space-y-2 group cursor-default'>
                  <div className='flex items-center justify-between text-sm'>
                    <div className='flex items-center gap-2'>
                      <span className='w-6 h-6 rounded-lg bg-sand/12 flex items-center justify-center text-sand text-xs font-bold'>
                        {i + 1}
                      </span>
                      <span className='text-gray-200 font-medium group-hover:text-ink-50 transition-colors'>
                        {product.name}
                      </span>
                    </div>
                    <span className='text-ink-400 group-hover:text-ink-50 transition-colors'>
                      {formatCurrency(product.total)}
                    </span>
                  </div>
                  <div className='w-full h-2 bg-ink-50/[0.06] rounded-full overflow-hidden'>
                    <div
                      className='h-full rounded-full bg-gradient-to-l from-brand-400 to-brand-600 animate-progress'
                      style={{ width: `${percentage}%`, animationDelay: `${0.5 + i * 0.1}s` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Rise>

        {/* Recent sales */}
        <Rise delay={0.4} className='glass-card p-6'>
          <h3 className='text-lg font-semibold text-ink-50 mb-6'>آخرین فروش‌ها</h3>
          <div className='space-y-1'>
            {data.recentSales.map((sale: any, i: number) => (
              <div
                key={sale.id}
                className='flex items-center justify-between p-3 rounded-xl hover:bg-ink-50/[0.03] transition-all cursor-default group'
                style={{ animationDelay: `${0.5 + i * 0.05}s` }}
              >
                <div className='flex items-center gap-3'>
                  <div className='w-10 h-10 rounded-xl bg-sand/12 flex items-center justify-center text-sand text-sm font-bold group-hover:bg-brand-600/25 transition-colors'>
                    {sale.customer.name.charAt(0)}
                  </div>
                  <div>
                    <p className='text-sm font-medium text-ink-50'>{sale.customer.name}</p>
                    <p className='text-xs text-ink-500'>{sale.invoiceNumber}</p>
                  </div>
                </div>
                <div className='text-left'>
                  <p className='text-sm font-semibold text-ink-50'>
                    {formatCurrency(sale.finalAmount)}
                  </p>
                  <span className={`badge text-[10px] ${getStatusColor(sale.status)}`}>
                    {getStatusLabel(sale.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Rise>
      </div>

      {/* Payment methods + pending */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
        <Rise delay={0.45} className='glass-card p-6'>
          <h3 className='text-lg font-semibold text-ink-50 mb-6'>روش‌های پرداخت</h3>
          <div className='space-y-4'>
            {data.paymentMethods.map((pm, i) => {
              const totalAll = data.paymentMethods.reduce((s, p) => s + p.total, 0)
              const pct = Math.round((pm.total / totalAll) * 100)
              return (
                <div key={i} className='group cursor-default'>
                  <div className='flex items-center justify-between mb-2'>
                    <div className='flex items-center gap-2'>
                      <div
                        className='w-2.5 h-2.5 rounded-full'
                        style={{ backgroundColor: chart.colors[i] }}
                      />
                      <span className='text-ink-300 text-sm'>
                        {methodLabels[pm.method] || pm.method}
                      </span>
                    </div>
                    <span className='text-ink-500 text-xs'>{pct}٪</span>
                  </div>
                  <div className='w-full h-1.5 bg-ink-50/[0.06] rounded-full overflow-hidden'>
                    <div
                      className='h-full rounded-full animate-progress'
                      style={{
                        width: `${pct}%`,
                        backgroundColor: chart.colors[i],
                        animationDelay: `${0.6 + i * 0.1}s`,
                      }}
                    />
                  </div>
                  <p className='text-xs text-ink-500 mt-1'>
                    {formatNumber(pm.count)} فروش — {formatCurrency(pm.total)}
                  </p>
                </div>
              )
            })}
          </div>
        </Rise>

        {/* Pending payments with visual indicator */}
        <Rise delay={0.5} className='glass-card p-6 lg:col-span-2'>
          <div className='flex items-center justify-between mb-6'>
            <h3 className='text-lg font-semibold text-ink-50'>پرداخت‌های معوق</h3>
            {data.stats.pendingAmount > 0 && (
              <div className='flex items-center gap-2'>
                <div className='w-2 h-2 rounded-full bg-amber-400 animate-glow-pulse' />
                <span className='text-xs text-amber-400'>نیاز به پیگیری</span>
              </div>
            )}
          </div>
          <div className='flex items-end gap-6'>
            <div>
              <span className='text-4xl font-bold text-amber-400'>
                {formatCurrency(data.stats.pendingAmount)}
              </span>
            </div>
            <div className='flex-1'>
              <div className='h-4 bg-ink-50/[0.06] rounded-full overflow-hidden mb-3'>
                <div
                  className='h-full rounded-full bg-gradient-to-l from-amber-400 to-red-500 animate-progress'
                  style={{
                    width: `${Math.min((data.stats.pendingAmount / Math.max(data.stats.currentRevenue, 1)) * 100, 100)}%`,
                  }}
                />
              </div>
              <p className='text-sm text-ink-400'>
                {Math.round(
                  (data.stats.pendingAmount / Math.max(data.stats.currentRevenue, 1)) * 100,
                )}
                ٪ از کل درآمد ماه جاری
              </p>
            </div>
          </div>
        </Rise>
      </div>
    </div>
  )
}

function StatCardAnimated({
  title,
  value,
  format,
  subtitle,
  change,
  icon,
  color,
  delay,
}: {
  title: string
  value: number
  format: 'currency' | 'number'
  subtitle?: string
  change?: number
  icon: string
  color: string
  delay: number
}) {
  const animatedValue = useCountUp(value, 1500)
  const displayValue =
    format === 'currency'
      ? animatedValue >= 1_000_000_000
        ? `${new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 }).format(animatedValue / 1_000_000_000)} میلیارد`
        : animatedValue >= 1_000_000
          ? `${new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 }).format(animatedValue / 1_000_000)} میلیون`
          : formatCurrency(animatedValue)
      : formatNumber(animatedValue)

  const rm = useReducedMotion()

  return (
    <motion.div
      className='stat-card'
      initial={rm ? false : { opacity: 0, y: 24, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: delay * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      whileHover={rm ? undefined : { y: -4 }}
    >
      <div className='relative z-10'>
        <div className='flex items-center justify-between'>
          <Icon name={icon} className='h-4 w-4 text-ink-600' />
          {change !== undefined && (
            <div
              className={`flex items-center gap-1 px-1.5 py-0.5 font-mono text-[10px] ${
                change >= 0 ? 'bg-emerald-400/10 text-emerald-300' : 'bg-red-400/10 text-red-300'
              }`}
            >
              <span className={change >= 0 ? '' : 'rotate-180'}>▲</span>
              {Math.abs(change)}٪
            </div>
          )}
        </div>
        <p className='mt-6 text-[11.5px] text-ink-500'>{title}</p>
        <p className='mt-1.5 text-[26px] font-bold leading-none tabular-nums text-ink-50 md:text-[28px]'>
          {displayValue}
        </p>
        {subtitle && <p className='mt-2 font-mono text-[10px] text-ink-600'>{subtitle}</p>}
      </div>
    </motion.div>
  )
}
