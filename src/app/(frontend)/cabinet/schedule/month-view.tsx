'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'

import { SlotDialog } from '@/app/(frontend)/cabinet/schedule/slot-dialog'
import {
  STATUS_DOT,
  STATUS_LABEL,
  STATUS_STYLES,
  slotTargetLabel,
  type DialogData,
  type GridSlot,
  type GroupRef,
  type Student,
} from '@/app/(frontend)/cabinet/schedule/types'
import { cn } from '@/lib/utils'
import { WEEKDAY_LABELS, getMonthMatrix } from '@/lib/datetime'
import { formatTimeInTz, formatTzParts } from '@/lib/timezone'

type DaySlots = {
  count: number
  statuses: GridSlot['status'][]
}

/** YYYY-MM-DD key for a UTC instant, as seen in the given timezone. */
function dayKeyInTz(instant: Date, tz: string): string {
  const p = formatTzParts(instant, tz)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${p.year}-${pad(p.month + 1)}-${pad(p.day)}`
}

/** Group slots by calendar day (TZ-aware key) and count per status. */
function groupByDayInTz(slots: GridSlot[], tz: string): Map<string, DaySlots> {
  const map = new Map<string, DaySlots>()
  for (const slot of slots) {
    const key = dayKeyInTz(new Date(slot.startAt), tz)
    const existing = map.get(key)
    if (existing) {
      existing.count += 1
      existing.statuses.push(slot.status)
    } else {
      map.set(key, { count: 1, statuses: [slot.status] })
    }
  }
  return map
}

function componentsKey(y: number, m: number, d: number): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${y}-${pad(m + 1)}-${pad(d)}`
}

/** Build a "YYYY-MM-DD" date string from explicit calendar components. */
function componentsToDateKey(y: number, m: number, d: number): string {
  return componentsKey(y, m, d)
}

export function MonthView({
  cursor,
  timezone,
  slots,
  students,
  groups,
  canEdit,
}: {
  cursor: Date
  timezone: string
  slots: GridSlot[]
  students: Student[]
  groups: GroupRef[]
  canEdit: boolean
}) {
  const router = useRouter()
  const params = useSearchParams()
  // Use TZ components of the cursor so the grid month matches what the user
  // sees, regardless of the server's timezone.
  const cursorParts = formatTzParts(cursor, timezone)
  const weeks = useMemo(
    () => getMonthMatrix(cursorParts.year, cursorParts.month),
    [cursorParts.year, cursorParts.month],
  )
  const byDay = useMemo(() => groupByDayInTz(slots, timezone), [slots, timezone])

  // Locally selected day for the bottom summary (defaults to today if in this month).
  // Stored as a "YYYY-MM-DD" key so it never depends on a Date instant.
  const todayParts = formatTzParts(new Date(), timezone)
  const todayKeyStr = componentsKey(todayParts.year, todayParts.month, todayParts.day)
  const cursorKeyStr = componentsKey(cursorParts.year, cursorParts.month, cursorParts.day)
  const [selectedKey, setSelectedKey] = useState<string>(
    todayKeyStr === cursorKeyStr ? todayKeyStr : cursorKeyStr,
  )
  const selected = selectedKey // alias for clarity in render
  const [dialog, setDialog] = useState<{ open: boolean; data: DialogData }>({
    open: false,
    data: {
      startAt: new Date().toISOString(),
      durationMin: 60,
      kind: 'individual',
      student: '',
      group: '',
      status: 'planned',
    },
  })

  const goToDay = (y: number, m: number, d: number) => {
    const sp = new URLSearchParams(params.toString())
    sp.set('view', 'day')
    sp.set('date', componentsToDateKey(y, m, d))
    router.push(`/cabinet/schedule?${sp.toString()}`)
  }

  const selectedSlots = slots
    .filter((s) => dayKeyInTz(new Date(s.startAt), timezone) === selectedKey)
    .sort((a, b) => a.startAt.localeCompare(b.startAt))

  const openEdit = (slot: GridSlot) => {
    setDialog({
      open: true,
      data: {
        id: slot.id,
        startAt: slot.startAt,
        durationMin: slot.durationMin,
        kind: slot.kind,
        student: slot.student?.id ?? '',
        group: slot.group?.id ?? '',
        status: slot.status,
        notes: slot.notes,
        isChild: slot.isRecurringChild,
        recurrence: slot.recurrence
          ? {
              isRecurring: slot.isRecurring,
              frequency: (slot.recurrence.frequency as 'daily' | 'weekly') ?? 'weekly',
              interval: slot.recurrence.interval ?? 1,
              weekdays: slot.recurrence.weekdays ?? [],
              until: slot.recurrence.until ?? '',
              count: slot.recurrence.count != null ? String(slot.recurrence.count) : '',
            }
          : undefined,
      },
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-lg border border-border">
        {/* Weekday header */}
        <div className="grid grid-cols-7 bg-muted/40">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="py-2 text-center text-xs font-medium text-muted-foreground">
              {label}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div>
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7">
              {week.map((cell) => {
                const key = componentsKey(cell.year, cell.month, cell.day)
                const dayInfo = byDay.get(key)
                const selectedDay = key === selected
                const todayCell = key === todayKeyStr
                const uniqueStatuses = dayInfo ? Array.from(new Set(dayInfo.statuses)) : []
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedKey(key)}
                    onDoubleClick={() => goToDay(cell.year, cell.month, cell.day)}
                    className={cn(
                      'min-h-20 border-t border-l border-border p-1.5 text-left align-top transition-colors last:border-r',
                      wi === weeks.length - 1 && 'border-b',
                      cell.isOtherMonth && 'bg-muted/10 text-muted-foreground/50',
                      !cell.isOtherMonth && 'hover:bg-accent/40',
                      selectedDay && 'bg-accent/60 ring-1 ring-ring',
                    )}
                    title="Один клик — сводка, двойной — открыть день"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          'inline-flex size-6 items-center justify-center rounded-full text-sm',
                          todayCell && 'bg-primary font-semibold text-primary-foreground',
                        )}
                      >
                        {cell.day}
                      </span>
                      {dayInfo ? (
                        <span className="text-xs font-medium text-muted-foreground">
                          {dayInfo.count}
                        </span>
                      ) : null}
                    </div>
                    {dayInfo ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {uniqueStatuses.map((st) => (
                          <span key={st} className={cn('size-1.5 rounded-full', STATUS_DOT[st])} />
                        ))}
                      </div>
                    ) : null}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {(['planned', 'done', 'cancelled'] as const).map((st) => (
          <span key={st} className="flex items-center gap-1.5">
            <span className={cn('size-2 rounded-full', STATUS_DOT[st])} />
            {STATUS_LABEL[st]}
          </span>
        ))}
        <span className="ml-auto">Двойной клик по дню — открыть в режиме «День»</span>
      </div>

      {/* Summary of the selected day */}
      <div className="rounded-lg border border-border p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold capitalize">
            {(() => {
              // Parse "YYYY-MM-DD" into components, then format via a UTC
              // instant so the label never depends on the server timezone.
              const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(selected)
              if (!m) return selected
              const instant = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
              return new Intl.DateTimeFormat('ru-RU', {
                day: 'numeric',
                month: 'long',
                weekday: 'long',
                timeZone: 'UTC',
              }).format(instant)
            })()}
          </h3>
          <button
            type="button"
            onClick={() => {
              const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(selected)
              if (m) goToDay(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
            }}
            className="text-xs font-medium text-primary hover:underline"
          >
            Открыть день →
          </button>
        </div>
        {selectedSlots.length === 0 ? (
          <p className="text-sm text-muted-foreground">Тренировок нет.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {selectedSlots.map((slot) => {
              const start = new Date(slot.startAt)
              return (
                <li key={slot.id}>
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => canEdit && openEdit(slot)}
                    className={cn(
                      'flex w-full items-center gap-3 py-2 text-left text-sm transition-colors hover:bg-accent/40',
                      !canEdit && 'cursor-default',
                    )}
                  >
                    <span className="w-28 shrink-0 font-medium text-muted-foreground">
                      {formatTimeInTz(start, timezone)} –{' '}
                      {formatTimeInTz(
                        new Date(start.getTime() + slot.durationMin * 60_000),
                        timezone,
                      )}
                    </span>
                    <span className="flex-1 truncate">{slotTargetLabel(slot)}</span>
                    <span
                      className={cn(
                        'rounded px-1.5 py-0.5 text-xs font-medium',
                        STATUS_STYLES[slot.status],
                      )}
                    >
                      {STATUS_LABEL[slot.status]}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <SlotDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((prev) => ({ ...prev, open }))}
        data={dialog.data}
        timezone={timezone}
        students={students}
        groups={groups}
      />
    </div>
  )
}
