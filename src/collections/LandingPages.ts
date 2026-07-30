import type { CollectionConfig } from 'payload'

/**
 * Landing page composition. Each document defines a page by selecting and
 * ordering blocks from the `landing-blocks` collection. Only one page
 * should have `isActive: true` — it is rendered at `/`.
 */
export const LandingPages: CollectionConfig = {
  slug: 'landing-pages',
  admin: {
    useAsTitle: 'title',
    group: 'Landing',
    defaultColumns: ['title', 'slug', 'isActive'],
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: { description: 'Internal name for this page.' },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description:
          'Mark this page as active — it will be shown at /. Only one page should be active.',
      },
    },
    {
      name: 'blocks',
      type: 'array',
      admin: {
        description: 'Add blocks in the order they should appear on the page.',
      },
      fields: [
        {
          name: 'block',
          type: 'relationship',
          relationTo: 'landing-blocks',
          required: true,
        },
      ],
    },
  ],
}
