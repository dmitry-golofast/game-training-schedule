import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { PreferencesForm } from '@/app/(frontend)/cabinet/profile/preferences-form'
import { getCurrentUser } from '@/lib/payload'
import { timezoneLabel } from '@/lib/timezone'

export const metadata = { title: 'Профиль' }

export default async function ProfilePage() {
  const user = await getCurrentUser()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Профиль</h1>
        <p className="text-sm text-muted-foreground">Учётная информация и предпочтения.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Данные аккаунта</CardTitle>
          <CardDescription>Эти данные видны только вам и администраторам.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Row label="Имя" value={user?.name || '—'} />
          <Separator />
          <Row label="Email" value={user?.email} />
          <Separator />
          <Row
            label="Роль"
            value={
              user?.role === 'admin'
                ? 'Тренер (администратор)'
                : user?.role === 'parent'
                  ? 'Родитель'
                  : 'Ученик'
            }
          />
          <Separator />
          <Row label="Часовой пояс" value={user?.timezone ? timezoneLabel(user.timezone) : '—'} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Настройки</CardTitle>
          <CardDescription>
            Имя для отображения, часовой пояс расписания и напоминания.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PreferencesForm
            name={user?.name ?? null}
            timezone={user?.timezone ?? null}
            reminderLeadHours={
              typeof user?.reminderLeadHours === 'number' ? user.reminderLeadHours : 24
            }
          />
        </CardContent>
      </Card>
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}
