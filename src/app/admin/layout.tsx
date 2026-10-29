'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Toaster } from '@/components/admin/ui'
import { ThemeToggle } from '@/components/theme-toggle'

interface User {
  id: string
  name: string
  email: string
  role: string
  businessSlug: string
}

const NAV: { group: string; items: { href: string; label: string; icon: string }[] }[] = [
  {
    group: 'عمومی',
    items: [{ href: '/admin', label: 'داشبورد', icon: 'grid' }],
  },
  {
    group: 'محتوا',
    items: [
      { href: '/admin/content', label: 'محتوای سایت', icon: 'layout' },
      { href: '/admin/posts', label: 'نوشته‌ها', icon: 'edit' },
      { href: '/admin/pages', label: 'برگه‌ها', icon: 'file' },
      { href: '/admin/media', label: 'رسانه', icon: 'image' },
      { href: '/admin/menus', label: 'منوها', icon: 'menu' },
    ],
  },
  {
    group: 'مدیریت',
    items: [
      { href: '/admin/users', label: 'کاربران', icon: 'users' },
      { href: '/admin/businesses', label: 'کسب‌وکارها', icon: 'store' },
      { href: '/admin/subscriptions', label: 'اشتراک‌ها', icon: 'credit' },
    ],
  },
  {
    group: 'سیستم',
    items: [
      { href: '/admin/settings', label: 'تنظیمات', icon: 'settings' },
      { href: '/admin/seo', label: 'سئو', icon: 'search' },
      { href: '/admin/audit', label: 'گزارش رویدادها', icon: 'shield' },
    ],
  },
]

const ICONS: Record<string, JSX.Element> = {
  grid: (
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={1.6}
      d='M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z'
    />
  ),
  layout: (
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={1.6}
      d='M3.75 6A2.25 2.25 0 016 3.75h12A2.25 2.25 0 0120.25 6v12A2.25 2.25 0 0118 20.25H6A2.25 2.25 0 013.75 18V6zM3.75 9.75h16.5M9 9.75v10.5'
    />
  ),
  edit: (
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={1.6}
      d='M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10'
    />
  ),
  file: (
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={1.6}
      d='M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z'
    />
  ),
  image: (
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={1.6}
      d='M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z'
    />
  ),
  menu: (
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={1.6}
      d='M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5'
    />
  ),
  users: (
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={1.6}
      d='M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z'
    />
  ),
  store: (
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={1.6}
      d='M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z'
    />
  ),
  credit: (
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={1.6}
      d='M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z'
    />
  ),
  settings: (
    <>
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={1.6}
        d='M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z'
      />
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={1.6}
        d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
      />
    </>
  ),
  search: (
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={1.6}
      d='M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z'
    />
  ),
  shield: (
    <>
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={1.6}
        d='M12 3l7.5 3v5.5c0 4.6-3.1 8.2-7.5 9.5-4.4-1.3-7.5-4.9-7.5-9.5V6L12 3z'
      />
      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.6} d='M9 12l2 2 4-4' />
    </>
  ),
  logout: (
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={1.6}
      d='M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9'
    />
  ),
  close: (
    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.6} d='M6 18L18 6M6 6l12 12' />
  ),
  external: (
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={1.6}
      d='M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25'
    />
  ),
}

function Icon({ name, className }: { name: string; className?: string }) {
  const path = ICONS[name]
  return (
    <svg className={className} fill='none' viewBox='0 0 24 24' stroke='currentColor'>
      {path || null}
    </svg>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        const u = data.user as User | undefined
        if (!u || u.businessSlug !== 'nexora-platform') {
          router.push('/login')
          return
        }
        setUser(u)
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false))
  }, [router])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    localStorage.removeItem('user')
    router.push('/login')
  }

  if (loading) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-ink-950'>
        <div className='flex flex-col items-center gap-5'>
          <span className='h-1.5 w-1.5 animate-pulse bg-sand' />
          <p className='font-mono text-[10px] uppercase tracking-[0.22em] text-ink-600'>
            loading console
          </p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className='flex min-h-screen bg-ink-950'>
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className='fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden'
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full w-[268px] flex-col border-l border-ink-100/[0.08] bg-ink-950 transition-transform duration-300 ease-editorial lg:sticky lg:h-screen lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
        )}
      >
        {/* Brand */}
        <div className='flex items-center justify-between px-5 py-5'>
          <Link
            href='/admin'
            className='group flex items-center gap-2.5'
            aria-label='پنل مدیریت نکسورا'
          >
            <span className='h-1.5 w-1.5 bg-sand transition-transform duration-500 group-hover:rotate-45' />
            <span className='font-serif text-[21px] italic leading-none text-ink-50'>Nexora</span>
            <span className='mt-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-600'>
              console
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className='p-1.5 text-ink-500 transition-colors hover:text-ink-50 lg:hidden'
            aria-label='بستن منو'
          >
            <Icon name='close' className='h-5 w-5' />
          </button>
        </div>

        <div className='mx-5 h-px bg-ink-100/[0.08]' />

        {/* Nav */}
        <nav className='flex-1 space-y-6 overflow-y-auto px-3 py-5' aria-label='منوی پنل مدیریت'>
          {NAV.map((section) => (
            <div key={section.group}>
              <p className='mb-2 px-3 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-600'>
                {section.group}
              </p>
              <div className='space-y-0.5'>
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/admin' && pathname?.startsWith(item.href))
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => window.innerWidth < 1024 && setSidebarOpen(false)}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn('nav-link', isActive && 'active')}
                    >
                      <Icon
                        name={item.icon}
                        className={cn(
                          'h-[18px] w-[18px] flex-shrink-0',
                          isActive ? 'text-sand' : 'text-ink-600',
                        )}
                      />
                      <span className='text-[13px]'>{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User */}
        <div className='border-t border-ink-100/[0.08] p-4'>
          <div className='mb-3 flex items-center gap-3'>
            <span className='flex h-9 w-9 items-center justify-center border border-ink-100/[0.15] text-[12px] font-medium text-ink-100'>
              {user.name?.charAt(0) || '?'}
            </span>
            <div className='min-w-0 flex-1'>
              <p className='truncate text-[12.5px] font-medium text-ink-50'>{user.name}</p>
              <p className='truncate font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-600'>
                platform admin
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className='flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] text-ink-500 transition-colors hover:bg-red-500/10 hover:text-red-300'
          >
            <Icon name='logout' className='h-4 w-4' />
            خروج از حساب
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className='min-w-0 flex-1'>
        <header className='sticky top-0 z-30 flex h-14 items-center justify-between border-b border-ink-100/[0.08] bg-ink-950/85 px-4 backdrop-blur-xl md:px-6'>
          <div className='flex items-center gap-3'>
            <button
              onClick={() => setSidebarOpen(true)}
              className='p-2 text-ink-400 transition-colors hover:text-ink-50 lg:hidden'
              aria-label='باز کردن منو'
            >
              <Icon name='menu' className='h-5 w-5' />
            </button>
            <span className='hidden font-mono text-[10px] uppercase tracking-[0.14em] text-ink-600 sm:block'>
              {new Date().toLocaleDateString('fa-IR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>

          <div className='flex items-center gap-2'>
            <span className='hidden items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-600 md:flex'>
              <span className='h-1 w-1 bg-emerald-400' />
              live
            </span>
            <ThemeToggle />
            <Link
              href='/'
              target='_blank'
              className='flex items-center gap-2 rounded-lg border border-ink-100/[0.15] px-3 py-1.5 text-[12px] text-ink-200 transition-all hover:border-ink-100/[0.35] hover:text-ink-50'
            >
              <Icon name='external' className='h-3.5 w-3.5' />
              مشاهده سایت
            </Link>
          </div>
        </header>

        <div className='mx-auto max-w-[1400px] p-4 animate-fade-in md:p-6 lg:p-8'>{children}</div>
      </main>

      <Toaster />
    </div>
  )
}
