import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import * as React from 'react'

import { Providers } from '@/components/providers'

import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Game Training Schedule',
    template: '%s · Game Training Schedule',
  },
  description: 'Personal cabinet for game training schedules.',
}

export default function FrontendLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
