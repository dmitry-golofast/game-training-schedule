'use client'

import { LayoutGridIcon, ListIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'

export type ViewMode = 'cards' | 'list'

/**
 * Segmented control for switching between cards and list views.
 * The active option is visually distinct (filled background, muted icon),
 * the inactive one is ghost with reduced opacity for a clear affordance.
 */
export function ViewToggle({
  value,
  onChange,
  cardsLabel = 'Карточки',
  listLabel = 'Список',
}: {
  value: ViewMode
  onChange: (mode: ViewMode) => void
  cardsLabel?: string
  listLabel?: string
}) {
  return (
    <div
      role="group"
      aria-label="Режим просмотра"
      className="inline-flex items-center gap-0.5 rounded-md border border-border bg-muted p-0.5"
    >
      <Button
        type="button"
        size="sm"
        variant={value === 'cards' ? 'secondary' : 'ghost'}
        className="gap-1.5"
        aria-pressed={value === 'cards'}
        onClick={() => onChange('cards')}
      >
        <LayoutGridIcon className={value === 'cards' ? 'size-4' : 'size-4 opacity-50'} />
        {cardsLabel}
      </Button>
      <Button
        type="button"
        size="sm"
        variant={value === 'list' ? 'secondary' : 'ghost'}
        className="gap-1.5"
        aria-pressed={value === 'list'}
        onClick={() => onChange('list')}
      >
        <ListIcon className={value === 'list' ? 'size-4' : 'size-4 opacity-50'} />
        {listLabel}
      </Button>
    </div>
  )
}
