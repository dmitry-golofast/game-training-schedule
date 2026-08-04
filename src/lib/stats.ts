import type { BasePayload } from 'payload'

import type { User } from '@/payload-types'
import { formatTzParts } from '@/lib/timezone'

/**
 * Dashboard / progress statistics for the cabinet overview.
 *
 * All queries use `overrideAccess: false` + the current `user`, so the
 * collection's access policy scopes results automatically: a student/parent
 * sees their own (or their children's) slots, an admin/trainer sees everything.
 */

/** Max gap (in days) between two training days before a streak is broken. */
const STREAK_MAX_GAP_DAYS = 3

/** ISO timestamps bounding the last 7 days (inclusive of `now`). */
function lastWeekBounds(now: Date): { start: string; end: string } {
  const end = now.toISOString()
  const start = new Date(now.getTime() - 7 * 24 * 60 * 60_000).toISOString()
  return { start, end }
}

export type CompletedStats = {
  /** Completed sessions within the last 7 days. */
  thisWeek: number
  /** Total completed sessions, all time. */
  total: number
  /** Sum of `durationMin` for completed sessions in the last 7 days. */
  minutesThisWeek: number
  /** Sum of `durationMin` for all completed sessions. */
  totalMinutes: number
}

/**
 * Completed-session counts and accumulated training time. We fetch the docs
 * (not just `count`) because durations must be summed client-side — Payload's
 * `count` only returns a number.
 */
export async function getCompletedStats(payload: BasePayload, user: User): Promise<CompletedStats> {
  const { start, end } = lastWeekBounds(new Date())
  // Single fetch of all completed slots (sorted). limit 1000 keeps it predictable.
  const result = await payload.find({
    collection: 'schedule-slots',
    where: { status: { equals: 'done' } },
    sort: 'startAt',
    limit: 1000,
    overrideAccess: false,
    user,
  })

  let thisWeek = 0
  let total = 0
  let minutesThisWeek = 0
  let totalMinutes = 0
  for (const doc of result.docs) {
    total += 1
    const dur = typeof doc.durationMin === 'number' ? doc.durationMin : 0
    totalMinutes += dur
    const t = doc.startAt ? new Date(doc.startAt).getTime() : NaN
    if (!Number.isNaN(t) && t >= new Date(start).getTime() && t <= new Date(end).getTime()) {
      thisWeek += 1
      minutesThisWeek += dur
    }
  }
  return { thisWeek, total, minutesThisWeek, totalMinutes }
}

export type StreakStats = { current: number; best: number }

/**
 * Training-day streak. A "training day" is a calendar day (in `tz`) with at
 * least one completed session. Walking backward through unique training days,
 * the streak continues while the gap between consecutive training days is
 * ≤ STREAK_MAX_GAP_DAYS; a larger gap resets it.
 *
 * `current` is the streak ending at the most recent training day — but if that
 * day is older than STREAK_MAX_GAP_DAYS from today, the current streak is 0
 * (the chain has already gone cold). `best` is the longest such chain in the
 * full history.
 */
export async function getStreak(
  payload: BasePayload,
  user: User,
  tz: string,
): Promise<StreakStats> {
  const result = await payload.find({
    collection: 'schedule-slots',
    where: { status: { equals: 'done' } },
    sort: '-startAt',
    limit: 1000,
    overrideAccess: false,
    user,
  })

  // Unique training-day timestamps (midnight in tz), most recent first.
  const dayKeys: number[] = []
  const seen = new Set<string>()
  for (const doc of result.docs) {
    if (!doc.startAt) continue
    const p = formatTzParts(new Date(doc.startAt), tz)
    const key = `${p.year}-${p.month}-${p.day}`
    if (seen.has(key)) continue
    seen.add(key)
    dayKeys.push(Date.UTC(p.year, p.month, p.day))
  }
  // `result.docs` is sorted by startAt desc, so dayKeys is already desc; sort
  // defensively in case of any equal-timestamp ordering quirks.
  dayKeys.sort((a, b) => b - a)

  if (dayKeys.length === 0) return { current: 0, best: 0 }

  const todayMidnight = (() => {
    const p = formatTzParts(new Date(), tz)
    return Date.UTC(p.year, p.month, p.day)
  })()
  const DAY_MS = 24 * 60 * 60_000

  // Best streak: walk all days, reset chain when gap > STREAK_MAX_GAP_DAYS.
  let best = 1
  let run = 1
  for (let i = 1; i < dayKeys.length; i += 1) {
    const gapDays = (dayKeys[i - 1] - dayKeys[i]) / DAY_MS
    if (gapDays <= STREAK_MAX_GAP_DAYS) {
      run += 1
      if (run > best) best = run
    } else {
      run = 1
    }
  }

  // Current streak: start from the most recent training day. If it is older
  // than STREAK_MAX_GAP_DAYS from today, the streak has gone cold → 0.
  const lastGapDays = (todayMidnight - dayKeys[0]) / DAY_MS
  let current = 1
  if (lastGapDays > STREAK_MAX_GAP_DAYS) {
    current = 0
  } else {
    for (let i = 1; i < dayKeys.length; i += 1) {
      const gapDays = (dayKeys[i - 1] - dayKeys[i]) / DAY_MS
      if (gapDays <= STREAK_MAX_GAP_DAYS) current += 1
      else break
    }
  }

  return { current, best }
}

export type SubscriptionInfo = { remaining: number; total: number } | null

/**
 * The viewer's active subscription nearest to expiry (most useful to surface).
 * Returns null when the viewer has no active subscription (e.g. an admin).
 */
export async function getActiveSubscription(
  payload: BasePayload,
  user: User,
): Promise<SubscriptionInfo> {
  const result = await payload.find({
    collection: 'subscriptions',
    where: { status: { equals: 'active' } },
    sort: 'validUntil',
    limit: 1,
    overrideAccess: false,
    user,
  })
  const sub = result.docs[0]
  if (!sub) return null
  return {
    remaining: typeof sub.remainingCredits === 'number' ? sub.remainingCredits : 0,
    total: typeof sub.totalCredits === 'number' ? sub.totalCredits : 0,
  }
}

/** Format a minute count as "Чч Мм" (hours and minutes). */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m}м`
  if (m === 0) return `${h}ч`
  return `${h}ч ${m}м`
}
