'use server'

import { revalidatePath } from 'next/cache'

import { getCurrentUser, getPayloadClient } from '@/lib/payload'

type ActionResult = { success: true } | { success: false; error: string }

/** Student/parent: submit a sick-leave request for a slot. */
export async function createSickLeaveAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const me = await getCurrentUser()
  if (!me) {
    return { success: false, error: 'Необходим вход.' }
  }

  const student = String(formData.get('student') ?? '').trim()
  const slot = String(formData.get('slot') ?? '').trim()
  const reason = String(formData.get('reason') ?? '').trim()

  if (!student || !slot || !reason) {
    return { success: false, error: 'Ученик, тренировка и причина обязательны.' }
  }

  const payload = await getPayloadClient()
  try {
    await payload.create({
      collection: 'sick-leaves',
      overrideAccess: true,
      data: { student, slot, reason, status: 'pending' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Не удалось подать заявку. ${message}` }
  }

  revalidatePath('/cabinet/sick-leaves')
  revalidatePath('/cabinet/schedule')
  return { success: true }
}

/** Admin: approve or reject a sick-leave request. */
export async function reviewSickLeaveAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const me = await getCurrentUser()
  if (!me || me.role !== 'admin') {
    return { success: false, error: 'Недостаточно прав.' }
  }

  const id = String(formData.get('id') ?? '').trim()
  const decision = String(formData.get('decision') ?? '').trim()
  const reviewNote = String(formData.get('reviewNote') ?? '').trim()

  if (!id || (decision !== 'approved' && decision !== 'rejected')) {
    return { success: false, error: 'Некорректное решение.' }
  }

  const payload = await getPayloadClient()
  try {
    await payload.update({
      collection: 'sick-leaves',
      id,
      overrideAccess: true,
      data: {
        status: decision,
        reviewedAt: new Date().toISOString(),
        reviewNote: reviewNote || undefined,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Не удалось обновить. ${message}` }
  }

  revalidatePath('/cabinet/sick-leaves')
  revalidatePath('/cabinet/schedule')
  return { success: true }
}
