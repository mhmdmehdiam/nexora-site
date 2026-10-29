'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Icon } from './icons'
import { AppContext } from './app-context'
import { ThemeToggle } from '@/components/theme-toggle'

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface AppContextType {
  user: User | null
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

const navItems = [
  { href: '/dashboard', icon: 'grid', label: 'داشبورد' },
  { href: '/dashboard/customers', icon: 'users', label: 'مشتریان' },
  { href: '/dashboard/products', icon: 'package', label: 'محصولات' },
  { href: '/dashboard/sales', icon: 'shopping-cart', label: 'فروش‌ها' },
  { href: '/dashboard/invoices', icon: 'file-text', label: 'فاکتورها' },
  { href: '/dashboard/reports', icon: 'bar-chart', label: 'گزارشات' },
  { href: '/dashboard/reminders', icon: 'bell', label: 'یادآوری‌ها' },
  { href: '/dashboard/sms', icon: 'message-square', label: 'پیامک' },
  { href: '/dashboard/ai', icon: 'brain', label: 'تحلیل هوشمند' },
  { href: '/dashboard/users', icon: 'shield', label: 'کاربران' },
  { href: '/dashboard/settings', icon: 'settings', label: 'تنظیمات' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  // Closed by default so the drawer doesn't cover the page on mobile;
  // on lg+ the sidebar is always visible regardless of this flag.
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) {
      setUser(JSON.parse(stored))
      setLoading(false)
    } else {
      fetch('/api/auth/me')
        .then((r) => r.json())
        .then((data) => {
          if (data.user) {
            setUser(data.user)
            localStorage.setItem('user', JSON.stringify(data.user))
          } else {
            router.push('/')
          }
        })
        .catch(() => router.push('/'))
        .finally(() => setLoading(false))
    }
  }, [router])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    localStorage.removeItem('user')
    router.push('/')
  }

  if (loading) {
    return (
      <div className='min-h-screen bg-ink-950 flex items-center justify-center'>
        <div className='flex flex-col items-center gap-4'>
          <div className='w-12 h-12 border-2 border-sand/35 border-t-brand-500 rounded-full animate-spin' />
          <p className='text-ink-400'>در حال بارگذاری...</p>
        </div>
      </div>
    )
  }

  return (
    <AppContext.Provider value={{ user, sidebarOpen, setSidebarOpen }}>
      <div className='flex min-h-screen bg-ink-950'>
        {/* Sidebar overlay (mobile) */}
        {sidebarOpen && (
          <div
            className='fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden'
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            'fixed top-0 right-0 h-full z-50 w-72 bg-ink-950/80 backdrop-blur-2xl border-l border-ink-100/[0.08] flex flex-col transition-transform duration-300 lg:sticky lg:translate-x-0',
            sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
          )}
        >
          {/* Logo */}
          <div className='p-6 flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 rounded-xl bg-sand/15 border border-sand/35 flex items-center justify-center'>
                <svg
                  className='w-5 h-5 text-sand'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={1.5}
                    d='M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5'
                  />
                </svg>
              </div>
              <div>
                <div className='flex items-center gap-2'>
                  <span className='font-serif text-[20px] italic leading-none text-ink-50'>
                    Nexora
                  </span>
                  <span className='font-mono text-[8.5px] uppercase tracking-[0.16em] text-ink-600'>
                    app
                  </span>
                </div>
                <p className='text-[10px] text-ink-500 -mt-0.5'>مدیریت هوشمند فروش</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className='lg:hidden p-1.5 text-ink-400 hover:text-ink-50'
            >
              <Icon name='close' className='w-5 h-5' />
            </button>
          </div>

          {/* Navigation */}
          <nav className='flex-1 px-3 py-2 space-y-1 overflow-y-auto'>
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname?.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => window.innerWidth < 1024 && setSidebarOpen(false)}
                  className={cn('nav-link', isActive && 'active')}
                >
                  <Icon name={item.icon} className='w-5 h-5 flex-shrink-0' />
                  <span className='text-sm'>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* User section */}
          <div className='p-4 border-t border-ink-100/[0.08]'>
            <div className='flex items-center gap-3 mb-3'>
              <div className='w-10 h-10 rounded-xl bg-sand/15 flex items-center justify-center text-sand font-bold text-sm'>
                {user?.name?.charAt(0) || '?'}
              </div>
              <div className='flex-1 min-w-0'>
                <p className='text-sm font-medium text-ink-50 truncate'>{user?.name}</p>
                <p className='text-xs text-ink-500 truncate'>
                  {user?.role === 'admin' ? 'مدیر' : 'کاربر'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className='w-full flex items-center gap-2 px-3 py-2 text-sm text-ink-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all'
            >
              <Icon name='logout' className='w-4 h-4' />
              خروج
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className='flex-1 min-w-0'>
          {/* Top bar */}
          <header className='sticky top-0 z-30 h-16 glass flex items-center justify-between px-6'>
            <button
              onClick={() => setSidebarOpen(true)}
              className='lg:hidden p-2 text-ink-400 hover:text-ink-50'
            >
              <Icon name='menu' className='w-6 h-6' />
            </button>
            <div className='flex-1' />
            <div className='flex items-center gap-3 text-sm text-ink-400'>
              <ThemeToggle />
              <span>
                {new Date().toLocaleDateString('fa-IR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          </header>

          {/* Page content */}
          <div className='p-6 animate-fade-in'>{children}</div>
        </main>
      </div>
    </AppContext.Provider>
  )
}
