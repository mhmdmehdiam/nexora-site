import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-950 px-6 text-center">
      <div className="font-mono text-[10px] tracking-[0.22em] text-ink-600">ERROR 404</div>
      <h1 className="mt-6 font-serif text-[120px] italic leading-none text-ink-50 md:text-[180px]">
        404
      </h1>
      <p className="mt-2 text-display-md font-black text-ink-200">این صفحه پیدا نشد</p>
      <p className="mt-4 max-w-md text-[14px] leading-7 text-ink-500">
        آدرسی که وارد کردی وجود ندارد یا جابه‌جا شده است. می‌توانی از صفحه‌ی اصلی ادامه بدهی.
      </p>
      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="btn-ink">
          بازگشت به خانه
        </Link>
        <Link href="/blog" className="btn-outline">
          خواندن بلاگ
        </Link>
      </div>
    </div>
  )
}
