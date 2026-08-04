'use server'

import { revalidatePath } from 'next/cache'

import { getCurrentUser, getPayloadClient } from '@/lib/payload'

type Result = { success: true } | { success: false; error: string }

const VALID_LEADS = new Set([0, 1, 2, 3, 6, 12, 24, 48, 72])

/**
 * Update the signed-in user's display name and reminder lead.
 * The user can only ever edit their own record.
 *
 * Timezone is no longer edited here — it is auto-detected from the browser
 * via `syncTimezoneAction` (see `TimezoneSync`).
 */
export async function updateProfileAction(_prev: unknown, formData: FormData): Promise<Result> {
  const me = await getCurrentUser()
  if (!me) {
    return { success: false, error: 'Необходим вход в систему.' }
  }

  const name = String(formData.get('name') ?? '').trim()
  const reminderLeadHours = Number(formData.get('reminderLeadHours') ?? 24)

  if (Number.isNaN(reminderLeadHours) || !VALID_LEADS.has(reminderLeadHours)) {
    return { success: false, error: 'Недопустимое время напоминания.' }
  }

  const payload = await getPayloadClient()
  try {
    await payload.update({
      collection: 'users',
      id: me.id,
      overrideAccess: false,
      user: me,
      data: {
        name: name || null,
        reminderLeadHours,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Не удалось сохранить. ${message}` }
  }

  revalidatePath('/cabinet/profile')
  return { success: true }
}

/**
 * Persist the browser-detected timezone onto the signed-in user. Called by the
 * `TimezoneSync` client component on mount. Idempotent — skips the write when
 * the stored value already matches. Email/cron consumers read `user.timezone`,
 * so keeping it filled here is what lets server-side rendering use the right zone.
 */
export async function syncTimezoneAction(timezone: string): Promise<Result> {
  const me = await getCurrentUser()
  if (!me) {
    return { success: false, error: 'Необходим вход в систему.' }
  }

  const tz = String(timezone ?? '').trim()
  if (!tz) return { success: true }
  // Validate the IANA zone.
  try {
    Intl.DateTimeFormat('en', { timeZone: tz })
  } catch {
    return { success: false, error: 'Некорректный часовой пояс.' }
  }

  if (me.timezone === tz) return { success: true }

  const payload = await getPayloadClient()
  try {
    await payload.update({
      collection: 'users',
      id: me.id,
      overrideAccess: false,
      user: me,
      data: { timezone: tz },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Не удалось сохранить часовой пояс. ${message}` }
  }

  revalidatePath('/cabinet/schedule')
  revalidatePath('/cabinet/sick-leaves')
  return { success: true }
}
