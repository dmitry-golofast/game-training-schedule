'use client'

import { DayView } from '@/app/(frontend)/cabinet/schedule/schedule-grid'
import { MonthView } from '@/app/(frontend)/cabinet/schedule/month-view'
import { PeriodToolbar } from '@/app/(frontend)/cabinet/schedule/period-toolbar'
import { YearView } from '@/app/(frontend)/cabinet/schedule/year-view'
import type { GridSlot, GroupRef, Student } from '@/app/(frontend)/cabinet/schedule/types'
import type { ScheduleView } from '@/lib/datetime'

/**
 * Top-level client orchestrator for the schedule page.
 * Picks the right view component based on the current `view`, sharing the
 * toolbar (mode switcher + date navigation) across all three.
 */
export function ScheduleView({
  view,
  cursor,
  timezone,
  slots,
  students,
  groups,
  canEdit,
}: {
  view: ScheduleView
  cursor: Date
  timezone: string
  slots: GridSlot[]
  students: Student[]
  groups: GroupRef[]
  canEdit: boolean
}) {
  return (
    <div className="flex flex-col gap-6">
      <PeriodToolbar view={view} cursor={cursor} timezone={timezone} />

      {view === 'day' ? (
        <DayView
          day={cursor}
          timezone={timezone}
          slots={slots}
          students={students}
          groups={groups}
          canEdit={canEdit}
        />
      ) : null}

      {view === 'month' ? (
        <MonthView
          cursor={cursor}
          timezone={timezone}
          slots={slots}
          students={students}
          groups={groups}
          canEdit={canEdit}
        />
      ) : null}

      {view === 'year' ? <YearView cursor={cursor} timezone={timezone} slots={slots} /> : null}
    </div>
  )
}
