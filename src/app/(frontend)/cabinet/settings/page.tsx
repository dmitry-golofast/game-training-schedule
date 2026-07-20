import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = { title: 'Настройки' }

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Настройки</h1>
        <p className="text-sm text-muted-foreground">Предпочтения и параметры аккаунта.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Уведомления</CardTitle>
          <CardDescription>Скоро: управление email-уведомлениями.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Раздел в разработке.</p>
        </CardContent>
      </Card>
    </div>
  )
}
