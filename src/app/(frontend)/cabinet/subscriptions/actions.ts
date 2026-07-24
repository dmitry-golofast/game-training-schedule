'use server'

import { revalidatePath } from 'next/cache'

import { getCurrentUser, getPayloadClient } from '@/lib/payload'

type ActionResult = { success: true } | { success: false; error: string }

const DATE_RE = /^\d{4}-\d{2}-\d{2}(T.*)?$/

/** Admin-only: create a subscription (training package) for a student. */
export async function upsertSubscriptionAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const me = await getCurrentUser()
  if (!me || me.role !== 'admin') {
    return { success: false, error: 'Недостаточно прав.' }
  }

  const id = String(formData.get('id') ?? '').trim()
  const student = String(formData.get('student') ?? '').trim()
  const kind = String(formData.get('kind') ?? 'individual') === 'group' ? 'group' : 'individual'
  const totalCredits = Number(formData.get('totalCredits') ?? 0)
  const validFrom = String(formData.get('validFrom') ?? '').trim()
  const validUntil = String(formData.get('validUntil') ?? '').trim()
  const notes = String(formData.get('notes') ?? '').trim()

  if (!student || !validFrom || !validUntil) {
    return { success: false, error: 'Ученик и период обязательны.' }
  }
  if (!(totalCredits > 0)) {
    return { success: false, error: 'Количество занятий должно быть больше 0.' }
  }
  if (!DATE_RE.test(validFrom) || !DATE_RE.test(validUntil)) {
    return { success: false, error: 'Некорректная дата.' }
  }

  const payload = await getPayloadClient()

  try {
    if (id) {
      // On edit we only allow kind/dates/notes; credits are managed by the
      // write-off system, so we don't touch totalCredits/remainingCredits.
      await payload.update({
        collection: 'subscriptions',
        id,
        overrideAccess: true,
        data: { kind, validFrom, validUntil, notes: notes || undefined },
      })
    } else {
      await payload.create({
        collection: 'subscriptions',
        overrideAccess: true,
        data: {
          student,
          kind,
          totalCredits,
          remainingCredits: totalCredits,
          validFrom,
          validUntil,
          status: 'active',
          notes: notes || undefined,
        },
      })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Не удалось сохранить абонемент. ${message}` }
  }

  revalidatePath('/cabinet/subscriptions')
  revalidatePath('/cabinet/profile')
  revalidatePath('/cabinet')
  return { success: true }
}

/** Admin-only: delete a subscription. */
export async function deleteSubscriptionAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const me = await getCurrentUser()
  if (!me || me.role !== 'admin') {
    return { success: false, error: 'Недостаточно прав.' }
  }

  const id = String(formData.get('id') ?? '').trim()
  if (!id) return { success: false, error: 'Не указан ID.' }

  const payload = await getPayloadClient()
  try {
    await payload.delete({ collection: 'subscriptions', id, overrideAccess: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Не удалось удалить. ${message}` }
  }

  revalidatePath('/cabinet/subscriptions')
  return { success: true }
}
