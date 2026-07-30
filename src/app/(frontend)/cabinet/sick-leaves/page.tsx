import { notFound } from 'next/navigation'

import { SickLeavesClient } from '@/app/(frontend)/cabinet/sick-leaves/sick-leaves-client'
import { SubmitSickLeaveDialog } from '@/app/(frontend)/cabinet/sick-leaves/submit-sick-leave-dialog'
import { getCurrentUser, getPayloadClient } from '@/lib/payload'
import { formatInTz } from '@/lib/timezone'
import { isAdminLike } from '@/lib/roles'

export const metadata = { title: 'Больничные' }

type Item = {
  id: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  reviewNote?: string | null
  reviewedAt?: string | null
  createdAt: string
  student: { id: string; name: string } | null
  slot: { id: string; startAt: string } | null
  documentUrl?: string | null
  documentTitle?: string | null
}

export default async function SickLeavesPage() {
  const me = await getCurrentUser()
  if (!me) notFound()

  const payload = await getPayloadClient()

  // Determine which sick-leaves to show based on role.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let whereClause: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let viewableChildren: any[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let upcomingSlots: any[] = []

  if (isAdminLike(me.role)) {
    whereClause = {} // all
  } else if (me.role === 'user') {
    whereClause = { student: { equals: me.id } }
    viewableChildren = [{ id: me.id, name: me.name || me.email }]
  } else if (me.role === 'parent') {
    const children = await payload.find({
      collection: 'users',
      where: { parent: { equals: me.id } },
      sort: 'name',
      limit: 50,
      overrideAccess: true,
    })
    const childIds = children.docs.map((c) => c.id)
    viewableChildren = children.docs.map((c) => ({
      id: c.id,
      name: [c.lastName, c.firstName].filter(Boolean).join(' ') || c.name || c.email,
    }))
    whereClause = childIds.length ? { student: { in: childIds } } : { student: { exists: false } }
  }

  const result = await payload.find({
    collection: 'sick-leaves',
    where: whereClause,
    sort: '-createdAt',
    limit: 200,
    overrideAccess: true,
    depth: 2,
  })

  const items: Item[] = result.docs.map((s) => {
    const student =
      typeof s.student === 'object' && s.student
        ? {
            id: s.student.id,
            name:
              [s.student.lastName, s.student.firstName].filter(Boolean).join(' ') ||
              s.student.name ||
              s.student.email,
          }
        : null
    const slot =
      typeof s.slot === 'object' && s.slot ? { id: s.slot.id, startAt: s.slot.startAt } : null
    const doc =
      typeof s.document === 'object' && s.document
        ? { url: s.document.url ?? null, title: s.document.title ?? null }
        : null
    return {
      id: s.id,
      reason: s.reason,
      status: s.status,
      reviewNote: s.reviewNote ?? null,
      reviewedAt: s.reviewedAt ?? null,
      createdAt: s.createdAt,
      student,
      slot,
      documentUrl: doc?.url ?? null,
      documentTitle: doc?.title ?? null,
    }
  })

  // For user/parent: load upcoming slots for the submit dialog.
  if (!isAdminLike(me.role) && viewableChildren.length > 0) {
    const childIds = viewableChildren.map((c) => c.id)
    const nowIso = new Date().toISOString()
    try {
      const slotsResult = await payload.find({
        collection: 'schedule-slots',
        where: {
          and: [
            { startAt: { greater_than_equal: nowIso } },
            { status: { equals: 'planned' } },
            { student: { in: childIds } },
          ],
        },
        sort: 'startAt',
        limit: 50,
        overrideAccess: true,
        depth: 0,
      })
      const tz = me.timezone || 'UTC'
      upcomingSlots = slotsResult.docs.map((s) => ({
        id: s.id,
        startAt: s.startAt,
        label: formatInTz(new Date(s.startAt), tz, {
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit',
          weekday: 'short',
        }),
      }))
    } catch {
      // Slots load failure shouldn't block the page.
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Больничные</h1>
          <p className="text-sm text-muted-foreground">
            Заявок: {items.length}
            {items.some((i) => i.status === 'pending')
              ? ` · Ожидают: ${items.filter((i) => i.status === 'pending').length}`
              : ''}
          </p>
        </div>
        {!isAdminLike(me.role) ? (
          <SubmitSickLeaveDialog children={viewableChildren} slots={upcomingSlots} />
        ) : null}
      </div>
      <SickLeavesClient items={items} canManage={isAdminLike(me.role)} />
    </div>
  )
}
