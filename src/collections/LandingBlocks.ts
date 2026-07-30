import type { CollectionConfig } from 'payload'

/**
 * CMS-managed landing page blocks. Each document is one section of the
 * landing page. The admin creates blocks, sets the `blockType`, fills in
 * content, and sets `order` to control rendering position.
 *
 * The frontend loads all visible blocks sorted by `order` and renders
 * each according to its `blockType`.
 */
export const LandingBlocks: CollectionConfig = {
  slug: 'landing-blocks',
  admin: {
    useAsTitle: 'title',
    group: 'Landing',
    defaultColumns: ['title', 'blockType', 'order', 'isVisible'],
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
      admin: { description: 'Internal label for this block (not shown on site).' },
    },
    {
      name: 'blockType',
      type: 'select',
      required: true,
      options: [
        { label: 'Hero', value: 'hero' },
        { label: 'Audience', value: 'audience' },
        { label: 'Problems', value: 'problems' },
        { label: 'Features', value: 'features' },
        { label: 'Gamification', value: 'gamification' },
        { label: 'Parent Control', value: 'parentControl' },
        { label: 'Trainer Dashboard', value: 'trainerDashboard' },
        { label: 'AI Assistant', value: 'aiAssistant' },
        { label: 'Extra Features', value: 'extraFeatures' },
        { label: 'How It Works', value: 'howItWorks' },
        { label: 'Advantages', value: 'advantages' },
        { label: 'Testimonials', value: 'testimonials' },
        { label: 'Pricing', value: 'pricing' },
        { label: 'FAQ', value: 'faq' },
        { label: 'Final CTA', value: 'finalCta' },
      ],
      admin: { position: 'sidebar' },
    },
    // ── Text fields ──
    { name: 'heading', type: 'text' },
    { name: 'subheading', type: 'textarea' },
    { name: 'ctaText', type: 'text' },
    { name: 'ctaTextSecondary', type: 'text' },
    {
      name: 'backgroundImage',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Background image for Hero (full viewport).' },
    },
    // ── Generic items list ──
    {
      name: 'items',
      type: 'array',
      fields: [{ name: 'text', type: 'text', required: true }],
    },
    // ── Feature/audience cards ──
    {
      name: 'cards',
      type: 'array',
      fields: [
        { name: 'icon', type: 'text' },
        { name: 'title', type: 'text', required: true },
        { name: 'subtitle', type: 'text' },
        {
          name: 'items',
          type: 'array',
          fields: [{ name: 'item', type: 'text', required: true }],
        },
      ],
    },
    // ── Gamification stats ──
    {
      name: 'stats',
      type: 'array',
      fields: [
        { name: 'value', type: 'text', required: true },
        { name: 'label', type: 'text', required: true },
      ],
    },
    // ── How it works steps ──
    {
      name: 'steps',
      type: 'array',
      fields: [{ name: 'text', type: 'text', required: true }],
    },
    // ── Trainer dashboard cards ──
    {
      name: 'dashboardCards',
      type: 'array',
      fields: [{ name: 'label', type: 'text', required: true }],
    },
    // ── Testimonials ──
    {
      name: 'testimonials',
      type: 'array',
      fields: [
        { name: 'text', type: 'textarea', required: true },
        { name: 'rating', type: 'number', defaultValue: 5, min: 1, max: 5 },
      ],
    },
    // ── Pricing tiers ──
    {
      name: 'pricing',
      type: 'array',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'price', type: 'text', required: true },
        {
          name: 'features',
          type: 'array',
          fields: [{ name: 'item', type: 'text', required: true }],
        },
        { name: 'popular', type: 'checkbox', defaultValue: false },
      ],
    },
    // ── FAQ ──
    {
      name: 'faq',
      type: 'array',
      fields: [
        { name: 'question', type: 'text', required: true },
        { name: 'answer', type: 'textarea', required: true },
      ],
    },
    // ── Advantages (icon + text) ──
    {
      name: 'advantages',
      type: 'array',
      fields: [
        { name: 'icon', type: 'text' },
        { name: 'text', type: 'text', required: true },
      ],
    },
  ],
}
