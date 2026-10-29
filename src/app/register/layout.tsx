import type { Metadata } from 'next'

/**
 * Sign-up is a funnel step, not a landing page. Indexing it would compete
 * with the real landing page for the same queries.
 */
export const metadata: Metadata = {
  title: 'ثبت‌نام',
  description: 'ساخت حساب رایگان در نکسورا',
  robots: { index: false, follow: false },
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children
}
