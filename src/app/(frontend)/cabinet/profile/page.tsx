import { ProfileTabs } from '@/app/(frontend)/cabinet/profile/profile-tabs'
import { getCurrentUser, getPayloadClient } from '@/lib/payload'
import { resolveAvatarUrl } from '@/lib/profile'
import { isAdminLike } from '@/lib/roles'

export const metadata = { title: 'Профиль' }

type StudentRef = { id: string; name: string }

export default async function ProfilePage() {
  const me = await getCurrentUser()
  if (!me) return null

  const payload = await getPayloadClient()

  // Reload the user with the avatar media populated (depth:1) so we can show
  // the avatar URL. getCurrentUser() returns the JWT payload, where `avatar`
  // is a bare id without a URL.
  const detailed = await payload.findByID({
    collection: 'users',
    id: me.id,
    overrideAccess: false,
    user: me,
    depth: 1,
  })

  // Resolve which students this viewer can see documents/subscriptions/payments for.
  //  - user  → self (role user)
  //  - parent → children
  //  - admin  → none here (admin manages via /cabinet/students etc.), but we
  //             still show admin's own profile sections as empty.
  let viewableStudents: StudentRef[] = []
  let studentIds: string[] = []
  let canSelectStudent = false
  let childrenData: { id: string; name: string; email: string; birthDate?: string | null }[] = []

  if (me.role === 'user') {
    viewableStudents = [{ id: me.id, name: me.name || me.email }]
    studentIds = [me.id]
  } else if (me.role === 'parent') {
    const children = await payload.find({
      collection: 'users',
      where: { parent: { equals: me.id } },
      sort: 'name',
      limit: 50,
      overrideAccess: true,
    })
    viewableStudents = children.docs.map((c) => ({ id: c.id, name: c.name || c.email }))
    studentIds = children.docs.map((c) => c.id)
    canSelectStudent = viewableStudents.length > 1
    childrenData = children.docs.map((c) => ({
      id: c.id,
      name: [c.lastName, c.firstName].filter(Boolean).join(' ') || c.name || c.email,
      email: c.email,
      birthDate: c.birthDate ?? null,
    }))
  } else if (isAdminLike(me.role)) {
    // Admin can upload for any student.
    const all = await payload.find({
      collection: 'users',
      where: { role: { equals: 'user' } },
      sort: 'name',
      limit: 500,
      overrideAccess: true,
    })
    viewableStudents = all.docs.map((s) => ({ id: s.id, name: s.name || s.email }))
    studentIds = all.docs.map((s) => s.id)
    canSelectStudent = true
  }

  // Load subscriptions, payments, documents for the viewable students.
  const whereClause = studentIds.length
    ? { student: { in: studentIds } }
    : { student: { exists: false } }

  const [subsResult, paymentsResult, docsResult] = await Promise.all([
    payload.find({
      collection: 'subscriptions',
      where: whereClause,
      sort: '-validUntil',
      limit: 100,
      overrideAccess: true,
      depth: 1,
    }),
    payload.find({
      collection: 'payments',
      where: whereClause,
      sort: '-paidAt',
      limit: 100,
      overrideAccess: true,
      depth: 1,
    }),
    payload.find({
      collection: 'documents',
      where: whereClause,
      sort: '-createdAt',
      limit: 100,
      overrideAccess: true,
      depth: 1,
    }),
  ])

  const subscriptions = subsResult.docs.map((s) => ({
    id: s.id,
    kind: s.kind,
    totalCredits: s.totalCredits,
    remainingCredits: s.remainingCredits,
    validFrom: s.validFrom,
    validUntil: s.validUntil,
    status: s.status,
    student:
      typeof s.student === 'object' && s.student
        ? { id: s.student.id, name: s.student.name || s.student.email }
        : null,
  }))

  const payments = paymentsResult.docs.map((p) => ({
    id: p.id,
    amount: p.amount,
    currency: p.currency ?? null,
    periodFrom: p.periodFrom ?? '',
    periodTo: p.periodTo ?? '',
    method: p.method ?? null,
    paidAt: p.paidAt ?? '',
    student:
      typeof p.student === 'object' && p.student
        ? { id: p.student.id, name: p.student.name || p.student.email }
        : null,
  }))

  const documents = docsResult.docs.map((d) => ({
    id: d.id,
    docType: d.docType,
    title: d.title,
    filename: d.filename ?? null,
    url: d.url ?? null,
    createdAt: d.createdAt,
    student:
      typeof d.student === 'object' && d.student
        ? { id: d.student.id, name: d.student.name || d.student.email }
        : null,
  }))

  const roleLabel =
    me.role === 'admin'
      ? 'Администратор'
      : me.role === 'trainer'
        ? 'Тренер'
        : me.role === 'parent'
          ? 'Родитель'
          : 'Ученик'

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Профиль</h1>
        <p className="text-sm text-muted-foreground">
          Учётная информация, абонемент, документы и оплаты.
        </p>
      </div>

      <ProfileTabs
        account={{
          id: me.id,
          name: detailed.name ?? '',
          email: me.email,
          role: roleLabel,
          rawRole: me.role,
          firstName: detailed.firstName ?? null,
          lastName: detailed.lastName ?? null,
          middleName: detailed.middleName ?? null,
          birthDate: detailed.birthDate ?? null,
          phone: detailed.phone ?? null,
          parentPhone: detailed.parentPhone ?? null,
          avatarUrl: resolveAvatarUrl(detailed.avatar),
        }}
        children={childrenData}
        subscriptions={subscriptions}
        payments={payments}
        documents={documents}
        viewableStudents={viewableStudents}
        canSelectStudent={canSelectStudent}
        isParent={me.role === 'parent'}
        reminderLeadHours={typeof me.reminderLeadHours === 'number' ? me.reminderLeadHours : 24}
      />
    </div>
  )
}
