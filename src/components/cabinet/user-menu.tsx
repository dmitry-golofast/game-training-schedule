'use client'

import { LogOutIcon, SettingsIcon, UserIcon } from 'lucide-react'
import Link from 'next/link'
import { useTransition } from 'react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { logoutAction } from '@/app/(frontend)/(auth)/actions'

function initials(value?: string | null) {
  if (!value) return '?'
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

const ROLE_LABELS: Record<string, string> = {
  user: 'Ученик',
  parent: 'Родитель',
  trainer: 'Тренер',
  admin: 'Администратор',
}

export function UserMenu({
  user,
}: {
  user: { email: string; name?: string | null; role?: string | null }
}) {
  const [isPending, startTransition] = useTransition()

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction()
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Avatar>
            <AvatarImage alt={user.name ?? user.email} />
            <AvatarFallback>{initials(user.name ?? user.email)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate">{user.name || 'Без имени'}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
          {user.role ? (
            <span className="text-xs font-medium text-foreground">
              {ROLE_LABELS[user.role] ?? user.role}
            </span>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/cabinet/profile">
            <UserIcon />
            Профиль
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/cabinet/settings">
            <SettingsIcon />
            Настройки
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={isPending}
          onClick={(e) => {
            e.preventDefault()
            handleLogout()
          }}
        >
          <LogOutIcon />
          {isPending ? 'Выходим…' : 'Выйти'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
