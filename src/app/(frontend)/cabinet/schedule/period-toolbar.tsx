'use client'

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ScheduleView } from '@/lib/datetime'
import { formatInTz, formatTzParts, toISODateInTz, timezoneLabel } from '@/lib/timezone'

const VIEW_OPTIONS: { value: ScheduleView; label: string }[] = [
  { value: 'day', label: 'День' },
  { value: 'month', label: 'Месяц' },
  { value: 'year', label: 'Год' },
]

const MONTH_LABELS = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
]

/**
 * Shift the cursor by one step of the current view, operating on the calendar
 * day as seen in the user's timezone. We extract TZ wall-clock components,
 * mutate them, then build a new instant via Date.UTC — this keeps the day
 * stable regardless of the server's timezone.
 */
function shiftCursor(cursor: Date, view: ScheduleView, tz: string, direction: 1 | -1): Date {
  const p = formatTzParts(cursor, tz)
  if (view === 'year') {
    return new Date(Date.UTC(p.year + direction, p.month, p.day, p.hours, p.minutes))
  }
  if (view === 'month') {
    return new Date(Date.UTC(p.year, p.month + direction, 1, p.hours, p.minutes))
  }
  return new Date(Date.UTC(p.year, p.month, p.day + direction, p.hours, p.minutes))
}

/** Period title rendered in the viewer's timezone. */
function periodTitle(cursor: Date, view: ScheduleView, tz: string): string {
  const p = formatTzParts(cursor, tz)
  if (view === 'year') return `${p.year} год`
  if (view === 'month') return `${MONTH_LABELS[p.month]} ${p.year}`
  return formatInTz(cursor, tz, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
  })
}

/**
 * Period selector + date navigation. All changes go through URL search params
 * so the server component re-renders with the new range. Date strings in the
 * URL are built from the wall-clock day in the viewer's timezone.
 */
export function PeriodToolbar({
  view,
  cursor,
  timezone,
}: {
  view: ScheduleView
  cursor: Date
  timezone: string
}) {
  const router = useRouter()
  const params = useSearchParams()

  const navigate = useCallback(
    (next: { view?: ScheduleView; date?: Date }) => {
      const sp = new URLSearchParams(params.toString())
      if (next.view) sp.set('view', next.view)
      if (next.date) sp.set('date', toISODateInTz(next.date, timezone))
      router.push(`/cabinet/schedule?${sp.toString()}`)
    },
    [router, params, timezone],
  )

  const onPrev = () => navigate({ date: shiftCursor(cursor, view, timezone, -1) })
  const onNext = () => navigate({ date: shiftCursor(cursor, view, timezone, 1) })
  const onToday = () => navigate({ date: new Date() })

  const title = useMemo(() => periodTitle(cursor, view, timezone), [cursor, view, timezone])

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" onClick={onPrev} aria-label="Предыдущий период">
          <ChevronLeftIcon />
        </Button>
        <Button variant="outline" size="sm" onClick={onToday}>
          Сегодня
        </Button>
        <Button variant="outline" size="icon" onClick={onNext} aria-label="Следующий период">
          <ChevronRightIcon />
        </Button>
      </div>

      <div className="flex flex-col items-center text-center sm:items-end sm:text-right">
        <h2 className="text-lg font-semibold tracking-tight capitalize">{title}</h2>
        <span className="text-xs text-muted-foreground">{timezoneLabel(timezone, cursor)}</span>
      </div>

      <div className="inline-flex rounded-lg bg-muted p-0.5 text-muted-foreground">
        {VIEW_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => navigate({ view: opt.value })}
            className={cn(
              'rounded-md px-3 py-1 text-sm font-medium transition-colors',
              view === opt.value
                ? 'bg-background text-foreground shadow-sm'
                : 'hover:text-foreground',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
