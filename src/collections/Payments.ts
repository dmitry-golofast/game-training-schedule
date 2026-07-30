import type { CollectionConfig } from 'payload'

import { studentOwnerScopedOrAdmin } from '@/payload/access/student-owner-scoped'
import { isAdminLike } from '@/lib/roles'

/**
 * A payment record: the trainer manually records a cash/card/transfer payment
 * for a student, optionally linking it to a subscription. Receipts are stored
 * as `documents` uploads.
 *
 * Access: admin manages; user/parent read their own/children's.
 */
export const Payments: CollectionConfig = {
  slug: 'payments',
  admin: {
    group: 'Cabinet',
    defaultColumns: ['student', 'amount', 'currency', 'periodFrom', 'periodTo', 'paidAt'],
  },
  access: {
    read: studentOwnerScopedOrAdmin,
    create: ({ req: { user } }) => isAdminLike(user?.role),
    update: ({ req: { user } }) => isAdminLike(user?.role),
    delete: ({ req: { user } }) => isAdminLike(user?.role),
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
      admin: { description: 'Связанный абонемент (необязательно).' },
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      admin: { description: 'Сумма платежа.' },
      validate: (v: unknown) => (Number(v) >= 0 ? true : 'Сумма не может быть отрицательной.'),
    },
    {
      name: 'currency',
      type: 'select',
      defaultValue: 'RUB',
      options: [
        { label: '₽ RUB', value: 'RUB' },
        { label: '$ USD', value: 'USD' },
        { label: '€ EUR', value: 'EUR' },
      ],
    },
    {
      name: 'periodFrom',
      type: 'date',
      required: true,
      admin: { description: 'Начало оплаченного периода.' },
    },
    {
      name: 'periodTo',
      type: 'date',
      required: true,
      admin: { description: 'Конец оплаченного периода.' },
    },
    {
      name: 'method',
      type: 'select',
      options: [
        { label: 'Наличные', value: 'cash' },
        { label: 'Карта', value: 'card' },
        { label: 'Перевод', value: 'transfer' },
      ],
    },
    {
      name: 'paidAt',
      type: 'date',
      required: true,
      admin: { description: 'Дата платежа.' },
    },
    {
      name: 'receipt',
      type: 'upload',
      relationTo: 'documents',
      admin: { description: 'Чек / квитанция (документ).' },
    },
    {
      name: 'note',
      type: 'textarea',
    },
  ],
}
