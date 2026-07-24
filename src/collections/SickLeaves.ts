import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  CollectionConfig,
} from 'payload'

import { studentOwnerScopedOrAdmin } from '@/payload/access/student-owner-scoped'

/**
 * Sick-leave requests: a student/parent reports illness for a specific slot,
 * the trainer reviews it.
 *
 *  - `pending`  — newly submitted, awaiting trainer decision.
 *  - `approved` — trainer accepted: the linked slot is cancelled (so the
 *     session is NOT written off — the `done` trigger never fires) and a
 *     `refund` ledger entry (delta 0) is logged for transparency.
 *  - `rejected` — trainer declined: no effect on the slot/credits.
 */
export const SickLeaves: CollectionConfig = {
  slug: 'sick-leaves',
  admin: {
    group: 'Cabinet',
    defaultColumns: ['student', 'slot', 'status', 'createdAt'],
  },
  access: {
    read: studentOwnerScopedOrAdmin,
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  hooks: {
    beforeChange: [
      // Stamp the student: for `user` role it's always self; for `parent`
      // the client passes the child's id; admin picks explicitly.
      (({ req, data }) => {
        if (req.user && !data.student && req.user.role === 'user') {
          data.student = req.user.id
        }
        return data
      }) satisfies CollectionBeforeChangeHook,
    ],
    afterChange: [
      // On approval: cancel the linked slot so the session isn't written off,
      // and log a refund ledger entry (delta 0) for audit.
      (async ({ doc, previousDoc, operation, req }) => {
        const prevStatus = previousDoc?.status
        const newStatus = doc.status
        if (newStatus !== 'approved' || prevStatus === 'approved') return
        if (operation !== 'update' && operation !== 'create') return

        const sick = doc as unknown as {
          id: string
          student: string | { id: string } | null
          slot: string | { id: string } | null
        }
        if (!sick.slot) return

        const slotId = typeof sick.slot === 'object' ? sick.slot.id : sick.slot
        try {
          // Cancel the slot. Because status becomes 'cancelled' (not 'done'),
          // the write-off hook on schedule-slots never fires → no credit loss.
          await req.payload.update({
            collection: 'schedule-slots',
            id: slotId,
            overrideAccess: true,
            data: { status: 'cancelled' },
          })

          // Best-effort ledger entry for transparency (delta 0).
          const studentId =
            typeof sick.student === 'object' && sick.student
              ? sick.student.id
              : (sick.student as string)
          if (studentId) {
            // Find the student's latest subscription to attach the note.
            const subs = await req.payload.find({
              collection: 'subscriptions',
              where: { student: { equals: studentId } },
              sort: '-createdAt',
              limit: 1,
              overrideAccess: true,
            })
            const subId = subs.docs[0]?.id
            if (subId) {
              await req.payload.create({
                collection: 'credit-transactions',
                overrideAccess: true,
                data: {
                  student: studentId,
                  subscription: subId,
                  slot: slotId,
                  delta: 0,
                  reason: 'refund',
                  balanceAfter: subs.docs[0]?.remainingCredits ?? null,
                  note: 'Возврат по больничному (занятие не списано)',
                },
              })
            }
          }
        } catch {
          // Never block the approval on side-effects.
        }
      }) satisfies CollectionAfterChangeHook,
    ],
  },
  fields: [
    {
      name: 'student',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      filterOptions: () => ({ role: { equals: 'user' } }),
      admin: { position: 'sidebar' },
    },
    {
      name: 'slot',
      type: 'relationship',
      relationTo: 'schedule-slots',
      required: true,
      admin: { description: 'Тренировка, по которой подан больничный.' },
    },
    {
      name: 'reason',
      type: 'textarea',
      required: true,
      admin: { description: 'Описание болезни / причина.' },
    },
    {
      name: 'document',
      type: 'upload',
      relationTo: 'documents',
      admin: { description: 'Медицинская справка (необязательно).' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'На рассмотрении', value: 'pending' },
        { label: 'Одобрено', value: 'approved' },
        { label: 'Отклонено', value: 'rejected' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'reviewedAt',
      type: 'date',
      admin: { position: 'sidebar' },
    },
    {
      name: 'reviewNote',
      type: 'textarea',
      admin: { description: 'Комментарий тренера при рассмотрении.' },
    },
  ],
}
