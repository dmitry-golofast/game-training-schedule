'use client'

import { AlertCircleIcon, CalendarPlusIcon, RepeatIcon } from 'lucide-react'
import { AttendanceDialog } from '@/app/(frontend)/cabinet/schedule/attendance-dialog'
import { useMemo, useState } from 'react'

import { SlotDialog } from '@/app/(frontend)/cabinet/schedule/slot-dialog'
import {
  STATUS_LABEL,
  STATUS_STYLES,
  slotTargetLabel,
  type DialogData,
  type GridSlot,
  type GroupRef,
  type Student,
} from '@/app/(frontend)/cabinet/schedule/types'
import { Button } from '@/components/ui/button'
import {
  ALLOWED_DURATIONS,
  DAY_END_HOUR,
  DAY_START_HOUR,
  ROW_HEIGHT_PX,
  SLOT_STEP_MIN,
} from '@/lib/datetime'
import { formatTzParts, formatTimeInTz, wallClockToUtc } from '@/lib/timezone'
import { cn } from '@/lib/utils'

type DayViewProps = {
  day: Date
  timezone: string
  slots: GridSlot[]
  students: Student[]
  groups: GroupRef[]
  canEdit: boolean
}

/** Build 30-min grid slots for the day in the viewer's timezone. */
function buildTimeSlotsInTz(day: Date, tz: string) {
  const parts = formatTzParts(day, tz)
  const slots: { startAt: Date; endAt: Date; label: string; rowIndex: number }[] = []
  const totalMin = (DAY_END_HOUR - DAY_START_HOUR) * 60
  const count = totalMin / SLOT_STEP_MIN
  for (let i = 0; i < count; i += 1) {
    const hours = DAY_START_HOUR + Math.floor((i * SLOT_STEP_MIN) / 60)
    const minutes = (i * SLOT_STEP_MIN) % 60
    const startAt = wallClockToUtc(parts.year, parts.month, parts.day, hours, minutes, tz)
    const endAt = new Date(startAt.getTime() + SLOT_STEP_MIN * 60_000)
    slots.push({ startAt, endAt, label: formatTimeInTz(startAt, tz), rowIndex: i })
  }
  return slots
}

/** Row index (fractional allowed) for a UTC instant within the day's grid. */
function rowIndexInTz(instant: Date, tz: string): number | null {
  const p = formatTzParts(instant, tz)
  const minutesFromStart = (p.hours - DAY_START_HOUR) * 60 + p.minutes
  if (minutesFromStart < 0) return null
  const endBoundary = (DAY_END_HOUR - DAY_START_HOUR) * 60
  if (minutesFromStart >= endBoundary) return null
  return minutesFromStart / SLOT_STEP_MIN
}

export function DayView({ day, timezone, slots, students, groups, canEdit }: DayViewProps) {
  const timeSlots = useMemo(() => buildTimeSlotsInTz(day, timezone), [day, timezone])

  const [dialog, setDialog] = useState<{ open: boolean; data: DialogData }>({
    open: false,
    data: emptyDialogData(timeSlots[0]?.startAt ?? new Date()),
  })

  const openCreate = (startAt: Date) => {
    setDialog({
      open: true,
      data: {
        startAt: startAt.toISOString(),
        durationMin: 60,
        kind: 'individual',
        student: students[0]?.id ?? '',
        group: groups[0]?.id ?? '',
        status: 'planned',
      },
    })
  }

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

  const gridHeight = timeSlots.length * ROW_HEIGHT_PX

  return (
    <div className="flex flex-col gap-3">
      {canEdit ? (
        <div className="flex justify-end">
          <Button onClick={() => openCreate(firstUpcomingSlot(timeSlots))}>
            <CalendarPlusIcon />
            Добавить тренировку
          </Button>
        </div>
      ) : null}

      <div className="relative overflow-hidden rounded-lg border border-border">
        <div className="flex">
          {/* Time-axis column */}
          <div className="w-16 shrink-0 bg-muted/30">
            {timeSlots.map((slot) => (
              <div
                key={slot.label}
                className="flex items-start justify-end px-2 pt-1 text-xs text-muted-foreground"
                style={{ height: ROW_HEIGHT_PX }}
              >
                {slot.label}
              </div>
            ))}
          </div>

          {/* Grid body: clickable empty rows + absolutely positioned slot blocks */}
          <div className="relative flex-1" style={{ height: gridHeight }}>
            {timeSlots.map((slot) => (
              <button
                key={slot.label}
                type="button"
                disabled={!canEdit}
                onClick={() => canEdit && openCreate(slot.startAt)}
                className={cn(
                  'absolute inset-x-0 border-t border-border',
                  canEdit ? 'cursor-pointer hover:bg-accent/50' : 'cursor-default',
                )}
                style={{ top: slot.rowIndex * ROW_HEIGHT_PX, height: ROW_HEIGHT_PX }}
                aria-label={`Слот ${slot.label}`}
              />
            ))}

            {slots.map((slot) => {
              const start = new Date(slot.startAt)
              const rowIndex = rowIndexInTz(start, timezone)
              if (rowIndex === null) return null
              const rows = slot.durationMin / SLOT_STEP_MIN
              const top = rowIndex * ROW_HEIGHT_PX
              const height = rows * ROW_HEIGHT_PX
              // Check if this past slot needs attendance.
              const isPastDue = start.getTime() < Date.now()
              const needsAttendance =
                canEdit && slot.status === 'planned' && isPastDue && !slot.hasAttendance
              // Build participant list for the attendance dialog.
              const participants =
                slot.kind === 'group' && slot.group
                  ? (groups.find((g) => g.id === slot.group?.id)?.members ?? [])
                  : slot.student
                    ? [slot.student]
                    : []
              return (
                <div
                  key={slot.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => (canEdit ? openEdit(slot) : undefined)}
                  onKeyDown={(e) => {
                    if (canEdit && (e.key === 'Enter' || e.key === ' ')) openEdit(slot)
                  }}
                  className={cn(
                    'absolute inset-x-2 flex flex-col items-start gap-0.5 overflow-hidden rounded-md border border-l-4 border-border px-3 py-1.5 text-left text-xs shadow-sm transition-colors',
                    STATUS_STYLES[slot.status],
                    canEdit && 'cursor-pointer',
                  )}
                  style={{ top: top + 1, height: height - 2 }}
                >
                  {/* Attendance journal button for planned slots (admin only) */}
                  {canEdit && slot.status === 'planned' && participants.length > 0 ? (
                    <AttendanceDialog
                      slotId={slot.id}
                      slotLabel={`${formatTimeInTz(start, timezone)} · ${slotTargetLabel(slot)}`}
                      participants={participants}
                    />
                  ) : null}
                  <span className="flex items-center gap-1 font-semibold">
                    {formatTimeInTz(start, timezone)} –{' '}
                    {formatTimeInTz(
                      new Date(start.getTime() + slot.durationMin * 60_000),
                      timezone,
                    )}
                    {needsAttendance ? (
                      <AlertCircleIcon
                        className="size-3 shrink-0 animate-pulse text-amber-500"
                        aria-label="Требуется заполнить журнал"
                      />
                    ) : null}
                    {slot.isRecurring || slot.isRecurringChild ? (
                      <RepeatIcon
                        className="size-3 opacity-70"
                        aria-label="Повторяющаяся тренировка"
                      />
                    ) : null}
                  </span>
                  <span className="truncate">{slotTargetLabel(slot)}</span>
                  {needsAttendance ? (
                    <span className="animate-pulse text-[10px] font-medium text-amber-500">
                      ⚠ Требуется журнал
                    </span>
                  ) : null}
                  {height >= ROW_HEIGHT_PX * 1.5 && !needsAttendance ? (
                    <span className="opacity-70">{STATUS_LABEL[slot.status]}</span>
                  ) : null}
                </div>
              )
            })}

            {slots.length === 0 ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                {canEdit ? 'Кликните по времени, чтобы добавить тренировку' : 'Нет тренировок'}
              </div>
            ) : null}
          </div>
        </div>
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

function emptyDialogData(startAt: Date): DialogData {
  return {
    startAt: startAt.toISOString(),
    durationMin: ALLOWED_DURATIONS[1] ?? 60,
    kind: 'individual',
    student: '',
    group: '',
    status: 'planned',
  }
}

/** The first slot at or after "now" — nice default for the "add" button. */
function firstUpcomingSlot(timeSlots: ReturnType<typeof buildTimeSlotsInTz>): Date {
  const now = Date.now()
  return (
    timeSlots.find((s) => s.startAt.getTime() >= now)?.startAt ??
    timeSlots[0]?.startAt ??
    new Date()
  )
}
