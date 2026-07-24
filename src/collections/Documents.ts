import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { studentOwnerScopedOrAdmin } from '@/payload/access/student-owner-scoped'

/**
 * Typed document uploads attached to a student's profile: medical
 * certificates, contracts/receipts, or arbitrary files.
 *
 * The `student` field is stamped automatically from the signed-in user
 * (for `user` role) — admins/parents select the target student explicitly.
 */
export const Documents: CollectionConfig = {
  slug: 'documents',
  upload: {
    mimeTypes: ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'],
  },
  admin: {
    group: 'Cabinet',
    defaultColumns: ['student', 'docType', 'title', 'createdAt'],
  },
  access: {
    read: studentOwnerScopedOrAdmin,
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  hooks: {
    beforeChange: [
      (({ req, data }) => {
        // Stamp the owning student. For `user` role, it's always self.
        // Admins/parents must pass `student` in the payload explicitly.
        if (req.user && !data.student && req.user.role === 'user') {
          data.student = req.user.id
        }
        return data
      }) satisfies CollectionBeforeChangeHook,
    ],
  },
  fields: [
    {
      name: 'student',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      filterOptions: () => ({ role: { equals: 'user' } }),
      admin: {
        position: 'sidebar',
        description: 'Ученик, к которому относится документ.',
      },
    },
    {
      name: 'docType',
      type: 'select',
      required: true,
      defaultValue: 'other',
      options: [
        { label: 'Медсправка', value: 'medic' },
        { label: 'Договор / чек', value: 'contract' },
        { label: 'Другое', value: 'other' },
      ],
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'notes',
      type: 'textarea',
    },
  ],
}
