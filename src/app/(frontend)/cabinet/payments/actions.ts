'use server'

import { revalidatePath } from 'next/cache'

import { getCurrentUser, getPayloadClient } from '@/lib/payload'

type ActionResult = { success: true } | { success: false; error: string }

const DATE_RE = /^\d{4}-\d{2}-\d{2}(T.*)?$/
const VALID_METHODS = new Set(['', 'cash', 'card', 'transfer'])

/** Admin-only: create/update a payment record. */
export async function upsertPaymentAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const me = await getCurrentUser()
  if (!me || me.role !== 'admin') {
    return { success: false, error: 'Недостаточно прав.' }
  }

  const id = String(formData.get('id') ?? '').trim()
  const student = String(formData.get('student') ?? '').trim()
  const subscription = String(formData.get('subscription') ?? '').trim()
  const amount = Number(formData.get('amount') ?? 0)
  const currencyRaw = String(formData.get('currency') ?? 'RUB')
  const currency: 'RUB' | 'USD' | 'EUR' =
    currencyRaw === 'USD' || currencyRaw === 'EUR' ? currencyRaw : 'RUB'
  const periodFrom = String(formData.get('periodFrom') ?? '').trim()
  const periodTo = String(formData.get('periodTo') ?? '').trim()
  const method = String(formData.get('method') ?? '').trim()
  const paidAt = String(formData.get('paidAt') ?? '').trim()
  const note = String(formData.get('note') ?? '').trim()

  if (!student || !periodFrom || !periodTo || !paidAt) {
    return { success: false, error: 'Ученик, период и дата платежа обязательны.' }
  }
  if (Number.isNaN(amount) || amount < 0) {
    return { success: false, error: 'Некорректная сумма.' }
  }
  if (!DATE_RE.test(periodFrom) || !DATE_RE.test(periodTo) || !DATE_RE.test(paidAt)) {
    return { success: false, error: 'Некорректная дата.' }
  }
  if (!VALID_METHODS.has(method)) {
    return { success: false, error: 'Некорректный способ оплаты.' }
  }

  const payload = await getPayloadClient()

  try {
    if (id) {
      await payload.update({
        collection: 'payments',
        id,
        overrideAccess: true,
        data: {
          amount,
          currency,
          periodFrom,
          periodTo,
          paidAt,
          method: (method || undefined) as 'cash' | 'card' | 'transfer' | undefined,
          subscription: subscription || undefined,
          note: note || undefined,
        },
      })
    } else {
      await payload.create({
        collection: 'payments',
        overrideAccess: true,
        data: {
          student,
          amount,
          currency,
          periodFrom,
          periodTo,
          paidAt,
          method: (method || undefined) as 'cash' | 'card' | 'transfer' | undefined,
          subscription: subscription || undefined,
          note: note || undefined,
        },
      })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Не удалось сохранить платёж. ${message}` }
  }

  revalidatePath('/cabinet/payments')
  revalidatePath('/cabinet/profile')
  return { success: true }
}

/** Admin-only: delete a payment. */
export async function deletePaymentAction(
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
    await payload.delete({ collection: 'payments', id, overrideAccess: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Не удалось удалить. ${message}` }
  }

  revalidatePath('/cabinet/payments')
  return { success: true }
}
