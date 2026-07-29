import { notFound } from 'next/navigation'
import Link from 'next/link'

import { EditStudentDialog } from '@/app/(frontend)/cabinet/students/[id]/edit-student-dialog'
import { DocumentsSection } from '@/app/(frontend)/cabinet/profile/documents-section'
import { PaymentHistory } from '@/app/(frontend)/cabinet/profile/payment-history'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { getCurrentUser, getPayloadClient } from '@/lib/payload'

export const metadata = { title: 'Профиль ученика' }

type Params = Promise<{ id: string }>

/** Compute age in full years from an ISO date string. */
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

export default async function StudentProfilePage({ params }: { params: Params }) {
  const me = await getCurrentUser()
  if (!me || me.role !== 'admin') notFound()

  const { id } = await params

  const payload = await getPayloadClient()

  let student
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

  // Load student's subscriptions, payments, documents.
  // Wrapped in try-catch so the page renders even if a collection doesn't
  // exist yet (e.g. fresh DB without migrations run).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const empty = { docs: [] as any[] }
  let subsResult: { docs: any[] } = empty
  let paymentsResult: { docs: any[] } = empty
  let docsResult: { docs: any[] } = empty

  try {
    ;[subsResult, paymentsResult, docsResult] = await Promise.all([
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
    ])
  } catch {
    // If any query fails, we still render the page with empty sections.
  }

  const subscriptions = subsResult.docs.map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s: any) => ({
      id: String(s.id),
      kind: s.kind as 'individual' | 'group',
      totalCredits: Number(s.totalCredits),
      remainingCredits: Number(s.remainingCredits),
      validFrom: s.validFrom as string,
      validUntil: s.validUntil as string,
      status: s.status as string,
    }),
  )

  const payments = paymentsResult.docs.map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (p: any) => ({
      id: String(p.id),
      amount: Number(p.amount),
      currency: (p.currency as string) ?? null,
      periodFrom: p.periodFrom as string,
      periodTo: p.periodTo as string,
      method: (p.method as string) ?? null,
      paidAt: p.paidAt as string,
    }),
  )

  const documents = docsResult.docs.map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (d: any) => ({
      id: String(d.id),
      docType: d.docType as 'medic' | 'contract' | 'other',
      title: String(d.title),
      filename: (d.filename as string) ?? null,
      url: (d.url as string) ?? null,
      createdAt: d.createdAt as string,
    }),
  )

  const age = computeAge(student.birthDate)
  const parentDoc = typeof student.parent === 'object' && student.parent ? student.parent : null

  const fullName = [student.lastName, student.firstName, student.middleName]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Link href="/cabinet/students" className="text-xs text-muted-foreground hover:underline">
            ← Назад к списку
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{fullName || 'Ученик'}</h1>
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

      <Card>
        <CardHeader>
          <CardTitle>Личные данные</CardTitle>
          <CardDescription>Имя, дата рождения, контакты.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Row label="Фамилия" value={student.lastName} />
          <Separator />
          <Row label="Имя" value={student.firstName} />
          <Separator />
          <Row label="Отчество" value={student.middleName || '—'} />
          <Separator />
          <Row label="Дата рождения" value={student.birthDate?.slice(0, 10)} />
          <Separator />
          <Row label="Возраст" value={age !== null ? `${age} лет` : '—'} />
          <Separator />
          <Row label="Email" value={student.email} />
          <Separator />
          <Row label="Телефон родителя" value={student.parentPhone || '—'} />
        </CardContent>
      </Card>

      {parentDoc ? (
        <Card>
          <CardHeader>
            <CardTitle>Родитель</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Row label="Имя" value={parentDoc.name || '—'} />
            <Separator />
            <Row label="Email" value={parentDoc.email} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Абонемент</CardTitle>
          <CardDescription>Остаток тренировок и срок действия.</CardDescription>
        </CardHeader>
        <CardContent>
          {subscriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Абонементов нет.</p>
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
                        {sub.kind === 'group' ? 'Групповой' : 'Индивидуальный'} ·{' '}
                        <span className="text-muted-foreground">{sub.status}</span>
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

      <Card>
        <CardHeader>
          <CardTitle>Оплаты</CardTitle>
          <CardDescription>История платежей.</CardDescription>
        </CardHeader>
        <CardContent>
          <PaymentHistory payments={payments} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Документы</CardTitle>
          <CardDescription>Медсправки, договоры, чеки.</CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentsSection
            documents={documents}
            students={[{ id: student.id, name: fullName }]}
            canSelectStudent={false}
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
      <span className="text-sm font-medium">{value || '—'}</span>
    </div>
  )
}
