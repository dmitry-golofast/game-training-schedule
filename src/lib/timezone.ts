/**
 * Timezone helpers.
 *
 * Slot times are stored in UTC. Each user views and enters times in their own
 * IANA timezone (stored on `user.timezone`, falling back to `UTC`). These
 * helpers translate between wall-clock times in a TZ and UTC instants,
 * relying solely on `Intl.DateTimeFormat` — no external date library.
 */

/** Default timezone when none is configured on the user. */
export const DEFAULT_TIMEZONE = 'UTC'

/** Resolve a user's timezone, falling back to UTC. */
export function getUserTimezone(timezone?: string | null): string {
  if (!timezone) return DEFAULT_TIMEZONE
  // Intl throws on invalid zones; guard so the app never crashes over a bad value.
  try {
    Intl.DateTimeFormat('en', { timeZone: timezone })
    return timezone
  } catch {
    return DEFAULT_TIMEZONE
  }
}

/**
 * Resolve the viewer's timezone for UI rendering (schedule, sick-leaves, …).
 *
 * The browser-detected zone is written to the `tz` cookie by the `TimezoneSync`
 * client component, so server components can read it on the very first render
 * (before the detected value has been persisted onto the user record). When the
 * cookie is absent or invalid we fall back to the stored `user.timezone`, then
 * UTC.
 */
export function getUserTimezoneFromCookie(
  cookieTz: string | undefined | null,
  userTz?: string | null,
): string {
  if (cookieTz) {
    try {
      Intl.DateTimeFormat('en', { timeZone: cookieTz })
      return cookieTz
    } catch {
      // ignore invalid cookie value, fall through
    }
  }
  return getUserTimezone(userTz)
}

/** Format a UTC instant as a wall-clock string in the given timezone. */
export function formatInTz(
  date: Date,
  tz: string,
  options: Intl.DateTimeFormatOptions = {},
): string {
  try {
    return new Intl.DateTimeFormat('ru-RU', { timeZone: tz, ...options }).format(date)
  } catch {
    return new Intl.DateTimeFormat('ru-RU', options).format(date)
  }
}

/** "HH:MM" in the given timezone. */
export function formatTimeInTz(date: Date, tz: string): string {
  return formatInTz(date, tz, { hour: '2-digit', minute: '2-digit', hour12: false })
}

/** Format a Date as "YYYY-MM-DD" using the wall-clock day in the given TZ. */
export function toISODateInTz(date: Date, tz: string): string {
  const p = formatTzParts(date, tz)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${p.year}-${pad(p.month + 1)}-${pad(p.day)}`
}

/** "15 июля 2026" in the given timezone. */
export function formatDateInTz(date: Date, tz: string): string {
  return formatInTz(date, tz, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
  })
}

/**
 * Interpret a local wall-clock date/time (`YYYY-MM-DDTHH:mm` or components) as
 * an instant in the given timezone and return the equivalent UTC Date.
 *
 * Implementation note: we format the "current" instant into the TZ, measure
 * the wall-clock offset from UTC in minutes, then shift the UTC instant back
 * to what it would be if the wall-clock matched the requested components.
 */
export function wallClockToUtc(
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
  tz: string,
): Date {
  // Start from a UTC instant with the requested components, then correct by
  // the TZ offset that applies at that instant.
  const naive = new Date(Date.UTC(year, month, day, hours, minutes, 0))
  const offsetMin = tzOffsetMinutes(naive, tz)
  return new Date(naive.getTime() - offsetMin * 60_000)
}

/**
 * Offset, in minutes, of `tz` from UTC at the given instant. Positive means
 * the zone is ahead of UTC (e.g. +180 for Moscow).
 */
export function tzOffsetMinutes(date: Date, tz: string): number {
  // Format the same instant in the target TZ and in UTC, parse both, diff.
  const tzParts = formatTzParts(date, tz)
  const utcParts = {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
    day: date.getUTCDate(),
    hours: date.getUTCHours(),
    minutes: date.getUTCMinutes(),
  }
  const tzMs = Date.UTC(tzParts.year, tzParts.month, tzParts.day, tzParts.hours, tzParts.minutes)
  const utcMs = Date.UTC(
    utcParts.year,
    utcParts.month,
    utcParts.day,
    utcParts.hours,
    utcParts.minutes,
  )
  // tzMs is the wall-clock in the target zone interpreted as UTC; subtracting
  // the real UTC ms gives the zone's offset.
  return Math.round((tzMs - utcMs) / 60_000)
}

/** Break a Date into wall-clock components in the given TZ. */
export function formatTzParts(
  date: Date,
  tz: string,
): { year: number; month: number; day: number; hours: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const map: Record<string, number> = {}
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = Number(p.value)
  }
  // Intl can emit "24" for midnight with hour12:false; normalize to 0.
  const hours = map.hour === 24 ? 0 : map.hour
  return {
    year: map.year,
    month: map.month - 1,
    day: map.day,
    hours,
    minutes: map.minute,
  }
}

/**
 * Return [start, end) UTC instants for the day that contains `instant`
 * when viewed in `tz`. Used to scope DB queries for the day view.
 */
export function getDayBoundsInTz(instant: Date, tz: string): { start: Date; end: Date } {
  const parts = formatTzParts(instant, tz)
  const start = wallClockToUtc(parts.year, parts.month, parts.day, 0, 0, tz)
  const end = new Date(start.getTime() + 24 * 60 * 60_000)
  return { start, end }
}

/** [start, end) UTC instants for the month containing `instant` in `tz`. */
export function getMonthBoundsInTz(instant: Date, tz: string): { start: Date; end: Date } {
  const parts = formatTzParts(instant, tz)
  const start = wallClockToUtc(parts.year, parts.month, 1, 0, 0, tz)
  const end = wallClockToUtc(parts.year, parts.month + 1, 1, 0, 0, tz)
  return { start, end }
}

/** [start, end) UTC instants for the year containing `instant` in `tz`. */
export function getYearBoundsInTz(instant: Date, tz: string): { start: Date; end: Date } {
  const parts = formatTzParts(instant, tz)
  const start = wallClockToUtc(parts.year, 0, 1, 0, 0, tz)
  const end = wallClockToUtc(parts.year + 1, 0, 1, 0, 0, tz)
  return { start, end }
}

/** Bounds for a given view, computed in the given timezone. */
export function getViewBoundsInTz(
  instant: Date,
  view: 'day' | 'month' | 'year',
  tz: string,
): { start: Date; end: Date } {
  if (view === 'month') return getMonthBoundsInTz(instant, tz)
  if (view === 'year') return getYearBoundsInTz(instant, tz)
  return getDayBoundsInTz(instant, tz)
}

/**
 * Given a wall-clock "day" (year/month/day interpreted in `tz`) return its UTC
 * start — a stable cursor for the day that doesn't drift with TZ on the
 * client side.
 */
export function dayStartInTz(year: number, month: number, day: number, tz: string): Date {
  return wallClockToUtc(year, month, day, 0, 0, tz)
}

/** Human-readable TZ label with current UTC offset, e.g. "Europe/Moscow (UTC+3)". */
export function timezoneLabel(tz: string, at: Date = new Date()): string {
  const offset = tzOffsetMinutes(at, tz)
  const sign = offset >= 0 ? '+' : '-'
  const abs = Math.abs(offset)
  const hh = String(Math.floor(abs / 60)).padStart(2, '0')
  const mm = String(abs % 60).padStart(2, '0')
  const tail = offset === 0 ? 'UTC' : `UTC${sign}${hh}${mm === '00' ? '' : `:${mm}`}`
  return `${tz} (${tail})`
}
