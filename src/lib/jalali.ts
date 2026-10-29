/**
 * Jalali (Persian) calendar helpers.
 *
 * Business reporting in Iran is month-based on the Jalali calendar, not the
 * Gregorian one. We use Intl to convert (no hand-rolled leap-year math), and
 * keep month names in a constant array so labels never depend on locale data.
 */

const MONTH_NAMES = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
]

const PARTS_FMT = new Intl.DateTimeFormat('en-US-u-ca-persian', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  timeZone: 'Asia/Tehran',
})

export interface JalaliParts {
  year: number
  month: number // 1..12
  day: number // 1..31
}

export function jalaliParts(date: Date): JalaliParts {
  const parts = PARTS_FMT.formatToParts(date)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)
  return { year: get('year'), month: get('month'), day: get('day') }
}

/** Sortable key, e.g. "1405-07". */
export function jalaliKey(date: Date): string {
  const { year, month } = jalaliParts(date)
  return `${year}-${String(month).padStart(2, '0')}`
}

export function jalaliMonthName(month: number): string {
  return MONTH_NAMES[Math.min(11, Math.max(0, month - 1))]
}

export function jalaliLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return `${jalaliMonthName(m)} ${new Intl.NumberFormat('fa-IR').format(y)}`
}

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const total = year * 12 + (month - 1) + delta
  return { year: Math.floor(total / 12), month: (total % 12) + 1 }
}

/** The `n` Jalali months ending at `from` (inclusive), oldest first. */
export function lastJalaliMonths(n: number, from: Date = new Date()): string[] {
  const { year, month } = jalaliParts(from)
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const s = shiftMonth(year, month, -i)
    out.push(`${s.year}-${String(s.month).padStart(2, '0')}`)
  }
  return out
}
