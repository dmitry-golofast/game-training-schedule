'use client'

import { CameraIcon, PencilIcon, Trash2Icon } from 'lucide-react'
import { useActionState, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { updateStudentAction } from '@/app/(frontend)/cabinet/students/actions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import { computeAge } from '@/lib/profile-shared'

type StudentData = {
  id: string
  firstName?: string | null
  lastName?: string | null
  middleName?: string | null
  birthDate?: string | null
  phone?: string | null
  parentPhone?: string | null
  avatarUrl?: string | null
}

function initials(value?: string | null) {
  if (!value) return '?'
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function EditForm({ student, onDone }: { student: StudentData; onDone: () => void }) {
  const [state, formAction] = useActionState(updateStudentAction, undefined)
  const [pending, setPending] = useState(false)
  const [birthDate, setBirthDate] = useState(student.birthDate?.slice(0, 10) ?? '')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(student.avatarUrl ?? null)
  const [removeAvatar, setRemoveAvatar] = useState(false)

  const age = computeAge(birthDate)
  const isMinor = age !== null && age < 18

  useEffect(() => {
    if (state?.success) {
      toast.success('Профиль ученика обновлён.')
      setPending(false)
      onDone()
    } else if (state?.error) {
      toast.error(state.error)
      setPending(false)
    }
  }, [state, onDone])

  const fullName = [student.lastName, student.firstName].filter(Boolean).join(' ') || undefined

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarPreview(URL.createObjectURL(file))
      setRemoveAvatar(false)
    }
  }

  return (
    <form action={formAction} onSubmit={() => setPending(true)} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={student.id} />

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar className="size-16">
            {avatarPreview && !removeAvatar ? (
              <AvatarImage src={avatarPreview} alt={fullName ?? 'avatar'} />
            ) : null}
            <AvatarFallback>{initials(fullName)}</AvatarFallback>
          </Avatar>
          <label
            htmlFor="edit-avatar-upload"
            className="absolute -right-1 -bottom-1 flex size-6 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            title="Загрузить фото"
          >
            <CameraIcon className="size-3.5" />
          </label>
          <input
            id="edit-avatar-upload"
            type="file"
            name="avatar"
            accept="image/*"
            className="hidden"
            onChange={onFileChange}
          />
        </div>
        {avatarPreview && !removeAvatar ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => {
              setRemoveAvatar(true)
              setAvatarPreview(null)
            }}
          >
            <Trash2Icon className="size-4" />
            Удалить фото
          </Button>
        ) : null}
        {removeAvatar ? <input type="hidden" name="clearAvatar" value="1" /> : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        <Label htmlFor="edit-phone">Мой телефон</Label>
        <Input
          id="edit-phone"
          name="phone"
          type="tel"
          defaultValue={student.phone ?? ''}
          placeholder="+7 ..."
        />
      </div>

      {isMinor ? (
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
      ) : null}

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
          <DialogDescription>
            Изменение личных данных, телефона и фотографии ученика.
          </DialogDescription>
        </DialogHeader>
        <EditForm student={student} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
