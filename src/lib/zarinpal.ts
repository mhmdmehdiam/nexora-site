/**
 * ZarinPal payment gateway client (v4 REST) + mock gateway.
 *
 * Modes (decided once, from env):
 *   - ZARINPAL_MERCHANT_ID set  → real gateway (sandbox when ZARINPAL_SANDBOX=1)
 *   - missing                   → mock: the checkout flow works end-to-end
 *                                 with an internal simulate page, so the whole
 *                                 upgrade journey is testable before the
 *                                 merchant account exists.
 *
 * IMPORTANT: ZarinPal works in RIAL. Our money is TOMAN — conversion happens
 * only here, never in the DB (all stored amounts are Toman integers).
 */

const REAL_API = 'https://api.zarinpal.com/pg/v4'
const SANDBOX_API = 'https://sandbox.zarinpal.com/pg/v4'
const REAL_STARTPAY = 'https://www.zarinpal.com/pg/StartPay/'
const SANDBOX_STARTPAY = 'https://sandbox.zarinpal.com/pg/StartPay/'

export const gatewayMode = (): 'zarinpal' | 'mock' =>
  process.env.ZARINPAL_MERCHANT_ID ? 'zarinpal' : 'mock'

const isSandbox = () => process.env.ZARINPAL_SANDBOX === '1'
const apiBase = () => (isSandbox() ? SANDBOX_API : REAL_API)
const startPayBase = () => (isSandbox() ? SANDBOX_STARTPAY : REAL_STARTPAY)

export interface PaymentRequestResult {
  ok: boolean
  authority?: string
  redirectUrl?: string
  error?: string
}

/** Step 1 — create the payment and get the redirect URL. */
export async function requestPayment(opts: {
  amountToman: number
  description: string
  callbackUrl: string
  mobile?: string
  email?: string
}): Promise<PaymentRequestResult> {
  const merchantId = process.env.ZARINPAL_MERCHANT_ID

  if (gatewayMode() === 'mock') {
    // internal simulate page — the callback does the real bookkeeping
    return { ok: true, authority: `MOCK${Date.now()}${Math.floor(Math.random() * 1e6)}` }
  }

  try {
    const res = await fetch(`${apiBase()}/payment/request.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant_id: merchantId,
        amount: opts.amountToman * 10, // Toman → Rial
        description: opts.description,
        callback_url: opts.callbackUrl,
        metadata: {
          ...(opts.mobile ? { mobile: opts.mobile } : {}),
          ...(opts.email ? { email: opts.email } : {}),
        },
      }),
    })
    const json = (await res.json()) as {
      data?: { authority?: string; code?: number; message?: string }
      errors?: { message?: string } | unknown[]
    }

    const authority = json.data?.authority
    const code = json.data?.code
    if ((code === 100 || code === 101) && authority) {
      return { ok: true, authority, redirectUrl: `${startPayBase()}${authority}` }
    }
    const msg =
      (!Array.isArray(json.errors) && json.errors?.message) || `کد خطای درگاه: ${code ?? '?'}`
    return { ok: false, error: `ایجاد تراکنش ناموفق بود (${msg})` }
  } catch (err) {
    console.error('[zarinpal] request failed:', err)
    return { ok: false, error: 'ارتباط با درگاه پرداخت برقرار نشد' }
  }
}

export interface VerifyResult {
  ok: boolean
  refId?: string
  cardPan?: string
  error?: string
  /** true when the payment was already verified before (idempotent re-visit) */
  alreadyVerified?: boolean
}

/** Step 2 — verify the payment server-side. Amount comes from OUR DB, never the client. */
export async function verifyPayment(opts: {
  amountToman: number
  authority: string
}): Promise<VerifyResult> {
  if (gatewayMode() === 'mock') {
    // mock authority pattern is trusted — it was minted by this server
    return { ok: true, refId: `MOCKREF${opts.authority.slice(-8)}`, alreadyVerified: false }
  }

  try {
    const res = await fetch(`${apiBase()}/payment/verify.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant_id: process.env.ZARINPAL_MERCHANT_ID,
        amount: opts.amountToman * 10, // Toman → Rial
        authority: opts.authority,
      }),
    })
    const json = (await res.json()) as {
      data?: { code?: number; ref_id?: number; card_pan?: string; message?: string }
      errors?: { message?: string; code?: number } | unknown[]
    }

    const code = json.data?.code
    if (code === 100 || code === 101) {
      return {
        ok: true,
        refId: json.data?.ref_id ? String(json.data.ref_id) : undefined,
        cardPan: json.data?.card_pan,
        alreadyVerified: code === 101,
      }
    }
    if (code === -51) return { ok: false, error: 'پرداخت ناموفق یا لغو شده' }
    const msg = (!Array.isArray(json.errors) && json.errors?.message) || `کد ${code ?? '?'}`
    return { ok: false, error: `تأیید پرداخت ناموفق بود (${msg})` }
  } catch (err) {
    console.error('[zarinpal] verify failed:', err)
    return { ok: false, error: 'ارتباط با درگاه پرداخت برقرار نشد' }
  }
}
