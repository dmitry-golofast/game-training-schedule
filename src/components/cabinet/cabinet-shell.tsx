import {
  CalendarDaysIcon,
  GraduationCapIcon,
  LayoutDashboardIcon,
  ReceiptIcon,
  SettingsIcon,
  StethoscopeIcon,
  TicketIcon,
  UserIcon,
  UsersIcon,
} from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

import { UserMenu } from '@/components/cabinet/user-menu'
import { ThemeToggle } from '@/components/theme-toggle'
import type { User } from '@/payload-types'

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> }

// Пункты, видимые всем аутентифицированным пользователям.
const COMMON_NAV: NavItem[] = [
  { href: '/cabinet', label: 'Обзор', icon: LayoutDashboardIcon },
  { href: '/cabinet/schedule', label: 'Расписание', icon: CalendarDaysIcon },
  { href: '/cabinet/sick-leaves', label: 'Больничные', icon: StethoscopeIcon },
  { href: '/cabinet/profile', label: 'Профиль', icon: UserIcon },
  { href: '/cabinet/settings', label: 'Настройки', icon: SettingsIcon },
]

// Доп. пункты для тренера-администратора.
const ADMIN_NAV: NavItem[] = [
  { href: '/cabinet/students', label: 'Ученики', icon: GraduationCapIcon },
  { href: '/cabinet/groups', label: 'Группы', icon: UsersIcon },
  { href: '/cabinet/subscriptions', label: 'Абонементы', icon: TicketIcon },
  { href: '/cabinet/payments', label: 'Оплаты', icon: ReceiptIcon },
]

export function CabinetShell({ user, children }: { user: User; children: React.ReactNode }) {
  const nav: NavItem[] = [...COMMON_NAV]
  if (user.role === 'admin') {
    // «Ученики» идёт сразу после «Обзора».
    nav.splice(1, 0, ...ADMIN_NAV)
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-4">
          <Link href="/cabinet" className="font-semibold tracking-tight">
            GTS
          </Link>

          <nav className="flex flex-1 items-center gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <item.icon className="size-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <UserMenu user={user} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  )
}
