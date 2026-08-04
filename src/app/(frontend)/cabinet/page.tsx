import { cookies } from 'next/headers'
import { CheckCircle2Icon, ClockIcon, FlameIcon } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDuration, getCompletedStats, getStreak } from '@/lib/stats'
import { getCurrentUser, getPayloadClient } from '@/lib/payload'
import { isAdminLike } from '@/lib/roles'
import { getUserTimezoneFromCookie } from '@/lib/timezone'

export default async function CabinetDashboard() {
  const me = await getCurrentUser()
  if (!me) return null

  const payload = await getPayloadClient()
  const cookieStore = await cookies()
  const tz = getUserTimezoneFromCookie(cookieStore.get('tz')?.value, me.timezone)
  const admin = isAdminLike(me.role)

  const [completed, streak] = await Promise.all([
    getCompletedStats(payload, me),
    getStreak(payload, me, tz),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Привет, {me.name || me.email}</h1>
        <p className="text-sm text-muted-foreground">
          {admin
            ? 'Сводка по тренировкам всех учеников.'
            : 'Сводка по вашим тренировкам и абонементу.'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2Icon className="size-5 text-primary" />
              Тренировки
            </CardTitle>
            <CardDescription>Завершено на неделе</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{completed.thisWeek}</p>
            <p className="mt-1 text-xs text-muted-foreground">всего завершено: {completed.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClockIcon className="size-5 text-primary" />
              Время
            </CardTitle>
            <CardDescription>Часов на неделе</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatDuration(completed.minutesThisWeek)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              всего: {formatDuration(completed.totalMinutes)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlameIcon className="size-5 text-primary" />
              Серия дней
            </CardTitle>
            <CardDescription>Подряд с тренировками</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {streak.current}
              {streak.current > 0 ? <span className="ml-1">🔥</span> : null}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">текущая · рекорд {streak.best}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
