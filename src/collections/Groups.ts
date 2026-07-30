import type { CollectionConfig } from 'payload'
import { isAdminLike } from '@/lib/roles'

/**
 * A training group — a named set of students that the trainer can address as
 * a single target when scheduling group sessions.
 *
 * Access: admin-only. Only trainers manage groups; students and parents
 * never touch them directly (they simply see group slots they belong to).
 */
export const Groups: CollectionConfig = {
  slug: 'groups',
  admin: {
    useAsTitle: 'name',
    group: 'Cabinet',
    defaultColumns: ['name', 'members', 'updatedAt'],
  },
  access: {
    read: ({ req: { user } }) => isAdminLike(user?.role),
    create: ({ req: { user } }) => isAdminLike(user?.role),
    update: ({ req: { user } }) => isAdminLike(user?.role),
    delete: ({ req: { user } }) => isAdminLike(user?.role),
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'members',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      filterOptions: () => ({
        role: { equals: 'user' },
      }),
      admin: {
        description: 'Ученики, входящие в группу.',
      },
    },
    {
      name: 'description',
      type: 'textarea',
    },
  ],
}
