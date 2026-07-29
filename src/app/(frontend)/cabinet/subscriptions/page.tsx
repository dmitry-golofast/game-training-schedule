import { notFound } from 'next/navigation'

import { SubscriptionsClient } from '@/app/(frontend)/cabinet/subscriptions/subscriptions-client'
import { getCurrentUser, getPayloadClient } from '@/lib/payload'

export const metadata = { title: 'Абонементы' }

export default async function SubscriptionsPage() {
  const me = await getCurrentUser()
  if (!me || me.role !== 'admin') notFound()

  const payload = await getPayloadClient()

  const [subsResult, studentsResult, paymentsResult] = await Promise.all([
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
    payload.find({
      collection: 'payments',
      limit: 500,
      overrideAccess: true,
      depth: 0,
    }),
  ])

  // Build a lookup: subscriptionId → payment info.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paymentBySub = new Map<string, any>()
  for (const p of paymentsResult.docs) {
    if (p.subscription) {
      const subId = typeof p.subscription === 'object' ? p.subscription.id : String(p.subscription)
      // Keep the first (most recent by sort) payment per subscription.
      if (!paymentBySub.has(subId)) {
        paymentBySub.set(subId, {
          amount: p.amount,
          currency: p.currency ?? 'RUB',
          method: p.method ?? null,
          paidAt: p.paidAt ?? null,
        })
      }
    }
  }

  const students = studentsResult.docs.map((s) => ({
    id: s.id,
    name: s.name || s.email,
    email: s.email,
  }))

  const subscriptions = subsResult.docs.map((sub) => {
    const pay = paymentBySub.get(sub.id)
    return {
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
      paymentAmount: pay?.amount ?? null,
      paymentCurrency: pay?.currency ?? null,
      paymentMethod: pay?.method ?? null,
      paidAt: pay?.paidAt ?? null,
    }
  })

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
