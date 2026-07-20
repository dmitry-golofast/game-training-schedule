'use client'

import { useActionState, useEffect } from 'react'
import { useFormStatus } from 'react-dom'
import { toast } from 'sonner'

import { updateProfileAction } from '@/app/(frontend)/cabinet/profile/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { COMMON_TIMEZONES } from '@/lib/timezone'

const REMINDER_OPTIONS = [0, 1, 2, 3, 6, 12, 24, 48, 72] as const

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Сохраняем…' : 'Сохранить'}
    </Button>
  )
}

export function PreferencesForm({
  name,
  timezone,
  reminderLeadHours,
  detectedTimezone,
}: {
  name: string | null
  timezone: string | null
  reminderLeadHours: number
  detectedTimezone?: string
}) {
  const [state, dispatch] = useActionState(updateProfileAction, undefined)

  useEffect(() => {
    if (state?.success) {
      toast.success('Настройки сохранены.')
    } else if (state && !state.success) {
      toast.error(state.error)
    }
  }, [state])

  return (
    <form action={dispatch} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="pref-name">Имя</Label>
        <Input
          id="pref-name"
          name="name"
          defaultValue={name ?? ''}
          placeholder="Как к вам обращаться"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="pref-tz">Часовой пояс</Label>
        <Select name="timezone" defaultValue={timezone || 'UTC'}>
          <SelectTrigger id="pref-tz" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COMMON_TIMEZONES.map((tz) => (
              <SelectItem key={tz} value={tz}>
                {tz}
              </SelectItem>
            ))}
            {/* Allow arbitrary zones not in the common list (e.g. autodetected). */}
            {timezone &&
            !COMMON_TIMEZONES.includes(timezone as (typeof COMMON_TIMEZONES)[number]) ? (
              <SelectItem value={timezone}>{timezone}</SelectItem>
            ) : null}
          </SelectContent>
        </Select>
        {detectedTimezone && detectedTimezone !== (timezone || 'UTC') ? (
          <button
            type="button"
            className="text-left text-xs text-primary hover:underline"
            // The Select above is Radix-controlled; switching happens on the server save.
            title="Выберите этот часовой пояс из списка"
          >
            Браузер определяет: {detectedTimezone}
          </button>
        ) : null}
        <p className="text-xs text-muted-foreground">Время расписания отображается в этом поясе.</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="pref-reminder">Напоминание перед тренировкой</Label>
        <Select name="reminderLeadHours" defaultValue={String(reminderLeadHours)}>
          <SelectTrigger id="pref-reminder" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REMINDER_OPTIONS.map((h) => (
              <SelectItem key={h} value={String(h)}>
                {h === 0 ? 'Отключено' : `За ${h} ч`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <SubmitButton />
      </div>
    </form>
  )
}
