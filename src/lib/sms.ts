/**
 * SMS delivery — provider abstraction.
 *
 * Supported providers (pick with SMS_PROVIDER):
 *   kavenegar  → KAVENEGAR_API_KEY + KAVENEGAR_SENDER
 *   smsir      → SMSIR_API_KEY + SMSIR_LINE_NUMBER
 *   mock       → no credentials; the message is stored and marked "sent"
 *                so the whole UI flow stays testable before a panel exists
 *
 * The rest of the app only ever calls `sendSms()` — swapping providers is
 * an env change, never a code change.
 */

export type SmsProvider = 'kavenegar' | 'smsir' | 'mock'

export interface SmsResult {
  ok: boolean
  provider: SmsProvider
  /** provider-side message id when available */
  messageId?: string
  error?: string
  /** true when no real provider is configured */
  mock?: boolean
}

export function activeProvider(): SmsProvider {
  const explicit = (process.env.SMS_PROVIDER || '').toLowerCase()
  if (explicit === 'kavenegar' && process.env.KAVENEGAR_API_KEY) return 'kavenegar'
  if (explicit === 'smsir' && process.env.SMSIR_API_KEY) return 'smsir'

  // auto-detect when SMS_PROVIDER is unset
  if (process.env.KAVENEGAR_API_KEY) return 'kavenegar'
  if (process.env.SMSIR_API_KEY) return 'smsir'
  return 'mock'
}

/**
 * Normalise an Iranian mobile number to the 09xxxxxxxxx form the panels
 * expect. Accepts +98…, 0098…, 98…, and bare 9xxxxxxxxx.
 */
export function normalizePhone(raw: string): string | null {
  const digits = (raw || '').replace(/[^\d]/g, '')
  if (!digits) return null

  let n = digits
  if (n.startsWith('0098')) n = n.slice(4)
  else if (n.startsWith('98') && n.length === 12) n = n.slice(2)
  else if (n.startsWith('0')) n = n.slice(1)

  // now expect 9xxxxxxxxx (10 digits starting with 9)
  if (n.length !== 10 || !n.startsWith('9')) return null
  return `0${n}`
}

/* ------------------------------------------------------------------ */
/* Kavenegar                                                           */
/* ------------------------------------------------------------------ */

async function sendKavenegar(phone: string, message: string): Promise<SmsResult> {
  const apiKey = process.env.KAVENEGAR_API_KEY!
  const sender = process.env.KAVENEGAR_SENDER || ''

  const url = new URL(`https://api.kavenegar.com/v1/${apiKey}/sms/send.json`)
  url.searchParams.set('receptor', phone)
  url.searchParams.set('message', message)
  if (sender) url.searchParams.set('sender', sender)

  try {
    const res = await fetch(url.toString(), { method: 'GET' })
    const json = (await res.json()) as {
      return?: { status?: number; message?: string }
      entries?: { messageid?: number; status?: number; statustext?: string }[]
    }

    const status = json.return?.status
    if (status === 200 && json.entries?.length) {
      const entry = json.entries[0]
      if (entry.status === 1 || entry.status === 2 || entry.status === 5) {
        return { ok: true, provider: 'kavenegar', messageId: String(entry.messageid ?? '') }
      }
      return { ok: false, provider: 'kavenegar', error: entry.statustext || 'ارسال ناموفق' }
    }
    return { ok: false, provider: 'kavenegar', error: json.return?.message || 'پاسخ نامعتبر از کاوه‌نگار' }
  } catch (err) {
    console.error('[sms:kavenegar]', err)
    return { ok: false, provider: 'kavenegar', error: 'ارتباط با کاوه‌نگار برقرار نشد' }
  }
}

/* ------------------------------------------------------------------ */
/* SMS.ir                                                              */
/* ------------------------------------------------------------------ */

async function sendSmsIr(phone: string, message: string): Promise<SmsResult> {
  const apiKey = process.env.SMSIR_API_KEY!
  const lineNumber = process.env.SMSIR_LINE_NUMBER

  try {
    const res = await fetch('https://api.sms.ir/v1/send/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        lineNumber: lineNumber ? Number(lineNumber) : undefined,
        messageText: message,
        mobiles: [phone],
      }),
    })
    const json = (await res.json()) as {
      status?: number
      message?: string
      data?: { packId?: string; messageIds?: number[] }
    }

    if (json.status === 1) {
      return {
        ok: true,
        provider: 'smsir',
        messageId: String(json.data?.messageIds?.[0] ?? json.data?.packId ?? ''),
      }
    }
    return { ok: false, provider: 'smsir', error: json.message || 'ارسال ناموفق' }
  } catch (err) {
    console.error('[sms:smsir]', err)
    return { ok: false, provider: 'smsir', error: 'ارتباط با SMS.ir برقرار نشد' }
  }
}

/* ------------------------------------------------------------------ */
/* Public entry point                                                  */
/* ------------------------------------------------------------------ */

export async function sendSms(opts: { phone: string; message: string }): Promise<SmsResult> {
  const provider = activeProvider()

  if (provider === 'mock') {
    // No credentials: pretend success so the UI flow works end to end.
    return {
      ok: true,
      provider: 'mock',
      messageId: `MOCK${Date.now()}`,
      mock: true,
    }
  }

  const phone = normalizePhone(opts.phone)
  if (!phone) {
    return { ok: false, provider, error: 'شماره موبایل معتبر نیست' }
  }

  if (!opts.message.trim()) {
    return { ok: false, provider, error: 'متن پیامک خالی است' }
  }

  if (provider === 'kavenegar') return sendKavenegar(phone, opts.message)
  return sendSmsIr(phone, opts.message)
}
