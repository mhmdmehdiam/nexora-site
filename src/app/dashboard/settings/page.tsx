'use client'

import { useEffect, useState } from 'react'
import { Icon } from '../icons'
import { AccountSecurity } from './account-security'

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    // Load settings from local storage or API
    setSettings({
      company_name: 'نکسورا',
      company_phone: '021-12345678',
      company_address: 'تهران، خیابان آزادی',
      tax_rate: '10',
      currency: 'تومان',
      sms_api_key: '',
      sms_sender: '10004321',
    })
    setLoading(false)
  }, [])

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className='space-y-6 max-w-3xl'>
      <div className='page-header animate-slide-in-up'>
        <div>
          <h1 className='page-title'>تنظیمات</h1>
          <p className='page-subtitle'>پیکربندی سیستم</p>
        </div>
      </div>

      {/* Company info */}
      <div className='glass-card p-6 animate-slide-in-up' style={{ animationDelay: '0.08s', animationFillMode: 'backwards' }}>
        <h3 className='text-lg font-semibold text-ink-50 mb-6 flex items-center gap-2'>
          <Icon name='settings' className='w-5 h-5 text-ink-400' /> اطلاعات شرکت
        </h3>
        <div className='space-y-4'>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm text-ink-400 mb-1.5'>نام شرکت</label>
              <input
                type='text'
                value={settings.company_name || ''}
                onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                className='input-field'
              />
            </div>
            <div>
              <label className='block text-sm text-ink-400 mb-1.5'>تلفن</label>
              <input
                type='text'
                value={settings.company_phone || ''}
                onChange={(e) => setSettings({ ...settings, company_phone: e.target.value })}
                className='input-field'
                dir='ltr'
              />
            </div>
          </div>
          <div>
            <label className='block text-sm text-ink-400 mb-1.5'>آدرس</label>
            <input
              type='text'
              value={settings.company_address || ''}
              onChange={(e) => setSettings({ ...settings, company_address: e.target.value })}
              className='input-field'
            />
          </div>
        </div>
      </div>

      {/* Financial */}
      <div className='glass-card p-6 animate-slide-in-up' style={{ animationDelay: '0.14s', animationFillMode: 'backwards' }}>
        <h3 className='text-lg font-semibold text-ink-50 mb-6 flex items-center gap-2'>
          <span></span> تنظیمات مالی
        </h3>
        <div className='grid grid-cols-2 gap-4'>
          <div>
            <label className='block text-sm text-ink-400 mb-1.5'>نرخ مالیات (٪)</label>
            <input
              type='number'
              value={settings.tax_rate || ''}
              onChange={(e) => setSettings({ ...settings, tax_rate: e.target.value })}
              className='input-field'
              dir='ltr'
            />
          </div>
          <div>
            <label className='block text-sm text-ink-400 mb-1.5'>واحد پول</label>
            <input
              type='text'
              value={settings.currency || ''}
              onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
              className='input-field'
            />
          </div>
        </div>
      </div>

      {/* SMS */}
      <div className='glass-card p-6 animate-slide-in-up' style={{ animationDelay: '0.2s', animationFillMode: 'backwards' }}>
        <h3 className='text-lg font-semibold text-ink-50 mb-6 flex items-center gap-2'>
          <Icon name='message-square' className='w-5 h-5 text-ink-400' /> تنظیمات پیامک
        </h3>
        <div className='space-y-4'>
          <div>
            <label className='block text-sm text-ink-400 mb-1.5'>API Key</label>
            <input
              type='password'
              value={settings.sms_api_key || ''}
              onChange={(e) => setSettings({ ...settings, sms_api_key: e.target.value })}
              className='input-field'
              dir='ltr'
              placeholder='کلید API پیامک'
            />
          </div>
          <div>
            <label className='block text-sm text-ink-400 mb-1.5'>شماره فرستنده</label>
            <input
              type='text'
              value={settings.sms_sender || ''}
              onChange={(e) => setSettings({ ...settings, sms_sender: e.target.value })}
              className='input-field'
              dir='ltr'
            />
          </div>
          <p className='text-xs text-ink-500'>
            برای اتصال به سرویس پیامک، API Key را وارد کنید. از سرویس‌های معتبر مانند کاوه‌نگار یا
            SMS.ir استفاده کنید.
          </p>
        </div>
      </div>

      <div className='animate-slide-in-up' style={{ animationDelay: '0.26s', animationFillMode: 'backwards' }}>
        <AccountSecurity />
      </div>

      {/* Save button */}
      <div className='flex justify-end'>
        <button onClick={handleSave} className='btn-primary px-8'>
          {saved ? <span className='flex items-center gap-2'> ذخیره شد</span> : 'ذخیره تنظیمات'}
        </button>
      </div>
    </div>
  )
}
