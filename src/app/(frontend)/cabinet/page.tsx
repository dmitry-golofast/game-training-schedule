import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getCurrentUser } from '@/lib/payload'

export default async function CabinetDashboard() {
  const user = await getCurrentUser()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Привет, {user?.name || user?.email}
        </h1>
        <p className="text-sm text-muted-foreground">
          Здесь будет сводка по вашим тренировкам и расписанию.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Расписание</CardTitle>
            <CardDescription>Запланированные тренировки</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">0</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Прогресс</CardTitle>
            <CardDescription>Выполнено за неделю</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">0%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Заметки</CardTitle>
            <CardDescription>Ваши личные записи</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">0</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
