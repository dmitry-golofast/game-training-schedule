import type { CollectionConfig } from 'payload'

import { accessibleOrAdmin, ownerOrAdmin } from '@/payload/access/owned'

/**
 * Generic upload collection. Files are readable by anyone (so avatars,
 * public images, etc. render without auth), but writes are scoped to the
 * owning user + admins via the `owner` relationship.
 */
export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    // Public read so avatars and shared images render without auth.
    read: () => true,
    create: ({ req: { user } }) => Boolean(user),
    update: accessibleOrAdmin,
    delete: ownerOrAdmin,
  },
  upload: true,
  hooks: {
    beforeChange: [
      ({ req, data }) => {
        if (req.user && !data.owner) {
          data.owner = req.user.id
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        readOnly: true,
        hidden: true,
      },
    },
  ],
}
