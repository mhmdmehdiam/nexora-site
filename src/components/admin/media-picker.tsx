'use client'

import { useCallback, useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { api, toast } from './ui'

export interface MediaItem {
  id: string
  filename: string
  url: string
  mimeType: string
  size: number
  alt: string | null
}

export function MediaPicker({
  open,
  onClose,
  onSelect,
}: {
  open: boolean
  onClose: () => void
  onSelect: (url: string) => void
}) {
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { media } = await api<{ media: MediaItem[] }>('/api/admin/media')
      setItems(media)
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  const upload = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { media } = await api<{ media: MediaItem }>('/api/admin/media', {
        method: 'POST',
        body: fd,
      })
      setItems((prev) => [media, ...prev])
      toast('فایل آپلود شد')
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[95] bg-black/70 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[96] flex max-h-[85vh] w-[min(920px,94vw)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-white/10 bg-ink-950-900 shadow-2xl"
          aria-describedby={undefined}
        >
          <div className="flex items-center justify-between border-b border-ink-100/[0.08] px-6 py-4">
            <Dialog.Title className="font-semibold text-ink-50">انتخاب از کتابخانه رسانه</Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-50/[0.06] hover:text-ink-50"
                aria-label="بستن"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </Dialog.Close>
          </div>

          <div className="flex items-center justify-between gap-3 border-b border-ink-100/[0.08] px-6 py-3">
            <p className="text-xs text-ink-500">
              {items.length > 0 ? `${items.length} فایل` : 'کتابخانه خالی است'}
            </p>
            <label className="cursor-pointer rounded-lg border border-ink-100/[0.14] px-3 py-1.5 text-xs text-ink-300 transition-colors hover:border-white/25 hover:text-ink-50">
              {uploading ? 'در حال آپلود…' : '+ آپلود فایل جدید'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) upload(f)
                  e.target.value = ''
                }}
              />
            </label>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="skeleton aspect-square rounded-xl" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <p className="py-16 text-center text-sm text-ink-500">
                هنوز فایلی آپلود نکرده‌اید.
              </p>
            ) : (
              <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                {items.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(m.url)
                        onClose()
                      }}
                      className="group block w-full overflow-hidden rounded-xl border border-ink-100/[0.10] transition-all hover:border-brand-500/60 focus-visible:border-brand-500"
                      aria-label={`انتخاب ${m.filename}`}
                    >
                      <span className="block aspect-square overflow-hidden bg-ink-50/[0.03]">
                        {m.mimeType.startsWith('image/') ? (
                          <img
                            src={m.url}
                            alt={m.alt || m.filename}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-[10px] text-ink-500">
                            {m.mimeType.split('/')[1] || 'FILE'}
                          </span>
                        )}
                      </span>
                      <span className="block truncate px-2 py-1.5 text-right text-[10px] text-ink-400" dir="auto">
                        {m.filename}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
