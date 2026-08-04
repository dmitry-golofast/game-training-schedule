import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { PreferencesForm } from '@/app/(frontend)/cabinet/profile/preferences-form'
import { DocumentsSection } from '@/app/(frontend)/cabinet/profile/documents-section'
import { PaymentHistory } from '@/app/(frontend)/cabinet/profile/payment-history'
import { ChildrenSection } from '@/app/(frontend)/cabinet/profile/children-section'
import { getCurrentUser, getPayloadClient } from '@/lib/payload'
import { isAdminLike } from '@/lib/roles'

export const metadata = { title: 'Профиль' }

type StudentRef = { id: string; name: string }

export default async function ProfilePage() {
  const me = await getCurrentUser()
  if (!me) return null

  const payload = await getPayloadClient()

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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Профиль</h1>
        <p className="text-sm text-muted-foreground">
          Учётная информация, абонемент, документы и оплаты.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Данные аккаунта</CardTitle>
          <CardDescription>Эти данные видны только вам и администраторам.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Row label="Имя" value={me.name || '—'} />
          <Separator />
          <Row label="Email" value={me.email} />
          <Separator />
          <Row
            label="Роль"
            value={
              me.role === 'admin'
                ? 'Администратор'
                : me.role === 'trainer'
                  ? 'Тренер'
                  : me.role === 'parent'
                    ? 'Родитель'
                    : 'Ученик'
            }
          />
        </CardContent>
      </Card>

      {/* Мои дети — только для родителей */}
      {me.role === 'parent' ? (
        <Card>
          <CardHeader>
            <CardTitle>Мои дети</CardTitle>
            <CardDescription>
              Привяжите учеников по их email, чтобы видеть их расписание и данные.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChildrenSection children={childrenData} />
          </CardContent>
        </Card>
      ) : null}

      {/* Абонемент — виджет остатка (ТЗ п.4) */}
      <Card>
        <CardHeader>
          <CardTitle>Абонемент</CardTitle>
          <CardDescription>Сколько тренировок осталось и до какой даты действует.</CardDescription>
        </CardHeader>
        <CardContent>
          {subscriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Активных абонементов нет.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {subscriptions.map((sub) => {
                const pct =
                  sub.totalCredits > 0
                    ? Math.round((sub.remainingCredits / sub.totalCredits) * 100)
                    : 0
                return (
                  <div key={sub.id} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {sub.student?.name ?? ''} ·{' '}
                        {sub.kind === 'group' ? 'Групповой' : 'Индивидуальный'}
                      </span>
                      <span className="text-sm">
                        Осталось <span className="font-semibold">{sub.remainingCredits}</span> из{' '}
                        {sub.totalCredits}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Действует до: {sub.validUntil?.slice(0, 10)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Оплаты — таблица с последней оплатой и периодом (ТЗ п.2) */}
      <Card>
        <CardHeader>
          <CardTitle>Оплаты</CardTitle>
          <CardDescription>История платежей с периодами.</CardDescription>
        </CardHeader>
        <CardContent>
          <PaymentHistory payments={payments} />
        </CardContent>
      </Card>

      {/* Документы — загрузка и хранение (ТЗ п.1) */}
      <Card>
        <CardHeader>
          <CardTitle>Документы</CardTitle>
          <CardDescription>Медицинские справки, договоры, чеки и другие файлы.</CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentsSection
            documents={documents}
            students={viewableStudents}
            canSelectStudent={canSelectStudent}
          />
        </CardContent>
      </Card>

      {/* Настройки */}
      <Card>
        <CardHeader>
          <CardTitle>Настройки</CardTitle>
          <CardDescription>Имя для отображения и напоминания.</CardDescription>
        </CardHeader>
        <CardContent>
          <PreferencesForm
            name={me.name ?? null}
            reminderLeadHours={typeof me.reminderLeadHours === 'number' ? me.reminderLeadHours : 24}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}
