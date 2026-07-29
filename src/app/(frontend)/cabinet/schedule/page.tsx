import { notFound } from 'next/navigation'

import { ScheduleView } from '@/app/(frontend)/cabinet/schedule/schedule-view'
import { toGridSlot, type GroupRef, type Student } from '@/app/(frontend)/cabinet/schedule/types'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { type ScheduleView as ViewMode, parseISODateComponents } from '@/lib/datetime'
import { getCurrentUser, getPayloadClient } from '@/lib/payload'
import { getViewBoundsInTz, getUserTimezone, wallClockToUtc } from '@/lib/timezone'

export const metadata = { title: 'Расписание' }

const VALID_VIEWS = new Set<ViewMode>(['day', 'month', 'year'])

type SearchParams = Promise<{ view?: string; date?: string }>

export default async function SchedulePage({ searchParams }: { searchParams: SearchParams }) {
  const me = await getCurrentUser()
  if (!me) notFound()

  const sp = await searchParams

  // Resolve view (defaults to "day").
  const view: ViewMode = VALID_VIEWS.has(sp.view as ViewMode) ? (sp.view as ViewMode) : 'day'

  // The viewer's timezone drives both the query bounds and the rendering.
  const tz = getUserTimezone(me.timezone)

  // Resolve cursor date.
  //
  // The cursor must represent a calendar day as seen by the USER (in their
  // timezone), regardless of the server's timezone. We parse the URL's
  // "YYYY-MM-DD" into plain components and turn them into a UTC instant via
  // `wallClockToUtc(..., tz)` — the midnight of that day in the user's TZ.
  // Using `new Date(year, month, day)` would anchor the day to the SERVER's
  // timezone and then drift when interpreted in the user's TZ, which is what
  // caused slots to land on the previous day.
  const components = sp.date ? parseISODateComponents(sp.date) : null
  const effectiveCursor = components
    ? wallClockToUtc(components.year, components.month, components.day, 0, 0, tz)
    : new Date()

  const { start, end } = getViewBoundsInTz(effectiveCursor, view, tz)

  const payload = await getPayloadClient()

  // Slots for the active period — access control scopes them per role
  // automatically (admin: all; user: own; parent: children's).
  const slotsResult = await payload.find({
    collection: 'schedule-slots',
    where: {
      startAt: { greater_than_equal: start.toISOString(), less_than: end.toISOString() },
    },
    sort: 'startAt',
    limit: 1000,
    overrideAccess: false,
    user: me,
    depth: 1,
  })

  const slots = slotsResult.docs.map(toGridSlot)

  // Students list is only needed for the admin create/edit dialog.
  let students: Student[] = []
  let groups: GroupRef[] = []
  if (me.role === 'admin') {
    const studentsResult = await payload.find({
      collection: 'users',
      where: { role: { equals: 'user' } },
      sort: 'name',
      limit: 200,
      overrideAccess: true,
    })
    students = studentsResult.docs.map((s) => ({
      id: s.id,
      name: s.name || s.email,
      email: s.email,
    }))

    const groupsResult = await payload.find({
      collection: 'groups',
      sort: 'name',
      limit: 200,
      overrideAccess: true,
      depth: 1,
    })
    groups = groupsResult.docs.map((g) => ({
      id: g.id,
      name: g.name,
      members: (g.members ?? [])
        .map((m) =>
          typeof m === 'object' && m !== null
            ? {
                id: m.id,
                name: [m.lastName, m.firstName].filter(Boolean).join(' ') || m.name || m.email,
                email: m.email,
              }
            : null,
        )
        .filter((m): m is { id: string; name: string; email: string } => m !== null),
    }))
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Расписание</h1>
      </div>

      {me.role !== 'admin' ? (
        <Card>
          <CardHeader>
            <CardDescription>
              Режим просмотра{me.role === 'parent' ? ' (слоты ваших детей)' : ''}.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card>
        <CardContent className="px-2 py-4 sm:px-4">
          <ScheduleView
            view={view}
            cursor={effectiveCursor}
            timezone={tz}
            slots={slots}
            students={students}
            groups={groups}
            canEdit={me.role === 'admin'}
          />
        </CardContent>
      </Card>
    </div>
  )
}
