import type { CollectionConfig } from 'payload'

import { studentOwnerScopedOrAdmin } from '@/payload/access/student-owner-scoped'
import { isAdminLike } from '@/lib/roles'

/**
 * A training package (абонемент): a bundle of pre-paid sessions for a student.
 *
 * The trainer creates it manually (no online payment): student + kind +
 * number of sessions + validity period. `remainingCredits` decrements as
 * sessions are completed (see `src/lib/subscriptions.ts → writeOffSession`).
 *
 * Access: admin manages; user/parent read their own/children's.
 */
export const Subscriptions: CollectionConfig = {
  slug: 'subscriptions',
  admin: {
    group: 'Cabinet',
    defaultColumns: ['student', 'kind', 'totalCredits', 'remainingCredits', 'status', 'validUntil'],
  },
  access: {
    read: studentOwnerScopedOrAdmin,
    create: ({ req: { user } }) => isAdminLike(user?.role),
    update: ({ req: { user } }) => isAdminLike(user?.role),
    delete: ({ req: { user } }) => isAdminLike(user?.role),
  },
  hooks: {
    beforeChange: [
      // Initialize remainingCredits from totalCredits on create (admin enters
      // only the total; the system manages the remainder).
      ({ data, operation }) => {
        if (!data) return data
        if (operation === 'create' && data.totalCredits != null) {
          if (data.remainingCredits == null) {
            data.remainingCredits = Number(data.totalCredits)
          }
          if (!data.status) data.status = 'active'
        }
        return data
      },
    ],
    afterChange: [
      // Record a "purchase" ledger entry on creation for audit consistency.
      ({ doc, operation, req }) => {
        if (operation !== 'create') return
        const sub = doc as unknown as {
          id: string
          student: string | { id: string } | null
          totalCredits: number
          remainingCredits: number
        }
        if (!sub.student) return
        const studentId =
          typeof sub.student === 'object' && sub.student ? sub.student.id : (sub.student as string)
        req.payload
          .create({
            collection: 'credit-transactions',
            overrideAccess: true,
            data: {
              student: studentId,
              subscription: sub.id,
              slot: null,
              delta: sub.totalCredits,
              reason: 'purchase',
              balanceAfter: sub.remainingCredits,
              note: 'Покупка абонемента',
            },
          })
          .catch(() => {
            // Ledger write is best-effort; never block subscription creation.
          })
      },
    ],
  },
  fields: [
    {
      name: 'template',
      type: 'relationship',
      relationTo: 'subscription-templates',
      // Optional: legacy subscriptions created before templates have none.
      admin: {
        position: 'sidebar',
        description: 'Шаблон, из которого создан этот абонемент.',
      },
    },
    {
      name: 'student',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      filterOptions: () => ({ role: { equals: 'user' } }),
      admin: { position: 'sidebar' },
    },
    {
      name: 'kind',
      type: 'select',
      required: true,
      defaultValue: 'individual',
      options: [
        { label: 'Индивидуальный', value: 'individual' },
        { label: 'Групповой', value: 'group' },
      ],
    },
    {
      name: 'totalCredits',
      type: 'number',
      required: true,
      admin: { description: 'Сколько занятий куплено.' },
      validate: (v: unknown) => (Number(v) > 0 ? true : 'Должно быть больше 0.'),
    },
    {
      name: 'remainingCredits',
      type: 'number',
      required: true,
      // Synced to totalCredits on create via defaultValue; decremented by the
      // write-off logic. readOnly so the admin can't edit it directly.
      admin: { readOnly: true, description: 'Осталось занятий (управляется системой).' },
    },
    {
      name: 'validFrom',
      type: 'date',
      required: true,
      admin: { description: 'Начало действия абонемента.' },
    },
    {
      name: 'validUntil',
      type: 'date',
      required: true,
      admin: { description: 'Окончание действия абонемента.' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Активен', value: 'active' },
        { label: 'Истёк', value: 'expired' },
        { label: 'Закрыт', value: 'closed' },
      ],
      admin: { readOnly: true },
    },
    {
      name: 'notes',
      type: 'textarea',
    },
  ],
}
