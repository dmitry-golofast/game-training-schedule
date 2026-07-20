'use client'

import { MoonIcon, SunIcon } from 'lucide-react'
import { useTheme } from 'next-themes'

import { Button } from '@/components/ui/button'

/**
 * Light/dark/system theme toggle. Uses next-themes; mounted only on the
 * client to avoid hydration mismatch on the resolved theme.
 */
export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Переключить тему"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      <SunIcon className="hidden dark:inline" />
      <MoonIcon className="inline dark:hidden" />
    </Button>
  )
}
