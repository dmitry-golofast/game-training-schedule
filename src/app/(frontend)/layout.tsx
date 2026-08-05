import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import * as React from 'react'

import { Providers } from '@/components/providers'

import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'eventFit',
    template: '%s · eventFit',
  },
  description: 'Personal cabinet for game training schedules.',
  manifest: '/manifest.webmanifest',
  applicationName: 'eventFit',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'eventFit',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#e01030',
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
