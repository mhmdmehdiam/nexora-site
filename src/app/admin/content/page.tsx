'use client'

import { useState } from 'react'
import { Card, Field, Btn, Loading, toast, api, useAsync } from '@/components/admin/ui'
import type { SiteContent } from '@/lib/site-content'

function setIn(obj: any, path: (string | number)[], value: any): any {
  if (path.length === 0) return value
  const [k, ...rest] = path
  if (Array.isArray(obj)) {
    const copy = obj.slice()
    copy[k as number] = setIn(copy[k as number], rest, value)
    return copy
  }
  return { ...(obj || {}), [k]: setIn((obj || {})[k] ?? {}, rest, value) }
}

const TABS = [
  { key: 'hero', label: 'هیرو' },
  { key: 'logos', label: 'لوگوها' },
  { key: 'howItWorks', label: 'سه قدم' },
  { key: 'features', label: 'امکانات' },
  { key: 'pricing', label: 'قیمت‌گذاری' },
  { key: 'testimonials', label: 'نظرات' },
  { key: 'faq', label: 'سوالات' },
  { key: 'cta', label: 'دعوت نهایی' },
  { key: 'footer', label: 'فوتر' },
] as const

export default function ContentEditorPage() {
  const { data, loading, reload } = useAsync<{ content: SiteContent }>(
    () => api('/api/admin/content'),
    [],
  )
  const [content, setContent] = useState<SiteContent | null>(null)
  const [tab, setTab] = useState<string>('hero')
  const [saving, setSaving] = useState(false)

  // sync once loaded
  if (data && !content) setContent(data.content)
  if (loading || !content) return <Loading rows={8} />

  const upd = (path: (string | number)[], value: any) =>
    setContent((c) => (c ? setIn(c, path, value) : c))
  const addItem = (path: (string | number)[], item: any) =>
    setContent((c) => {
      if (!c) return c
      const arr = (path.reduce((o: any, k) => o?.[k], c) as any[]) || []
      return setIn(c, path, [...arr, item])
    })
  const removeItem = (path: (string | number)[], index: number) =>
    setContent((c) => {
      if (!c) return c
      const arr = (path.reduce((o: any, k) => o?.[k], c) as any[]) || []
      return setIn(
        c,
        path,
        arr.filter((_, i) => i !== index),
      )
    })

  const save = async () => {
    setSaving(true)
    try {
      await api('/api/admin/content', { method: 'PUT', body: JSON.stringify({ content }) })
      toast('محتوای سایت ذخیره شد')
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='space-y-6'>
      <div className='page-header border-b border-ink-100/[0.08] pb-6'>
        <div>
          <div className='mb-3 flex items-center gap-3'>
            <span className='sec-num'>[CONTENT]</span>
            <span className='h-px w-8 bg-ink-100/20' />
          </div>
          <h1 className='page-title text-[26px]'>محتوای سایت</h1>
          <p className='page-subtitle'>متن‌ها و بخش‌های صفحه اصلی سایت را از اینجا ویرایش کنید</p>
        </div>
        <div className='flex gap-2'>
          <Btn variant='secondary' onClick={reload}>
            بازخوانی
          </Btn>
          <Btn onClick={save} disabled={saving}>
            {saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </Btn>
        </div>
      </div>

      {/* Tabs */}
      <div className='flex flex-wrap items-center gap-1 border border-ink-100/[0.10] p-1'>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            aria-pressed={tab === t.key}
            className={`px-3.5 py-2 text-[12.5px] transition-colors duration-200 ${
              tab === t.key
                ? 'bg-ink-50 text-ink-950 font-medium'
                : 'text-ink-400 hover:bg-ink-50/[0.05] hover:text-ink-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'hero' && (
        <Card title='بخش هیرو'>
          <div className='space-y-5'>
            <Field label='نشان بالای عنوان'>
              <input
                className='input-field'
                value={content.hero.badge}
                onChange={(e) => upd(['hero', 'badge'], e.target.value)}
              />
            </Field>
            <div className='grid md:grid-cols-3 gap-4'>
              <Field label='عنوان (بخش اول)'>
                <input
                  className='input-field'
                  value={content.hero.titlePrefix}
                  onChange={(e) => upd(['hero', 'titlePrefix'], e.target.value)}
                />
              </Field>
              <Field label='عنوان (کلمه برجسته)'>
                <input
                  className='input-field'
                  value={content.hero.titleHighlight}
                  onChange={(e) => upd(['hero', 'titleHighlight'], e.target.value)}
                />
              </Field>
              <Field label='عنوان (بخش آخر)'>
                <input
                  className='input-field'
                  value={content.hero.titleSuffix}
                  onChange={(e) => upd(['hero', 'titleSuffix'], e.target.value)}
                />
              </Field>
            </div>
            <Field label='زیرعنوان'>
              <textarea
                className='input-field min-h-[80px]'
                value={content.hero.subtitle}
                onChange={(e) => upd(['hero', 'subtitle'], e.target.value)}
              />
            </Field>
            <div className='grid md:grid-cols-2 gap-4'>
              <Field label='دکمه اصلی'>
                <input
                  className='input-field'
                  value={content.hero.ctaPrimary}
                  onChange={(e) => upd(['hero', 'ctaPrimary'], e.target.value)}
                />
              </Field>
              <Field label='دکمه فرعی'>
                <input
                  className='input-field'
                  value={content.hero.ctaSecondary}
                  onChange={(e) => upd(['hero', 'ctaSecondary'], e.target.value)}
                />
              </Field>
            </div>

            <div className='pt-4 border-t border-ink-100/[0.08]'>
              <div className='flex items-center justify-between mb-3'>
                <p className='text-sm text-ink-300 font-medium'>آمار هیرو</p>
                <Btn
                  size='sm'
                  variant='secondary'
                  onClick={() => addItem(['hero', 'stats'], { value: 0, suffix: '', label: '' })}
                >
                  + افزودن
                </Btn>
              </div>
              <div className='space-y-3'>
                {content.hero.stats.map((s, i) => (
                  <div key={i} className='flex items-end gap-3'>
                    <div className='w-28'>
                      <Field label='عدد'>
                        <input
                          type='number'
                          className='input-field'
                          value={s.value}
                          onChange={(e) =>
                            upd(['hero', 'stats', i, 'value'], Number(e.target.value))
                          }
                        />
                      </Field>
                    </div>
                    <div className='w-24'>
                      <Field label='پسوند'>
                        <input
                          className='input-field'
                          value={s.suffix}
                          onChange={(e) => upd(['hero', 'stats', i, 'suffix'], e.target.value)}
                        />
                      </Field>
                    </div>
                    <div className='flex-1'>
                      <Field label='برچسب'>
                        <input
                          className='input-field'
                          value={s.label}
                          onChange={(e) => upd(['hero', 'stats', i, 'label'], e.target.value)}
                        />
                      </Field>
                    </div>
                    <button
                      onClick={() => removeItem(['hero', 'stats'], i)}
                      className='mb-3 p-2 text-red-400 hover:bg-red-500/10 rounded-lg'
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {tab === 'features' && (
        <Card title='بخش امکانات'>
          <div className='space-y-5'>
            <Field label='عنوان بخش'>
              <input
                className='input-field'
                value={content.features.title}
                onChange={(e) => upd(['features', 'title'], e.target.value)}
              />
            </Field>
            <Field label='زیرعنوان'>
              <input
                className='input-field'
                value={content.features.subtitle}
                onChange={(e) => upd(['features', 'subtitle'], e.target.value)}
              />
            </Field>
            <div className='pt-4 border-t border-ink-100/[0.08]'>
              <div className='flex items-center justify-between mb-3'>
                <p className='text-sm text-ink-300 font-medium'>
                  آیتم‌ها ({content.features.items.length})
                </p>
                <Btn
                  size='sm'
                  variant='secondary'
                  onClick={() =>
                    addItem(['features', 'items'], {
                      icon: '',
                      title: '',
                      desc: '',
                      color: 'brand',
                    })
                  }
                >
                  + افزودن
                </Btn>
              </div>
              <div className='space-y-3'>
                {content.features.items.map((f, i) => (
                  <div
                    key={i}
                    className='p-4 rounded-xl bg-ink-50/[0.02] border border-ink-100/[0.08] space-y-3'
                  >
                    <div className='flex items-center gap-3'>
                      <input
                        className='input-field w-20 text-center text-xl'
                        value={f.icon}
                        onChange={(e) => upd(['features', 'items', i, 'icon'], e.target.value)}
                      />
                      <input
                        className='input-field flex-1'
                        placeholder='عنوان'
                        value={f.title}
                        onChange={(e) => upd(['features', 'items', i, 'title'], e.target.value)}
                      />
                      <button
                        onClick={() => removeItem(['features', 'items'], i)}
                        className='p-2 text-red-400 hover:bg-red-500/10 rounded-lg'
                      >
                        ×
                      </button>
                    </div>
                    <textarea
                      className='input-field min-h-[60px]'
                      placeholder='توضیح'
                      value={f.desc}
                      onChange={(e) => upd(['features', 'items', i, 'desc'], e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {tab === 'pricing' && (
        <Card title='بخش قیمت‌گذاری'>
          <div className='space-y-5'>
            <Field label='عنوان بخش'>
              <input
                className='input-field'
                value={content.pricing.title}
                onChange={(e) => upd(['pricing', 'title'], e.target.value)}
              />
            </Field>
            <Field label='زیرعنوان'>
              <input
                className='input-field'
                value={content.pricing.subtitle}
                onChange={(e) => upd(['pricing', 'subtitle'], e.target.value)}
              />
            </Field>
            <div className='pt-4 border-t border-ink-100/[0.08] space-y-4'>
              {content.pricing.plans.map((p, i) => (
                <div
                  key={i}
                  className='p-4 rounded-xl bg-ink-50/[0.02] border border-ink-100/[0.08] space-y-3'
                >
                  <div className='flex items-center justify-between'>
                    <p className='text-ink-50 font-medium'>
                      پلن {i + 1}: {p.name}
                    </p>
                    <div className='flex items-center gap-3'>
                      <label className='flex items-center gap-2 text-xs text-ink-400'>
                        <input
                          type='checkbox'
                          checked={p.popular}
                          onChange={(e) =>
                            upd(['pricing', 'plans', i, 'popular'], e.target.checked)
                          }
                        />
                        محبوب
                      </label>
                      <button
                        onClick={() => removeItem(['pricing', 'plans'], i)}
                        className='p-2 text-red-400 hover:bg-red-500/10 rounded-lg'
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <div className='grid md:grid-cols-3 gap-3'>
                    <Field label='نام'>
                      <input
                        className='input-field'
                        value={p.name}
                        onChange={(e) => upd(['pricing', 'plans', i, 'name'], e.target.value)}
                      />
                    </Field>
                    <Field label='قیمت ماهانه'>
                      <input
                        type='number'
                        className='input-field'
                        value={p.monthlyPrice}
                        onChange={(e) =>
                          upd(['pricing', 'plans', i, 'monthlyPrice'], Number(e.target.value))
                        }
                      />
                    </Field>
                    <Field label='قیمت سالانه'>
                      <input
                        type='number'
                        className='input-field'
                        value={p.yearlyPrice}
                        onChange={(e) =>
                          upd(['pricing', 'plans', i, 'yearlyPrice'], Number(e.target.value))
                        }
                      />
                    </Field>
                  </div>
                  <Field label='توضیح'>
                    <input
                      className='input-field'
                      value={p.desc}
                      onChange={(e) => upd(['pricing', 'plans', i, 'desc'], e.target.value)}
                    />
                  </Field>
                  <div className='grid md:grid-cols-2 gap-3'>
                    <Field label='متن دکمه'>
                      <input
                        className='input-field'
                        value={p.cta}
                        onChange={(e) => upd(['pricing', 'plans', i, 'cta'], e.target.value)}
                      />
                    </Field>
                    <Field label='نشان (خالی = بدون نشان)'>
                      <input
                        className='input-field'
                        value={p.badge || ''}
                        onChange={(e) =>
                          upd(['pricing', 'plans', i, 'badge'], e.target.value || null)
                        }
                      />
                    </Field>
                  </div>
                  <div className='pt-2'>
                    <div className='flex items-center justify-between mb-2'>
                      <p className='text-xs text-ink-400'>ویژگی‌ها</p>
                      <button
                        onClick={() =>
                          addItem(['pricing', 'plans', i, 'features'], { text: '', included: true })
                        }
                        className='text-xs text-sand hover:text-sand-light'
                      >
                        + ویژگی
                      </button>
                    </div>
                    <div className='space-y-2'>
                      {p.features.map((ft, j) => (
                        <div key={j} className='flex items-center gap-2'>
                          <input
                            type='checkbox'
                            checked={ft.included}
                            onChange={(e) =>
                              upd(
                                ['pricing', 'plans', i, 'features', j, 'included'],
                                e.target.checked,
                              )
                            }
                          />
                          <input
                            className='input-field flex-1 py-2'
                            value={ft.text}
                            onChange={(e) =>
                              upd(['pricing', 'plans', i, 'features', j, 'text'], e.target.value)
                            }
                          />
                          <button
                            onClick={() => removeItem(['pricing', 'plans', i, 'features'], j)}
                            className='p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg text-xs'
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {tab === 'testimonials' && (
        <Card title='بخش نظرات'>
          <div className='space-y-5'>
            <Field label='عنوان بخش'>
              <input
                className='input-field'
                value={content.testimonials.title}
                onChange={(e) => upd(['testimonials', 'title'], e.target.value)}
              />
            </Field>
            <div className='pt-4 border-t border-ink-100/[0.08]'>
              <div className='flex items-center justify-between mb-3'>
                <p className='text-sm text-ink-300 font-medium'>نظرات</p>
                <Btn
                  size='sm'
                  variant='secondary'
                  onClick={() =>
                    addItem(['testimonials', 'items'], {
                      name: '',
                      role: '',
                      avatar: '',
                      text: '',
                      rating: 5,
                    })
                  }
                >
                  + افزودن
                </Btn>
              </div>
              <div className='space-y-3'>
                {content.testimonials.items.map((t, i) => (
                  <div
                    key={i}
                    className='p-4 rounded-xl bg-ink-50/[0.02] border border-ink-100/[0.08] space-y-3'
                  >
                    <div className='flex items-center gap-3'>
                      <input
                        className='input-field w-16 text-center'
                        placeholder='حرف'
                        value={t.avatar}
                        onChange={(e) =>
                          upd(['testimonials', 'items', i, 'avatar'], e.target.value)
                        }
                      />
                      <input
                        className='input-field flex-1'
                        placeholder='نام'
                        value={t.name}
                        onChange={(e) => upd(['testimonials', 'items', i, 'name'], e.target.value)}
                      />
                      <input
                        className='input-field flex-1'
                        placeholder='سمت'
                        value={t.role}
                        onChange={(e) => upd(['testimonials', 'items', i, 'role'], e.target.value)}
                      />
                      <button
                        onClick={() => removeItem(['testimonials', 'items'], i)}
                        className='p-2 text-red-400 hover:bg-red-500/10 rounded-lg'
                      >
                        ×
                      </button>
                    </div>
                    <textarea
                      className='input-field min-h-[60px]'
                      placeholder='متن نظر'
                      value={t.text}
                      onChange={(e) => upd(['testimonials', 'items', i, 'text'], e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {tab === 'faq' && (
        <Card title='بخش سوالات متداول'>
          <div className='space-y-5'>
            <Field label='عنوان بخش'>
              <input
                className='input-field'
                value={content.faq.title}
                onChange={(e) => upd(['faq', 'title'], e.target.value)}
              />
            </Field>
            <div className='pt-4 border-t border-ink-100/[0.08]'>
              <div className='flex items-center justify-between mb-3'>
                <p className='text-sm text-ink-300 font-medium'>سوال‌ها</p>
                <Btn
                  size='sm'
                  variant='secondary'
                  onClick={() => addItem(['faq', 'items'], { q: '', a: '' })}
                >
                  + افزودن
                </Btn>
              </div>
              <div className='space-y-3'>
                {content.faq.items.map((f, i) => (
                  <div
                    key={i}
                    className='p-4 rounded-xl bg-ink-50/[0.02] border border-ink-100/[0.08] space-y-3'
                  >
                    <div className='flex items-center gap-3'>
                      <input
                        className='input-field flex-1'
                        placeholder='سوال'
                        value={f.q}
                        onChange={(e) => upd(['faq', 'items', i, 'q'], e.target.value)}
                      />
                      <button
                        onClick={() => removeItem(['faq', 'items'], i)}
                        className='p-2 text-red-400 hover:bg-red-500/10 rounded-lg'
                      >
                        ×
                      </button>
                    </div>
                    <textarea
                      className='input-field min-h-[60px]'
                      placeholder='پاسخ'
                      value={f.a}
                      onChange={(e) => upd(['faq', 'items', i, 'a'], e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {tab === 'footer' && (
        <Card title='بخش فوتر'>
          <div className='space-y-5'>
            <Field label='متن معرفی'>
              <textarea
                className='input-field min-h-[70px]'
                value={content.footer.about}
                onChange={(e) => upd(['footer', 'about'], e.target.value)}
              />
            </Field>
            <Field label='متن کپی‌رایت'>
              <input
                className='input-field'
                value={content.footer.copyright}
                onChange={(e) => upd(['footer', 'copyright'], e.target.value)}
              />
            </Field>
            <div className='pt-4 border-t border-ink-100/[0.08]'>
              <div className='flex items-center justify-between mb-3'>
                <p className='text-sm text-ink-300 font-medium'>ستون‌های فوتر</p>
                <Btn
                  size='sm'
                  variant='secondary'
                  onClick={() => addItem(['footer', 'columns'], { title: '', links: [] })}
                >
                  + ستون
                </Btn>
              </div>
              <div className='space-y-4'>
                {content.footer.columns.map((col, i) => (
                  <div
                    key={i}
                    className='p-4 rounded-xl bg-ink-50/[0.02] border border-ink-100/[0.08] space-y-3'
                  >
                    <div className='flex items-center gap-3'>
                      <input
                        className='input-field flex-1'
                        placeholder='عنوان ستون'
                        value={col.title}
                        onChange={(e) => upd(['footer', 'columns', i, 'title'], e.target.value)}
                      />
                      <button
                        onClick={() => removeItem(['footer', 'columns'], i)}
                        className='p-2 text-red-400 hover:bg-red-500/10 rounded-lg'
                      >
                        ×
                      </button>
                    </div>
                    <div className='space-y-2'>
                      {col.links.map((l, j) => (
                        <div key={j} className='flex items-center gap-2'>
                          <input
                            className='input-field flex-1 py-2'
                            placeholder='برچسب'
                            value={l.label}
                            onChange={(e) =>
                              upd(['footer', 'columns', i, 'links', j, 'label'], e.target.value)
                            }
                          />
                          <input
                            className='input-field flex-1 py-2'
                            placeholder='لینک'
                            dir='ltr'
                            value={l.href}
                            onChange={(e) =>
                              upd(['footer', 'columns', i, 'links', j, 'href'], e.target.value)
                            }
                          />
                          <button
                            onClick={() => removeItem(['footer', 'columns', i, 'links'], j)}
                            className='p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg text-xs'
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() =>
                          addItem(['footer', 'columns', i, 'links'], { label: '', href: '#' })
                        }
                        className='text-xs text-sand hover:text-sand-light'
                      >
                        + لینک
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {tab === 'logos' && (
        <Card title='نوار لوگوها' subtitle='نام مشتریان در نوار متحرک زیر هیرو'>
          <div className='space-y-5'>
            <Field label='عنوان نوار'>
              <input
                className='input-field'
                value={content.logos.title}
                onChange={(e) => upd(['logos', 'title'], e.target.value)}
              />
            </Field>
            <div>
              <div className='mb-3 flex items-center justify-between'>
                <p className='text-sm font-medium text-ink-300'>نام‌ها</p>
                <Btn size='sm' variant='secondary' onClick={() => addItem(['logos', 'items'], '')}>
                  + افزودن
                </Btn>
              </div>
              <div className='space-y-2'>
                {content.logos.items.map((name, i) => (
                  <div key={i} className='flex items-center gap-2'>
                    <input
                      className='input-field flex-1'
                      value={name}
                      onChange={(e) => upd(['logos', 'items', i], e.target.value)}
                    />
                    <button
                      onClick={() => removeItem(['logos', 'items'], i)}
                      aria-label='حذف'
                      className='rounded-lg p-2 text-red-400 hover:bg-red-500/10'
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {tab === 'howItWorks' && (
        <Card title='بخش سه قدم' subtitle='روند شروع کار برای مشتری جدید'>
          <div className='space-y-5'>
            <div className='grid gap-4 md:grid-cols-2'>
              <Field label='عنوان'>
                <input
                  className='input-field'
                  value={content.howItWorks.title}
                  onChange={(e) => upd(['howItWorks', 'title'], e.target.value)}
                />
              </Field>
              <Field label='زیرعنوان'>
                <input
                  className='input-field'
                  value={content.howItWorks.subtitle}
                  onChange={(e) => upd(['howItWorks', 'subtitle'], e.target.value)}
                />
              </Field>
            </div>
            <div>
              <div className='mb-3 flex items-center justify-between'>
                <p className='text-sm font-medium text-ink-300'>قدم‌ها</p>
                <Btn
                  size='sm'
                  variant='secondary'
                  onClick={() => addItem(['howItWorks', 'steps'], { title: '', desc: '' })}
                >
                  + افزودن قدم
                </Btn>
              </div>
              <div className='space-y-3'>
                {content.howItWorks.steps.map((s, i) => (
                  <div
                    key={i}
                    className='space-y-3 rounded-xl border border-ink-100/[0.08] bg-ink-50/[0.02] p-4'
                  >
                    <div className='flex items-center gap-3'>
                      <span className='font-mono text-[10px] text-ink-600'>
                        [{String(i + 1).padStart(2, '0')}]
                      </span>
                      <input
                        className='input-field flex-1'
                        placeholder='عنوان قدم'
                        value={s.title}
                        onChange={(e) => upd(['howItWorks', 'steps', i, 'title'], e.target.value)}
                      />
                      <button
                        onClick={() => removeItem(['howItWorks', 'steps'], i)}
                        aria-label='حذف'
                        className='rounded-lg p-2 text-red-400 hover:bg-red-500/10'
                      >
                        ×
                      </button>
                    </div>
                    <textarea
                      className='input-field min-h-[60px]'
                      placeholder='توضیح'
                      value={s.desc}
                      onChange={(e) => upd(['howItWorks', 'steps', i, 'desc'], e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {tab === 'cta' && (
        <Card title='دعوت نهایی' subtitle='بخش پایانی صفحه اصلی'>
          <div className='space-y-5'>
            <Field label='عنوان'>
              <input
                className='input-field'
                value={content.cta.title}
                onChange={(e) => upd(['cta', 'title'], e.target.value)}
              />
            </Field>
            <Field label='زیرعنوان'>
              <textarea
                className='input-field min-h-[70px]'
                value={content.cta.subtitle}
                onChange={(e) => upd(['cta', 'subtitle'], e.target.value)}
              />
            </Field>
            <div className='grid gap-4 md:grid-cols-2'>
              <Field label='دکمه اصلی'>
                <input
                  className='input-field'
                  value={content.cta.primary}
                  onChange={(e) => upd(['cta', 'primary'], e.target.value)}
                />
              </Field>
              <Field label='دکمه دوم'>
                <input
                  className='input-field'
                  value={content.cta.secondary}
                  onChange={(e) => upd(['cta', 'secondary'], e.target.value)}
                />
              </Field>
            </div>
          </div>
        </Card>
      )}

      <div className='flex justify-end'>
        <Btn onClick={save} disabled={saving}>
          {saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
        </Btn>
      </div>
    </div>
  )
}
