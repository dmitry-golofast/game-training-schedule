'use client'

import { PlusIcon } from 'lucide-react'
import { useActionState, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { createStudentAction } from '@/app/(frontend)/cabinet/students/actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
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

type Parent = { id: string; name: string; email: string }

function StudentForm({ parents, onDone }: { parents: Parent[]; onDone: () => void }) {
  const [state, formAction] = useActionState(createStudentAction, undefined)
  const [pending, startTransition] = useTransition()

  // When the action returns success, close the dialog + toast.
  if (state?.success) {
    if (state.tempPassword) {
      toast.success(`Ученик создан. Временный пароль: ${state.tempPassword}`, {
        duration: 12000,
        description: 'Передайте пароль ученику и попросите сменить его после входа.',
      })
    } else {
      toast.success('Ученик добавлен.')
    }
    onDone()
  }

  return (
    <form
      action={formAction}
      onSubmit={() => {
        // Wrap in transition so we can show pending state on the button.
        startTransition(() => {})
      }}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="student-name">Имя</Label>
        <Input id="student-name" name="name" type="text" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="student-email">Email</Label>
        <Input id="student-email" name="email" type="email" autoComplete="off" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="student-password">Пароль</Label>
        <Input
          id="student-password"
          name="password"
          type="text"
          autoComplete="off"
          placeholder="Оставьте пустым — сгенерируем автоматически"
        />
        <p className="text-xs text-muted-foreground">
          Минимум 8 символов. Если пусто — создадим случайный и покажем его один раз.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="student-parent">Родитель (необязательно)</Label>
        {/* Hidden input keeps the selected parent id in the form payload. */}
        <input type="hidden" name="parentId" id="student-parent-value" />
        <Select
          onValueChange={(value) => {
            const el = document.getElementById('student-parent-value')
            if (el instanceof HTMLInputElement) el.value = value
          }}
        >
          <SelectTrigger id="student-parent" className="w-full">
            <SelectValue placeholder="Без родителя" />
          </SelectTrigger>
          <SelectContent>
            {parents.map((parent) => (
              <SelectItem key={parent.id} value={parent.id}>
                {parent.name} ({parent.email})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {state?.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? 'Создаём…' : 'Добавить ученика'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function StudentsClient({ parents }: { parents: Parent[] }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon />
          Добавить ученика
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новый ученик</DialogTitle>
          <DialogDescription>
            Ученику будет присвоена роль «Ученик». Он сможет войти, используя email и пароль.
          </DialogDescription>
        </DialogHeader>
        <StudentForm parents={parents} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
