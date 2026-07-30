'use client'

import { ClipboardCheckIcon } from 'lucide-react'
import { useState, useTransition } from 'react'
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
  const [isPending, startTransition] = useTransition()
  const [presentMap, setPresentMap] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {}
    for (const p of participants) m[p.id] = true
    return m
  })

  const toggle = (id: string) => {
    setPresentMap((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const presentCount = Object.values(presentMap).filter(Boolean).length

  const handleSubmit = () => {
    // Build the attendance data directly and call the action.
    const attendance = participants.map((p) => ({
      student: p.id,
      present: presentMap[p.id] ?? true,
    }))

    if (attendance.length === 0) {
      toast.error('Нет учеников для отметки.')
      return
    }

    const formData = new FormData()
    formData.set('slotId', slotId)
    for (const a of attendance) {
      formData.set(`student_${a.student}`, a.present ? 'true' : 'false')
    }

    startTransition(async () => {
      const result = await saveAttendanceAction(undefined, formData)
      if (result?.success) {
        toast.success('Журнал сохранён.')
        setOpen(false)
      } else if (result && !result.success) {
        toast.error(result.error)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => setOpen(v)}>
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

        <div className="flex flex-col gap-2">
          {participants.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет учеников в тренировке.</p>
          ) : (
            participants.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-3 rounded-md border p-3 hover:bg-accent"
              >
                <Checkbox checked={presentMap[p.id] ?? true} onCheckedChange={() => toggle(p.id)} />
                <span className="flex-1 text-sm font-medium">{p.name}</span>
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
          <Button
            type="button"
            disabled={isPending || participants.length === 0}
            onClick={handleSubmit}
          >
            {isPending ? 'Сохраняем…' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
