'use server'

import { revalidatePath } from 'next/cache'

import { getCurrentUser, getPayloadClient } from '@/lib/payload'
import { isAdminLike } from '@/lib/roles'

type ActionResult = { success: true } | { success: false; error: string }

/**
 * If `formData` carries a non-empty `image` file, upload it into the `media`
 * collection and return the new media document id. Returns null when no file
 * was attached (so the caller can skip touching the `image` field).
 *
 * Mirrors the upload pattern in `documents-actions.ts`: the Local API accepts
 * a Buffer + mimetype + name + size via the `file` option.
 */
async function uploadImageFile(
  formData: FormData,
  alt: string,
): Promise<{ id: string } | { error: string } | null> {
  const file = formData.get('image')
  if (!(file instanceof File) || file.size === 0) return null

  const payload = await getPayloadClient()
  try {
    const arrayBuffer = await file.arrayBuffer()
    const created = await payload.create({
      collection: 'media',
      overrideAccess: true,
      data: { alt: alt || file.name },
      file: {
        data: Buffer.from(arrayBuffer),
        mimetype: file.type || 'image/*',
        name: file.name,
        size: file.size,
      },
    })
    if (!created?.id) {
      return { error: 'Не удалось загрузить картинку.' }
    }
    return { id: String(created.id) }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { error: `Ошибка загрузки картинки. ${message}` }
  }
}

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
  const priceRaw = formData.get('price')
  const price = priceRaw === null || priceRaw === '' ? undefined : Number(priceRaw)
  const durationDaysRaw = formData.get('durationDays')
  const durationDays =
    durationDaysRaw === null || durationDaysRaw === '' ? 30 : Number(durationDaysRaw)
  const notes = String(formData.get('notes') ?? '').trim()

  if (!title) {
    return { success: false, error: 'Название обязательно.' }
  }
  if (!(totalCredits > 0)) {
    return { success: false, error: 'Количество занятий должно быть больше 0.' }
  }
  if (price != null && Number.isNaN(price)) {
    return { success: false, error: 'Некорректная стоимость.' }
  }
  if (!(durationDays > 0)) {
    return { success: false, error: 'Срок действия должен быть больше 0.' }
  }

  const imageResult = await uploadImageFile(formData, title)
  if (imageResult && 'error' in imageResult) {
    return { success: false, error: imageResult.error }
  }

  const payload = await getPayloadClient()
  try {
    await payload.create({
      collection: 'subscription-templates',
      overrideAccess: true,
      data: {
        title,
        kind,
        totalCredits,
        price,
        durationDays,
        notes: notes || undefined,
        ...(imageResult ? { image: imageResult.id } : {}),
      },
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
  const priceRaw = formData.get('price')
  const price = priceRaw === null || priceRaw === '' ? undefined : Number(priceRaw)
  const durationDaysRaw = formData.get('durationDays')
  const durationDays =
    durationDaysRaw === null || durationDaysRaw === '' ? 30 : Number(durationDaysRaw)
  const notes = String(formData.get('notes') ?? '').trim()

  if (!id || !title) {
    return { success: false, error: 'Название обязательно.' }
  }
  if (!(totalCredits > 0)) {
    return { success: false, error: 'Количество занятий должно быть больше 0.' }
  }
  if (price != null && Number.isNaN(price)) {
    return { success: false, error: 'Некорректная стоимость.' }
  }
  if (!(durationDays > 0)) {
    return { success: false, error: 'Срок действия должен быть больше 0.' }
  }

  // Upload a new preview only when a file is attached. When no file is sent,
  // we leave the existing `image` untouched (Payload keeps the prior value).
  const imageResult = await uploadImageFile(formData, title)
  if (imageResult && 'error' in imageResult) {
    return { success: false, error: imageResult.error }
  }

  const payload = await getPayloadClient()
  try {
    await payload.update({
      collection: 'subscription-templates',
      id,
      overrideAccess: true,
      data: {
        title,
        kind,
        totalCredits,
        price,
        durationDays,
        notes: notes || undefined,
        ...(imageResult ? { image: imageResult.id } : {}),
      },
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
