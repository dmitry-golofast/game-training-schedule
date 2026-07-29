'use client'

import { PencilIcon } from 'lucide-react'
import { useActionState, useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { updateStudentAction } from '@/app/(frontend)/cabinet/students/actions'
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

type StudentData = {
  id: string
  firstName?: string | null
  lastName?: string | null
  middleName?: string | null
  birthDate?: string | null
  parentPhone?: string | null
}

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

function EditForm({ student, onDone }: { student: StudentData; onDone: () => void }) {
  const [state, formAction] = useActionState(updateStudentAction, undefined)
  const [pending, startTransition] = useTransition()
  const [birthDate, setBirthDate] = useState(student.birthDate?.slice(0, 10) ?? '')

  const age = ageFromBirth(birthDate)
  const isMinor = age !== null && age < 18

  useEffect(() => {
    if (state?.success) {
      toast.success('Профиль обновлён.')
      onDone()
    } else if (state?.error) {
      toast.error(state.error)
    }
  }, [state, onDone])

  return (
    <form
      action={formAction}
      onSubmit={() => startTransition(() => {})}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="id" value={student.id} />

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-lastName">
            Фамилия <span className="text-destructive">*</span>
          </Label>
          <Input
            id="edit-lastName"
            name="lastName"
            type="text"
            defaultValue={student.lastName ?? ''}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-firstName">
            Имя <span className="text-destructive">*</span>
          </Label>
          <Input
            id="edit-firstName"
            name="firstName"
            type="text"
            defaultValue={student.firstName ?? ''}
            required
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-middleName">Отчество</Label>
        <Input
          id="edit-middleName"
          name="middleName"
          type="text"
          defaultValue={student.middleName ?? ''}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-birthDate">Дата рождения</Label>
        <Input
          id="edit-birthDate"
          name="birthDate"
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
        />
        {age !== null ? <p className="text-xs text-muted-foreground">Возраст: {age} лет</p> : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-parentPhone">
          Телефон родителя
          {isMinor ? <span className="text-destructive"> *</span> : null}
        </Label>
        <Input
          id="edit-parentPhone"
          name="parentPhone"
          type="tel"
          defaultValue={student.parentPhone ?? ''}
          placeholder="+7 ..."
          required={isMinor}
        />
      </div>

      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? 'Сохраняем…' : 'Сохранить'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function EditStudentDialog({ student }: { student: StudentData }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PencilIcon />
          Редактировать
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Редактирование ученика</DialogTitle>
          <DialogDescription>Изменение личных данных ученика.</DialogDescription>
        </DialogHeader>
        <EditForm student={student} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
