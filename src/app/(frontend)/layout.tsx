import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import * as React from 'react'

import { Providers } from '@/components/providers'

import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Slotory',
    template: '%s · Slotory',
  },
  description: 'Personal cabinet for game training schedules.',
}

// All pages under (frontend) use Payload Local API (DB access) and must not
// be statically prerendered at build time — the DB is not available during
// the Docker build stage.
export const dynamic = 'force-dynamic'

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
