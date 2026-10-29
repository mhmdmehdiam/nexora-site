import type { Metadata } from 'next'
import { LegalShell, H2, P } from '@/components/site/legal-shell'
import { ContactForm } from '@/components/site/contact-form'

export const metadata: Metadata = {
  title: 'تماس با ما',
  description: 'پشتیبانی، فروش و گزارش امنیتی — راه‌های ارتباط با تیم نکسورا.',
  alternates: { canonical: '/contact' },
}

const CHANNELS = [
  { label: 'پشتیبانی فنی', value: 'support@nexora.ir', hint: 'پاسخ حداکثر یک روز کاری' },
  { label: 'فروش و سازمانی', value: 'sales@nexora.ir', hint: 'برای پلن سازمانی و فاکتور رسمی' },
  { label: 'گزارش امنیتی', value: 'security@nexora.ir', hint: 'بررسی ظرف ۴۸ ساعت' },
  { label: 'حریم خصوصی', value: 'privacy@nexora.ir', hint: 'درخواست داده و حذف حساب' },
]

export default function ContactPage() {
  return (
    <LegalShell
      index="CONTACT"
      title="تماس با ما"
      intro="هر پیام را می‌خوانیم. برای سریع‌ترین پاسخ، موضوع را دقیق بنویس و اگر مشکل فنی است، نام کسب‌وکارت را هم ذکر کن."
    >
      <div className="grid gap-px border border-ink-100/[0.12] bg-ink-100/[0.1] sm:grid-cols-2">
        {CHANNELS.map((c) => (
          <div key={c.label} className="bg-ink-900 p-5">
            <div className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-600">
              {c.label}
            </div>
            <a
              href={`mailto:${c.value}`}
              dir="ltr"
              className="mt-2 block text-[13px] font-semibold text-ink-100 underline underline-offset-4 hover:text-sand"
            >
              {c.value}
            </a>
            <div className="mt-1.5 text-[11.5px] text-ink-500">{c.hint}</div>
          </div>
        ))}
      </div>

      <H2>فرم تماس</H2>
      <P>اگر ترجیح می‌دهی از داخل سایت بنویسی، این فرم مستقیم به صندوق پشتیبانی می‌رود.</P>

      <div className="mt-6">
        <ContactForm />
      </div>

      <H2>اطلاعات کسب‌وکار</H2>
      <P>
        نکسورا — پلتفرم مدیریت فروش و مشتری. برای مکاتبات رسمی و فاکتور، از آدرس{' '}
        <span dir="ltr">sales@nexora.ir</span> استفاده کن.
      </P>
    </LegalShell>
  )
}
