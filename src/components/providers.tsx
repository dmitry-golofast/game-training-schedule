'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

import { Toaster } from '@/components/ui/sonner'

/**
 * Client-side providers shared across the frontend route group.
 * - ThemeProvider: persists light/dark/system choice, applies `.dark` class.
 * - Toaster: sonner toast portal mounted once at the root.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
      <Toaster richColors closeButton />
    </NextThemesProvider>
  )
}
