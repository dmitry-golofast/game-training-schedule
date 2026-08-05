'use client'

import { CameraIcon, Trash2Icon } from 'lucide-react'
import { useActionState, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { updateProfileAction } from '@/app/(frontend)/cabinet/profile/actions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { computeAge } from '@/lib/profile-shared'

function initials(value?: string | null) {
  if (!value) return '?'
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * Self-profile edit form (rendered in the «Аккаунт» tab).
 *
 * Phone visibility is age-driven for students (role `user`):
 *  - under 18: «Телефон родителя» (required) + «Мой телефон» (optional);
 *  - 18+ / no birthDate / non-student roles: only «Мой телефон».
 */
export function ProfileEditForm({
  firstName,
  lastName,
  middleName,
  birthDate,
  phone,
  parentPhone,
  role,
  avatarUrl,
}: {
  firstName: string | null
  lastName: string | null
  middleName: string | null
  birthDate: string | null
  phone: string | null
  parentPhone: string | null
  role: string
  avatarUrl: string | null
}) {
  const [state, formAction] = useActionState(updateProfileAction, undefined)
  const [pending, setPending] = useState(false)

  const [birthDateValue, setBirthDateValue] = useState(birthDate?.slice(0, 10) ?? '')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(avatarUrl)
  const [removeAvatar, setRemoveAvatar] = useState(false)

  const isStudent = role === 'user'
  const age = useMemo(() => computeAge(birthDateValue), [birthDateValue])
  const isMinor = isStudent && age !== null && age < 18

  useEffect(() => {
    if (state?.success) {
      toast.success('Профиль обновлён.')
      setPending(false)
    } else if (state && !state.success) {
      toast.error(state.error)
      setPending(false)
    }
  }, [state])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarPreview(URL.createObjectURL(file))
      setRemoveAvatar(false)
    }
  }

  const fullName = [lastName, firstName].filter(Boolean).join(' ') || undefined

  return (
    <form action={formAction} className="flex flex-col gap-5" onSubmit={() => setPending(true)}>
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar className="size-20">
            {avatarPreview && !removeAvatar ? (
              <AvatarImage src={avatarPreview} alt={fullName ?? 'avatar'} />
            ) : null}
            <AvatarFallback className="text-lg">{initials(fullName)}</AvatarFallback>
          </Avatar>
          <label
            htmlFor="avatar-upload"
            className="absolute -right-1 -bottom-1 flex size-7 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            title="Загрузить фото"
          >
            <CameraIcon className="size-4" />
          </label>
          <input
            id="avatar-upload"
            type="file"
            name="avatar"
            accept="image/*"
            className="hidden"
            onChange={onFileChange}
          />
        </div>
        <div className="flex flex-col gap-1">
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
          ) : (
            <span className="text-xs text-muted-foreground">PNG или JPG, до ~5 МБ.</span>
          )}
        </div>
        {removeAvatar ? <input type="hidden" name="clearAvatar" value="1" /> : null}
      </div>

      {/* Name parts */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="pf-lastName">
            Фамилия <span className="text-destructive">*</span>
          </Label>
          <Input id="pf-lastName" name="lastName" defaultValue={lastName ?? ''} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="pf-firstName">
            Имя <span className="text-destructive">*</span>
          </Label>
          <Input id="pf-firstName" name="firstName" defaultValue={firstName ?? ''} required />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="pf-middleName">Отчество</Label>
        <Input id="pf-middleName" name="middleName" defaultValue={middleName ?? ''} />
      </div>

      {/* Birth date + age */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="pf-birthDate">Дата рождения</Label>
        <Input
          id="pf-birthDate"
          name="birthDate"
          type="date"
          value={birthDateValue}
          onChange={(e) => setBirthDateValue(e.target.value)}
        />
        {age !== null ? <p className="text-xs text-muted-foreground">Возраст: {age} лет</p> : null}
      </div>

      {/* My phone (always visible, optional) */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="pf-phone">Мой телефон</Label>
        <Input
          id="pf-phone"
          name="phone"
          type="tel"
          defaultValue={phone ?? ''}
          placeholder="+7 ..."
        />
      </div>

      {/* Parent phone — only for minor students */}
      {isMinor ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="pf-parentPhone">
            Телефон родителя <span className="text-destructive">*</span>
          </Label>
          <Input
            id="pf-parentPhone"
            name="parentPhone"
            type="tel"
            defaultValue={parentPhone ?? ''}
            placeholder="+7 ..."
            required
          />
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? 'Сохраняем…' : 'Сохранить'}
        </Button>
      </div>
    </form>
  )
}
