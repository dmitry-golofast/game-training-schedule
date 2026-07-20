'use server'

import { revalidatePath } from 'next/cache'

import { getCurrentUser, getPayloadClient } from '@/lib/payload'

type Result = { success: true } | { success: false; error: string }

const VALID_LEADS = new Set([0, 1, 2, 3, 6, 12, 24, 48, 72])

/**
 * Update the signed-in user's display name, timezone and reminder lead.
 * The user can only ever edit their own record.
 */
export async function updateProfileAction(_prev: unknown, formData: FormData): Promise<Result> {
  const me = await getCurrentUser()
  if (!me) {
    return { success: false, error: 'Необходим вход в систему.' }
  }

  const name = String(formData.get('name') ?? '').trim()
  const timezone = String(formData.get('timezone') ?? '').trim()
  const reminderLeadHours = Number(formData.get('reminderLeadHours') ?? 24)

  // Validate timezone.
  if (timezone && timezone !== 'UTC') {
    try {
      Intl.DateTimeFormat('en', { timeZone: timezone })
    } catch {
      return { success: false, error: 'Некорректный часовой пояс.' }
    }
  }

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
        timezone: timezone || null,
        reminderLeadHours,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Не удалось сохранить. ${message}` }
  }

  revalidatePath('/cabinet/profile')
  revalidatePath('/cabinet/schedule')
  return { success: true }
}
