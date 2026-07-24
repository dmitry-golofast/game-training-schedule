import { notFound } from 'next/navigation'

import { SickLeavesClient } from '@/app/(frontend)/cabinet/sick-leaves/sick-leaves-client'
import { getCurrentUser, getPayloadClient } from '@/lib/payload'

export const metadata = { title: 'Больничные' }

export default async function SickLeavesPage() {
  const me = await getCurrentUser()
  if (!me || me.role !== 'admin') notFound()

  const payload = await getPayloadClient()

  const result = await payload.find({
    collection: 'sick-leaves',
    sort: '-createdAt',
    limit: 200,
    overrideAccess: true,
    depth: 1,
  })

  const items = result.docs.map((s) => {
    const student =
      typeof s.student === 'object' && s.student
        ? { id: s.student.id, name: s.student.name || s.student.email }
        : null
    const slot =
      typeof s.slot === 'object' && s.slot ? { id: s.slot.id, startAt: s.slot.startAt } : null
    return {
      id: s.id,
      reason: s.reason,
      status: s.status,
      reviewNote: s.reviewNote ?? null,
      reviewedAt: s.reviewedAt ?? null,
      createdAt: s.createdAt,
      student,
      slot,
    }
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Больничные</h1>
        <p className="text-sm text-muted-foreground">
          Заявок: {items.length} · Ожидают: {items.filter((i) => i.status === 'pending').length}
        </p>
      </div>
      <SickLeavesClient items={items} />
    </div>
  )
}
