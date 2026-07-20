'use client'

import { Trash2Icon } from 'lucide-react'
import { useActionState, useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { deleteSlotAction, upsertSlotAction } from '@/app/(frontend)/cabinet/schedule/actions'
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
import { ALLOWED_DURATIONS } from '@/lib/datetime'
import { formatTzParts } from '@/lib/timezone'
import { cn } from '@/lib/utils'

type Student = { id: string; name: string; email: string }
type GroupRef = { id: string; name: string }
type SlotStatus = 'planned' | 'done' | 'cancelled'
type SlotKind = 'individual' | 'group'

type RecurrenceData = {
  isRecurring: boolean
  frequency: 'daily' | 'weekly'
  interval: number
  weekdays: number[]
  until: string
  count: string
}

type SlotData = {
  id?: string
  startAt: string // ISO
  durationMin: number
  kind: SlotKind
  student: string // student id (individual)
  group: string // group id (group)
  status: SlotStatus
  notes?: string | null
  recurrence?: RecurrenceData
  // True when editing an existing materialized child of a series — recurrence
  // editing is disabled in that case (edit the parent instead).
  isChild?: boolean
}

// Weekday toggle buttons: 0=Sun … 6=Sat (matches the recurrence schema).
const WEEKDAY_BUTTONS = [
  { value: 1, label: 'Пн' },
  { value: 2, label: 'Вт' },
  { value: 3, label: 'Ср' },
  { value: 4, label: 'Чт' },
  { value: 5, label: 'Пт' },
  { value: 6, label: 'Сб' },
  { value: 0, label: 'Вс' },
] as const

/**
 * Convert an ISO instant to the "YYYY-MM-DDTHH:mm" value expected by
 * `<input type="datetime-local">`, expressed as wall-clock time in the
 * viewer's timezone. The input itself carries no timezone; the server-side
 * action re-interprets the value in the same timezone when persisting.
 */
function toDatetimeLocal(iso: string, tz: string): string {
  const d = new Date(iso)
  const p = formatTzParts(d, tz)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${p.year}-${pad(p.month + 1)}-${pad(p.day)}T${pad(p.hours)}:${pad(p.minutes)}`
}

function SlotForm({
  data,
  students,
  groups,
  timezone,
  onDone,
}: {
  data: SlotData
  students: Student[]
  groups: GroupRef[]
  timezone: string
  onDone: () => void
}) {
  const [state, formAction] = useActionState(upsertSlotAction, undefined)
  const [pending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteState, deleteAction] = useActionState(deleteSlotAction, undefined)

  // Controlled start-at so manual edits to the datetime-local input are never
  // overwritten by parent re-renders. Initial value mirrors `data.startAt` in
  // the viewer's timezone.
  const [startAtLocal, setStartAtLocal] = useState(() => toDatetimeLocal(data.startAt, timezone))

  // When the slot being edited changes (e.g. dialog re-opened for a different
  // slot), re-seed the input from the new `data.startAt`.
  useEffect(() => {
    setStartAtLocal(toDatetimeLocal(data.startAt, timezone))
  }, [data.startAt, timezone])

  // Keep the student/group selection in sync with hidden inputs via local state,
  // because shadcn Select is a Radix component (not a native form control).
  const [studentId, setStudentId] = useState(data.student)
  const [groupId, setGroupId] = useState(data.group)
  const [kind, setKind] = useState<SlotKind>(data.kind)
  const [status, setStatus] = useState<SlotStatus>(data.status)
  const [recurrence, setRecurrence] = useState<RecurrenceData>(
    data.recurrence ?? {
      isRecurring: false,
      frequency: 'weekly',
      interval: 1,
      weekdays: [],
      until: '',
      count: '',
    },
  )

  useEffect(() => {
    if (state?.success) {
      toast.success(data.id ? 'Слот обновлён.' : 'Слот добавлен.')
      onDone()
    } else if (state && !state.success) {
      toast.error(state.error)
    }
  }, [state, data.id, onDone])

  useEffect(() => {
    if (deleteState?.success) {
      toast.success('Слот удалён.')
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
        {data.id ? <input type="hidden" name="id" value={data.id} /> : null}
        <input type="hidden" name="timezone" value={timezone} />

        <div className="flex flex-col gap-2">
          <Label htmlFor="slot-startAt">Начало</Label>
          {/* Hidden input carries the current value into FormData for the
              server action; the visible input is controlled so manual edits
              are never overwritten by parent re-renders. */}
          <input type="hidden" name="startAt" value={startAtLocal} />
          <Input
            id="slot-startAt"
            type="datetime-local"
            value={startAtLocal}
            onChange={(e) => setStartAtLocal(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="slot-duration">Длительность</Label>
          <Select name="durationMin" defaultValue={String(data.durationMin)}>
            <SelectTrigger id="slot-duration" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALLOWED_DURATIONS.map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {d} мин
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Тип тренировки */}
        <input type="hidden" name="kind" value={kind} />
        <div className="flex flex-col gap-2">
          <Label htmlFor="slot-kind">Тип тренировки</Label>
          <Select
            value={kind}
            onValueChange={(v) => setKind(v === 'group' ? 'group' : 'individual')}
          >
            <SelectTrigger id="slot-kind" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="individual">Индивидуальная</SelectItem>
              <SelectItem value="group">Групповая</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Участник — ученик (individual) или группа (group) */}
        {kind === 'group' ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="slot-group">Группа</Label>
            <input type="hidden" name="group" value={groupId} />
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger id="slot-group" className="w-full">
                <SelectValue placeholder="Выберите группу" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {groups.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Сначала создайте группу в разделе «Группы».
              </p>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Label htmlFor="slot-student">Ученик</Label>
            <input type="hidden" name="student" value={studentId} />
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger id="slot-student" className="w-full">
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

        <div className="flex flex-col gap-2">
          <Label htmlFor="slot-status">Статус</Label>
          <Select name="status" value={status} onValueChange={(v) => setStatus(v as SlotStatus)}>
            <SelectTrigger id="slot-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="planned">Запланировано</SelectItem>
              <SelectItem value="done">Завершено</SelectItem>
              <SelectItem value="cancelled">Отменено</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="slot-notes">Заметки</Label>
          <Textarea
            id="slot-notes"
            name="notes"
            defaultValue={data.notes ?? ''}
            rows={3}
            placeholder="План тренировки, комментарии…"
          />
        </div>

        {/* Recurrence — disabled when editing a materialized child. */}
        {data.isChild ? null : (
          <div className="flex flex-col gap-3 rounded-md border border-border p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox
                checked={recurrence.isRecurring}
                onCheckedChange={(v) =>
                  setRecurrence((prev) => ({ ...prev, isRecurring: v === true }))
                }
              />
              Повторять
            </label>
            <input
              type="hidden"
              name="isRecurring"
              value={recurrence.isRecurring ? 'true' : 'false'}
            />

            {recurrence.isRecurring ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">Каждые</span>
                  <Select
                    name="recurrence.interval"
                    defaultValue={String(recurrence.interval)}
                    onValueChange={(v) =>
                      setRecurrence((prev) => ({ ...prev, interval: Number(v) }))
                    }
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    name="recurrence.frequency"
                    defaultValue={recurrence.frequency}
                    onValueChange={(v) =>
                      setRecurrence((prev) => ({
                        ...prev,
                        frequency: v === 'daily' ? 'daily' : 'weekly',
                      }))
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">дн.</SelectItem>
                      <SelectItem value="weekly">нед.</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {recurrence.frequency === 'weekly' ? (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs text-muted-foreground">Дни недели</span>
                    <div className="flex gap-1">
                      {WEEKDAY_BUTTONS.map(({ value, label }) => {
                        const active = recurrence.weekdays.includes(value)
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() =>
                              setRecurrence((prev) => ({
                                ...prev,
                                weekdays: active
                                  ? prev.weekdays.filter((w) => w !== value)
                                  : [...prev.weekdays, value],
                              }))
                            }
                            className={cn(
                              'flex size-8 items-center justify-center rounded-md border text-xs font-medium transition-colors',
                              active
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'hover:bg-accent',
                            )}
                          >
                            {label}
                          </button>
                        )
                      })}
                      {/* Hidden inputs carry the selected weekdays into FormData. */}
                      {recurrence.weekdays.map((w) => (
                        <input key={w} type="hidden" name="recurrence.weekdays" value={w} />
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">
                    Окончание (укажите дату ИЛИ количество)
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <Input
                      type="date"
                      name="recurrence.until"
                      value={recurrence.until}
                      onChange={(e) =>
                        setRecurrence((prev) => ({ ...prev, until: e.target.value }))
                      }
                      className="w-44"
                      placeholder="Дата"
                    />
                    <Input
                      type="number"
                      min={1}
                      max={52}
                      name="recurrence.count"
                      value={recurrence.count}
                      onChange={(e) =>
                        setRecurrence((prev) => ({ ...prev, count: e.target.value }))
                      }
                      className="w-28"
                      placeholder="Кол-во"
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {data.id ? (
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

      {/* Delete confirmation */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Удалить слот?</DialogTitle>
            <DialogDescription>
              Действие нельзя отменить. Слот будет удалён без возможности восстановления.
            </DialogDescription>
          </DialogHeader>
          <form action={deleteAction} className="flex flex-col gap-3">
            <input type="hidden" name="id" value={data.id} />
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

/**
 * Controlled dialog for creating / editing a schedule slot.
 * `open` and `onOpenChange` are driven by the parent grid.
 */
export function SlotDialog({
  open,
  onOpenChange,
  data,
  timezone,
  students,
  groups,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: SlotData
  timezone: string
  students: Student[]
  groups: GroupRef[]
}) {
  // Re-mount the form whenever the slot changes so all defaultValues reset.
  const [nonce] = useState(() => Math.random().toString(36).slice(2))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{data.id ? 'Редактирование тренировки' : 'Новая тренировка'}</DialogTitle>
          <DialogDescription>
            Запланируйте тренировку: тип, участник, время, длительность и статус.
          </DialogDescription>
        </DialogHeader>
        <SlotForm
          key={data.id ?? `new-${nonce}`}
          data={data}
          timezone={timezone}
          students={students}
          groups={groups}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
