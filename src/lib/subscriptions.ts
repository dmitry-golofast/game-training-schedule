import type { BasePayload } from 'payload'

/**
 * Subscription / credit-write-off logic.
 *
 * The trainer marks a slot as «done»; this module finds the student's active
 * subscription of the matching kind and decrements one credit. Each write-off
 * is recorded in the `credit-transactions` ledger for audit and idempotency.
 */

export type SlotKind = 'individual' | 'group'

/**
 * Write off one session for a student. Idempotent: if a `session`
 * transaction already exists for the (student, slot) pair, this is a no-op.
 *
 * Returns true if a credit was actually consumed, false otherwise (no active
 * subscription, or already written off).
 */
export async function writeOffSession(
  payload: BasePayload,
  studentId: string,
  slotId: string,
  kind: SlotKind,
): Promise<boolean> {
  // Idempotency: skip if already written off for this slot.
  const existing = await payload.find({
    collection: 'credit-transactions',
    where: {
      and: [
        { student: { equals: studentId } },
        { slot: { equals: slotId } },
        { reason: { equals: 'session' } },
      ],
    },
    limit: 1,
    overrideAccess: true,
  })
  if (existing.totalDocs > 0) return false

  const sub = await getActiveSubscription(payload, studentId, kind)
  if (!sub) return false

  const remaining = Math.max(0, sub.remainingCredits - 1)
  await payload.update({
    collection: 'subscriptions',
    id: sub.id,
    overrideAccess: true,
    data: {
      remainingCredits: remaining,
      status: remaining === 0 ? 'closed' : 'active',
    },
  })

  await payload.create({
    collection: 'credit-transactions',
    overrideAccess: true,
    data: {
      student: studentId,
      subscription: sub.id,
      slot: slotId,
      delta: -1,
      reason: 'session',
      balanceAfter: remaining,
      note: 'Списание за завершённую тренировку',
    },
  })

  return true
}

/**
 * Find the student's active subscription matching the slot kind.
 * Active = status 'active', remaining > 0, validUntil >= today.
 */
export async function getActiveSubscription(
  payload: BasePayload,
  studentId: string,
  kind: SlotKind,
) {
  const todayIso = new Date().toISOString()
  const result = await payload.find({
    collection: 'subscriptions',
    where: {
      and: [
        { student: { equals: studentId } },
        { kind: { equals: kind } },
        { status: { equals: 'active' } },
        { remainingCredits: { greater_than: 0 } },
        { validUntil: { greater_than_equal: todayIso } },
      ],
    },
    sort: 'validFrom', // oldest first — consume the soonest-expiring
    limit: 1,
    overrideAccess: true,
  })
  return result.docs[0] ?? null
}

/** Add credits to a subscription (e.g. top-up / adjustment). */
export async function addCredits(
  payload: BasePayload,
  subscriptionId: string,
  delta: number,
  note?: string,
): Promise<void> {
  const sub = await payload.findByID({
    collection: 'subscriptions',
    id: subscriptionId,
    overrideAccess: true,
  })
  const remaining = Math.max(0, sub.remainingCredits + delta)
  await payload.update({
    collection: 'subscriptions',
    id: subscriptionId,
    overrideAccess: true,
    data: {
      remainingCredits: remaining,
      status: remaining > 0 ? 'active' : 'closed',
    },
  })
  await payload.create({
    collection: 'credit-transactions',
    overrideAccess: true,
    data: {
      student:
        typeof sub.student === 'object' && sub.student ? sub.student.id : (sub.student as string),
      subscription: subscriptionId,
      delta,
      reason: 'adjustment',
      balanceAfter: remaining,
      note: note ?? 'Корректировка',
    },
  })
}
