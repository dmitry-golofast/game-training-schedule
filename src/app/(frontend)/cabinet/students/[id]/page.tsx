import { notFound } from 'next/navigation'
import Link from 'next/link'

import { EditStudentDialog } from '@/app/(frontend)/cabinet/students/[id]/edit-student-dialog'
import { StudentTabs } from '@/app/(frontend)/cabinet/students/[id]/student-tabs'
import { Card, CardContent } from '@/components/ui/card'
import { getCurrentUser, getPayloadClient } from '@/lib/payload'
import { isAdminLike } from '@/lib/roles'

export const metadata = { title: 'Профиль ученика' }

function computeAge(birthDate?: string | null): number | null {
  if (!birthDate) return null
  const d = new Date(birthDate)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1
  return age >= 0 ? age : null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = any

export default async function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser()
  if (!me || !isAdminLike(me.role)) notFound()

  const { id } = await params

  const payload = await getPayloadClient()

  let student: AnyDoc
  try {
    student = await payload.findByID({
      collection: 'users',
      id,
      overrideAccess: true,
      depth: 1,
    })
  } catch {
    notFound()
  }

  if (!student || student.role !== 'user') notFound()

  const age = computeAge(student.birthDate)
  const parentDoc = typeof student.parent === 'object' && student.parent ? student.parent : null
  const fullName = [student.lastName, student.firstName, student.middleName]
    .filter(Boolean)
    .join(' ')

  // Load all data in parallel.
  let subscriptions: AnyDoc[] = []
  let payments: AnyDoc[] = []
  let documents: AnyDoc[] = []
  let sickLeaves: AnyDoc[] = []
  let scheduleSlots: AnyDoc[] = []

  try {
    const [subsResult, paymentsResult, docsResult, sickResult, slotsResult] = await Promise.all([
      payload.find({
        collection: 'subscriptions',
        where: { student: { equals: id } },
        sort: '-validUntil',
        limit: 50,
        overrideAccess: true,
        depth: 1,
      }),
      payload.find({
        collection: 'payments',
        where: { student: { equals: id } },
        sort: '-paidAt',
        limit: 50,
        overrideAccess: true,
        depth: 1,
      }),
      payload.find({
        collection: 'documents',
        where: { student: { equals: id } },
        sort: '-createdAt',
        limit: 50,
        overrideAccess: true,
        depth: 1,
      }),
      payload.find({
        collection: 'sick-leaves',
        where: { student: { equals: id } },
        sort: '-createdAt',
        limit: 50,
        overrideAccess: true,
        depth: 2,
      }),
      payload.find({
        collection: 'schedule-slots',
        where: { student: { equals: id } },
        sort: '-startAt',
        limit: 30,
        overrideAccess: true,
        depth: 1,
      }),
    ])
    subscriptions = subsResult.docs
    payments = paymentsResult.docs
    documents = docsResult.docs
    sickLeaves = sickResult.docs
    scheduleSlots = slotsResult.docs
  } catch {
    // DB errors — render with empty sections.
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Link href="/cabinet/students" className="text-xs text-muted-foreground hover:underline">
            ← Назад к списку
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{fullName || 'Ученик'}</h1>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            {age !== null ? <span>{age} лет</span> : null}
            <span>{student.email}</span>
            {student.parentPhone ? <span>{student.parentPhone}</span> : null}
          </div>
        </div>
        <EditStudentDialog
          student={{
            id: student.id,
            firstName: student.firstName ?? null,
            lastName: student.lastName ?? null,
            middleName: student.middleName ?? null,
            birthDate: student.birthDate ?? null,
            parentPhone: student.parentPhone ?? null,
          }}
        />
      </div>

      {/* Tabs */}
      <StudentTabs
        student={student}
        parentDoc={parentDoc}
        subscriptions={subscriptions}
        payments={payments}
        documents={documents}
        sickLeaves={sickLeaves}
        scheduleSlots={scheduleSlots}
      />
    </div>
  )
}
