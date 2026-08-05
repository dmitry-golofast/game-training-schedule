'use client'

import {
  CalendarDaysIcon,
  GraduationCapIcon,
  LayoutDashboardIcon,
  MenuIcon,
  ReceiptIcon,
  SettingsIcon,
  StethoscopeIcon,
  TicketIcon,
  UserIcon,
  UsersIcon,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as React from 'react'

import { UserMenu } from '@/components/cabinet/user-menu'
import { ThemeToggle } from '@/components/theme-toggle'
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import type { User } from '@/payload-types'
import { isAdminLike } from '@/lib/roles'

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> }

// Пункты, видимые всем аутентифицированным пользователям.
const COMMON_NAV: NavItem[] = [
  { href: '/cabinet', label: 'Обзор', icon: LayoutDashboardIcon },
  { href: '/cabinet/schedule', label: 'Расписание', icon: CalendarDaysIcon },
  { href: '/cabinet/subscriptions', label: 'Абонементы', icon: TicketIcon },
  { href: '/cabinet/sick-leaves', label: 'Больничные', icon: StethoscopeIcon },
  { href: '/cabinet/profile', label: 'Профиль', icon: UserIcon },
  { href: '/cabinet/settings', label: 'Настройки', icon: SettingsIcon },
]

// Доп. пункты для тренера-администратора.
const ADMIN_NAV: NavItem[] = [
  { href: '/cabinet/students', label: 'Ученики', icon: GraduationCapIcon },
  { href: '/cabinet/groups', label: 'Группы', icon: UsersIcon },
  { href: '/cabinet/payments', label: 'Оплаты', icon: ReceiptIcon },
]

function buildNav(role: string): NavItem[] {
  const nav = [...COMMON_NAV]
  if (isAdminLike(role)) {
    nav.splice(1, 0, ...ADMIN_NAV)
  }
  return nav
}

function NavList({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = pathname === item.href
        return (
          <SheetClose asChild key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'inline-flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          </SheetClose>
        )
      })}
    </nav>
  )
}

// Quick actions pinned to the mobile bottom bar. The rest of the navigation
// (Обзор, Абонементы, Ученики, Группы, Оплаты, Больничные) stays in the drawer
// opened via the Menu button.
const QUICK_NAV: NavItem[] = [
  { href: '/cabinet/schedule', label: 'Расписание', icon: CalendarDaysIcon },
  { href: '/cabinet/profile', label: 'Профиль', icon: UserIcon },
  { href: '/cabinet/settings', label: 'Настройки', icon: SettingsIcon },
]

/** Bottom navigation bar — mobile only. First button opens the drawer. */
function MobileTabBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Быстрая навигация"
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-border bg-background/95 backdrop-blur md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <TabBarButton label="Меню" icon={MenuIcon} active={false} onClick={onOpenMenu} />
      {QUICK_NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link key={item.href} href={item.href} className="contents">
            <TabBarButton label={item.label} icon={item.icon} active={active} />
          </Link>
        )
      })}
    </nav>
  )
}

function TabBarButton({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  active: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
        active ? 'text-primary' : 'text-muted-foreground',
      )}
    >
      <Icon className="size-5" />
      <span className="leading-none">{label}</span>
    </button>
  )
}

export function CabinetShell({
  user,
  avatarUrl,
  children,
}: {
  user: User
  avatarUrl?: string | null
  children: React.ReactNode
}) {
  const nav = buildNav(user.role)
  const [menuOpen, setMenuOpen] = React.useState(false)

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4">
          {/* Logo */}
          <Link href="/cabinet" className="font-semibold tracking-tight">
            eventFit
          </Link>

          {/* Desktop nav */}
          <nav className="hidden flex-1 items-center gap-1 md:flex">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <item.icon className="size-4" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Spacer for mobile (nav is in the bottom bar) */}
          <div className="flex-1 md:hidden" />

          {/* Controls */}
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <UserMenu user={user} avatarUrl={avatarUrl} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 pb-24 md:pb-8">{children}</main>

      {/* Mobile bottom bar + drawer controlled by it */}
      <MobileTabBar onOpenMenu={() => setMenuOpen(true)} />
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-72">
          <SheetHeader>
            <SheetTitle className="px-0">Меню</SheetTitle>
          </SheetHeader>
          <div className="px-2">
            <NavList items={nav} onNavigate={() => setMenuOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
