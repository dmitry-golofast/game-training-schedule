'use client'

import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { useActionState, useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { deleteGroupAction, upsertGroupAction } from '@/app/(frontend)/cabinet/groups/actions'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Textarea } from '@/components/ui/textarea'

type Student = { id: string; name: string; email: string }
type Group = {
  id: string
  name: string
  description?: string | null
  members: Student[]
}

type Editing =
  | { mode: 'create' }
  | { mode: 'edit'; id: string; name: string; description?: string | null; members: string[] }
  | null

function GroupForm({
  initial,
  students,
  onDone,
}: {
  initial: {
    id?: string
    name?: string
    description?: string | null
    members?: string[]
  }
  students: Student[]
  onDone: () => void
}) {
  const [state, formAction] = useActionState(upsertGroupAction, undefined)
  const [pending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteState, deleteAction] = useActionState(deleteGroupAction, undefined)
  const [selected, setSelected] = useState<Set<string>>(new Set(initial.members ?? []))

  useEffect(() => {
    if (state?.success) {
      toast.success(initial.id ? 'Группа обновлена.' : 'Группа создана.')
      onDone()
    } else if (state && !state.success) {
      toast.error(state.error)
    }
  }, [state, initial.id, onDone])

  useEffect(() => {
    if (deleteState?.success) {
      toast.success('Группа удалена.')
      onDone()
    } else if (deleteState && !deleteState.success) {
      toast.error(deleteState.error)
    }
  }, [deleteState, onDone])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <>
      <form
        action={formAction}
        onSubmit={() => startTransition(() => {})}
        className="flex flex-col gap-4"
      >
        {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}

        <div className="flex flex-col gap-2">
          <Label htmlFor="group-name">Название</Label>
          <Input id="group-name" name="name" defaultValue={initial.name ?? ''} required />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="group-description">Описание</Label>
          <Textarea
            id="group-description"
            name="description"
            defaultValue={initial.description ?? ''}
            rows={2}
            placeholder="Необязательно"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Участники</Label>
          {students.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Сначала добавьте учеников на странице «Ученики».
            </p>
          ) : (
            <div className="max-h-64 overflow-y-auto rounded-md border border-border">
              {students.map((s) => (
                <label
                  key={s.id}
                  className="flex items-center gap-3 border-b border-border px-3 py-2 last:border-b-0 hover:bg-accent"
                >
                  <Checkbox checked={selected.has(s.id)} onCheckedChange={() => toggle(s.id)} />
                  <span className="flex flex-col">
                    <span className="text-sm leading-none font-medium">{s.name}</span>
                    <span className="text-xs text-muted-foreground">{s.email}</span>
                  </span>
                  {/* Hidden inputs carry selected members into FormData. */}
                  {selected.has(s.id) ? (
                    <input type="hidden" name="members" value={s.id} readOnly />
                  ) : null}
                </label>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">Выбрано: {selected.size}</p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {initial.id ? (
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
            <DialogTitle>Удалить группу?</DialogTitle>
            <DialogDescription>
              Сами ученики не удаляются — только группа. Слоты, ссылающиеся на группу, останутся, но
              потеряют связь.
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

export function GroupsClient({ groups, students }: { groups: Group[]; students: Student[] }) {
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Editing>(null)

  return (
    <>
      {/* Floating-ish toolbar with the create button. */}
      <div className="flex justify-end">
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon />
              Создать группу
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новая группа</DialogTitle>
              <DialogDescription>Объедините учеников для групповых тренировок.</DialogDescription>
            </DialogHeader>
            <GroupForm students={students} onDone={() => setCreating(false)} initial={{}} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Per-group edit buttons row (rendered compactly under each card via client). */}
      <div className="flex flex-wrap gap-2">
        {groups.map((group) => (
          <Dialog
            key={group.id}
            open={editing?.mode === 'edit' && editing.id === group.id}
            onOpenChange={(open) =>
              setEditing(
                open
                  ? {
                      mode: 'edit',
                      id: group.id,
                      name: group.name,
                      description: group.description,
                      members: group.members.map((m) => m.id),
                    }
                  : null,
              )
            }
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <PencilIcon />
                {group.name}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Редактирование группы</DialogTitle>
                <DialogDescription>{group.name}</DialogDescription>
              </DialogHeader>
              <GroupForm
                students={students}
                onDone={() => setEditing(null)}
                initial={{
                  id: group.id,
                  name: group.name,
                  description: group.description,
                  members: group.members.map((m) => m.id),
                }}
              />
            </DialogContent>
          </Dialog>
        ))}
      </div>
    </>
  )
}
