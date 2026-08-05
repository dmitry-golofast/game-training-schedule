import { redirect } from 'next/navigation'
import * as React from 'react'

import { CabinetShell } from '@/components/cabinet/cabinet-shell'
import { TimezoneSync } from '@/components/cabinet/timezone-sync'
import { getCurrentUser, getPayloadClient } from '@/lib/payload'
import { resolveAvatarUrl } from '@/lib/profile'

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

  // Populate the avatar media so we can pass its public URL down to UserMenu.
  // getCurrentUser() returns the JWT payload, where `avatar` is a bare id.
  const payload = await getPayloadClient()
  const detailed = await payload.findByID({
    collection: 'users',
    id: user.id,
    overrideAccess: false,
    user,
    depth: 1,
  })
  const avatarUrl = resolveAvatarUrl(detailed.avatar)

  return (
    <CabinetShell user={user} avatarUrl={avatarUrl}>
      <TimezoneSync storedTimezone={user.timezone ?? null} />
      {props.children}
    </CabinetShell>
  )
}
