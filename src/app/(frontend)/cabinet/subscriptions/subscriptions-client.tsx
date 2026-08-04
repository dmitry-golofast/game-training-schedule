'use client'

import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { useActionState, useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'

import {
  createTemplateAction,
  deleteTemplateAction,
  updateTemplateAction,
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

type Template = {
  id: string
  title: string
  kind: 'individual' | 'group'
  totalCredits: number
  notes?: string | null
}

/** Create form: template fields only (no student, no dates). */
function CreateForm({ onDone }: { onDone: () => void }) {
  const [state, formAction] = useActionState(createTemplateAction, undefined)
  const [pending, startTransition] = useTransition()
  const [kind, setKind] = useState<'individual' | 'group'>('individual')

  useEffect(() => {
    if (!state) return
    if (state.success) {
      toast.success('Шаблон создан.')
      onDone()
    } else if ('error' in state) {
      toast.error(state.error)
    }
  }, [state, onDone])

  return (
    <form
      action={formAction}
      onSubmit={() => startTransition(() => {})}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="tpl-title">Название</Label>
        <Input
          id="tpl-title"
          name="title"
          placeholder="например: Индивидуальный 8 занятий"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="tpl-kind">Тип</Label>
        <input type="hidden" name="kind" value={kind} />
        <Select value={kind} onValueChange={(v) => setKind(v === 'group' ? 'group' : 'individual')}>
          <SelectTrigger id="tpl-kind" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="individual">Индивидуальный</SelectItem>
            <SelectItem value="group">Групповой</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="tpl-total">Количество занятий</Label>
        <Input id="tpl-total" name="totalCredits" type="number" min={1} defaultValue={8} required />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="tpl-notes">Заметки</Label>
        <Textarea id="tpl-notes" name="notes" rows={2} />
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

/** Edit form: template fields only. */
function EditForm({ initial, onDone }: { initial: Template; onDone: () => void }) {
  const [state, formAction] = useActionState(updateTemplateAction, undefined)
  const [pending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteState, deleteAction] = useActionState(deleteTemplateAction, undefined)
  const [kind, setKind] = useState<'individual' | 'group'>(
    initial.kind === 'group' ? 'group' : 'individual',
  )

  useEffect(() => {
    if (state?.success) {
      toast.success('Шаблон обновлён.')
      onDone()
    } else if (state && !state.success) {
      toast.error(state.error)
    }
  }, [state, onDone])

  useEffect(() => {
    if (deleteState?.success) {
      toast.success('Шаблон удалён.')
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
          <Label htmlFor="edit-title">Название</Label>
          <Input id="edit-title" name="title" defaultValue={initial.title} required />
        </div>

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

        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-total">Количество занятий</Label>
          <Input
            id="edit-total"
            name="totalCredits"
            type="number"
            min={1}
            defaultValue={initial.totalCredits}
            required
          />
        </div>

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
            <DialogTitle>Удалить шаблон?</DialogTitle>
            <DialogDescription>
              Существующие абонементы учеников, созданные из этого шаблона, не будут затронуты.
            </DialogDescription>
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
  templates,
  isAdmin,
}: {
  templates: Template[]
  isAdmin: boolean
}) {
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Template | null>(null)

  return (
    <div className="flex flex-col gap-4">
      {isAdmin ? (
        <div className="flex justify-end">
          <Dialog open={creating} onOpenChange={setCreating}>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon />
                Создать шаблон
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Новый шаблон абонемента</DialogTitle>
                <DialogDescription>Шаблон можно привязать ученикам в их профиле.</DialogDescription>
              </DialogHeader>
              <CreateForm onDone={() => setCreating(false)} />
            </DialogContent>
          </Dialog>
        </div>
      ) : null}

      <div className="grid gap-3">
        {templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">Шаблонов пока нет.</p>
        ) : null}
        {templates.map((tpl) => {
          const card = (
            <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{tpl.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {tpl.kind === 'group' ? 'Групповой' : 'Индивидуальный'}
                  </span>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{tpl.totalCredits} занятий</div>
                {tpl.notes ? (
                  <div className="mt-1 text-xs text-muted-foreground">{tpl.notes}</div>
                ) : null}
              </div>
            </div>
          )

          if (!isAdmin) {
            return (
              <div key={tpl.id}>
                <div>{card}</div>
              </div>
            )
          }

          return (
            <Dialog
              key={tpl.id}
              open={editing?.id === tpl.id}
              onOpenChange={(open) => setEditing(open ? tpl : null)}
            >
              <div className="flex items-center gap-2">
                <div className="flex-1">{card}</div>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon">
                    <PencilIcon />
                  </Button>
                </DialogTrigger>
              </div>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Редактирование шаблона</DialogTitle>
                  <DialogDescription>{tpl.title}</DialogDescription>
                </DialogHeader>
                <EditForm initial={tpl} onDone={() => setEditing(null)} />
              </DialogContent>
            </Dialog>
          )
        })}
      </div>
    </div>
  )
}
