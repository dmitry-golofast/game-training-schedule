'use client'

import { useEffect } from 'react'

import { syncTimezoneAction } from '@/app/(frontend)/cabinet/profile/actions'

/**
 * Invisible client component that auto-detects the browser's IANA timezone and
 * keeps two things in sync:
 *
 * 1. A `tz` cookie (1 year, lax) so server components can render the schedule
 *    in the right zone on the very first request, before any DB write lands.
 * 2. The signed-in user's `timezone` field (via `syncTimezoneAction`) so that
 *    server-side consumers without a browser — email notifications, cron
 *    reminders — also format times in the recipient's zone.
 *
 * Mounted once in the cabinet layout. Renders nothing.
 */
export function TimezoneSync({ storedTimezone }: { storedTimezone?: string | null }) {
  useEffect(() => {
    let detected: string | undefined
    try {
      detected = Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch {
      detected = undefined
    }
    if (!detected) return

    // Validate before using — `resolvedOptions` can occasionally yield an
    // empty/odd value in older engines.
    try {
      Intl.DateTimeFormat('en', { timeZone: detected })
    } catch {
      return
    }

    // Refresh the cookie on every mount so a changed device zone is picked up.
    document.cookie = `tz=${encodeURIComponent(detected)}; path=/; max-age=31536000; samesite=lax`

    // Persist onto the user only when it actually changed.
    if (detected !== storedTimezone) {
      void syncTimezoneAction(detected)
    }
  }, [storedTimezone])

  return null
}
