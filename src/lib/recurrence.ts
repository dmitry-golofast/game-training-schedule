/**
 * Recurrence expansion — computes concrete occurrence start times from a
 * parent slot's RRULE-style rule.
 *
 * Time model: the parent's `startAt` is a UTC instant. Its wall-clock
 * components (hour, minute) are read in the parent's `recurrence.timezone`,
 * and each occurrence keeps the same wall-clock time on its own date in
 * that timezone. All returned `Date`s are UTC instants.
 */

import { formatTzParts, wallClockToUtc } from '@/lib/timezone'

export type RecurrenceFrequency = 'daily' | 'weekly'

export type RecurrenceRule = {
  frequency: RecurrenceFrequency
  interval: number // every N days/weeks (1..4)
  weekdays?: number[] | null // 0=Sun … 6=Sat (weekly only)
  until?: string | null // ISO date, inclusive end day
  count?: number | null // max number of occurrences (including the first)
  timezone: string // IANA zone in which wall-clock time is anchored
}

/** Wall-clock time (h, m) of a UTC instant in the given timezone. */
function wallTimeInTz(instant: Date, tz: string): { hours: number; minutes: number } {
  const p = formatTzParts(instant, tz)
  return { hours: p.hours, minutes: p.minutes }
}

/** Get the day-of-week (0=Sun..6=Sat) for a (year, month, day) tuple. */
function dayOfWeek(y: number, m: number, d: number): number {
  // Use Date.UTC so the day-of-week is deterministic regardless of server TZ.
  return new Date(Date.UTC(y, m, d)).getUTCDay()
}

/**
 * Expand a recurrence into concrete occurrence start instants.
 *
 * Key rules:
 *  - For weekly recurrence with selected weekdays, ONLY those weekdays
 *    generate occurrences. The firstStart date itself is NOT forced — if
 *    it falls on a non-selected weekday, it won't produce an occurrence
 *    on that date.
 *  - If weekdays is empty/null, every day matching the interval is valid.
 *  - The weekDistance is computed from the firstStart's wall-clock day
 *    to the candidate's wall-clock day, both in the same timezone.
 */
export function expandRecurrence(
  firstStart: Date,
  rule: RecurrenceRule,
  rangeEnd: Date,
  maxOccurrences = 365,
): Date[] {
  const tz = rule.timezone || 'UTC'
  const { hours, minutes } = wallTimeInTz(firstStart, tz)

  const untilInstant = rule.until ? new Date(rule.until) : null
  const cap = Math.min(
    maxOccurrences,
    typeof rule.count === 'number' && rule.count > 0 ? rule.count : maxOccurrences,
  )

  const out: Date[] = []

  // Start iterating from the calendar day of `firstStart` in `tz`.
  const firstParts = formatTzParts(firstStart, tz)
  // The reference start day for week-distance calculations.
  const refDayMs = Date.UTC(firstParts.year, firstParts.month, firstParts.day)

  // For weekly with weekdays: find the start of the week containing firstStart
  // (Monday-based) so interval cycles align properly.
  const firstWeekday = dayOfWeek(firstParts.year, firstParts.month, firstParts.day)
  const weekStartOffset = firstWeekday === 0 ? 6 : firstWeekday - 1 // Mon=0..Sun=6
  const weekStartMs = refDayMs - weekStartOffset * 86_400_000

  const cursor = new Date(Date.UTC(firstParts.year, firstParts.month, firstParts.day))

  let produced = 0
  for (let i = 0; i < maxOccurrences * 7 && produced < cap; i += 1) {
    const y = cursor.getUTCFullYear()
    const m = cursor.getUTCMonth()
    const d = cursor.getUTCDate()

    // The calendar day of the cursor (in UTC terms, matching TZ components).
    const cursorDayMs = Date.UTC(y, m, d)

    // Convert this candidate wall-clock day (at the anchor time) to a UTC instant.
    const instant = wallClockToUtc(y, m, d, hours, minutes, tz)

    // Must not precede the first occurrence.
    if (instant.getTime() < firstStart.getTime()) {
      cursor.setUTCDate(cursor.getUTCDate() + 1)
      continue
    }

    // Enforce `until` (inclusive end-of-day boundary).
    if (untilInstant) {
      const untilEnd = new Date(untilInstant)
      untilEnd.setUTCDate(untilEnd.getUTCDate() + 1)
      if (instant.getTime() >= untilEnd.getTime()) break
    }

    // Enforce `rangeEnd`.
    if (instant.getTime() > rangeEnd.getTime()) break

    if (rule.frequency === 'weekly') {
      const weekday = dayOfWeek(y, m, d)
      const hasWeekdays = rule.weekdays && rule.weekdays.length > 0
      const allowed = !hasWeekdays || rule.weekdays!.includes(weekday)

      if (!allowed) {
        cursor.setUTCDate(cursor.getUTCDate() + 1)
        continue
      }

      // Check interval: which week cycle are we in?
      const dayDiffFromWeekStart = Math.round((cursorDayMs - weekStartMs) / 86_400_000)
      const weekIndex = Math.floor(dayDiffFromWeekStart / 7)
      const inInterval = weekIndex % (rule.interval || 1) === 0

      if (inInterval) {
        out.push(instant)
        produced += 1
      }
    } else {
      // daily: every `interval` days.
      const dayDiff = Math.round((cursorDayMs - refDayMs) / 86_400_000)
      if (dayDiff >= 0 && dayDiff % (rule.interval || 1) === 0) {
        out.push(instant)
        produced += 1
      }
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return out
}
