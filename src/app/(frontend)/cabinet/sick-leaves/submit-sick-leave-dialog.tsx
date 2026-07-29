'use client'

import { StethoscopeIcon } from 'lucide-react'
import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { createSickLeaveAction } from '@/app/(frontend)/cabinet/sick-leaves/actions'
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

type Child = { id: string; name: string }
type Slot = { id: string; startAt: string; label: string }

function SubmitForm({
  children,
  slots,
  onDone,
}: {
  children: Child[]
  slots: Slot[]
  onDone: () => void
}) {
  const [state, formAction] = useActionState(createSickLeaveAction, undefined)
  const [isPending, startTransition] = useTransition()
  const [selectedChild, setSelectedChild] = useState(children[0]?.id ?? '')
  const [selectedSlot, setSelectedSlot] = useState('')
  const shownRef = useRef(false)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (!state) return
    if (shownRef.current) return
    shownRef.current = true
    if (state.success) {
      toast.success('Заявка на больничный подана.')
      formRef.current?.reset()
      onDone()
    } else if ('error' in state) {
      toast.error(state.error)
      shownRef.current = false
    }
  }, [state, onDone])

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={() => startTransition(() => {})}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="student" value={selectedChild} />
      <input type="hidden" name="slot" value={selectedSlot} />

      {children.length > 1 ? (
        <div className="flex flex-col gap-2">
          <Label>Ученик</Label>
          <Select value={selectedChild} onValueChange={setSelectedChild}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Выберите ученика" />
            </SelectTrigger>
            <SelectContent>
              {children.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="sick-slot">Тренировка</Label>
        <Select value={selectedSlot} onValueChange={setSelectedSlot}>
          <SelectTrigger id="sick-slot" className="w-full">
            <SelectValue placeholder="Выберите тренировку" />
          </SelectTrigger>
          <SelectContent>
            {slots.length === 0 ? (
              <SelectItem value="" disabled>
                Нет предстоящих тренировок
              </SelectItem>
            ) : (
              slots.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="sick-reason">Причина</Label>
        <Textarea
          id="sick-reason"
          name="reason"
          rows={3}
          placeholder="Описание болезни / причина пропуска"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="sick-file">Справка (PDF, изображение)</Label>
        <Input id="sick-file" name="file" type="file" accept="application/pdf,image/*" />
        <p className="text-xs text-muted-foreground">Необязательно, но рекомендуется приложить.</p>
      </div>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Отмена
          </Button>
        </DialogClose>
        <Button type="submit" disabled={isPending || (!selectedSlot && slots.length === 0)}>
          {isPending ? 'Отправляем…' : 'Подать'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function SubmitSickLeaveDialog({ children, slots }: { children: Child[]; slots: Slot[] }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <StethoscopeIcon />
          Подать больничный
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Заявка на больничный</DialogTitle>
          <DialogDescription>
            Выберите тренировку, опишите причину и приложите справку при необходимости.
          </DialogDescription>
        </DialogHeader>
        <SubmitForm children={children} slots={slots} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
