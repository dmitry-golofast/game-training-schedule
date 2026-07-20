/**
 * Calendar primitives for the schedule views.
 *
 * IMPORTANT: this module is intentionally timezone-agnostic. It deals only
 * with calendar components (year, month, day) and constants. Any conversion
 * between a wall-clock day and a UTC instant happens in `@/lib/timezone` via
 * `wallClockToUtc` / `formatTzParts`, so the server's own timezone never
 * affects which calendar day a slot lands on.
 */

/** Grid granularity, minutes. */
export const SLOT_STEP_MIN = 30

/** First row of the working day (inclusive), 24h. */
export const DAY_START_HOUR = 8

/** End boundary of the working day (exclusive), 24h. */
export const DAY_END_HOUR = 22

/** Row height in the grid (px). Keep in sync with the grid component. */
export const ROW_HEIGHT_PX = 48

/** Allowed slot durations, minutes. Must be multiples of SLOT_STEP_MIN. */
export const ALLOWED_DURATIONS = [30, 60, 90, 120] as const

export type ScheduleView = 'day' | 'month' | 'year'

/**
 * Parse a "YYYY-MM-DD" string into its calendar components. Returns null if
 * invalid.
 *
 * NOTE: deliberately returns plain components (not a `Date`) so that callers
 * can construct an instant in a specific timezone via `wallClockToUtc`. Using
 * `new Date(year, month, day)` here would pin the day to the SERVER's local
 * timezone, which then drifts when interpreted in the user's timezone.
 */
export function parseISODateComponents(
  value: string,
): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return null
  return { year: Number(m[1]), month: Number(m[2]) - 1, day: Number(m[3]) }
}

export type CalendarCell = {
  // A `Date` is kept for convenience but should NOT be used to derive the
  // cell's calendar day — its components are server-local. Use `year` /
  // `month` / `day` instead.
  date: Date
  year: number
  month: number
  day: number
  isOtherMonth: boolean
}

/**
 * Build the calendar matrix for a month as weeks × 7 days, starting Monday.
 * Cells from the previous/next month are included to fill the grid; they are
 * flagged via `isOtherMonth`. Each cell carries explicit (year, month, day)
 * components so it is independent of the server timezone.
 */
export function getMonthMatrix(year: number, month: number): CalendarCell[][] {
  const firstOfMonth = new Date(year, month, 1)
  // JS: 0 = Sunday. We want Monday = 0.
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7

  // Track the calendar day as explicit (year, month, day) so the cell never
  // depends on the server's timezone. `new Date(y, m, d)` is used purely as a
  // calendar calculator (it handles month/day overflow), then we read back
  // the normalized components.
  let cur = normalize(year, month, 1 - firstWeekday)

  const weeks: CalendarCell[][] = []
  for (let w = 0; w < 6; w += 1) {
    const row: CalendarCell[] = []
    for (let d = 0; d < 7; d += 1) {
      row.push({
        date: new Date(cur.year, cur.month, cur.day),
        year: cur.year,
        month: cur.month,
        day: cur.day,
        isOtherMonth: cur.month !== month,
      })
      cur = addOneDay(cur.year, cur.month, cur.day)
    }
    weeks.push(row)
  }
  return weeks
}

/** Short weekday labels, Monday-first. */
export const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

/** Normalize a (possibly underflowed/overflowed) day into valid components. */
function normalize(y: number, m: number, d: number): { year: number; month: number; day: number } {
  const cal = new Date(y, m, d)
  return { year: cal.getFullYear(), month: cal.getMonth(), day: cal.getDate() }
}

/** Add one calendar day, returning valid (year, month, day). */
function addOneDay(y: number, m: number, d: number): { year: number; month: number; day: number } {
  return normalize(y, m, d + 1)
}
