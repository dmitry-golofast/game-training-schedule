'use client'

import { PencilIcon, PlusIcon, Trash2Icon, UsersIcon } from 'lucide-react'
import { useActionState, useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { deleteGroupAction, upsertGroupAction } from '@/app/(frontend)/cabinet/groups/actions'
import { ViewToggle, type ViewMode } from '@/components/cabinet/view-toggle'
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
  imageUrl?: string | null
  imageAlt?: string | null
  imageId?: string | null
}

type Editing =
  | { mode: 'create' }
  | {
      mode: 'edit'
      id: string
      name: string
      description?: string | null
      members: string[]
      imageUrl?: string | null
      imageAlt?: string | null
      imageId?: string | null
    }
  | null

/** Shared file input for uploading a preview image into the `media` collection. */
function ImageInput({
  currentUrl,
  currentAlt,
}: {
  currentUrl?: string | null
  currentAlt?: string | null
}) {
  const [remove, setRemove] = useState(false)

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="group-preview">Превью (картинка)</Label>
      {currentUrl ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentUrl}
            alt={currentAlt ?? ''}
            className="size-16 rounded-md border border-border object-cover"
          />
          <Checkbox
            id="group-preview-remove"
            checked={remove}
            onCheckedChange={(v) => setRemove(v === true)}
          />
          <Label htmlFor="group-preview-remove" className="text-xs text-muted-foreground">
            Удалить текущую картинку
          </Label>
        </div>
      ) : null}
      <Input id="group-preview" name="preview" type="file" accept="image/*" />
      {remove ? <input type="hidden" name="clearPreview" value="1" readOnly /> : null}
    </div>
  )
}

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
    imageUrl?: string | null
    imageAlt?: string | null
    imageId?: string | null
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

        <ImageInput currentUrl={initial.imageUrl} currentAlt={initial.imageAlt} />

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
                  className="flex cursor-pointer items-center gap-3 border-b border-border px-3 py-2 last:border-b-0 hover:bg-accent"
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

/** A single group rendered as an interactive card. Click opens edit dialog.
 *  The card uses a fixed-aspect image on top and a `flex-1` content area so
 *  cards in the same grid row share the same height regardless of how long
 *  the description is or how many member chips are shown. */
function GroupCard({ group, onOpen }: { group: Group; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group/card flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card text-left transition hover:border-primary/50 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-muted">
        {group.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={group.imageUrl}
            alt={group.imageAlt ?? group.name}
            className="size-full object-cover transition group-hover/card:scale-[1.02]"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <UsersIcon className="size-10 opacity-40" />
          </div>
        )}
        <span className="absolute top-2 right-2 rounded-full bg-background/90 px-2 py-0.5 text-xs font-medium text-foreground backdrop-blur">
          {group.members.length} уч.
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="line-clamp-2 leading-tight font-semibold">{group.name}</h3>
          <PencilIcon className="size-4 shrink-0 text-muted-foreground opacity-0 transition group-hover/card:opacity-100" />
        </div>
        {group.description ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">{group.description}</p>
        ) : (
          <p className="text-xs text-transparent select-none">.</p>
        )}
        <div className="mt-auto flex flex-wrap gap-1">
          {group.members.length === 0 ? (
            <span className="text-xs text-muted-foreground">нет участников</span>
          ) : (
            group.members.slice(0, 5).map((m) => (
              <span
                key={m.id}
                className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
              >
                {m.name}
              </span>
            ))
          )}
          {group.members.length > 5 ? (
            <span className="text-xs text-muted-foreground">+{group.members.length - 5}</span>
          ) : null}
        </div>
      </div>
    </button>
  )
}

/** A single group rendered as a compact list row. Click opens edit dialog. */
function GroupRow({ group, onOpen }: { group: Group; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-md border border-border bg-card p-3 text-left transition hover:border-primary/50 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {group.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={group.imageUrl}
          alt={group.imageAlt ?? group.name}
          className="size-12 shrink-0 rounded-md border border-border object-cover"
        />
      ) : (
        <div className="flex size-12 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
          <UsersIcon className="size-5 opacity-60" />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{group.name}</span>
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {group.members.length} уч.
          </span>
        </div>
        {group.description ? (
          <span className="truncate text-xs text-muted-foreground">{group.description}</span>
        ) : null}
      </div>
      <PencilIcon className="size-4 shrink-0 text-muted-foreground" />
    </button>
  )
}

export function GroupsClient({ groups, students }: { groups: Group[]; students: Student[] }) {
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Editing>(null)
  const [view, setView] = useState<ViewMode>('cards')

  const openEdit = (group: Group) =>
    setEditing({
      mode: 'edit',
      id: group.id,
      name: group.name,
      description: group.description,
      members: group.members.map((m) => m.id),
      imageUrl: group.imageUrl,
      imageAlt: group.imageAlt,
      imageId: group.imageId,
    })

  const editingGroup =
    editing?.mode === 'edit' ? (groups.find((g) => g.id === editing.id) ?? null) : null

  return (
    <>
      {/* Toolbar: view switcher + create button. On mobile the create button
          collapses to an icon so the whole row fits a narrow screen. */}
      <div className="flex items-center justify-between gap-2">
        <ViewToggle value={view} onChange={setView} />

        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild>
            <Button size="icon" className="sm:size-auto sm:gap-1.5" aria-label="Создать группу">
              <PlusIcon />
              <span className="sr-only sm:not-sr-only">Создать группу</span>
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

      {/* Groups grid/list. Each item is clickable to open its edit dialog.
          The Dialog wrappers below are controlled by the `editing` state, so
          clicking a card/row sets `editing` and opens the corresponding modal. */}
      {view === 'cards' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} onOpen={() => openEdit(group)} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {groups.map((group) => (
            <GroupRow key={group.id} group={group} onOpen={() => openEdit(group)} />
          ))}
        </div>
      )}

      {/* Single controlled edit dialog driven by the `editing` state. */}
      <Dialog
        open={editing?.mode === 'edit'}
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактирование группы</DialogTitle>
            <DialogDescription>{editingGroup?.name ?? ''}</DialogDescription>
          </DialogHeader>
          {editing?.mode === 'edit' ? (
            <GroupForm
              students={students}
              onDone={() => setEditing(null)}
              initial={{
                id: editing.id,
                name: editing.name,
                description: editing.description,
                members: editing.members,
                imageUrl: editing.imageUrl,
                imageAlt: editing.imageAlt,
                imageId: editing.imageId,
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
