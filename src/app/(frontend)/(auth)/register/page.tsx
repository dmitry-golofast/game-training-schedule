'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'

import { AuthCard } from '@/app/(frontend)/(auth)/auth-card'
import { registerAction } from '@/app/(frontend)/(auth)/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type Role = 'user' | 'parent' | 'trainer'

const ROLE_OPTIONS: { value: Role; title: string; description: string }[] = [
  {
    value: 'user',
    title: 'Ученик',
    description: 'Управляю своими тренировками и расписанием.',
  },
  {
    value: 'parent',
    title: 'Родитель',
    description: 'Контролирую тренировки своих детей.',
  },
  {
    value: 'trainer',
    title: 'Тренер',
    description: 'Создаю учеников и веду группы. Нужен код приглашения.',
  },
]

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="mt-2 w-full" disabled={pending}>
      {pending ? 'Создаём…' : 'Создать аккаунт'}
    </Button>
  )
}

export default function RegisterPage() {
  const [state, dispatch] = useActionState(registerAction, undefined)
  const [role, setRole] = useState<Role>('user')

  return (
    <AuthCard
      title="Регистрация"
      description="Создайте аккаунт за минуту"
      footer={
        <>
          Уже есть аккаунт?{' '}
          <Link href="/login" className="font-medium text-foreground underline">
            Войти
          </Link>
        </>
      }
    >
      <form action={dispatch} className="flex flex-col gap-4">
        {/* Скрытое поле, несущее итоговую роль в FormData */}
        <input type="hidden" name="role" value={role} />

        {/* Выбор роли — кнопки вместо radio, чтобы гарантированно управлять state */}
        <div className="flex flex-col gap-2">
          <Label>Я регистрируюсь как</Label>
          <div className="flex flex-col gap-2">
            {ROLE_OPTIONS.map((option) => {
              const selected = role === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRole(option.value)}
                  aria-pressed={selected}
                  className={cn(
                    'flex items-start gap-3 rounded-md border p-3 text-left transition-colors hover:bg-accent',
                    selected && 'border-primary bg-accent',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border',
                      selected ? 'border-primary' : 'border-input',
                    )}
                  >
                    {selected ? <span className="size-2 rounded-full bg-primary" /> : null}
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm leading-none font-medium">{option.title}</span>
                    <span className="text-xs text-muted-foreground">{option.description}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Поле «код приглашения» — только для роли Тренер (admin). */}
        {role === 'trainer' && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="inviteCode">Код приглашения</Label>
            <Input
              id="inviteCode"
              name="inviteCode"
              type="text"
              autoComplete="off"
              placeholder="Введите код тренера"
              required
            />
            <p className="text-xs text-muted-foreground">
              Получите код у действующего администратора.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="lastName">
              Фамилия <span className="text-destructive">*</span>
            </Label>
            <Input id="lastName" name="lastName" type="text" autoComplete="family-name" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="firstName">
              Имя <span className="text-destructive">*</span>
            </Label>
            <Input id="firstName" name="firstName" type="text" autoComplete="given-name" required />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="middleName">Отчество</Label>
          <Input id="middleName" name="middleName" type="text" autoComplete="additional-name" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Пароль</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
          <p className="text-xs text-muted-foreground">Минимум 8 символов.</p>
        </div>

        {state?.error ? (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        ) : null}
        <SubmitButton />
      </form>
    </AuthCard>
  )
}
