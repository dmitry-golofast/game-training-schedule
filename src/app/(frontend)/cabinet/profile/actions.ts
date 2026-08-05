'use server'

import { revalidatePath } from 'next/cache'

import { getCurrentUser, getPayloadClient } from '@/lib/payload'
import { buildDisplayName, computeAge, uploadAvatarFile } from '@/lib/profile'

type Result = { success: true } | { success: false; error: string }

const VALID_LEADS = new Set([0, 1, 2, 3, 6, 12, 24, 48, 72])

/**
 * Update the signed-in user's own profile.
 *
 * Edits: ФИО (lastName/firstName/middleName), birthDate, phone, parentPhone,
 * plus optional avatar upload / removal. The display `name` is regenerated
 * from the name parts. `reminderLeadHours` is also accepted so the same
 * action can back the «Настройки» tab form.
 *
 * Age-based phone rules (student = role `user`):
 *  - under 18  → `parentPhone` is required, `phone` is optional.
 *  - 18+ / no birthDate → only `phone` is saved; `parentPhone` is ignored.
 *
 * The user can only ever edit their own record (`overrideAccess: false`).
 */
export async function updateProfileAction(_prev: unknown, formData: FormData): Promise<Result> {
  const me = await getCurrentUser()
  if (!me) {
    return { success: false, error: 'Необходим вход в систему.' }
  }

  const firstName = String(formData.get('firstName') ?? '').trim()
  const lastName = String(formData.get('lastName') ?? '').trim()
  const middleName = String(formData.get('middleName') ?? '').trim()
  const birthDate = String(formData.get('birthDate') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  const parentPhone = String(formData.get('parentPhone') ?? '').trim()
  const reminderLeadHours = Number(formData.get('reminderLeadHours') ?? me.reminderLeadHours ?? 24)

  if (Number.isNaN(reminderLeadHours) || !VALID_LEADS.has(reminderLeadHours)) {
    return { success: false, error: 'Недопустимое время напоминания.' }
  }

  if (!firstName || !lastName) {
    return { success: false, error: 'Имя и фамилия обязательны.' }
  }

  // Age-based rules for the parentPhone field.
  const isStudent = me.role === 'user'
  const age = computeAge(birthDate)
  const isMinor = isStudent && age !== null && age < 18
  if (isMinor && !parentPhone) {
    return { success: false, error: 'Телефон родителя обязателен для учащихся младше 18 лет.' }
  }

  // Avatar: upload new / clear existing / leave as-is.
  const clearAvatar = formData.get('clearAvatar') === '1'
  const uploaded = await uploadAvatarFile(formData, 'avatar')
  if (uploaded && 'error' in uploaded) {
    return { success: false, error: uploaded.error }
  }

  const data: Record<string, unknown> = {
    firstName,
    lastName,
    middleName: middleName || null,
    birthDate: birthDate || null,
    phone: phone || null,
    name: buildDisplayName(firstName, lastName, middleName),
    reminderLeadHours,
  }

  // parentPhone is only relevant for minor students; for everyone else we
  // clear it so stale data does not linger after an 18th birthday.
  data.parentPhone = isMinor ? parentPhone : null

  if (uploaded && 'id' in uploaded) {
    data.avatar = uploaded.id
  } else if (clearAvatar) {
    data.avatar = null
  }

  const payload = await getPayloadClient()
  try {
    await payload.update({
      collection: 'users',
      id: me.id,
      overrideAccess: false,
      user: me,
      data,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Не удалось сохранить. ${message}` }
  }

  revalidatePath('/cabinet/profile')
  // Refresh the avatar shown in the cabinet header.
  revalidatePath('/cabinet')
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
