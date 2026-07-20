import { redirect } from 'next/navigation'
import * as React from 'react'

import { CabinetShell } from '@/components/cabinet/cabinet-shell'
import { getCurrentUser } from '@/lib/payload'

/**
 * Server-side route guard for the whole cabinet route group.
 * Resolves the current session via the `payload-token` cookie; redirects
 * unauthenticated users to the login page.
 */
export default async function CabinetLayout(props: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return <CabinetShell user={user}>{props.children}</CabinetShell>
}
