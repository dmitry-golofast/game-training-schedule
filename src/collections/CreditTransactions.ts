import type { CollectionConfig } from 'payload'

import { studentOwnerScopedOrAdmin } from '@/payload/access/student-owner-scoped'

/**
 * Append-only ledger of credit movements for a student's subscriptions.
 *
 *  - `reason: 'purchase'`   — +N when a subscription is created.
 *  - `reason: 'session'`    — -1 when a slot is marked done (one write-off).
 *  - `reason: 'refund'`     — 0 for sick-leave transparency (no real refund).
 *  - `reason: 'adjustment'` — manual correction by admin.
 *
 * Read access is student-scoped; writes are system/admin-only (created by
 * hooks and actions, never directly by the student).
 */
export const CreditTransactions: CollectionConfig = {
  slug: 'credit-transactions',
  admin: {
    group: 'Cabinet',
    defaultColumns: ['student', 'subscription', 'delta', 'reason', 'createdAt'],
  },
  access: {
    read: studentOwnerScopedOrAdmin,
    create: ({ req: { user } }) => user?.role === 'admin',
    update: ({ req: { user } }) => user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
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
      name: 'subscription',
      type: 'relationship',
      relationTo: 'subscriptions',
      required: true,
    },
    {
      name: 'slot',
      type: 'relationship',
      relationTo: 'schedule-slots',
      admin: { description: 'Слот, за который списано занятие (если применимо).' },
    },
    {
      name: 'delta',
      type: 'number',
      required: true,
      admin: { description: '+N при покупке, −1 при списании.' },
    },
    {
      name: 'reason',
      type: 'select',
      required: true,
      options: [
        { label: 'Покупка', value: 'purchase' },
        { label: 'Списание за тренировку', value: 'session' },
        { label: 'Возврат (больничный)', value: 'refund' },
        { label: 'Корректировка', value: 'adjustment' },
      ],
    },
    {
      name: 'balanceAfter',
      type: 'number',
      admin: { description: 'Остаток на абонементе после операции.' },
    },
    {
      name: 'note',
      type: 'textarea',
    },
  ],
}
