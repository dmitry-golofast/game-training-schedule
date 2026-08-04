'use client'

import { ImageIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { useActionState, useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'

import {
  createTemplateAction,
  deleteTemplateAction,
  updateTemplateAction,
} from '@/app/(frontend)/cabinet/subscriptions/actions'
import { ViewToggle, type ViewMode } from '@/components/cabinet/view-toggle'
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
  price?: number | null
  durationDays?: number | null
  notes?: string | null
  imageUrl?: string | null
  imageAlt?: string | null
  imageId?: string | null
}

/** Shared file input for uploading a preview image into the `media` collection. */
function ImageInput({
  currentUrl,
  currentAlt,
}: {
  currentUrl?: string | null
  currentAlt?: string | null
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="tpl-image">Превью (картинка)</Label>
      {currentUrl ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentUrl}
            alt={currentAlt ?? ''}
            className="size-16 rounded-md border border-border object-cover"
          />
          <span className="text-xs text-muted-foreground">Заменить картинку:</span>
        </div>
      ) : null}
      <Input id="tpl-image" name="image" type="file" accept="image/*" />
    </div>
  )
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

      <ImageInput />

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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="tpl-price">Стоимость (₽)</Label>
          <Input id="tpl-price" name="price" type="number" min={0} step="0.01" placeholder="0" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="tpl-duration">Срок действия (дней)</Label>
          <Input
            id="tpl-duration"
            name="durationDays"
            type="number"
            min={1}
            defaultValue={30}
            required
          />
        </div>
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

        <ImageInput currentUrl={initial.imageUrl} currentAlt={initial.imageAlt} />

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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-price">Стоимость (₽)</Label>
            <Input
              id="edit-price"
              name="price"
              type="number"
              min={0}
              step="0.01"
              defaultValue={initial.price ?? undefined}
              placeholder="0"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-duration">Срок действия (дней)</Label>
            <Input
              id="edit-duration"
              name="durationDays"
              type="number"
              min={1}
              defaultValue={initial.durationDays ?? 30}
              required
            />
          </div>
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

/** Inline textual content shared between cards and list views. */
function CardBody({ tpl }: { tpl: Template }) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="line-clamp-2 leading-tight font-semibold">{tpl.title}</span>
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {tpl.kind === 'group' ? 'Групповой' : 'Индивид.'}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>{tpl.totalCredits} занятий</span>
        {tpl.price != null ? <span>{tpl.price} ₽</span> : null}
        {tpl.durationDays ? <span>{tpl.durationDays} дн.</span> : null}
      </div>
      {tpl.notes ? (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{tpl.notes}</p>
      ) : null}
    </>
  )
}

/** Card view: preview on top, content below. `h-full` keeps cards in the same
 *  grid row equal height regardless of notes length. When `interactive` is
 *  set the card shows hover/focus affordances consistent with the groups UI. */
function GridCard({ tpl, interactive = false }: { tpl: Template; interactive?: boolean }) {
  return (
    <div
      className={[
        'flex h-full flex-col overflow-hidden rounded-lg border bg-card',
        interactive
          ? 'border-border transition group-hover/tpl:border-primary/50 group-hover/tpl:shadow-md'
          : 'border-border',
      ].join(' ')}
    >
      <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-muted">
        {tpl.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={tpl.imageUrl}
            alt={tpl.imageAlt ?? tpl.title}
            loading="lazy"
            className="size-full object-cover transition group-hover/tpl:scale-[1.02]"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-muted text-muted-foreground">
            <ImageIcon className="size-10 opacity-40" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <CardBody tpl={tpl} />
      </div>
    </div>
  )
}

/** Compact list row: small thumbnail on the left, content on the right.
 *  Mirrors the row style used for groups for visual consistency. */
function ListRow({ tpl, interactive = false }: { tpl: Template; interactive?: boolean }) {
  return (
    <div
      className={[
        'flex items-center gap-3 rounded-md border bg-card p-3',
        interactive
          ? 'border-border transition group-hover/tpl:border-primary/50 group-hover/tpl:bg-accent/40'
          : 'border-border',
      ].join(' ')}
    >
      {tpl.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={tpl.imageUrl}
          alt={tpl.imageAlt ?? tpl.title}
          loading="lazy"
          className="size-12 shrink-0 rounded-md object-cover"
        />
      ) : (
        <div className="flex size-12 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
          <ImageIcon className="size-5 opacity-60" />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <CardBody tpl={tpl} />
      </div>
    </div>
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
  const [view, setView] = useState<ViewMode>('cards')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        {/* View toggle: cards (default) / list */}
        <ViewToggle value={view} onChange={setView} />

        {isAdmin ? (
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
        ) : null}
      </div>

      {templates.length === 0 ? (
        <p className="text-sm text-muted-foreground">Шаблонов пока нет.</p>
      ) : view === 'cards' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((tpl) => {
            if (!isAdmin) {
              return (
                <div key={tpl.id}>
                  <GridCard tpl={tpl} />
                </div>
              )
            }
            return (
              <Dialog
                key={tpl.id}
                open={editing?.id === tpl.id}
                onOpenChange={(open) => setEditing(open ? tpl : null)}
              >
                <div className="group/tpl relative h-full">
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="block size-full cursor-pointer rounded-lg text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      aria-label={`Редактировать «${tpl.title}»`}
                    >
                      <GridCard tpl={tpl} interactive />
                    </button>
                  </DialogTrigger>
                  <span className="pointer-events-none absolute top-2 right-2 rounded-md bg-background/90 p-1 text-muted-foreground opacity-0 backdrop-blur transition-opacity group-hover/tpl:opacity-100">
                    <PencilIcon className="size-4" />
                  </span>
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
      ) : (
        <div className="flex flex-col gap-2">
          {templates.map((tpl) => {
            if (!isAdmin) {
              return (
                <div key={tpl.id}>
                  <ListRow tpl={tpl} />
                </div>
              )
            }
            return (
              <Dialog
                key={tpl.id}
                open={editing?.id === tpl.id}
                onOpenChange={(open) => setEditing(open ? tpl : null)}
              >
                <div className="group/tpl flex items-center gap-2">
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="flex-1 cursor-pointer rounded-md text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      aria-label={`Редактировать «${tpl.title}»`}
                    >
                      <ListRow tpl={tpl} interactive />
                    </button>
                  </DialogTrigger>
                  <PencilIcon className="size-4 shrink-0 text-muted-foreground opacity-0 transition group-hover/tpl:opacity-100" />
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
      )}
    </div>
  )
}
