import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { getCurrentUser } from '@/lib/payload'

export default async function HomePage() {
  const user = await getCurrentUser()

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <span className="font-semibold tracking-tight">Game Training Schedule</span>
        <nav className="flex items-center gap-2">
          {user ? (
            <Button asChild>
              <Link href="/cabinet">В кабинет</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/login">Войти</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Регистрация</Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Планируйте тренировки как профи
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Личный кабинет для управления игровым тренировочным расписанием, прогрессом и целями.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/register">Начать бесплатно</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">У меня есть аккаунт</Link>
          </Button>
        </div>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-4 py-6 text-sm text-muted-foreground">
        © {new Date().getFullYear()} Game Training Schedule
      </footer>
    </div>
  )
}
