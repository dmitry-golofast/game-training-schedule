'use server'

import { revalidatePath } from 'next/cache'

import { getCurrentUser, getPayloadClient } from '@/lib/payload'
import { isAdminLike } from '@/lib/roles'

type ActionResult = { success: true } | { success: false; error: string }

/**
 * Admin-only: create a subscription template (catalog entry).
 */
export async function createTemplateAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const me = await getCurrentUser()
  if (!me || !isAdminLike(me.role)) {
    return { success: false, error: 'Недостаточно прав.' }
  }

  const title = String(formData.get('title') ?? '').trim()
  const kind = String(formData.get('kind') ?? 'individual') === 'group' ? 'group' : 'individual'
  const totalCredits = Number(formData.get('totalCredits') ?? 0)
  const notes = String(formData.get('notes') ?? '').trim()

  if (!title) {
    return { success: false, error: 'Название обязательно.' }
  }
  if (!(totalCredits > 0)) {
    return { success: false, error: 'Количество занятий должно быть больше 0.' }
  }

  const payload = await getPayloadClient()
  try {
    await payload.create({
      collection: 'subscription-templates',
      overrideAccess: true,
      data: { title, kind, totalCredits, notes: notes || undefined },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Не удалось создать шаблон. ${message}` }
  }

  revalidatePath('/cabinet/subscriptions')
  return { success: true }
}

/**
 * Admin-only: update a subscription template.
 */
export async function updateTemplateAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const me = await getCurrentUser()
  if (!me || !isAdminLike(me.role)) {
    return { success: false, error: 'Недостаточно прав.' }
  }

  const id = String(formData.get('id') ?? '').trim()
  const title = String(formData.get('title') ?? '').trim()
  const kind = String(formData.get('kind') ?? 'individual') === 'group' ? 'group' : 'individual'
  const totalCredits = Number(formData.get('totalCredits') ?? 0)
  const notes = String(formData.get('notes') ?? '').trim()

  if (!id || !title) {
    return { success: false, error: 'Название обязательно.' }
  }
  if (!(totalCredits > 0)) {
    return { success: false, error: 'Количество занятий должно быть больше 0.' }
  }

  const payload = await getPayloadClient()
  try {
    await payload.update({
      collection: 'subscription-templates',
      id,
      overrideAccess: true,
      data: { title, kind, totalCredits, notes: notes || undefined },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Не удалось сохранить. ${message}` }
  }

  revalidatePath('/cabinet/subscriptions')
  return { success: true }
}

/**
 * Admin-only: delete a subscription template.
 */
export async function deleteTemplateAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const me = await getCurrentUser()
  if (!me || !isAdminLike(me.role)) {
    return { success: false, error: 'Недостаточно прав.' }
  }

  const id = String(formData.get('id') ?? '').trim()
  if (!id) return { success: false, error: 'Не указан ID.' }

  const payload = await getPayloadClient()
  try {
    await payload.delete({ collection: 'subscription-templates', id, overrideAccess: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Не удалось удалить. ${message}` }
  }

  revalidatePath('/cabinet/subscriptions')
  return { success: true }
}
