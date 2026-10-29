'use client'

/**
 * CSV export trigger.
 *
 * A plain anchor, not fetch() — the server sets Content-Disposition, so the
 * browser hands the file to the download manager and the page never navigates.
 * The endpoint streams with a UTF-8 BOM so Excel renders Persian correctly.
 */
export function ExportButton({
  entity,
  label = 'خروجی CSV',
}: {
  entity: 'sales' | 'customers' | 'products'
  label?: string
}) {
  return (
    <a
      href={`/api/export/${entity}`}
      className="inline-flex items-center gap-2 rounded-xl border border-ink-100/15 px-4 py-2.5 text-[12.5px] text-ink-200 transition-colors hover:border-ink-100/35 hover:text-ink-50"
      title="دانلود کامل داده‌ها در قالب CSV (قابل باز شدن در اکسل)"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16" />
      </svg>
      {label}
    </a>
  )
}
