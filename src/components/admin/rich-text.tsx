'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MediaPicker } from './media-picker'

type Cmd =
  | { kind: 'cmd'; cmd: string; value?: string; label: string; title: string; icon: React.ReactNode }
  | { kind: 'block'; value: string; label: string; title: string; icon: React.ReactNode }

function Icon({ d }: { d: string }) {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d={d} />
    </svg>
  )
}

const COMMANDS: Cmd[] = [
  {
    kind: 'cmd',
    cmd: 'bold',
    label: 'B',
    title: 'درشت (Ctrl+B)',
    icon: <span className="text-[13px] font-bold">B</span>,
  },
  {
    kind: 'cmd',
    cmd: 'italic',
    label: 'I',
    title: 'کج (Ctrl+I)',
    icon: <span className="text-[13px] italic">I</span>,
  },
  {
    kind: 'cmd',
    cmd: 'underline',
    label: 'U',
    title: 'زیرخط (Ctrl+U)',
    icon: <span className="text-[13px] underline">U</span>,
  },
  {
    kind: 'block',
    value: 'h2',
    label: 'H2',
    title: 'سرتیتر بزرگ',
    icon: <span className="text-[11px] font-semibold">H2</span>,
  },
  {
    kind: 'block',
    value: 'h3',
    label: 'H3',
    title: 'سرتیتر کوچک',
    icon: <span className="text-[11px] font-semibold">H3</span>,
  },
  {
    kind: 'block',
    value: 'p',
    label: 'P',
    title: 'پاراگراف',
    icon: <span className="text-[11px]">¶</span>,
  },
  {
    kind: 'cmd',
    cmd: 'insertUnorderedList',
    label: 'UL',
    title: 'لیست نقطه‌ای',
    icon: <Icon d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  },
  {
    kind: 'cmd',
    cmd: 'insertOrderedList',
    label: 'OL',
    title: 'لیست شماره‌دار',
    icon: <Icon d="M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />,
  },
  {
    kind: 'block',
    value: 'blockquote',
    label: 'Quote',
    title: 'نقل‌قول',
    icon: <Icon d="M7 7h4v6H7zM13 7h4v6h-4zM7 13c0 2 1 3 3 3M13 13c0 2 1 3 3 3" />,
  },
]

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'متن خود را بنویسید…',
  minHeight = 360,
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const lastExternal = useRef<string>('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [active, setActive] = useState<Record<string, boolean>>({})

  // Sync external value in (only when it differs from what we last emitted)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (value !== lastExternal.current && value !== el.innerHTML) {
      el.innerHTML = value || ''
      lastExternal.current = value
    }
  }, [value])

  const emit = useCallback(() => {
    const el = ref.current
    if (!el) return
    lastExternal.current = el.innerHTML
    onChange(el.innerHTML)
  }, [onChange])

  const refreshActive = useCallback(() => {
    try {
      setActive({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
      })
    } catch {
      /* queryCommandState can throw in some browsers */
    }
  }, [])

  const run = (c: Cmd) => {
    const el = ref.current
    if (!el) return
    el.focus()
    try {
      document.execCommand('styleWithCSS', false, 'false')
    } catch {}
    if (c.kind === 'cmd') {
      document.execCommand(c.cmd, false)
    } else {
      document.execCommand('formatBlock', false, `<${c.value}>`)
    }
    emit()
    refreshActive()
  }

  const addLink = () => {
    const url = window.prompt('آدرس لینک را وارد کنید:', 'https://')
    if (!url) return
    ref.current?.focus()
    document.execCommand('createLink', false, url)
    emit()
  }

  const insertImage = (url: string) => {
    ref.current?.focus()
    document.execCommand(
      'insertHTML',
      false,
      `<img src="${url}" alt="" style="max-width:100%;height:auto" />`
    )
    emit()
  }

  return (
    <div className="overflow-hidden rounded-xl border border-ink-100/[0.10] bg-white/[0.02] focus-within:border-brand-500/50">
      <div
        className="flex flex-wrap items-center gap-1 border-b border-ink-100/[0.08] bg-white/[0.02] px-2 py-1.5"
        role="toolbar"
        aria-label="نوار ابزار ویرایش متن"
      >
        {COMMANDS.map((c) => {
          const isActive =
            (c.kind === 'cmd' && (active[c.cmd] || false)) || false
          return (
            <button
              key={c.label + c.title}
              type="button"
              title={c.title}
              aria-label={c.title}
              aria-pressed={isActive}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => run(c)}
              className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-ink-300 transition-colors hover:bg-ink-50/[0.08] hover:text-ink-50 ${
                isActive ? 'bg-brand-500/20 text-brand-200' : ''
              }`}
            >
              {c.icon}
            </button>
          )
        })}

        <span className="mx-1 h-5 w-px bg-ink-50/[0.08]" aria-hidden="true" />

        <button
          type="button"
          title="افزودن لینک"
          aria-label="افزودن لینک"
          onMouseDown={(e) => e.preventDefault()}
          onClick={addLink}
          className="flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-ink-300 transition-colors hover:bg-ink-50/[0.08] hover:text-ink-50"
        >
          <Icon d="M10 13a5 5 0 007.07 0l2.83-2.83a5 5 0 00-7.07-7.07L11 5m2 6a5 5 0 00-7.07 0L3.1 13.83a5 5 0 007.07 7.07L12 19" />
        </button>
        <button
          type="button"
          title="درج تصویر از کتابخانه"
          aria-label="درج تصویر از کتابخانه"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setPickerOpen(true)}
          className="flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-ink-300 transition-colors hover:bg-ink-50/[0.08] hover:text-ink-50"
        >
          <Icon d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </button>
        <button
          type="button"
          title="حذف قالب‌بندی"
          aria-label="حذف قالب‌بندی"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            ref.current?.focus()
            document.execCommand('removeFormat')
            emit()
          }}
          className="flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-ink-300 transition-colors hover:bg-ink-50/[0.08] hover:text-ink-50"
        >
          <Icon d="M6 4h13M9 4l-4 16M15 4l-1.5 6M4 20h8" />
        </button>

        <div className="mr-auto flex items-center gap-2">
          <span className="hidden font-mono text-[10px] text-ink-600 sm:block">HTML</span>
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              value && value !== '<br>' ? 'bg-emerald-400' : 'bg-gray-600'
            }`}
            aria-hidden="true"
          />
        </div>
      </div>

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="محتوای نوشته"
        dir="rtl"
        data-placeholder={placeholder}
        onInput={emit}
        onBlur={emit}
        onKeyUp={refreshActive}
        onMouseUp={refreshActive}
        onFocus={refreshActive}
        style={{ minHeight }}
        className="prose-editorial max-w-none px-5 py-4 outline-none empty:before:pointer-events-none empty:before:text-ink-600 empty:before:content-[attr(data-placeholder)]"
      />

      <div className="flex items-center justify-between border-t border-ink-100/[0.08] px-4 py-2">
        <span className="text-[10px] text-ink-600">
          Ctrl+B درشت · Ctrl+I کج · Ctrl+U زیرخط
        </span>
        <span className="text-[10px] text-ink-600">
          {value.replace(/<[^>]*>/g, '').trim().length.toLocaleString('fa-IR')} کاراکتر
        </span>
      </div>

      <MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={insertImage} />
    </div>
  )
}
