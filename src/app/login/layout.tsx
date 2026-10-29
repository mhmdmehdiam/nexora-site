import type { Metadata } from 'next'

/**
 * /login and /register are client components, so they can't export metadata.
 * A tiny layout is the supported way to mark them noindex — leaving them
 * crawlable puts a sign-in form in the search results instead of the product.
 */
export const metadata: Metadata = {
  title: 'ورود',
  description: 'ورود به حساب نکسورا',
  robots: { index: false, follow: false },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
