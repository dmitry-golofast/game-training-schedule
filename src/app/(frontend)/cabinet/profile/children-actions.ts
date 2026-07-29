'use server'

import { revalidatePath } from 'next/cache'

import { getCurrentUser, getPayloadClient } from '@/lib/payload'

type ActionResult = { success: true } | { success: false; error: string }

/**
 * Parent-only: link an existing student (role=user) to this parent by email.
 * The student must not already have a parent assigned.
 */
export async function linkChildAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const me = await getCurrentUser()
  if (!me || me.role !== 'parent') {
    return { success: false, error: 'Недостаточно прав.' }
  }

  const childEmail = String(formData.get('childEmail') ?? '')
    .trim()
    .toLowerCase()

  if (!childEmail) {
    return { success: false, error: 'Укажите email ученика.' }
  }

  const payload = await getPayloadClient()

  // Find the student by email.
  const found = await payload.find({
    collection: 'users',
    where: {
      and: [{ email: { equals: childEmail } }, { role: { equals: 'user' } }],
    },
    limit: 1,
    overrideAccess: true,
  })

  const child = found.docs[0]
  if (!child) {
    return { success: false, error: 'Ученик с таким email не найден.' }
  }

  // Check if the student already has a parent.
  if (child.parent) {
    const existingParentId =
      typeof child.parent === 'object' && child.parent ? child.parent.id : String(child.parent)
    if (existingParentId === me.id) {
      return { success: false, error: 'Этот ученик уже привязан к вам.' }
    }
    return { success: false, error: 'Этот ученик уже привязан к другому родителю.' }
  }

  try {
    await payload.update({
      collection: 'users',
      id: child.id,
      overrideAccess: true,
      data: { parent: me.id },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Не удалось привязать. ${message}` }
  }

  revalidatePath('/cabinet/profile')
  return { success: true }
}

/**
 * Parent-only: unlink a child from this parent.
 */
export async function unlinkChildAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const me = await getCurrentUser()
  if (!me || me.role !== 'parent') {
    return { success: false, error: 'Недостаточно прав.' }
  }

  const childId = String(formData.get('childId') ?? '').trim()
  if (!childId) {
    return { success: false, error: 'Не указан ID ученика.' }
  }

  const payload = await getPayloadClient()
  const child = await payload.findByID({
    collection: 'users',
    id: childId,
    overrideAccess: true,
  })

  // Verify ownership.
  const currentParentId =
    typeof child.parent === 'object' && child.parent
      ? child.parent.id
      : child.parent
        ? String(child.parent)
        : null
  if (currentParentId !== me.id) {
    return { success: false, error: 'Этот ученик не привязан к вам.' }
  }

  try {
    await payload.update({
      collection: 'users',
      id: childId,
      overrideAccess: true,
      data: { parent: null },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Не удалось отвязать. ${message}` }
  }

  revalidatePath('/cabinet/profile')
  return { success: true }
}
