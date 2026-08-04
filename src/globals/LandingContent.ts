import type { GlobalConfig } from 'payload'

/**
 * CMS-managed landing page content. All 15 sections of the eventFit landing
 * page are editable from the Payload admin panel. Default values use ASCII
 * to avoid encoding issues with MongoDB.
 */
export const LandingContent: GlobalConfig = {
  slug: 'landing-content',
  admin: {
    group: 'Landing',
  },
  fields: [
    // ── Block 1: Hero ──
    {
      name: 'hero',
      type: 'group',
      fields: [
        {
          name: 'heading',
          type: 'text',
          required: true,
          defaultValue: 'Kazhdaya trenirovka pod kontrolem',
        },
        {
          name: 'subheading',
          type: 'textarea',
          defaultValue: 'eventFit obyedinyaet roditeley, detey i trenerov v odnom prilozhenii.',
        },
        { name: 'ctaText', type: 'text', defaultValue: 'Poprobovat besplatno' },
        {
          name: 'trialNote',
          type: 'text',
          defaultValue: '14 dney besplatno • Bez bankovskoy karti',
        },
      ],
    },
    // ── Block 2: Audience ──
    {
      name: 'audience',
      type: 'array',
      fields: [
        { name: 'icon', type: 'text', required: true },
        { name: 'title', type: 'text', required: true },
        { name: 'subtitle', type: 'text' },
        {
          name: 'features',
          type: 'array',
          fields: [{ name: 'item', type: 'text', required: true }],
        },
      ],
    },
    // ── Block 3: Problems ──
    {
      name: 'problems',
      type: 'group',
      fields: [
        {
          name: 'heading',
          type: 'text',
          defaultValue: 'Khvatit iskat soobshcheniya v messendzherah.',
        },
        {
          name: 'items',
          type: 'array',
          fields: [{ name: 'text', type: 'text', required: true }],
        },
      ],
    },
    // ── Block 4: Features ──
    {
      name: 'features',
      type: 'array',
      fields: [
        { name: 'icon', type: 'text', required: true },
        { name: 'title', type: 'text', required: true },
        { name: 'items', type: 'array', fields: [{ name: 'item', type: 'text', required: true }] },
      ],
    },
    // ── Block 5: Gamification ──
    {
      name: 'gamification',
      type: 'group',
      fields: [
        { name: 'heading', type: 'text', defaultValue: 'Rebenok sam hochet otkrivat prilozhenie.' },
        {
          name: 'subtitle',
          type: 'text',
          defaultValue: 'Kazhdiy pohod na trenirovku stanovitsya novoy pobedoy.',
        },
        {
          name: 'stats',
          type: 'array',
          fields: [
            { name: 'value', type: 'text', required: true },
            { name: 'label', type: 'text', required: true },
          ],
        },
      ],
    },
    // ── Block 6: Parent Control ──
    {
      name: 'parentControl',
      type: 'group',
      fields: [
        { name: 'heading', type: 'text', defaultValue: 'Vi znaete vsyo, chto proishodit.' },
        {
          name: 'items',
          type: 'array',
          fields: [{ name: 'text', type: 'text', required: true }],
        },
      ],
    },
    // ── Block 7: Trainer Dashboard ──
    {
      name: 'trainerDashboard',
      type: 'group',
      fields: [
        { name: 'heading', type: 'text', defaultValue: 'Kabinet trenera' },
        {
          name: 'subtitle',
          type: 'text',
          defaultValue: 'Vmesto Excel, WhatsApp i bumazhek odna sistema.',
        },
        {
          name: 'cards',
          type: 'array',
          fields: [{ name: 'label', type: 'text', required: true }],
        },
      ],
    },
    // ── Block 8: AI Assistant ──
    {
      name: 'aiAssistant',
      type: 'group',
      fields: [
        {
          name: 'heading',
          type: 'text',
          defaultValue: 'Iskusstvenniy intellekt pomogaet ekonomit chasy raboty.',
        },
        {
          name: 'items',
          type: 'array',
          fields: [{ name: 'text', type: 'text', required: true }],
        },
      ],
    },
    // ── Block 9: Extra Features ──
    {
      name: 'extraFeatures',
      type: 'array',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'items', type: 'array', fields: [{ name: 'item', type: 'text', required: true }] },
      ],
    },
    // ── Block 10: How It Works ──
    {
      name: 'howItWorks',
      type: 'group',
      fields: [
        { name: 'heading', type: 'text', defaultValue: 'Kak rabotaet' },
        {
          name: 'steps',
          type: 'array',
          fields: [{ name: 'text', type: 'text', required: true }],
        },
      ],
    },
    // ── Block 11: Advantages ──
    {
      name: 'advantages',
      type: 'array',
      fields: [
        { name: 'icon', type: 'text', required: true },
        { name: 'text', type: 'text', required: true },
      ],
    },
    // ── Block 12: Testimonials ──
    {
      name: 'testimonials',
      type: 'array',
      fields: [
        { name: 'text', type: 'textarea', required: true },
        { name: 'rating', type: 'number', defaultValue: 5, min: 1, max: 5 },
      ],
    },
    // ── Block 13: Pricing ──
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
    // ── Block 14: FAQ ──
    {
      name: 'faq',
      type: 'array',
      fields: [
        { name: 'question', type: 'text', required: true },
        { name: 'answer', type: 'textarea', required: true },
      ],
    },
    // ── Block 15: Final CTA ──
    {
      name: 'finalCta',
      type: 'group',
      fields: [
        {
          name: 'heading',
          type: 'text',
          defaultValue: 'Perestante tratit vremya na organizatsiyu trenirovok.',
        },
        {
          name: 'subheading',
          type: 'textarea',
          defaultValue: 'eventFit pomogaet rebenku zanimatsya regulyarno.',
        },
        { name: 'ctaText', type: 'text', defaultValue: 'Poprobovat besplatno' },
        { name: 'note', type: 'text', defaultValue: '14 dney besplatno • Otmena v lyuboy moment' },
      ],
    },
  ],
}
