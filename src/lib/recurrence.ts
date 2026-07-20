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

/**
 * Expand a recurrence into concrete occurrence start instants.
 *
 *  - `firstStart` is the parent slot's startAt (UTC). Its wall-clock time in
 *    `rule.timezone` anchors the time-of-day for every occurrence.
 *  - `rangeEnd` is an inclusive upper bound used to stop the expansion even
 *    when neither `until` nor `count` is provided (safety cap).
 *  - `maxOccurrences` is a hard cap (default 365) to prevent runaway loops.
 *
 * Returns UTC `Date`s, including the first occurrence, in ascending order.
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
  const cursor = new Date(Date.UTC(firstParts.year, firstParts.month, firstParts.day))

  let produced = 0
  // Safety: never iterate more than `maxOccurrences` candidate days.
  for (let i = 0; i < maxOccurrences * 7 && produced < cap; i += 1) {
    const y = cursor.getUTCFullYear()
    const m = cursor.getUTCMonth()
    const d = cursor.getUTCDate()

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

    // For weekly frequency, restrict to selected weekdays (0=Sun..6=Sat)
    // and respect the interval in WEEKS.
    if (rule.frequency === 'weekly') {
      // `cursor` already represents a wall-clock day in `tz`; its UTC day-of-week
      // matches the wall-clock day-of-week by construction (y/m/d are TZ parts).
      const weekday = new Date(y, m, d).getUTCDay()
      const allowed =
        !rule.weekdays || rule.weekdays.length === 0 || rule.weekdays.includes(weekday)
      const weekDiff = weekDistance(firstStart, instant, tz)
      const inInterval = weekDiff % (rule.interval || 1) === 0
      if (allowed && inInterval) {
        out.push(instant)
        produced += 1
      }
    } else {
      // daily: every `interval` days.
      const dayDiff = Math.round((instant.getTime() - firstStart.getTime()) / 86_400_000)
      if (dayDiff >= 0 && dayDiff % (rule.interval || 1) === 0) {
        out.push(instant)
        produced += 1
      }
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return out
}

/** Whole-week distance between two instants, as seen in `tz`. */
function weekDistance(a: Date, b: Date, tz: string): number {
  const pa = formatTzParts(a, tz)
  const pb = formatTzParts(b, tz)
  const da = Date.UTC(pa.year, pa.month, pa.day)
  const db = Date.UTC(pb.year, pb.month, pb.day)
  return Math.round((db - da) / (7 * 86_400_000))
}
