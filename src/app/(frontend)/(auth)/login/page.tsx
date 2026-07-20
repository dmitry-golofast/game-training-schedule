'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

import { AuthCard } from '@/app/(frontend)/(auth)/auth-card'
import { loginAction } from '@/app/(frontend)/(auth)/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="mt-2 w-full" disabled={pending}>
      {pending ? 'Входим…' : 'Войти'}
    </Button>
  )
}

export default function LoginPage() {
  const [state, dispatch] = useActionState(loginAction, undefined)

  return (
    <AuthCard
      title="Вход"
      description="Войдите в личный кабинет"
      footer={
        <>
          Нет аккаунта?{' '}
          <Link href="/register" className="font-medium text-foreground underline">
            Зарегистрироваться
          </Link>
        </>
      }
    >
      <form action={dispatch} className="flex flex-col gap-4">
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
            autoComplete="current-password"
            required
          />
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
