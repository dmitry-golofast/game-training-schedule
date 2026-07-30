'use client'

import { ClipboardCheckIcon } from 'lucide-react'
import { useActionState, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { saveAttendanceAction } from '@/app/(frontend)/cabinet/schedule/actions'
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

type Participant = { id: string; name: string }

/**
 * Attendance journal dialog. Shows all participants of a slot (individual →
 * one student; group → all members) with a "present" checkbox each. On save,
 * marks the slot as `done` and triggers per-student write-off for those
 * present only.
 */
export function AttendanceDialog({
  slotId,
  slotLabel,
  participants,
}: {
  slotId: string
  slotLabel: string
  participants: Participant[]
}) {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useActionState(saveAttendanceAction, undefined)
  const shownRef = useRef(false)

  // Track present state per student in local state.
  const [presentMap, setPresentMap] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {}
    for (const p of participants) m[p.id] = true
    return m
  })

  useEffect(() => {
    if (!state) return
    if (shownRef.current) return
    shownRef.current = true
    if (state.success) {
      toast.success('Журнал сохранён.')
      setOpen(false)
    } else if ('error' in state) {
      toast.error(state.error)
      shownRef.current = false
    }
  }, [state])

  const toggle = (id: string) => {
    setPresentMap((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const presentCount = Object.values(presentMap).filter(Boolean).length

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) shownRef.current = false
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="flex items-center gap-1 rounded bg-primary/80 px-2 py-1 text-[11px] font-medium text-primary-foreground transition-colors hover:bg-primary"
        title="Вести журнал посещаемости"
      >
        <ClipboardCheckIcon className="size-3" />
        Журнал
      </button>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Журнал посещаемости</DialogTitle>
          <DialogDescription>{slotLabel}</DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="slotId" value={slotId} />

          <div className="flex flex-col gap-2">
            {participants.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет учеников в тренировке.</p>
            ) : (
              participants.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-3 rounded-md border p-3 hover:bg-accent"
                >
                  <Checkbox
                    checked={presentMap[p.id] ?? true}
                    onCheckedChange={() => toggle(p.id)}
                  />
                  <span className="flex-1 text-sm font-medium">{p.name}</span>
                  <input
                    type="hidden"
                    name={`student_${p.id}`}
                    value={presentMap[p.id] ? 'true' : 'false'}
                  />
                  <span
                    className={
                      presentMap[p.id]
                        ? 'text-xs font-medium text-primary'
                        : 'text-xs text-muted-foreground'
                    }
                  >
                    {presentMap[p.id] ? 'Присутствовал' : 'Отсутствовал'}
                  </span>
                </label>
              ))
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Присутствуют: {presentCount} из {participants.length}. Занятие списывается только у
            присутствующих.
          </p>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Отмена
              </Button>
            </DialogClose>
            <Button type="submit" disabled={participants.length === 0}>
              Сохранить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
