'use server'

import { revalidatePath } from 'next/cache'

import { getPayloadClient } from '@/lib/payload'
import { getCurrentUser } from '@/lib/payload'

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

/**
 * Admin-only action: create a new student (`role: 'user'`).
 *
 *  - The role is HARDCODED to `user` server-side — a trainer can never
 *    create another admin or parent through this action.
 *  - Email is normalized; duplicates surface as a friendly error.
 *  - Password is optional: when left blank, a random temp password is
 *    generated and returned so the trainer can hand it to the student.
 *  - `parentId` is optional and validated to point at an existing parent.
 *
 * Returns `{ success, tempPassword?, error? }`.
 */
export async function createStudentAction(
  _prev: unknown,
  formData: FormData,
): Promise<{ success: boolean; tempPassword?: string; error?: string }> {
  const me = await getCurrentUser()
  if (!me || me.role !== 'admin') {
    return { success: false, error: 'Недостаточно прав.' }
  }

  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const name = String(formData.get('name') ?? '').trim()
  const rawParentId = String(formData.get('parentId') ?? '').trim()
  const providedPassword = String(formData.get('password') ?? '').trim()

  if (!email || !name) {
    return { success: false, error: 'Имя и email обязательны.' }
  }

  const password = providedPassword || generateTempPassword()
  if (password.length < 8) {
    return { success: false, error: 'Пароль должен быть не короче 8 символов.' }
  }

  // Resolve parent (if specified) and make sure it's actually a parent user.
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
        name,
        role: 'user',
        ...(parent ? { parent } : {}),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (/already|exists|duplicate/i.test(message)) {
      return { success: false, error: 'Ученик с таким email уже существует.' }
    }
    return { success: false, error: 'Не удалось создать ученика. Попробуйте позже.' }
  }

  // The student list comes from the same route; refresh it.
  revalidatePath('/cabinet/students')

  // Only surface the temp password when WE generated it.
  return {
    success: true,
    tempPassword: providedPassword ? undefined : password,
  }
}
