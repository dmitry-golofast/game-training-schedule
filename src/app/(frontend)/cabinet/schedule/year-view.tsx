'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo } from 'react'

import {
  type DayStat,
  type GridSlot,
  INTENSITY_BG,
  intensityForCount,
} from '@/app/(frontend)/cabinet/schedule/types'
import { cn } from '@/lib/utils'
import { WEEKDAY_LABELS, getMonthMatrix } from '@/lib/datetime'
import { formatTzParts } from '@/lib/timezone'

/** Per-day statistics for a month, keyed by day-of-month (1..31). */
function dayStatsForMonthInTz(
  slots: GridSlot[],
  year: number,
  month: number,
  tz: string,
): Map<number, DayStat> {
  const map = new Map<number, DayStat>()
  for (const slot of slots) {
    const p = formatTzParts(new Date(slot.startAt), tz)
    if (p.year !== year || p.month !== month) continue
    const existing = map.get(p.day) ?? {
      count: 0,
      hasCancelled: false,
      hasPlanned: false,
      hasDone: false,
    }
    if (slot.status === 'cancelled') existing.hasCancelled = true
    else if (slot.status === 'planned') existing.hasPlanned = true
    else if (slot.status === 'done') existing.hasDone = true
    if (slot.status !== 'cancelled') existing.count += 1
    map.set(p.day, existing)
  }
  return map
}

function isTodayCell(cell: { year: number; month: number; day: number }, tz: string): boolean {
  const b = formatTzParts(new Date(), tz)
  return cell.year === b.year && cell.month === b.month && cell.day === b.day
}

function monthName(month: number): string {
  return new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(new Date(2000, month, 1))
}

/** Pluralize "тренировка" for a count, e.g. "2 тренировки", "5 тренировок". */
function pluralTrainings(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return `${n} тренировка`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} тренировки`
  return `${n} тренировок`
}

export function YearView({
  cursor,
  timezone,
  slots,
}: {
  cursor: Date
  timezone: string
  slots: GridSlot[]
}) {
  const router = useRouter()
  const params = useSearchParams()
  const cursorParts = formatTzParts(cursor, timezone)
  const year = cursorParts.year
  const currentMonthTz = formatTzParts(new Date(), timezone).month
  const currentYearTz = formatTzParts(new Date(), timezone).year
  const isCurrentYear = year === currentYearTz

  const months = useMemo(() => Array.from({ length: 12 }, (_, m) => m), [])

  const goTo = (view: 'day' | 'month', y: number, m: number, d: number) => {
    const sp = new URLSearchParams(params.toString())
    sp.set('view', view)
    const pad = (n: number) => String(n).padStart(2, '0')
    sp.set('date', `${y}-${pad(m + 1)}-${pad(d)}`)
    router.push(`/cabinet/schedule?${sp.toString()}`)
  }

  // Year-wide totals for the summary header.
  const yearTotal = slots.filter((s) => s.status !== 'cancelled').length
  const yearPlanned = slots.filter((s) => s.status === 'planned').length
  const yearDone = slots.filter((s) => s.status === 'done').length

  return (
    <div className="flex flex-col gap-5">
      {/* Year summary chips */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full bg-muted px-3 py-1 font-medium text-muted-foreground">
          Всего: {yearTotal}
        </span>
        <span className="rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">
          Запланировано: {yearPlanned}
        </span>
        <span className="rounded-full bg-muted-foreground/10 px-3 py-1 font-medium text-muted-foreground">
          Завершено: {yearDone}
        </span>
        <span className="ml-auto hidden text-xs text-muted-foreground sm:inline">
          Клик по месяцу — режим «Месяц», по дню — режим «День». Насыщенность = кол-во тренировок.
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {months.map((month) => {
          const weeks = getMonthMatrix(year, month)
          const stats = dayStatsForMonthInTz(slots, year, month, timezone)
          const monthTotal = Array.from(stats.values()).reduce((sum, s) => sum + s.count, 0)
          const isCurrent = isCurrentYear && month === currentMonthTz

          return (
            <div
              key={month}
              className={cn(
                'flex flex-col gap-2 rounded-xl border border-border bg-card p-3 shadow-sm transition-colors hover:border-primary/40',
                isCurrent && 'border-primary/60 ring-2 ring-primary/20',
              )}
            >
              {/* Month header: name (→ month view) + slot count */}
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => goTo('month', year, month, 1)}
                  className={cn(
                    'text-sm font-semibold capitalize transition-colors hover:text-primary',
                    isCurrent && 'text-primary',
                  )}
                >
                  {monthName(month)}
                </button>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    monthTotal > 0
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {monthTotal}
                </span>
              </div>

              {/* Weekday labels row */}
              <div className="grid grid-cols-7 gap-0.5">
                {WEEKDAY_LABELS.map((label) => (
                  <div
                    key={label}
                    className="text-center text-[9px] font-medium text-muted-foreground/70 uppercase"
                  >
                    {label}
                  </div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-0.5">
                {weeks.flat().map((cell, idx) => {
                  const todayCell = isTodayCell(cell, timezone)
                  const stat = !cell.isOtherMonth ? stats.get(cell.day) : undefined
                  const intensity = stat ? intensityForCount(stat.count) : 0
                  const bg = INTENSITY_BG[intensity]
                  const pad = (n: number) => String(n).padStart(2, '0')
                  const isoLabel = `${cell.year}-${pad(cell.month + 1)}-${pad(cell.day)}`

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => goTo('day', cell.year, cell.month, cell.day)}
                      title={stat && stat.count > 0 ? pluralTrainings(stat.count) : isoLabel}
                      className={cn(
                        'relative flex aspect-square items-center justify-center rounded-md text-[11px] tabular-nums transition-colors',
                        cell.isOtherMonth
                          ? 'text-muted-foreground/30 hover:bg-muted/40'
                          : 'text-foreground/80 hover:ring-1 hover:ring-primary/30',
                        // Intensity "heat" backgrounds for in-month days.
                        !cell.isOtherMonth && bg,
                        // Today marker — a ring overrides bg for clarity.
                        todayCell &&
                          !cell.isOtherMonth &&
                          'ring-1 ring-primary ring-offset-1 ring-offset-card',
                      )}
                    >
                      {cell.isOtherMonth ? '' : cell.day}
                      {/* Status indicator dots (max 3) for extra detail. */}
                      {!cell.isOtherMonth && stat && stat.count > 0 ? (
                        <span className="absolute right-0 bottom-0 flex gap-px pr-0.5 pb-0.5">
                          {stat.hasPlanned ? (
                            <span className="size-1 rounded-full bg-primary" />
                          ) : null}
                          {stat.hasDone ? (
                            <span className="size-1 rounded-full bg-muted-foreground" />
                          ) : null}
                          {stat.hasCancelled ? (
                            <span className="size-1 rounded-full bg-destructive" />
                          ) : null}
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-primary/15" />1 тренировка
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-primary/30" />2
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-primary/50" />3
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-primary/80" />
          4+
        </span>
        <span className="text-muted-foreground/40">•</span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-primary" />
          запланировано
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-muted-foreground" />
          завершено
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-destructive" />
          отменено
        </span>
      </div>
    </div>
  )
}
