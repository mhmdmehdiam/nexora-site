/**
 * Calculation test suite — run with:  npx tsx scripts/test-money.ts
 *
 * Every case asserts an exact integer. If any of these fail, money is wrong.
 */
import assert from 'node:assert/strict'
import {
  parseMoney,
  computeSaleTotals,
  resolvePaymentStatus,
  resolvePaidAmount,
  balanceOf,
  percentChange,
  roundHalfUp,
  formatMoney,
  normalizeDigits,
  isMoney,
} from '../src/lib/money'
import { jalaliKey, jalaliParts, lastJalaliMonths } from '../src/lib/jalali'
import { startOfJalaliMonth, tehranDayStart, tehranDayKey } from '../src/lib/time'

let passed = 0
const failures: string[] = []

function test(name: string, fn: () => void) {
  try {
    fn()
    passed++
  } catch (e: any) {
    failures.push(`${name}\n    ${e.message}`)
  }
}

const eq = (actual: unknown, expected: unknown, msg = '') =>
  assert.deepEqual(actual, expected, msg || `expected ${expected}, got ${actual}`)

/* ==========================================================================
   parseMoney
   ========================================================================== */

test('parse: plain integer', () => eq(parseMoney(1250000), 1250000))
test('parse: numeric string', () => eq(parseMoney('1250000'), 1250000))
test('parse: thousands separators', () => eq(parseMoney('1,250,000'), 1250000))
test('parse: Persian digits', () => eq(parseMoney('۱۲۵۰۰۰۰'), 1250000))
test('parse: Persian digits + Persian separator', () => eq(parseMoney('۱٬۲۵۰٬۰۰۰'), 1250000))
test('parse: Arabic-Indic digits', () => eq(parseMoney('١٢٥٠'), 1250))
test('parse: currency suffix', () => eq(parseMoney('1250 تومان'), 1250))
test('parse: spaces and nbsp', () => eq(parseMoney(' 1 250 000 '), 1250000))
test('parse: decimal rounds half up', () => eq(parseMoney('10.5'), 11))
test('parse: decimal below half', () => eq(parseMoney('10.4'), 10))
test('parse: Persian decimal separator', () => eq(parseMoney('۱۰٫۶'), 11))
test('parse: negative', () => eq(parseMoney('-2500'), -2500))
test('parse: empty → null', () => eq(parseMoney(''), null))
test('parse: garbage → null', () => eq(parseMoney('abc'), null))
test('parse: null → null', () => eq(parseMoney(null), null))
test('parse: NaN → null', () => eq(parseMoney(NaN), null))
test('parse: Infinity → null', () => eq(parseMoney(Infinity), null))
test('parse: float artefact 0.1*3 → 0', () => eq(parseMoney(0.1 * 3), 0))

/* ==========================================================================
   computeSaleTotals
   ========================================================================== */

test('totals: simple 2 × 1000 @10%', () => {
  const t = computeSaleTotals({ lines: [{ unitPrice: 1000, quantity: 2 }], taxRate: 10 })
  eq(t.subtotal, 2000)
  eq(t.tax, 200)
  eq(t.total, 2200)
  eq(t.errors, [])
})

test('totals: multiple lines', () => {
  const t = computeSaleTotals({
    lines: [
      { unitPrice: 250000, quantity: 3 },
      { unitPrice: 120000, quantity: 1 },
    ],
    taxRate: 9,
  })
  eq(t.subtotal, 870000)
  eq(t.tax, 78300) // 870000 * 0.09
  eq(t.total, 948300)
})

test('totals: order discount applied before tax', () => {
  const t = computeSaleTotals({
    lines: [{ unitPrice: 1000, quantity: 1 }],
    orderDiscount: 500,
    taxRate: 10,
  })
  eq(t.taxableBase, 500)
  eq(t.tax, 50)
  eq(t.total, 550)
})

test('totals: discount larger than subtotal is clamped', () => {
  const t = computeSaleTotals({
    lines: [{ unitPrice: 1000, quantity: 1 }],
    orderDiscount: 5000,
    taxRate: 10,
  })
  eq(t.orderDiscount, 1000)
  eq(t.taxableBase, 0)
  eq(t.tax, 0)
  eq(t.total, 0)
  assert.ok(t.errors.length > 0, 'should report an error')
})

test('totals: line discount', () => {
  const t = computeSaleTotals({
    lines: [{ unitPrice: 10000, quantity: 2, discount: 5000 }],
    taxRate: 10,
  })
  eq(t.subtotal, 20000)
  eq(t.itemDiscountTotal, 5000)
  eq(t.taxableBase, 15000)
  eq(t.tax, 1500)
  eq(t.total, 16500)
  eq(t.lineTotals, [15000])
})

test('totals: line discount clamped to line value', () => {
  const t = computeSaleTotals({
    lines: [{ unitPrice: 1000, quantity: 1, discount: 5000 }],
    taxRate: 0,
  })
  eq(t.itemDiscountTotal, 1000)
  eq(t.total, 0)
  assert.ok(t.errors.length > 0)
})

test('totals: tax rounds half up (1005 @10% = 100.5 → 101)', () => {
  const t = computeSaleTotals({ lines: [{ unitPrice: 1005, quantity: 1 }], taxRate: 10 })
  eq(t.tax, 101)
  eq(t.total, 1106)
})

test('totals: tax rounds down below half (1004 @10% = 100.4 → 100)', () => {
  const t = computeSaleTotals({ lines: [{ unitPrice: 1004, quantity: 1 }], taxRate: 10 })
  eq(t.tax, 100)
  eq(t.total, 1104)
})

test('totals: 0% tax', () => {
  const t = computeSaleTotals({ lines: [{ unitPrice: 12345, quantity: 7 }], taxRate: 0 })
  eq(t.tax, 0)
  eq(t.total, 86415)
})

test('totals: 100% tax', () => {
  const t = computeSaleTotals({ lines: [{ unitPrice: 500, quantity: 1 }], taxRate: 100 })
  eq(t.tax, 500)
  eq(t.total, 1000)
})

test('totals: rejects empty lines', () => {
  const t = computeSaleTotals({ lines: [], taxRate: 10 })
  assert.ok(t.errors.length > 0)
  eq(t.total, 0)
})

test('totals: rejects zero quantity', () => {
  const t = computeSaleTotals({ lines: [{ unitPrice: 1000, quantity: 0 }], taxRate: 10 })
  assert.ok(t.errors.length > 0)
})

test('totals: rejects negative quantity', () => {
  const t = computeSaleTotals({ lines: [{ unitPrice: 1000, quantity: -2 }], taxRate: 10 })
  assert.ok(t.errors.length > 0)
})

test('totals: rejects fractional quantity', () => {
  const t = computeSaleTotals({ lines: [{ unitPrice: 1000, quantity: 1.5 }], taxRate: 10 })
  assert.ok(t.errors.length > 0)
})

test('totals: rejects negative unit price', () => {
  const t = computeSaleTotals({ lines: [{ unitPrice: -100, quantity: 1 }], taxRate: 10 })
  assert.ok(t.errors.length > 0)
})

test('totals: float price is rounded to integer', () => {
  const t = computeSaleTotals({ lines: [{ unitPrice: 19.99, quantity: 3 }], taxRate: 0 })
  eq(t.subtotal, 60) // 20 × 3
})

test('totals: tax rate out of range is clamped', () => {
  const t = computeSaleTotals({ lines: [{ unitPrice: 1000, quantity: 1 }], taxRate: 250 })
  eq(t.taxRate, 100)
  assert.ok(t.errors.length > 0)
})

test('totals: large realistic invoice', () => {
  const t = computeSaleTotals({
    lines: [
      { unitPrice: 49_700_000, quantity: 3 },
      { unitPrice: 12_300_000, quantity: 11 },
      { unitPrice: 950_000, quantity: 7 },
    ],
    orderDiscount: 5_000_000,
    taxRate: 9,
  })
  eq(t.subtotal, 149_100_000 + 135_300_000 + 6_650_000) // 291,050,000
  eq(t.taxableBase, 291_050_000 - 5_000_000)
  eq(t.tax, roundHalfUp((286_050_000 * 9) / 100))
  eq(t.total, t.taxableBase + t.tax)
  eq(t.errors, [])
})

test('totals: exact, no float drift over 200 lines', () => {
  const lines = Array.from({ length: 200 }, () => ({ unitPrice: 3_333_333, quantity: 3 }))
  const t = computeSaleTotals({ lines, taxRate: 10 })
  eq(t.subtotal, 200 * 3_333_333 * 3)
  eq(t.tax, roundHalfUp((t.subtotal * 10) / 100))
  eq(t.total, t.subtotal + t.tax)
})

/* ==========================================================================
   Payment status / balance
   ========================================================================== */

test('status: zero total is paid', () => eq(resolvePaymentStatus(0, 0), 'paid'))
test('status: nothing paid', () => eq(resolvePaymentStatus(1000, 0), 'pending'))
test('status: partial', () => eq(resolvePaymentStatus(1000, 400), 'partial'))
test('status: exact payment', () => eq(resolvePaymentStatus(1000, 1000), 'paid'))
test('status: overpayment counts as paid', () => eq(resolvePaymentStatus(1000, 1500), 'paid'))

test('paid: clamped to total', () => eq(resolvePaidAmount(1000, 1500), 1000))
test('paid: negative becomes zero', () => eq(resolvePaidAmount(1000, -50), 0))
test('paid: normal', () => eq(resolvePaidAmount(1000, 250), 250))

test('balance: normal', () => eq(balanceOf(1000, 250), 750))
test('balance: overpaid is zero, not negative', () => eq(balanceOf(1000, 1500), 0))

test('percentChange: growth', () => eq(percentChange(120, 100), 20))
test('percentChange: decline', () => eq(percentChange(80, 100), -20))
test('percentChange: from zero', () => eq(percentChange(50, 0), null))
test('percentChange: both zero', () => eq(percentChange(0, 0), 0))

/* ==========================================================================
   Formatting
   ========================================================================== */

test('format: no decimals ever', () => {
  const s = formatMoney(1234.56)
  assert.ok(!/[٫.]/.test(s), `unexpected decimal point in ${s}`)
})
test('format: thousands grouped', () => {
  const s = formatMoney(1_250_000)
  assert.ok(s.includes('۱'), s)
})
test('format: NaN safe', () => assert.ok(formatMoney(NaN).includes('۰')))
test('digits: normalises mixed input', () => eq(normalizeDigits('۱۲3٤'), '1234'))
test('isMoney: rejects floats', () => eq(isMoney(1.5), false))
test('isMoney: accepts integers', () => eq(isMoney(10), true))

/* ==========================================================================
   Calendar
   ========================================================================== */

test('jalali: known date 2026-03-21 → 1405-01-01', () => {
  const p = jalaliParts(new Date(Date.UTC(2026, 2, 21)))
  eq(p.year, 1405)
  eq(p.month, 1)
  eq(p.day, 1)
})

test('jalali: key format', () => {
  assert.match(jalaliKey(new Date(Date.UTC(2026, 9, 23))), /^\d{4}-\d{2}$/)
})

test('jalali: last 6 months are sequential', () => {
  const months = lastJalaliMonths(6, new Date(Date.UTC(2026, 9, 23)))
  eq(months.length, 6)
  const nums = months.map((k) => {
    const [y, m] = k.split('-').map(Number)
    return y * 12 + m
  })
  for (let i = 1; i < nums.length; i++) {
    eq(nums[i] - nums[i - 1], 1, `gap between ${months[i - 1]} and ${months[i]}`)
  }
})

test('time: tehran day start is midnight Tehran', () => {
  const d = new Date(Date.UTC(2026, 9, 23, 22, 30)) // 02:00 Tehran next day
  const start = tehranDayStart(d)
  eq(tehranDayKey(start), '2026-10-24')
  // Tehran 00:00 == 20:30 UTC of the previous day
  eq(start.getTime() % 86_400_000, 73_800_000)
})

test('time: start of Jalali month is day 1', () => {
  const start = startOfJalaliMonth(new Date(Date.UTC(2026, 9, 23)))
  eq(jalaliParts(start).day, 1)
  assert.ok(start.getTime() <= Date.UTC(2026, 9, 23))
})

/* ========================================================================== */

const total = passed + failures.length
if (failures.length === 0) {
  console.log(`\n✓ ${passed}/${total} calculation tests passed\n`)
  process.exit(0)
} else {
  console.log(`\n✗ ${failures.length} of ${total} failed\n`)
  for (const f of failures) console.log('  ✗ ' + f)
  console.log('')
  process.exit(1)
}
