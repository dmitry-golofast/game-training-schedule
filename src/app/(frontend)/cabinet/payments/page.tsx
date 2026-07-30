import { notFound } from 'next/navigation'

import { PaymentsClient } from '@/app/(frontend)/cabinet/payments/payments-client'
import { getCurrentUser, getPayloadClient } from '@/lib/payload'
import { isAdminLike } from '@/lib/roles'

export const metadata = { title: 'Оплаты' }

export default async function PaymentsPage() {
  const me = await getCurrentUser()
  if (!me || !isAdminLike(me.role)) notFound()

  const payload = await getPayloadClient()

  const [paymentsResult, studentsResult] = await Promise.all([
    payload.find({
      collection: 'payments',
      sort: '-paidAt',
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

  const payments = paymentsResult.docs.map((p) => ({
    id: p.id,
    amount: p.amount,
    currency: p.currency,
    periodFrom: p.periodFrom,
    periodTo: p.periodTo,
    method: p.method ?? null,
    paidAt: p.paidAt,
    student:
      typeof p.student === 'object' && p.student
        ? { id: p.student.id, name: p.student.name || p.student.email }
        : null,
  }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Оплаты</h1>
        <p className="text-sm text-muted-foreground">Всего: {payments.length}</p>
      </div>
      <PaymentsClient students={students} payments={payments} />
    </div>
  )
}
