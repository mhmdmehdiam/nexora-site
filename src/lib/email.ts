import nodemailer, { type Transporter } from 'nodemailer'

/**
 * Email transport.
 *
 * Mirrors the SMS layer: a provider abstraction with a working mock mode, so
 * the whole product (password reset, invoices, notifications) can be built and
 * tested before anyone has an SMTP account.
 *
 * Configuration — SMTP (works with any host, including Iranian providers):
 *   SMTP_HOST=smtp.yourhost.com
 *   SMTP_PORT=587
 *   SMTP_SECURE=0            # 1 for port 465
 *   SMTP_USER=...
 *   SMTP_PASS=...
 *   MAIL_FROM="نکسورا <no-reply@nexora.ir>"
 *
 * With no SMTP_HOST the provider is "mock": messages are logged and stored in
 * memory for the dev mailbox at /dev/mail, but never sent.
 */

export type EmailProvider = 'smtp' | 'mock'

export interface SendEmailInput {
  to: string
  subject: string
  html: string
  text?: string
  replyTo?: string
}

export interface SendEmailResult {
  ok: boolean
  provider: EmailProvider
  messageId?: string
  error?: string
}

const FROM = process.env.MAIL_FROM || 'نکسورا <no-reply@nexora.local>'

let cached: Transporter | null = null

function provider(): EmailProvider {
  return process.env.SMTP_HOST ? 'smtp' : 'mock'
}

function transporter(): Transporter | null {
  if (!process.env.SMTP_HOST) return null
  if (cached) return cached

  cached = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === '1' || Number(process.env.SMTP_PORT) === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    // Fail fast instead of hanging a request for 2 minutes
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  })
  return cached
}

/** Dev-only ring buffer so the mock provider is actually inspectable. */
export const devMailbox: (SendEmailInput & { at: Date; id: string })[] = []

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const mode = provider()

  if (mode === 'mock') {
    const id = `mock-${Date.now().toString(36)}`
    devMailbox.unshift({ ...input, at: new Date(), id })
    if (devMailbox.length > 50) devMailbox.length = 50
    console.info(
      JSON.stringify({
        level: 'info',
        msg: 'email_mock',
        to: input.to,
        subject: input.subject,
        // the body is only useful in dev, and it can contain reset links
        html: process.env.NODE_ENV === 'production' ? undefined : input.html,
      })
    )
    return { ok: true, provider: 'mock', messageId: id }
  }

  const tx = transporter()
  if (!tx) return { ok: false, provider: 'mock', error: 'transport unavailable' }

  try {
    const info = await tx.sendMail({
      from: FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text || stripHtml(input.html),
      replyTo: input.replyTo,
    })
    return { ok: true, provider: 'smtp', messageId: info.messageId }
  } catch (err) {
    return {
      ok: false,
      provider: 'smtp',
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/** Branded shell so every transactional email looks the same. */
export function emailLayout(opts: { title: string; body: string; footer?: string }): string {
  return `<!doctype html>
<html dir="rtl" lang="fa">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f2ebdd;font-family:Vazirmatn,Tahoma,system-ui,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2ebdd;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="max-width:520px;background:#fbf7ee;border:1px solid #d8cbb2;border-radius:14px;overflow:hidden">
        <tr><td style="padding:26px 28px 8px">
          <div style="font-size:11px;letter-spacing:.18em;color:#8a7c68;text-transform:uppercase">NEXORA</div>
          <h1 style="margin:10px 0 0;font-size:20px;line-height:1.5;color:#1a1814;font-weight:700">${opts.title}</h1>
        </td></tr>
        <tr><td style="padding:8px 28px 26px;font-size:14px;line-height:2;color:#3a342c">
          ${opts.body}
        </td></tr>
        <tr><td style="padding:16px 28px 24px;border-top:1px solid #e6dcc8;font-size:11.5px;line-height:1.9;color:#8a7c68">
          ${opts.footer || 'این پیام به‌صورت خودکار از طرف نکسورا ارسال شده است.'}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

/** Reusable button that survives Outlook's CSS stripping. */
export function emailButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0">
    <tr><td style="background:#1a1814;border-radius:10px">
      <a href="${href}" style="display:inline-block;padding:13px 26px;font-size:13.5px;font-weight:600;color:#f7f2e6;text-decoration:none">${label}</a>
    </td></tr>
  </table>`
}
