'use server'

import { revalidatePath } from 'next/cache'

import { getCurrentUser, getPayloadClient } from '@/lib/payload'
import { isAdminLike } from '@/lib/roles'
import { buildDisplayName, computeAge, uploadAvatarFile } from '@/lib/profile'

/**
 * Generate a random temporary password for a new student.
 * 12 chars from an unambiguous alphabet — safe to share out-of-band.
 */
function generateTempPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let out = ''
  for (let i = 0; i < 12; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return out
}

/** Shared field extraction + validation for create and update. */
function parseStudentFields(formData: FormData) {
  const firstName = String(formData.get('firstName') ?? '').trim()
  const lastName = String(formData.get('lastName') ?? '').trim()
  const middleName = String(formData.get('middleName') ?? '').trim()
  const birthDate = String(formData.get('birthDate') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  const parentPhone = String(formData.get('parentPhone') ?? '').trim()

  if (!firstName || !lastName) {
    return { error: 'Имя и фамилия обязательны.' }
  }

  // Age check: parentPhone required if under 18.
  let isMinor = false
  if (birthDate) {
    const age = computeAge(birthDate)
    if (age !== null && age < 18) {
      isMinor = true
      if (!parentPhone) {
        return { error: 'Телефон родителя обязателен для учащихся младше 18 лет.' }
      }
    }
  }

  const name = buildDisplayName(firstName, lastName, middleName)

  return {
    data: {
      firstName,
      lastName,
      middleName: middleName || undefined,
      birthDate: birthDate || undefined,
      phone: phone || undefined,
      // For adult students, drop any stale parentPhone on save.
      parentPhone: isMinor ? parentPhone || undefined : undefined,
      name,
    },
    isMinor,
  }
}

/**
 * Admin-only action: create a new student (`role: 'user'`).
 *
 *  - The role is HARDCODED to `user` server-side.
 *  - `firstName` and `lastName` are required; `middleName` is optional.
 *  - `parentPhone` is required when the student is under 18.
 *  - Password is optional; auto-generated when blank.
 */
export async function createStudentAction(
  _prev: unknown,
  formData: FormData,
): Promise<{ success: boolean; tempPassword?: string; error?: string }> {
  const me = await getCurrentUser()
  if (!me || !isAdminLike(me.role)) {
    return { success: false, error: 'Недостаточно прав.' }
  }

  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const rawParentId = String(formData.get('parentId') ?? '').trim()
  const providedPassword = String(formData.get('password') ?? '').trim()

  if (!email) {
    return { success: false, error: 'Email обязателен.' }
  }

  const parsed = parseStudentFields(formData)
  if ('error' in parsed) {
    return { success: false, error: parsed.error }
  }

  const password = providedPassword || generateTempPassword()
  if (password.length < 8) {
    return { success: false, error: 'Пароль должен быть не короче 8 символов.' }
  }

  // Resolve parent (if specified).
  let parent: string | undefined
  if (rawParentId) {
    const payload = await getPayloadClient()
    const candidate = await payload.findByID({
      collection: 'users',
      id: rawParentId,
      overrideAccess: true,
    })
    if (!candidate || candidate.role !== 'parent') {
      return { success: false, error: 'Выбранный родитель не найден.' }
    }
    parent = candidate.id
  }

  const payload = await getPayloadClient()
  try {
    await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email,
        password,
        role: 'user',
        ...(parent ? { parent } : {}),
        ...parsed.data,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (/already|exists|duplicate/i.test(message)) {
      return { success: false, error: 'Ученик с таким email уже существует.' }
    }
    return { success: false, error: 'Не удалось создать ученика. Попробуйте позже.' }
  }

  revalidatePath('/cabinet/students')
  return {
    success: true,
    tempPassword: providedPassword ? undefined : password,
  }
}

/**
 * Admin-only action: update an existing student's profile.
 * Cannot change role, email, or password through this action.
 */
export async function updateStudentAction(
  _prev: unknown,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  const me = await getCurrentUser()
  if (!me || !isAdminLike(me.role)) {
    return { success: false, error: 'Недостаточно прав.' }
  }

  const id = String(formData.get('id') ?? '').trim()
  if (!id) {
    return { success: false, error: 'Не указан ID ученика.' }
  }

  const parsed = parseStudentFields(formData)
  if ('error' in parsed) {
    return { success: false, error: parsed.error }
  }

  // Avatar: upload new / clear existing / leave as-is.
  const clearAvatar = formData.get('clearAvatar') === '1'
  const uploaded = await uploadAvatarFile(formData, 'avatar')
  if (uploaded && 'error' in uploaded) {
    return { success: false, error: uploaded.error }
  }

  const data: Record<string, unknown> = { ...parsed.data }
  if (uploaded && 'id' in uploaded) {
    data.avatar = uploaded.id
  } else if (clearAvatar) {
    data.avatar = null
  }

  const payload = await getPayloadClient()
  try {
    await payload.update({
      collection: 'users',
      id,
      overrideAccess: true,
      data,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Не удалось сохранить. ${message}` }
  }

  revalidatePath('/cabinet/students')
  revalidatePath(`/cabinet/students/${id}`)
  return { success: true }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}(T.*)?$/

/**
 * Admin-only: assign a subscription to a student from a template.
 *
 * Creates a concrete subscription instance: copies kind/totalCredits/notes
 * from the template, binds the student + validity period. The
 * `beforeChange` hook on the Subscriptions collection initializes
 * remainingCredits = totalCredits and status = 'active'.
 */
export async function assignSubscriptionAction(
  _prev: unknown,
  formData: FormData,
): Promise<{ success: true } | { success: false; error: string }> {
  const me = await getCurrentUser()
  if (!me || !isAdminLike(me.role)) {
    return { success: false, error: 'Недостаточно прав.' }
  }

  const studentId = String(formData.get('studentId') ?? '').trim()
  const templateId = String(formData.get('templateId') ?? '').trim()
  const validFrom = String(formData.get('validFrom') ?? '').trim()
  const validUntil = String(formData.get('validUntil') ?? '').trim()

  if (!studentId || !templateId || !validFrom || !validUntil) {
    return { success: false, error: 'Заполните все поля.' }
  }
  if (!DATE_RE.test(validFrom) || !DATE_RE.test(validUntil)) {
    return { success: false, error: 'Некорректная дата.' }
  }

  const payload = await getPayloadClient()

  // Load the template to copy its fields.
  const tpl = await payload.findByID({
    collection: 'subscription-templates',
    id: templateId,
    overrideAccess: true,
  })

  try {
    await payload.create({
      collection: 'subscriptions',
      overrideAccess: true,
      data: {
        student: studentId,
        template: templateId,
        kind: tpl.kind,
        totalCredits: tpl.totalCredits,
        remainingCredits: tpl.totalCredits,
        price: typeof tpl.price === 'number' ? tpl.price : undefined,
        validFrom,
        validUntil,
        status: 'active',
        notes: tpl.notes || undefined,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Не удалось создать абонемент. ${message}` }
  }

  revalidatePath(`/cabinet/students/${studentId}`)
  revalidatePath('/cabinet/profile')
  return { success: true }
}
