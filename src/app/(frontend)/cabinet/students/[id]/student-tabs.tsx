'use client'

import { useState } from 'react'

import { DocumentsSection } from '@/app/(frontend)/cabinet/profile/documents-section'
import { PaymentHistory } from '@/app/(frontend)/cabinet/profile/payment-history'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = any

type Tab = {
  id: string
  label: string
  badge?: number
}

const TABS: Tab[] = [
  { id: 'info', label: 'Инфо' },
  { id: 'schedule', label: 'Расписание' },
  { id: 'subscriptions', label: 'Абонементы' },
  { id: 'payments', label: 'Оплаты' },
  { id: 'documents', label: 'Документы' },
  { id: 'sick-leaves', label: 'Больничные' },
]

export function StudentTabs({
  student,
  parentDoc,
  subscriptions,
  payments,
  documents,
  sickLeaves,
  scheduleSlots,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  student: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parentDoc: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subscriptions: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payments: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  documents: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sickLeaves: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scheduleSlots: any[]
}) {
  const [activeTab, setActiveTab] = useState('info')

  const fullName = [student.lastName, student.firstName, student.middleAge]
    .filter(Boolean)
    .join(' ')
  const fullDisplayName = [student.lastName, student.firstName, student.middleName]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="flex flex-col gap-4">
      {/* Tab bar — horizontal scroll on mobile, static on desktop */}
      <div className="-mx-4 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-1 pb-px">
          {TABS.map((tab) => {
            const badge =
              tab.id === 'subscriptions'
                ? subscriptions.length
                : tab.id === 'payments'
                  ? payments.length
                  : tab.id === 'documents'
                    ? documents.length
                    : tab.id === 'sick-leaves'
                      ? sickLeaves.length
                      : tab.id === 'schedule'
                        ? scheduleSlots.length
                        : 0
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'relative flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.label}
                {badge > 0 ? (
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                      activeTab === tab.id
                        ? 'bg-primary/15 text-primary'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {badge}
                  </span>
                ) : null}
                {activeTab === tab.id ? (
                  <span className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-primary" />
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="min-h-[300px]">
        {activeTab === 'info' && (
          <Card>
            <CardHeader>
              <CardTitle>Личные данные</CardTitle>
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
              <Row label="Email" value={student.email} />
              <Separator />
              <Row label="Телефон родителя" value={student.parentPhone || '—'} />
              {parentDoc ? (
                <>
                  <Separator />
                  <Row label="Родитель" value={`${parentDoc.name || '—'} (${parentDoc.email})`} />
                </>
              ) : null}
            </CardContent>
          </Card>
        )}

        {activeTab === 'schedule' && (
          <Card>
            <CardHeader>
              <CardTitle>Тренировки ({scheduleSlots.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {scheduleSlots.length === 0 ? (
                <p className="text-sm text-muted-foreground">Тренировок нет.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {scheduleSlots.map((slot) => (
                    <li key={slot.id} className="flex items-center justify-between py-2 text-sm">
                      <span>{new Date(slot.startAt).toLocaleString('ru-RU')}</span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          slot.status === 'planned'
                            ? 'bg-primary/10 text-primary'
                            : slot.status === 'done'
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-destructive/10 text-destructive',
                        )}
                      >
                        {slot.status === 'planned'
                          ? 'Запланировано'
                          : slot.status === 'done'
                            ? 'Завершено'
                            : 'Отменено'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'subscriptions' && (
          <Card>
            <CardHeader>
              <CardTitle>Абонементы ({subscriptions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {subscriptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Абонементов нет.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {subscriptions.map((sub) => {
                    const pct =
                      sub.totalCredits > 0
                        ? Math.round((sub.remainingCredits / sub.totalCredits) * 100)
                        : 0
                    return (
                      <div key={sub.id} className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {sub.kind === 'group' ? 'Групповой' : 'Индивидуальный'}
                          </span>
                          <span className="text-sm">
                            Осталось <span className="font-semibold">{sub.remainingCredits}</span>{' '}
                            из {sub.totalCredits}
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
        )}

        {activeTab === 'payments' && (
          <Card>
            <CardHeader>
              <CardTitle>Оплаты ({payments.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <PaymentHistory
                payments={payments.map((p) => ({
                  id: p.id,
                  amount: p.amount,
                  currency: p.currency ?? 'RUB',
                  periodFrom: p.periodFrom,
                  periodTo: p.periodTo,
                  method: p.method ?? null,
                  paidAt: p.paidAt,
                }))}
              />
            </CardContent>
          </Card>
        )}

        {activeTab === 'documents' && (
          <Card>
            <CardHeader>
              <CardTitle>Документы ({documents.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentsSection
                documents={documents.map((d) => ({
                  id: d.id,
                  docType: d.docType,
                  title: d.title,
                  filename: d.filename ?? null,
                  url: d.url ?? null,
                  createdAt: d.createdAt,
                }))}
                students={[{ id: student.id, name: fullDisplayName }]}
                canSelectStudent={false}
              />
            </CardContent>
          </Card>
        )}

        {activeTab === 'sick-leaves' && (
          <Card>
            <CardHeader>
              <CardTitle>Больничные ({sickLeaves.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {sickLeaves.length === 0 ? (
                <p className="text-sm text-muted-foreground">Больничных нет.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {sickLeaves.map((s) => {
                    const slot = typeof s.slot === 'object' && s.slot ? s.slot : null
                    const doc = typeof s.document === 'object' && s.document ? s.document : null
                    return (
                      <div key={s.id} className="rounded-md border border-border p-3">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {slot ? new Date(slot.startAt).toLocaleString('ru-RU') : '—'}
                          </span>
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-xs font-medium',
                              s.status === 'pending'
                                ? 'bg-primary/10 text-primary'
                                : s.status === 'approved'
                                  ? 'bg-emerald-500/10 text-emerald-600'
                                  : 'bg-destructive/10 text-destructive',
                            )}
                          >
                            {s.status === 'pending'
                              ? 'На рассмотрении'
                              : s.status === 'approved'
                                ? 'Одобрено'
                                : 'Отклонено'}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{s.reason}</p>
                        {doc?.url ? (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-block text-xs text-primary hover:underline"
                          >
                            📄 {doc.title || 'Справка'}
                          </a>
                        ) : null}
                        {s.reviewNote ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Комментарий тренера: {s.reviewNote}
                          </p>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
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
