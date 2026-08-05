'use client'

import { useState } from 'react'

import { ChildrenSection } from '@/app/(frontend)/cabinet/profile/children-section'
import { DocumentsSection } from '@/app/(frontend)/cabinet/profile/documents-section'
import { PaymentHistory } from '@/app/(frontend)/cabinet/profile/payment-history'
import { PreferencesForm } from '@/app/(frontend)/cabinet/profile/preferences-form'
import { ProfileEditForm } from '@/app/(frontend)/cabinet/profile/profile-edit-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

type StudentRef = { id: string; name: string }
type ChildRef = { id: string; name: string; email: string; birthDate?: string | null }

type Subscription = {
  id: string
  kind: 'individual' | 'group'
  totalCredits: number
  remainingCredits: number
  validFrom?: string | null
  validUntil?: string | null
  student?: { id: string; name: string } | null
}

type Payment = {
  id: string
  amount: number
  currency?: string | null
  periodFrom: string
  periodTo: string
  method?: string | null
  paidAt: string
  student?: { id: string; name: string } | null
}

type DocumentItem = {
  id: string
  docType: 'medic' | 'contract' | 'other'
  title: string
  filename?: string | null
  url?: string | null
  createdAt: string
  student?: { id: string; name: string } | null
}

type Tab = {
  id: string
  label: string
  badge?: number
}

export function ProfileTabs({
  account,
  children,
  subscriptions,
  payments,
  documents,
  viewableStudents,
  canSelectStudent,
  isParent,
  reminderLeadHours,
}: {
  account: {
    id: string
    name: string
    email: string
    role: string
    rawRole: string
    firstName?: string | null
    lastName?: string | null
    middleName?: string | null
    birthDate?: string | null
    phone?: string | null
    parentPhone?: string | null
    avatarUrl?: string | null
  }
  children: ChildRef[]
  subscriptions: Subscription[]
  payments: Payment[]
  documents: DocumentItem[]
  viewableStudents: StudentRef[]
  canSelectStudent: boolean
  isParent: boolean
  reminderLeadHours: number
}) {
  const [activeTab, setActiveTab] = useState('account')

  const tabs: Tab[] = [
    { id: 'account', label: 'Аккаунт' },
    { id: 'subscription', label: 'Абонемент', badge: subscriptions.length },
    { id: 'payments', label: 'Оплаты', badge: payments.length },
    { id: 'documents', label: 'Документы', badge: documents.length },
    { id: 'settings', label: 'Настройки' },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Tab bar — horizontal scroll on mobile, static on desktop */}
      <div className="-mx-4 [scrollbar-width:none] overflow-x-auto border-b border-border px-4 [-ms-overflow-style:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-1 pb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
              {tab.badge != null && tab.badge > 0 ? (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                    activeTab === tab.id
                      ? 'bg-primary/15 text-primary'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {tab.badge}
                </span>
              ) : null}
              {activeTab === tab.id ? (
                <span className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-primary" />
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="min-h-[300px]">
        {activeTab === 'account' && (
          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Личные данные</CardTitle>
                <CardDescription>
                  ФИО, дата рождения, телефон и фотография. Видны только вам и администраторам.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProfileEditForm
                  firstName={account.firstName ?? null}
                  lastName={account.lastName ?? null}
                  middleName={account.middleName ?? null}
                  birthDate={account.birthDate ?? null}
                  phone={account.phone ?? null}
                  parentPhone={account.parentPhone ?? null}
                  role={account.rawRole}
                  avatarUrl={account.avatarUrl ?? null}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Учётная запись</CardTitle>
                <CardDescription>Email и роль изменить нельзя.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Row label="Email" value={account.email} />
                <Separator />
                <Row label="Роль" value={account.role} />
              </CardContent>
            </Card>

            {isParent ? (
              <Card>
                <CardHeader>
                  <CardTitle>Мои дети</CardTitle>
                  <CardDescription>
                    Привяжите учеников по их email, чтобы видеть их расписание и данные.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChildrenSection children={children} />
                </CardContent>
              </Card>
            ) : null}
          </div>
        )}

        {activeTab === 'subscription' && (
          <Card>
            <CardHeader>
              <CardTitle>Абонемент ({subscriptions.length})</CardTitle>
              <CardDescription>
                Сколько тренировок осталось и до какой даты действует.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {subscriptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Активных абонементов нет.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {subscriptions.map((sub) => {
                    const pct =
                      sub.totalCredits > 0
                        ? Math.round((sub.remainingCredits / sub.totalCredits) * 100)
                        : 0
                    return (
                      <div key={sub.id} className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {sub.student?.name ?? ''} ·{' '}
                            {sub.kind === 'group' ? 'Групповой' : 'Индивидуальный'}
                          </span>
                          <span className="text-sm">
                            Осталось <span className="font-semibold">{sub.remainingCredits}</span>{' '}
                            из {sub.totalCredits}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Действует до: {sub.validUntil?.slice(0, 10)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'payments' && (
          <Card>
            <CardHeader>
              <CardTitle>Оплаты ({payments.length})</CardTitle>
              <CardDescription>История платежей с периодами.</CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentHistory payments={payments} />
            </CardContent>
          </Card>
        )}

        {activeTab === 'documents' && (
          <Card>
            <CardHeader>
              <CardTitle>Документы ({documents.length})</CardTitle>
              <CardDescription>Медицинские справки, договоры, чеки и другие файлы.</CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentsSection
                documents={documents}
                students={viewableStudents}
                canSelectStudent={canSelectStudent}
              />
            </CardContent>
          </Card>
        )}

        {activeTab === 'settings' && (
          <Card>
            <CardHeader>
              <CardTitle>Настройки</CardTitle>
              <CardDescription>
                Имя для отображения и время напоминания о тренировке.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PreferencesForm
                firstName={account.firstName ?? null}
                lastName={account.lastName ?? null}
                reminderLeadHours={reminderLeadHours}
              />
            </CardContent>
          </Card>
        )}
      </div>
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
