import { jalaliParts } from './jalali'

/**
 * Timezone helpers.
 *
 * The database stores timestamps as UTC instants (Prisma → epoch ms). The
 * business operates in Iran (UTC+03:30, no DST since 2022), so "today" and
 * "this month" must be computed on the Tehran wall clock — otherwise a sale
 * made at 01:00 local time lands on the previous day, and month totals shift
 * at 03:30 instead of midnight.
 */

export const TEHRAN_OFFSET_MS = 210 * 60 * 1000 // +03:30

const DAY_MS = 24 * 60 * 60 * 1000

/** Midnight (Tehran) of the day containing `date`, as a UTC instant. */
export function tehranDayStart(date: Date = new Date()): Date {
  const shifted = new Date(date.getTime() + TEHRAN_OFFSET_MS)
  const floor = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate()
  )
  return new Date(floor - TEHRAN_OFFSET_MS)
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS)
}

/**
 * First day (Tehran midnight) of the Jalali month containing `date`.
 * Walks back at most 31 days — cheap, and exact without calendar tables.
 */
export function startOfJalaliMonth(date: Date = new Date()): Date {
  const target = jalaliParts(date)
  let cursor = tehranDayStart(date)

  for (let i = 0; i < 32; i++) {
    const prev = addDays(cursor, -1)
    const p = jalaliParts(prev)
    if (p.year !== target.year || p.month !== target.month) break
    cursor = prev
  }
  return cursor
}

/** Start of the current Gregorian month on the Tehran clock. */
export function startOfTehranGregorianMonth(date: Date = new Date()): Date {
  const shifted = new Date(date.getTime() + TEHRAN_OFFSET_MS)
  const floor = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), 1)
  return new Date(floor - TEHRAN_OFFSET_MS)
}

/** ISO day key ("YYYY-MM-DD") on the Tehran clock. */
export function tehranDayKey(date: Date): string {
  const shifted = new Date(date.getTime() + TEHRAN_OFFSET_MS)
  const y = shifted.getUTCFullYear()
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0')
  const d = String(shifted.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * SQL expression that converts the stored timestamp into a Tehran-local
 * "YYYY-MM-DD" string.
 *
 * PostgreSQL stores DateTime as `timestamp(3)` in UTC. Adding the +03:30
 * offset before formatting yields the Tehran wall-clock day.
 *
 * (The previous SQLite variant divided epoch-ms by 1000 and used
 * `unixepoch`; PostgreSQL needs a plain interval shift.)
 */
export const SQL_TEHRAN_DAY = `to_char("saleDate" + INTERVAL '3 hours 30 minutes', 'YYYY-MM-DD')`

/** Same, but as "YYYY-MM" on the Tehran clock. */
export const SQL_TEHRAN_MONTH = `to_char("saleDate" + INTERVAL '3 hours 30 minutes', 'YYYY-MM')`
