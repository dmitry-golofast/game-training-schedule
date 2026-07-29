'use client'

import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'

import {
  createSubscriptionWithPaymentAction,
  deleteSubscriptionAction,
  updateSubscriptionAction,
} from '@/app/(frontend)/cabinet/subscriptions/actions'
import { Button } from '@/components/ui/button'
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
import { Textarea } from '@/components/ui/textarea'

type Student = { id: string; name: string; email: string }
type Subscription = {
  id: string
  kind: 'individual' | 'group'
  totalCredits: number
  remainingCredits: number
  validFrom: string
  validUntil: string
  status: string
  notes?: string | null
  student: { id: string; name: string } | null
  paymentAmount?: number | null
  paymentCurrency?: string | null
  paymentMethod?: string | null
  paidAt?: string | null
}

const CURRENCY_SYMBOL: Record<string, string> = { RUB: '₽', USD: '$', EUR: '€' }
const METHOD_LABEL: Record<string, string> = {
  cash: 'Наличные',
  card: 'Карта',
  transfer: 'Перевод',
}

/** Create form: subscription + payment in one submit. */
function CreateForm({ students, onDone }: { students: Student[]; onDone: () => void }) {
  const [state, formAction] = useActionState(createSubscriptionWithPaymentAction, undefined)
  const [pending, startTransition] = useTransition()
  const [studentId, setStudentId] = useState('')
  const [kind, setKind] = useState<'individual' | 'group'>('individual')
  const shownRef = useRef(false)

  useEffect(() => {
    if (!state) return
    if (shownRef.current) return
    shownRef.current = true
    if (state.success) {
      toast.success('Абонемент и оплата созданы.')
      onDone()
    } else if ('error' in state) {
      toast.error(state.error)
      shownRef.current = false
    }
  }, [state, onDone])

  return (
    <form
      action={formAction}
      onSubmit={() => startTransition(() => {})}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="sub-student">Ученик</Label>
        <input type="hidden" name="student" value={studentId} />
        <Select value={studentId} onValueChange={setStudentId}>
          <SelectTrigger id="sub-student" className="w-full">
            <SelectValue placeholder="Выберите ученика" />
          </SelectTrigger>
          <SelectContent>
            {students.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name} ({s.email})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="sub-kind">Тип</Label>
        <input type="hidden" name="kind" value={kind} />
        <Select value={kind} onValueChange={(v) => setKind(v === 'group' ? 'group' : 'individual')}>
          <SelectTrigger id="sub-kind" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="individual">Индивидуальный</SelectItem>
            <SelectItem value="group">Групповой</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="sub-total">Количество занятий</Label>
        <Input id="sub-total" name="totalCredits" type="number" min={1} defaultValue={8} required />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="sub-from">Действует с</Label>
          <Input id="sub-from" name="validFrom" type="date" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="sub-until">Действует по</Label>
          <Input id="sub-until" name="validUntil" type="date" required />
        </div>
      </div>

      {/* Payment block */}
      <div className="rounded-md border border-border p-3">
        <p className="mb-3 text-sm font-medium">Оплата</p>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sub-amount">Сумма</Label>
              <Input
                id="sub-amount"
                name="amount"
                type="number"
                min={0}
                step="0.01"
                defaultValue={0}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sub-currency">Валюта</Label>
              <Select name="currency" defaultValue="RUB">
                <SelectTrigger id="sub-currency" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RUB">₽ RUB</SelectItem>
                  <SelectItem value="USD">$ USD</SelectItem>
                  <SelectItem value="EUR">€ EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sub-paidAt">Дата оплаты</Label>
              <Input
                id="sub-paidAt"
                name="paidAt"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sub-method">Способ</Label>
              <Select name="method" defaultValue="">
                <SelectTrigger id="sub-method" className="w-full">
                  <SelectValue placeholder="Не указан" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Не указан</SelectItem>
                  <SelectItem value="cash">Наличные</SelectItem>
                  <SelectItem value="card">Карта</SelectItem>
                  <SelectItem value="transfer">Перевод</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="sub-notes">Заметки</Label>
        <Textarea id="sub-notes" name="notes" rows={2} />
      </div>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Отмена
          </Button>
        </DialogClose>
        <Button type="submit" disabled={pending}>
          {pending ? 'Сохраняем…' : 'Создать'}
        </Button>
      </DialogFooter>
    </form>
  )
}

/** Edit form: subscription fields only (payment is read-only). */
function EditForm({
  initial,
  onDone,
}: {
  initial: {
    id: string
    kind: string
    validFrom: string
    validUntil: string
    notes?: string | null
    paymentAmount?: number | null
    paymentCurrency?: string | null
    paymentMethod?: string | null
    paidAt?: string | null
  }
  onDone: () => void
}) {
  const [state, formAction] = useActionState(updateSubscriptionAction, undefined)
  const [pending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteState, deleteAction] = useActionState(deleteSubscriptionAction, undefined)
  const [kind, setKind] = useState<'individual' | 'group'>(
    initial.kind === 'group' ? 'group' : 'individual',
  )

  useEffect(() => {
    if (state?.success) {
      toast.success('Абонемент обновлён.')
      onDone()
    } else if (state && !state.success) {
      toast.error(state.error)
    }
  }, [state, onDone])

  useEffect(() => {
    if (deleteState?.success) {
      toast.success('Абонемент удалён.')
      onDone()
    } else if (deleteState && !deleteState.success) {
      toast.error(deleteState.error)
    }
  }, [deleteState, onDone])

  return (
    <>
      <form
        action={formAction}
        onSubmit={() => startTransition(() => {})}
        className="flex flex-col gap-4"
      >
        <input type="hidden" name="id" value={initial.id} />

        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-kind">Тип</Label>
          <input type="hidden" name="kind" value={kind} />
          <Select
            value={kind}
            onValueChange={(v) => setKind(v === 'group' ? 'group' : 'individual')}
          >
            <SelectTrigger id="edit-kind" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="individual">Индивидуальный</SelectItem>
              <SelectItem value="group">Групповой</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-from">Действует с</Label>
            <Input
              id="edit-from"
              name="validFrom"
              type="date"
              defaultValue={initial.validFrom?.slice(0, 10)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-until">Действует по</Label>
            <Input
              id="edit-until"
              name="validUntil"
              type="date"
              defaultValue={initial.validUntil?.slice(0, 10)}
              required
            />
          </div>
        </div>

        {/* Payment info (read-only) */}
        {initial.paymentAmount != null ? (
          <div className="rounded-md bg-muted/30 p-3">
            <p className="mb-2 text-sm font-medium">Оплата</p>
            <div className="flex flex-col gap-1 text-xs text-muted-foreground">
              <span>
                Сумма:{' '}
                <span className="font-medium text-foreground">
                  {initial.paymentAmount} {CURRENCY_SYMBOL[initial.paymentCurrency ?? 'RUB'] ?? '₽'}
                </span>
              </span>
              <span>Способ: {METHOD_LABEL[initial.paymentMethod ?? ''] ?? 'не указан'}</span>
              <span>Оплачено: {initial.paidAt?.slice(0, 10)}</span>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-notes">Заметки</Label>
          <Textarea id="edit-notes" name="notes" defaultValue={initial.notes ?? ''} rows={2} />
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="destructive"
            className="mr-auto"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2Icon />
            Удалить
          </Button>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Отмена
            </Button>
          </DialogClose>
          <Button type="submit" disabled={pending}>
            {pending ? 'Сохраняем…' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </form>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Удалить абонемент?</DialogTitle>
            <DialogDescription>Будут удалены абонемент и связанная оплата.</DialogDescription>
          </DialogHeader>
          <form action={deleteAction} className="flex flex-col gap-3">
            <input type="hidden" name="id" value={initial.id} />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Отмена
                </Button>
              </DialogClose>
              <Button type="submit" variant="destructive">
                Удалить
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function SubscriptionsClient({
  students,
  subscriptions,
}: {
  students: Student[]
  subscriptions: Subscription[]
}) {
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Subscription | null>(null)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon />
              Создать абонемент
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Новый абонемент + оплата</DialogTitle>
              <DialogDescription>
                Абонемент создаётся вместе с оплатой — нельзя создать абонемент без оплаты.
              </DialogDescription>
            </DialogHeader>
            <CreateForm students={students} onDone={() => setCreating(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {subscriptions.map((sub) => {
          const pct =
            sub.totalCredits > 0 ? Math.round((sub.remainingCredits / sub.totalCredits) * 100) : 0
          return (
            <Dialog
              key={sub.id}
              open={editing?.id === sub.id}
              onOpenChange={(open) => setEditing(open ? sub : null)}
            >
              <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{sub.student?.name ?? '—'}</span>
                    <span className="text-xs text-muted-foreground">
                      {sub.kind === 'group' ? 'Групповой' : 'Индивид.'}
                    </span>
                    <StatusBadge status={sub.status} />
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {sub.validFrom?.slice(0, 10)} — {sub.validUntil?.slice(0, 10)}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-medium">
                      {sub.remainingCredits}/{sub.totalCredits}
                    </span>
                  </div>
                  {sub.paymentAmount != null ? (
                    <div className="mt-1 text-xs text-muted-foreground">
                      Оплачено: {sub.paymentAmount}{' '}
                      {CURRENCY_SYMBOL[sub.paymentCurrency ?? 'RUB'] ?? '₽'} ·{' '}
                      {sub.paidAt?.slice(0, 10)}
                    </div>
                  ) : null}
                </div>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon">
                    <PencilIcon />
                  </Button>
                </DialogTrigger>
              </div>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Редактирование абонемента</DialogTitle>
                  <DialogDescription>
                    {sub.student?.name} — осталось {sub.remainingCredits}/{sub.totalCredits}
                  </DialogDescription>
                </DialogHeader>
                <EditForm
                  onDone={() => setEditing(null)}
                  initial={{
                    id: sub.id,
                    kind: sub.kind,
                    validFrom: sub.validFrom,
                    validUntil: sub.validUntil,
                    notes: sub.notes,
                    paymentAmount: sub.paymentAmount,
                    paymentCurrency: sub.paymentCurrency,
                    paymentMethod: sub.paymentMethod,
                    paidAt: sub.paidAt,
                  }}
                />
              </DialogContent>
            </Dialog>
          )
        })}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-primary/10 text-primary',
    expired: 'bg-muted text-muted-foreground',
    closed: 'bg-destructive/10 text-destructive',
  }
  const label: Record<string, string> = { active: 'Активен', expired: 'Истёк', closed: 'Закрыт' }
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? ''}`}>
      {label[status] ?? status}
    </span>
  )
}
