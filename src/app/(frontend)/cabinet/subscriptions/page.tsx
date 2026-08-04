import { SubscriptionsClient } from '@/app/(frontend)/cabinet/subscriptions/subscriptions-client'
import { getCurrentUser, getPayloadClient } from '@/lib/payload'
import { isAdminLike } from '@/lib/roles'

export const metadata = { title: 'Абонементы' }

type Student = { id: string; name: string; email: string }

export default async function SubscriptionsPage() {
  const me = await getCurrentUser()
  if (!me) return null

  const payload = await getPayloadClient()
  const admin = isAdminLike(me.role)

  // Determine which subscriptions to load and whether the student selector
  // is needed (admins get the full list + selector; students/parents see
  // only their own / their children's).
  let students: Student[] = []
  let subsWhere: Record<string, unknown>

  if (admin) {
    // Admin/trainer: all subscriptions + all students for the selector.
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

    students = studentsResult.docs.map((s) => ({
      id: s.id,
      name: s.name || s.email,
      email: s.email,
    }))

    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Абонементы</h1>
          <p className="text-sm text-muted-foreground">Всего: {subsResult.docs.length}</p>
        </div>
        <SubscriptionsClient
          students={students}
          subscriptions={subsResult.docs.map((sub) => ({
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
          }))}
          isAdmin
        />
      </div>
    )
  }

  // Student / parent: scoped read-only list.
  if (me.role === 'user') {
    subsWhere = { student: { equals: me.id } }
  } else {
    // parent — find children first, then filter by their ids.
    const children = await payload.find({
      collection: 'users',
      where: { parent: { equals: me.id } },
      sort: 'name',
      limit: 50,
      overrideAccess: true,
    })
    const childIds = children.docs.map((c) => c.id)
    subsWhere = childIds.length ? { student: { in: childIds } } : { student: { exists: false } }
  }

  const subsResult = await payload.find({
    collection: 'subscriptions',
    where: subsWhere,
    sort: '-validUntil',
    limit: 100,
    overrideAccess: true,
    depth: 1,
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Абонементы</h1>
        <p className="text-sm text-muted-foreground">Ваши активные абонементы.</p>
      </div>
      <SubscriptionsClient
        students={[]}
        subscriptions={subsResult.docs.map((sub) => ({
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
        }))}
        isAdmin={false}
      />
    </div>
  )
}
