'use client'

import { PlusIcon } from 'lucide-react'
import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
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

/** Compute age from a YYYY-MM-DD string. Returns null if invalid/empty. */
function ageFromBirth(value: string): number | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1
  return age >= 0 ? age : null
}

function StudentForm({ parents, onDone }: { parents: Parent[]; onDone: () => void }) {
  const [state, formAction] = useActionState(createStudentAction, undefined)
  const [pending, startTransition] = useTransition()
  const [birthDate, setBirthDate] = useState('')
  const [parentId, setParentId] = useState('')
  const shownRef = useRef(false)

  const age = ageFromBirth(birthDate)
  const isMinor = age !== null && age < 18

  useEffect(() => {
    if (!state) return
    // Prevent duplicate toasts: only fire once per state object.
    if (shownRef.current) return
    shownRef.current = true

    if (state.success) {
      if (state.tempPassword) {
        toast.success(`Ученик создан. Временный пароль: ${state.tempPassword}`, {
          duration: 12000,
          description: 'Передайте пароль ученику и попросите сменить его после входа.',
        })
      } else {
        toast.success('Ученик добавлен.')
      }
      onDone()
    } else if (state.error) {
      toast.error(state.error)
      // Reset flag so the user sees a toast on the next attempt.
      shownRef.current = false
    }
  }, [state, onDone])

  return (
    <form
      action={formAction}
      onSubmit={() => startTransition(() => {})}
      className="flex flex-col gap-4"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="student-lastName">
            Фамилия <span className="text-destructive">*</span>
          </Label>
          <Input id="student-lastName" name="lastName" type="text" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="student-firstName">
            Имя <span className="text-destructive">*</span>
          </Label>
          <Input id="student-firstName" name="firstName" type="text" required />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="student-middleName">Отчество</Label>
        <Input id="student-middleName" name="middleName" type="text" placeholder="Необязательно" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="student-birthDate">Дата рождения</Label>
        <Input
          id="student-birthDate"
          name="birthDate"
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
        />
        {age !== null ? (
          <p className="text-xs text-muted-foreground">
            Возраст: {age} лет
            {isMinor ? ' (несовершеннолетний — телефон родителя обязателен)' : ''}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="student-parentPhone">
          Телефон родителя
          {isMinor ? <span className="text-destructive"> *</span> : null}
        </Label>
        <Input
          id="student-parentPhone"
          name="parentPhone"
          type="tel"
          placeholder="+7 ..."
          required={isMinor}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="student-email">
          Email <span className="text-destructive">*</span>
        </Label>
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
        <Label htmlFor="student-parent">
          Родитель
          {isMinor ? <span className="text-destructive"> *</span> : null}
        </Label>
        <input type="hidden" name="parentId" value={parentId} />
        <Select value={parentId} onValueChange={setParentId}>
          <SelectTrigger id="student-parent" className="w-full">
            <SelectValue placeholder={isMinor ? 'Выберите родителя' : 'Без родителя'} />
          </SelectTrigger>
          <SelectContent>
            {parents.map((parent) => (
              <SelectItem key={parent.id} value={parent.id}>
                {parent.name} ({parent.email})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isMinor ? (
          <p className="text-xs text-muted-foreground">
            Для учащихся младше 18 лет выбор родителя обязателен.
          </p>
        ) : null}
      </div>

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
      <DialogContent className="sm:max-w-lg">
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
