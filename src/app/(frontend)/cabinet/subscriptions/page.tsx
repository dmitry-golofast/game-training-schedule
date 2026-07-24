import { notFound } from 'next/navigation'

import { SubscriptionsClient } from '@/app/(frontend)/cabinet/subscriptions/subscriptions-client'
import { getCurrentUser, getPayloadClient } from '@/lib/payload'

export const metadata = { title: 'Абонементы' }

export default async function SubscriptionsPage() {
  const me = await getCurrentUser()
  if (!me || me.role !== 'admin') notFound()

  const payload = await getPayloadClient()

  const [subsResult, studentsResult] = await Promise.all([
    payload.find({
      collection: 'subscriptions',
      sort: '-validUntil',
      limit: 200,
      overrideAccess: true,
      depth: 1,
    }),
    payload.find({
      collection: 'users',
      where: { role: { equals: 'user' } },
      sort: 'name',
      limit: 500,
      overrideAccess: true,
    }),
  ])

  const students = studentsResult.docs.map((s) => ({
    id: s.id,
    name: s.name || s.email,
    email: s.email,
  }))

  const subscriptions = subsResult.docs.map((sub) => ({
    id: sub.id,
    kind: sub.kind,
    totalCredits: sub.totalCredits,
    remainingCredits: sub.remainingCredits,
    validFrom: sub.validFrom,
    validUntil: sub.validUntil,
    status: sub.status,
    notes: sub.notes ?? null,
    student:
      typeof sub.student === 'object' && sub.student
        ? { id: sub.student.id, name: sub.student.name || sub.student.email }
        : null,
  }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Абонементы</h1>
        <p className="text-sm text-muted-foreground">Всего: {subscriptions.length}</p>
      </div>
      <SubscriptionsClient students={students} subscriptions={subscriptions} />
    </div>
  )
}
