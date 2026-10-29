'use client'

import { useRef, useState } from 'react'
import {
  Card,
  Btn,
  EmptyState,
  Loading,
  Confirm,
  toast,
  api,
  useAsync,
  faNum,
  faDate,
} from '@/components/admin/ui'

export default function MediaPage() {
  const { data, loading, reload } = useAsync<{ media: any[] }>(() => api('/api/admin/media'), [])
  const [uploading, setUploading] = useState(false)
  const [del, setDel] = useState<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const upload = async (files: FileList | null) => {
    if (!files || !files.length) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData()
        fd.append('file', file)
        await api('/api/admin/media', { method: 'POST', body: fd })
      }
      toast('فایل‌ها آپلود شدند')
      reload()
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const remove = async () => {
    try {
      await api(`/api/admin/media/${del.id}`, { method: 'DELETE' })
      toast('فایل حذف شد')
      reload()
    } catch (e: any) {
      toast(e.message, 'error')
    }
  }

  const copy = (url: string) => {
    navigator.clipboard?.writeText(url)
    toast('آدرس کپی شد')
  }

  const media = data?.media || []

  return (
    <div className='space-y-6'>
      <div className='page-header'>
        <div>
          <h1 className='page-title text-3xl'>کتابخانه رسانه</h1>
          <p className='page-subtitle'>تصاویر و فایل‌های سایت را مدیریت کنید</p>
        </div>
        <Btn onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? 'در حال آپلود...' : ' آپلود فایل'}
        </Btn>
        <input
          ref={inputRef}
          type='file'
          multiple
          accept='image/*,.pdf'
          className='hidden'
          onChange={(e) => upload(e.target.files)}
        />
      </div>

      <Card>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            upload(e.dataTransfer.files)
          }}
          className='border-2 border-dashed border-ink-100/[0.10] rounded-2xl p-8 text-center mb-6 hover:border-brand-500/40 transition-colors cursor-pointer'
          onClick={() => inputRef.current?.click()}
        >
          <p className='text-3xl mb-2'></p>
          <p className='text-sm text-ink-400'>
            فایل‌ها را اینجا رها کنید یا کلیک کنید (حداکثر ۵ مگابایت)
          </p>
        </div>

        {loading ? (
          <Loading />
        ) : media.length === 0 ? (
          <EmptyState icon='' title='کتابخانه خالی است' subtitle='اولین تصویر را آپلود کنید' />
        ) : (
          <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4'>
            {media.map((m) => (
              <div key={m.id} className='group glass-card overflow-hidden'>
                <div className='aspect-square bg-white/[0.02] flex items-center justify-center overflow-hidden'>
                  {m.mimeType?.startsWith('image/') ? (
                    <img
                      src={m.url}
                      alt={m.alt || m.filename}
                      className='w-full h-full object-cover'
                    />
                  ) : (
                    <span className='text-4xl'></span>
                  )}
                </div>
                <div className='p-3'>
                  <p className='text-xs text-ink-50 truncate' title={m.filename}>
                    {m.filename}
                  </p>
                  <p className='text-[10px] text-ink-500 mt-0.5'>
                    {faNum(Math.round(m.size / 1024))} کیلوبایت • {faDate(m.createdAt)}
                  </p>
                  <div className='flex items-center gap-2 mt-2'>
                    <button
                      onClick={() => copy(m.url)}
                      className='text-[11px] text-sand hover:text-sand-light'
                    >
                      کپی آدرس
                    </button>
                    <button
                      onClick={() => setDel(m)}
                      className='text-[11px] text-red-400 hover:text-red-300 mr-auto'
                    >
                      حذف
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Confirm
        open={!!del}
        onClose={() => setDel(null)}
        onConfirm={remove}
        title='حذف فایل'
        message={`آیا از حذف «${del?.filename}» مطمئن هستید؟`}
      />
    </div>
  )
}
