'use server'

import { revalidatePath } from 'next/cache'

import { getCurrentUser, getPayloadClient } from '@/lib/payload'

type ActionResult = { success: true } | { success: false; error: string }

const DATE_RE = /^\d{4}-\d{2}-\d{2}(T.*)?$/
const VALID_METHODS = new Set(['', 'cash', 'card', 'transfer'])

/**
 * Admin-only: create a subscription AND its payment in one transaction-like
 * flow. If the payment fails after the subscription is created, the
 * subscription is deleted (rollback).
 */
export async function createSubscriptionWithPaymentAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const me = await getCurrentUser()
  if (!me || me.role !== 'admin') {
    return { success: false, error: 'Недостаточно прав.' }
  }

  // ── Subscription fields ──
  const student = String(formData.get('student') ?? '').trim()
  const kind = String(formData.get('kind') ?? 'individual') === 'group' ? 'group' : 'individual'
  const totalCredits = Number(formData.get('totalCredits') ?? 0)
  const validFrom = String(formData.get('validFrom') ?? '').trim()
  const validUntil = String(formData.get('validUntil') ?? '').trim()
  const notes = String(formData.get('notes') ?? '').trim()

  // ── Payment fields ──
  const amount = Number(formData.get('amount') ?? 0)
  const currencyRaw = String(formData.get('currency') ?? 'RUB')
  const currency: 'RUB' | 'USD' | 'EUR' =
    currencyRaw === 'USD' || currencyRaw === 'EUR' ? currencyRaw : 'RUB'
  const method = String(formData.get('method') ?? '').trim()
  const paidAt = String(formData.get('paidAt') ?? '').trim()
  const note = String(formData.get('note') ?? '').trim()

  // ── Validation ──
  if (!student || !validFrom || !validUntil || !paidAt) {
    return { success: false, error: 'Ученик, период и дата оплаты обязательны.' }
  }
  if (!(totalCredits > 0)) {
    return { success: false, error: 'Количество занятий должно быть больше 0.' }
  }
  if (Number.isNaN(amount) || amount < 0) {
    return { success: false, error: 'Некорректная сумма оплаты.' }
  }
  if (!DATE_RE.test(validFrom) || !DATE_RE.test(validUntil) || !DATE_RE.test(paidAt)) {
    return { success: false, error: 'Некорректная дата.' }
  }
  if (!VALID_METHODS.has(method)) {
    return { success: false, error: 'Некорректный способ оплаты.' }
  }

  const payload = await getPayloadClient()

  // ── Create subscription ──
  let subId: string
  try {
    const sub = await payload.create({
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
    subId = sub.id
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Не удалось создать абонемент. ${message}` }
  }

  // ── Create payment linked to the subscription ──
  try {
    await payload.create({
      collection: 'payments',
      overrideAccess: true,
      data: {
        student,
        subscription: subId,
        amount,
        currency,
        periodFrom: validFrom,
        periodTo: validUntil,
        paidAt,
        method: (method || undefined) as 'cash' | 'card' | 'transfer' | undefined,
        note: note || undefined,
      },
    })
  } catch (err) {
    // Rollback: delete the subscription if payment failed.
    await payload
      .delete({ collection: 'subscriptions', id: subId, overrideAccess: true })
      .catch(() => {})
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Не удалось создать оплату. ${message}` }
  }

  revalidatePath('/cabinet/subscriptions')
  revalidatePath('/cabinet/profile')
  revalidatePath('/cabinet')
  return { success: true }
}

/**
 * Admin-only: update subscription (kind/dates/notes only — credits are
 * system-managed).
 */
export async function updateSubscriptionAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const me = await getCurrentUser()
  if (!me || me.role !== 'admin') {
    return { success: false, error: 'Недостаточно прав.' }
  }

  const id = String(formData.get('id') ?? '').trim()
  const kind = String(formData.get('kind') ?? 'individual') === 'group' ? 'group' : 'individual'
  const validFrom = String(formData.get('validFrom') ?? '').trim()
  const validUntil = String(formData.get('validUntil') ?? '').trim()
  const notes = String(formData.get('notes') ?? '').trim()

  if (!id || !validFrom || !validUntil) {
    return { success: false, error: 'Период обязателен.' }
  }

  const payload = await getPayloadClient()
  try {
    await payload.update({
      collection: 'subscriptions',
      id,
      overrideAccess: true,
      data: { kind, validFrom, validUntil, notes: notes || undefined },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Не удалось сохранить. ${message}` }
  }

  revalidatePath('/cabinet/subscriptions')
  return { success: true }
}

/**
 * Admin-only: delete a subscription and its linked payment.
 */
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

  // Delete linked payments first.
  try {
    const linked = await payload.find({
      collection: 'payments',
      where: { subscription: { equals: id } },
      limit: 10,
      overrideAccess: true,
    })
    for (const p of linked.docs) {
      await payload
        .delete({ collection: 'payments', id: p.id, overrideAccess: true })
        .catch(() => {})
    }
  } catch {
    // Best-effort.
  }

  try {
    await payload.delete({ collection: 'subscriptions', id, overrideAccess: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Не удалось удалить. ${message}` }
  }

  revalidatePath('/cabinet/subscriptions')
  return { success: true }
}
