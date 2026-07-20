import type { CollectionConfig } from 'payload'

import { accessibleOrAdmin, ownerOrAdmin } from '@/payload/access/owned'

/**
 * Demo collection that demonstrates the per-user data-isolation pattern
 * used throughout the personal cabinet. Every document is scoped to its
 * `owner`; the `read` access function returns a Where query that the
 * database enforces, so users never see each other's notes.
 *
 * Replace / extend this with the real domain collections (schedules,
 * exercises, progress, …) in subsequent iterations.
 */
export const UserNotes: CollectionConfig = {
  slug: 'user-notes',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'owner', 'updatedAt'],
    group: 'Cabinet',
  },
  access: {
    read: accessibleOrAdmin,
    create: ({ req: { user } }) => Boolean(user),
    update: ownerOrAdmin,
    delete: ownerOrAdmin,
  },
  hooks: {
    beforeChange: [
      ({ req, data }) => {
        // Stamp the owner on first create. Only set when missing so admins
        // editing on someone's behalf don't accidentally reassign ownership.
        if (req.user && !data.owner) {
          data.owner = req.user.id
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'content',
      type: 'textarea',
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        readOnly: true,
        hidden: true,
      },
    },
  ],
}
