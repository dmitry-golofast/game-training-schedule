'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import { PlusIcon } from 'lucide-react'
import { toast } from 'sonner'

import { assignSubscriptionAction } from '@/app/(frontend)/cabinet/students/actions'
import { DocumentsSection } from '@/app/(frontend)/cabinet/profile/documents-section'
import { PaymentHistory } from '@/app/(frontend)/cabinet/profile/payment-history'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

type Template = {
  id: string
  title: string
  kind: 'individual' | 'group'
  totalCredits: number
  durationDays: number | null
}

export function StudentTabs({
  student,
  parentDoc,
  subscriptions,
  payments,
  documents,
  sickLeaves,
  scheduleSlots,
  templates,
  isAdmin,
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
  templates: Template[]
  isAdmin: boolean
}) {
  const [activeTab, setActiveTab] = useState('info')

  const fullName = [student.lastName, student.firstName, student.middleName]
    .filter(Boolean)
    .join(' ')
  const fullDisplayName = [student.lastName, student.firstName, student.middleName]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="flex flex-col gap-4">
      {/* Tab bar — horizontal scroll on mobile, static on desktop */}
      <div className="-mx-4 [scrollbar-width:none] overflow-x-auto border-b border-border px-4 [-ms-overflow-style:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
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
            <CardHeader className="flex-row items-center justify-between gap-3">
              <CardTitle className="min-w-0 break-words">
                Абонементы ({subscriptions.length})
              </CardTitle>
              {isAdmin ? (
                <div className="shrink-0">
                  <AssignSubscriptionDialog studentId={student.id} templates={templates} />
                </div>
              ) : null}
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
                        <div className="flex items-start justify-between gap-2">
                          <span className="min-w-0 text-sm font-medium break-words">
                            {sub.kind === 'group' ? 'Групповой' : 'Индивидуальный'}
                          </span>
                          <span className="shrink-0 text-sm whitespace-nowrap">
                            Осталось <span className="font-semibold">{sub.remainingCredits}</span>{' '}
                            из {sub.totalCredits}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          <span>
                            Действует с {sub.validFrom?.slice(0, 10)} до{' '}
                            {sub.validUntil?.slice(0, 10)}
                          </span>
                          {typeof sub.price === 'number' && sub.price > 0 ? (
                            <span className="font-medium text-foreground">
                              {sub.price.toLocaleString('ru-RU')} ₽
                            </span>
                          ) : null}
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
    <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium break-words sm:text-right">{value || '—'}</span>
    </div>
  )
}

/** Dialog for assigning a subscription (from a template) to this student. */
function AssignSubscriptionDialog({
  studentId,
  templates,
}: {
  studentId: string
  templates: Template[]
}) {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useActionState(assignSubscriptionAction, undefined)
  const [pending, startTransition] = useTransition()
  const [templateId, setTemplateId] = useState('')
  const today = new Date().toISOString().slice(0, 10)
  const [validFrom, setValidFrom] = useState(today)

  // When the template changes, auto-fill validUntil = validFrom + durationDays.
  const selectedTpl = templates.find((t) => t.id === templateId) ?? null
  const validUntil = (() => {
    if (!selectedTpl?.durationDays) return ''
    const d = new Date(validFrom)
    d.setDate(d.getDate() + selectedTpl.durationDays)
    return d.toISOString().slice(0, 10)
  })()

  function handleTemplateChange(id: string) {
    setTemplateId(id)
    setValidFrom(today)
  }

  useEffect(() => {
    if (!state) return
    if (state.success) {
      toast.success('Абонемент добавлен.')
      setOpen(false)
      setTemplateId('')
      setValidFrom(today)
    } else if ('error' in state) {
      toast.error(state.error)
    }
  }, [state])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon />
          Добавить
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Добавить абонемент</DialogTitle>
          <DialogDescription>Выберите шаблон и период действия.</DialogDescription>
        </DialogHeader>
        <form
          action={formAction}
          onSubmit={() => startTransition(() => {})}
          className="flex min-w-0 flex-col gap-4"
        >
          <input type="hidden" name="studentId" value={studentId} />
          <input type="hidden" name="templateId" value={templateId} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="assign-template">Шаблон</Label>
            <Select value={templateId} onValueChange={handleTemplateChange}>
              <SelectTrigger id="assign-template" className="w-full">
                <SelectValue placeholder="Выберите шаблон" />
              </SelectTrigger>
              <SelectContent className="max-w-[90vw] sm:max-w-md">
                {templates.map((t) => (
                  <SelectItem
                    key={t.id}
                    value={t.id}
                    className="text-balance break-words whitespace-normal"
                  >
                    {t.title} — {t.totalCredits} зан.
                    {t.durationDays ? `, ${t.durationDays} дн.` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="assign-from">Действует с</Label>
              <Input
                id="assign-from"
                name="validFrom"
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="assign-until">Действует по</Label>
              <Input
                id="assign-until"
                name="validUntil"
                type="date"
                value={validUntil}
                readOnly
                aria-readonly="true"
                required
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Отмена
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending || !templateId}>
              {pending ? 'Добавляем…' : 'Добавить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
