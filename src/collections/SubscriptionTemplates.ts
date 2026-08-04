import type { CollectionConfig } from 'payload'

import { isAdminLike } from '@/lib/roles'

/**
 * Catalog of subscription packages (шаблоны абонементов).
 *
 * A template defines the reusable shape of a subscription — title, kind,
 * number of sessions, notes — with NO student binding. Trainers manage the
 * catalog on /cabinet/subscriptions. A concrete subscription instance (with
 * a student + validity period + remaining credits) is created from a
 * template in the student profile (see `assignSubscriptionAction`).
 *
 * Access: admin/trainer manage; everyone else reads the catalog (for
 * reference — which packages exist), but cannot create/edit.
 */
export const SubscriptionTemplates: CollectionConfig = {
  slug: 'subscription-templates',
  admin: {
    group: 'Cabinet',
    defaultColumns: ['title', 'kind', 'totalCredits', 'updatedAt'],
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => isAdminLike(user?.role),
    update: ({ req: { user } }) => isAdminLike(user?.role),
    delete: ({ req: { user } }) => isAdminLike(user?.role),
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: { description: 'Название абонемента (например: «Индивидуальный 8 занятий»).' },
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
      admin: { description: 'Сколько занятий входит в абонемент.' },
      validate: (v: unknown) => (Number(v) > 0 ? true : 'Должно быть больше 0.'),
    },
    {
      name: 'notes',
      type: 'textarea',
    },
  ],
}
