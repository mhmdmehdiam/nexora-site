import type { Metadata } from 'next'

/**
 * Metadata for /forgot-password.
 *
 * The page itself is a client component (form state), so the metadata has to
 * live in a layout. It is a utility route — there is nothing here for a
 * crawler to index, and indexing it would only surface a dead end in the
 * results.
 */
export const metadata: Metadata = {
  title: 'بازیابی رمز عبور',
  description: 'اگر رمز عبورت را فراموش کرده‌ای، لینک بازیابی را به ایمیلت می‌فرستیم.',
  robots: { index: false, follow: false },
}

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children
}
