'use client'

import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { useActionState, useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { deletePaymentAction, upsertPaymentAction } from '@/app/(frontend)/cabinet/payments/actions'
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
type Payment = {
  id: string
  amount: number
  currency?: string | null
  periodFrom: string
  periodTo: string
  method?: string | null
  paidAt: string
  student: { id: string; name: string } | null
}

const METHOD_LABEL: Record<string, string> = {
  cash: 'Наличные',
  card: 'Карта',
  transfer: 'Перевод',
}

function PaymentForm({
  students,
  initial,
  onDone,
}: {
  students: Student[]
  initial?: {
    id: string
    amount: number
    currency?: string | null
    periodFrom: string
    periodTo: string
    method?: string | null
    paidAt: string
  }
  onDone: () => void
}) {
  const [state, formAction] = useActionState(upsertPaymentAction, undefined)
  const [pending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteState, deleteAction] = useActionState(deletePaymentAction, undefined)
  const [studentId, setStudentId] = useState('')

  useEffect(() => {
    if (state?.success) {
      toast.success(initial?.id ? 'Платёж обновлён.' : 'Платёж добавлен.')
      onDone()
    } else if (state && !state.success) {
      toast.error(state.error)
    }
  }, [state, initial?.id, onDone])

  useEffect(() => {
    if (deleteState?.success) {
      toast.success('Платёж удалён.')
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
        {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}

        {initial?.id ? null : (
          <div className="flex flex-col gap-2">
            <Label htmlFor="pay-student">Ученик</Label>
            <input type="hidden" name="student" value={studentId} />
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger id="pay-student" className="w-full">
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
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="pay-amount">Сумма</Label>
            <Input
              id="pay-amount"
              name="amount"
              type="number"
              min={0}
              step="0.01"
              defaultValue={initial?.amount ?? ''}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pay-currency">Валюта</Label>
            <Select name="currency" defaultValue={initial?.currency ?? 'RUB'}>
              <SelectTrigger id="pay-currency" className="w-full">
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

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="pay-from">Период с</Label>
            <Input
              id="pay-from"
              name="periodFrom"
              type="date"
              defaultValue={initial?.periodFrom?.slice(0, 10)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pay-to">Период по</Label>
            <Input
              id="pay-to"
              name="periodTo"
              type="date"
              defaultValue={initial?.periodTo?.slice(0, 10)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="pay-paidAt">Дата платежа</Label>
            <Input
              id="pay-paidAt"
              name="paidAt"
              type="date"
              defaultValue={(initial?.paidAt ?? new Date().toISOString()).slice(0, 10)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pay-method">Способ</Label>
            <Select name="method" defaultValue={initial?.method ?? ''}>
              <SelectTrigger id="pay-method" className="w-full">
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

        <div className="flex flex-col gap-2">
          <Label htmlFor="pay-note">Заметка</Label>
          <Textarea id="pay-note" name="note" rows={2} />
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {initial?.id ? (
            <Button
              type="button"
              variant="destructive"
              className="mr-auto"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2Icon />
              Удалить
            </Button>
          ) : null}
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
            <DialogTitle>Удалить платёж?</DialogTitle>
            <DialogDescription>Действие нельзя отменить.</DialogDescription>
          </DialogHeader>
          <form action={deleteAction} className="flex flex-col gap-3">
            <input type="hidden" name="id" value={initial?.id} />
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

export function PaymentsClient({
  students,
  payments,
}: {
  students: Student[]
  payments: Payment[]
}) {
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Payment | null>(null)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon />
              Добавить платёж
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новый платёж</DialogTitle>
              <DialogDescription>Фиксация оплаты ученика.</DialogDescription>
            </DialogHeader>
            <PaymentForm students={students} onDone={() => setCreating(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-2">
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Платежей пока нет.</p>
        ) : (
          payments.map((p) => (
            <Dialog
              key={p.id}
              open={editing?.id === p.id}
              onOpenChange={(open) => setEditing(open ? p : null)}
            >
              <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.student?.name ?? '—'}</span>
                    <span className="text-sm font-semibold">
                      {p.amount} {p.currency ?? 'RUB'}
                    </span>
                    {p.method ? (
                      <span className="text-xs text-muted-foreground">
                        {METHOD_LABEL[p.method]}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Период: {p.periodFrom?.slice(0, 10)} — {p.periodTo?.slice(0, 10)} · Оплачено:{' '}
                    {p.paidAt?.slice(0, 10)}
                  </div>
                </div>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon">
                    <PencilIcon />
                  </Button>
                </DialogTrigger>
              </div>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Редактирование платежа</DialogTitle>
                  <DialogDescription>{p.student?.name}</DialogDescription>
                </DialogHeader>
                <PaymentForm
                  students={students}
                  onDone={() => setEditing(null)}
                  initial={{
                    id: p.id,
                    amount: p.amount,
                    currency: p.currency,
                    periodFrom: p.periodFrom,
                    periodTo: p.periodTo,
                    method: p.method,
                    paidAt: p.paidAt,
                  }}
                />
              </DialogContent>
            </Dialog>
          ))
        )}
      </div>
    </div>
  )
}
