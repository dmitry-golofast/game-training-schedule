import type { ScheduleSlot } from '@/payload-types'

export type SlotStatus = 'planned' | 'done' | 'cancelled'
export type SlotKind = 'individual' | 'group'

export type Student = { id: string; name: string; email: string }

/** Populated group reference as used by the grid/dialog. */
export type GroupRef = { id: string; name: string }

export type GridSlot = {
  id: string
  startAt: string
  durationMin: number
  status: SlotStatus
  notes?: string | null
  kind: SlotKind
  student: Student | null
  group: GroupRef | null
  isRecurring: boolean
  isRecurringChild: boolean
}

/** Shape of a slot passed from the server component to the client views. */
export function toGridSlot(slot: ScheduleSlot): GridSlot {
  const studentDoc =
    typeof slot.student === 'object' && slot.student !== null
      ? {
          id: slot.student.id,
          name: slot.student.name || slot.student.email,
          email: slot.student.email,
        }
      : null
  const groupDoc =
    typeof slot.group === 'object' && slot.group !== null
      ? { id: slot.group.id, name: slot.group.name }
      : null
  return {
    id: slot.id,
    startAt: slot.startAt,
    durationMin: slot.durationMin,
    status: slot.status,
    notes: slot.notes,
    kind: slot.kind === 'group' ? 'group' : 'individual',
    student: studentDoc,
    group: groupDoc,
    isRecurring: Boolean(slot.isRecurring),
    isRecurringChild: Boolean(slot.isRecurringChild),
  }
}

export const STATUS_STYLES: Record<SlotStatus, string> = {
  planned: 'border-l-primary bg-primary/10 text-primary hover:bg-primary/15',
  done: 'border-l-muted-foreground/50 bg-muted/40 text-muted-foreground hover:bg-muted/60',
  cancelled:
    'border-l-destructive bg-destructive/10 text-destructive line-through hover:bg-destructive/15',
}

export const STATUS_LABEL: Record<SlotStatus, string> = {
  planned: 'Запланировано',
  done: 'Завершено',
  cancelled: 'Отменено',
}

/** Small dot color per status for calendar cells. */
export const STATUS_DOT: Record<SlotStatus, string> = {
  planned: 'bg-primary',
  done: 'bg-muted-foreground',
  cancelled: 'bg-destructive',
}

/**
 * Intensity buckets for the year view heat-style day cells. A day with more
 * slots gets a stronger background; cancelled slots don't count toward the
 * "active" intensity (they render as a strikethrough dot instead).
 */
export const STATUS_WEIGHT: Record<SlotStatus, number> = {
  planned: 1,
  done: 1,
  cancelled: 0,
}

/**
 * Background classes per slot-count intensity level, used by the year view to
 * produce a subtle "heat" effect. Index 0 = no slots, higher = busier.
 */
export const INTENSITY_BG: string[] = [
  // 0 slots
  '',
  // 1 slot
  'bg-primary/15 text-primary',
  // 2 slots
  'bg-primary/30 text-primary',
  // 3 slots
  'bg-primary/50 text-primary-foreground',
  // 4+ slots
  'bg-primary/80 text-primary-foreground font-semibold',
]

/** Map an integer slot count to an intensity bucket (0..INTENSITY_BG.length-1). */
export function intensityForCount(count: number): number {
  if (count <= 0) return 0
  if (count >= 4) return INTENSITY_BG.length - 1
  return count
}

export type DayStat = {
  /** Active (non-cancelled) slot count. */
  count: number
  /** Whether at least one cancelled slot exists on this day. */
  hasCancelled: boolean
  /** Whether at least one planned slot exists on this day. */
  hasPlanned: boolean
  /** Whether at least one done slot exists on this day. */
  hasDone: boolean
}

export type DialogData = {
  id?: string
  startAt: string
  durationMin: number
  kind: SlotKind
  student: string
  group: string
  status: SlotStatus
  notes?: string | null
  isChild?: boolean
}

/** Human-readable label for a slot's target (student or group). */
export function slotTargetLabel(slot: {
  kind: SlotKind
  student: Student | null
  group: GroupRef | null
}): string {
  if (slot.kind === 'group') {
    return slot.group ? `Группа «${slot.group.name}»` : 'Без группы'
  }
  return slot.student?.name ?? 'Без ученика'
}
