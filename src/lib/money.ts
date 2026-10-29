/**
 * ============================================================================
 *  Money & sales arithmetic — single source of truth
 * ============================================================================
 *
 *  Every monetary value in this app is an INTEGER number of the business's
 *  currency unit (تومان). No floats, no decimals, ever:
 *
 *    - 49_700_000 means 49,700,000 تومان
 *    - 0.5 is not a valid amount
 *
 *  Why: `0.1 + 0.2 !== 0.3` in IEEE-754. Adding three items priced with
 *  fractions silently loses rials, and a tax computed on a drifting base is
 *  wrong by the time it reaches the invoice. Integers are exact up to 2^53.
 *
 *  Rounding rule (documented once, used everywhere):
 *    tax = half-up( taxableBase × taxRate / 100 )
 *  i.e. 10.5 → 11 and 10.4 → 10. Discounts are never rounded because they are
 *  entered as integers.
 * ============================================================================
 */

export const MAX_MONEY = Number.MAX_SAFE_INTEGER

/** Persian ۰-۹ and Arabic-Indic ٠-٩ → ASCII digits. */
const DIGIT_MAP: Record<string, string> = {
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
}

export function normalizeDigits(input: string): string {
  let out = ''
  for (const ch of input) out += DIGIT_MAP[ch] ?? ch
  return out
}

/** True when `n` is a finite integer we can safely do money math on. */
export function isMoney(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && Number.isFinite(n) && Math.abs(n) <= MAX_MONEY
}

/** Half-up rounding that also behaves for negatives (away from zero at .5). */
export function roundHalfUp(n: number): number {
  if (!Number.isFinite(n)) return 0
  return n < 0 ? -Math.round(-n) : Math.round(n)
}

/**
 * Parse anything a user (or an old API client) might send into integer money.
 *
 * Accepts: 1_250_000 | "1,250,000" | "۱٬۲۵۰٬۰۰۰" | "1250000.4" | " ۱۲۵۰ تومان "
 * Returns `null` when the value cannot be understood — callers must decide
 * whether that is an error or a zero.
 */
export function parseMoney(input: unknown): number | null {
  if (input === null || input === undefined || input === '') return null
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) return null
    return roundHalfUp(input)
  }
  if (typeof input !== 'string') return null

  let s = normalizeDigits(input).trim()
  if (!s) return null

  // Drop currency words and any grouping separators (٬ ، , space, nbsp).
  s = s.replace(/(تومان|ریال|تومن|toman|irr)/gi, '')
  s = s.replace(/[٬،,\u066C\u00A0\u202F\s]/g, '')
  // Persian / Arabic decimal separator → dot
  s = s.replace(/[٫\u066B]/g, '.')

  // Allow a single leading minus, digits, and at most one decimal point.
  if (!/^-?\d*\.?\d*$/.test(s) || s === '' || s === '-' || s === '.') return null

  const n = Number(s)
  if (!Number.isFinite(n)) return null
  return roundHalfUp(n)
}

/** Strict integer coercion for stored values coming back from the database. */
export function fromDb(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return roundHalfUp(value)
  if (typeof value === 'string') return parseMoney(value) ?? 0
  if (typeof value === 'bigint') return Number(value)
  return 0
}

/**
 * Quantities must be whole units. Unlike money we do NOT round here — a
 * fractional quantity is a data error, so it returns null and the caller
 * surfaces it instead of silently selling 1.5 → 2 items.
 */
export function parseQuantity(input: unknown): number | null {
  if (typeof input === 'number') {
    if (!Number.isFinite(input) || !Number.isInteger(input)) return null
    return input
  }
  if (typeof input === 'string') {
    const s = normalizeDigits(input).trim()
    if (/[.٫\u066B]/.test(s)) return null
    return parseMoney(s)
  }
  return null
}

/** Clamp to [min, max] using integers only. */
export function clampInt(value: number, min: number, max: number): number {
  const v = roundHalfUp(value)
  if (v < min) return min
  if (v > max) return max
  return v
}

/* ==========================================================================
   Sale totals
   ========================================================================== */

export interface SaleLineInput {
  /** Anything the client sent; parsed and validated inside. */
  unitPrice: unknown
  quantity: unknown
  /** Line-level discount, absolute amount (not a percentage). */
  discount?: unknown
}

export interface SaleTotalsInput {
  lines: SaleLineInput[]
  /** Order-level discount, absolute amount. */
  orderDiscount?: unknown
  /** Tax rate as a whole percent, e.g. 10 for 10%. */
  taxRate?: unknown
}

export interface SaleTotals {
  /** Sum of unitPrice × quantity, before any discount. */
  subtotal: number
  /** Sum of line-level discounts. */
  itemDiscountTotal: number
  /** Order discount actually applied (clamped to what is left). */
  orderDiscount: number
  /** Amount the tax is calculated on: subtotal − discounts. Never negative. */
  taxableBase: number
  taxRate: number
  tax: number
  /** taxableBase + tax */
  total: number
  /** Net total per line, in the same order as the input. */
  lineTotals: number[]
  /** Human-readable problems; empty when the input is valid. */
  errors: string[]
}

export function computeSaleTotals(input: SaleTotalsInput): SaleTotals {
  const errors: string[] = []
  const lines = Array.isArray(input.lines) ? input.lines : []

  if (lines.length === 0) errors.push('حداقل یک قلم کالا لازم است')

  let subtotal = 0
  let itemDiscountTotal = 0
  const lineTotals: number[] = []

  lines.forEach((line, i) => {
    const n = i + 1
    const unitPrice = parseMoney(line?.unitPrice)
    const quantity = parseQuantity(line?.quantity)
    const lineDiscount = parseMoney(line?.discount ?? 0) ?? 0

    if (unitPrice === null || unitPrice < 0) {
      errors.push(`ردیف ${n}: قیمت واحد نامعتبر است`)
    }
    if (quantity === null || quantity <= 0) {
      errors.push(`ردیف ${n}: تعداد باید عدد صحیح بزرگ‌تر از صفر باشد`)
    }
    if (lineDiscount < 0) {
      errors.push(`ردیف ${n}: تخفیف ردیف نمی‌تواند منفی باشد`)
    }

    const price = unitPrice && unitPrice > 0 ? unitPrice : 0
    const qty = quantity && quantity > 0 ? quantity : 0
    const gross = price * qty
    const discount = clampInt(lineDiscount, 0, gross)

    if (lineDiscount > gross) {
      errors.push(`ردیف ${n}: تخفیف بیشتر از مبلغ ردیف است`)
    }

    subtotal += gross
    itemDiscountTotal += discount
    lineTotals.push(gross - discount)
  })

  const rawOrderDiscount = parseMoney(input.orderDiscount ?? 0) ?? 0
  const discountCeiling = Math.max(0, subtotal - itemDiscountTotal)
  const orderDiscount = clampInt(rawOrderDiscount, 0, discountCeiling)

  if (rawOrderDiscount < 0) errors.push('تخفیف کل نمی‌تواند منفی باشد')
  if (rawOrderDiscount > discountCeiling) errors.push('تخفیف کل بیشتر از مبلغ قابل تخفیف است')

  const rawRate = parseMoney(input.taxRate ?? 0) ?? 0
  const taxRate = clampInt(rawRate, 0, 100)
  if (rawRate < 0 || rawRate > 100) errors.push('نرخ مالیات باید بین ۰ تا ۱۰۰ درصد باشد')

  const taxableBase = Math.max(0, subtotal - itemDiscountTotal - orderDiscount)
  const tax = roundHalfUp((taxableBase * taxRate) / 100)
  const total = taxableBase + tax

  return {
    subtotal,
    itemDiscountTotal,
    orderDiscount,
    taxableBase,
    taxRate,
    tax,
    total,
    lineTotals,
    errors,
  }
}

/* ==========================================================================
   Payment status
   ========================================================================== */

export type SaleStatus = 'paid' | 'partial' | 'pending'

export function resolvePaymentStatus(total: number, paid: number): SaleStatus {
  const t = Math.max(0, roundHalfUp(total))
  const p = clampInt(paid, 0, t)
  if (t === 0) return 'paid'
  if (p >= t) return 'paid'
  if (p > 0) return 'partial'
  return 'pending'
}

export function resolvePaidAmount(total: number, paid: number): number {
  return clampInt(paid, 0, Math.max(0, roundHalfUp(total)))
}

/** Outstanding balance, never negative. */
export function balanceOf(total: number, paid: number): number {
  return Math.max(0, roundHalfUp(total) - clampInt(paid, 0, Math.max(0, roundHalfUp(total))))
}

/* ==========================================================================
   Formatting
   ========================================================================== */

/** Always integer output — never shows a decimal point. */
export function formatMoney(amount: number, currency = 'تومان'): string {
  const n = roundHalfUp(Number.isFinite(amount) ? amount : 0)
  return new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 }).format(n) + ' ' + currency
}

export function formatMoneyCompact(amount: number): { value: string; unit: string } {
  const n = roundHalfUp(Number.isFinite(amount) ? amount : 0)
  const fmt = (v: number) =>
    new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 }).format(v)
  if (Math.abs(n) >= 1_000_000_000) return { value: fmt(n / 1_000_000_000), unit: 'میلیارد تومان' }
  if (Math.abs(n) >= 1_000_000) return { value: fmt(n / 1_000_000), unit: 'میلیون تومان' }
  if (Math.abs(n) >= 1_000) return { value: fmt(n / 1_000), unit: 'هزار تومان' }
  return { value: fmt(n), unit: 'تومان' }
}

/** Percentage change between two periods, rounded to 1 decimal. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return Math.round(((current - previous) / previous) * 1000) / 10
}
