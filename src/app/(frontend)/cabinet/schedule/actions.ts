'use server'

import { revalidatePath } from 'next/cache'

import { ALLOWED_DURATIONS } from '@/lib/datetime'
import { expandRecurrence, type RecurrenceFrequency, type RecurrenceRule } from '@/lib/recurrence'
import { getPayloadClient, getCurrentUser } from '@/lib/payload'
import { getUserTimezone, wallClockToUtc } from '@/lib/timezone'
import { isAdminLike } from '@/lib/roles'

const VALID_STATUSES = new Set(['planned', 'done', 'cancelled'])
type SlotStatus = 'planned' | 'done' | 'cancelled'

type ActionResult = { success: true } | { success: false; error: string }

/**
 * Admin-only action: create or update a schedule slot.
 *
 *  - Requires `role === 'admin'` (checked via the resolved session).
 *  - `id` present → update the existing slot; absent → create a new one.
 *  - `durationMin` must be one of ALLOWED_DURATIONS; `status` must be valid.
 *  - `startAt` arrives as a local `datetime-local` string ("YYYY-MM-DDTHH:mm");
 *    we convert it to a Date that preserves the chosen wall-clock time.
 */
export async function upsertSlotAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const me = await getCurrentUser()
  if (!me || !isAdminLike(me.role)) {
    return { success: false, error: 'Недостаточно прав.' }
  }

  const id = String(formData.get('id') ?? '').trim()
  const startAtRaw = String(formData.get('startAt') ?? '').trim()
  const durationMin = Number(formData.get('durationMin') ?? 0)
  const status = String(formData.get('status') ?? 'planned').trim()
  const notes = String(formData.get('notes') ?? '').trim()
  // The timezone in which the `datetime-local` value is expressed. Falls back
  // to the signed-in user's configured timezone.
  const tz = getUserTimezone(String(formData.get('timezone') ?? '').trim() || me.timezone)

  // Slot target — either an individual student or a group.
  const rawKind = String(formData.get('kind') ?? 'individual').trim()
  const kind: 'individual' | 'group' = rawKind === 'group' ? 'group' : 'individual'
  const student = String(formData.get('student') ?? '').trim()
  const group = String(formData.get('group') ?? '').trim()

  // Recurrence fields (optional).
  const isRecurring = String(formData.get('isRecurring') ?? '') === 'true'
  const frequencyRaw = String(formData.get('recurrence.frequency') ?? 'weekly')
  const frequency: RecurrenceFrequency = frequencyRaw === 'daily' ? 'daily' : 'weekly'
  const interval = Math.max(1, Math.min(4, Number(formData.get('recurrence.interval') ?? 1) || 1))
  const weekdaysRaw = formData.getAll('recurrence.weekdays').map((v) => Number(v))
  const weekdays = weekdaysRaw.filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
  const until = String(formData.get('recurrence.until') ?? '').trim() || null
  const countRaw = Number(formData.get('recurrence.count') ?? 0)

  // Validate the slot target per its kind.
  if (!startAtRaw) {
    return { success: false, error: 'Время начала обязательно.' }
  }
  if (kind === 'individual' && !student) {
    return { success: false, error: 'Укажите ученика для индивидуальной тренировки.' }
  }
  if (kind === 'group' && !group) {
    return { success: false, error: 'Выберите группу для групповой тренировки.' }
  }
  if (!ALLOWED_DURATIONS.includes(durationMin as (typeof ALLOWED_DURATIONS)[number])) {
    return { success: false, error: 'Недопустимая длительность.' }
  }
  if (!VALID_STATUSES.has(status)) {
    return { success: false, error: 'Недопустимый статус.' }
  }
  const statusValue = status as SlotStatus

  // `datetime-local` yields a wall-clock string "YYYY-MM-DDTHH:mm" with no
  // timezone. We interpret it in the viewer's timezone and convert to a UTC
  // instant for storage.
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(startAtRaw)
  if (!match) {
    return { success: false, error: 'Некорректная дата/время.' }
  }
  const startAt = wallClockToUtc(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    tz,
  )
  if (Number.isNaN(startAt.getTime())) {
    return { success: false, error: 'Некорректная дата/время.' }
  }

  const payload = await getPayloadClient()

  // If recurring, validate that at least one of `until` / `count` is set.
  const count = Number.isFinite(countRaw) && countRaw > 0 ? countRaw : null
  if (isRecurring && !until && !count) {
    return {
      success: false,
      error: 'Укажите дату окончания или количество повторений.',
    }
  }

  try {
    if (id) {
      // Update path. If this is a recurrence parent, rebuild its children.
      const existing = await payload.findByID({
        collection: 'schedule-slots',
        id,
        overrideAccess: true,
      })

      if (isRecurring || existing.isRecurring) {
        // Delete previously-materialized children of this parent.
        await payload.delete({
          collection: 'schedule-slots',
          where: {
            and: [{ recurrenceParent: { equals: id } }, { isRecurringChild: { equals: true } }],
          },
          overrideAccess: true,
        })
      }

      await payload.update({
        collection: 'schedule-slots',
        id,
        overrideAccess: true,
        data: {
          startAt: startAt.toISOString(),
          durationMin,
          kind,
          student: kind === 'individual' ? student : undefined,
          group: kind === 'group' ? group : undefined,
          status: statusValue,
          notes: notes || null,
          isRecurring,
          isRecurringChild: false,
          recurrenceParent: null,
          recurrence: isRecurring
            ? {
                frequency,
                interval,
                weekdays: weekdays.length ? weekdays : null,
                until,
                count,
                timezone: tz,
              }
            : undefined,
        },
      })

      if (isRecurring) {
        await materializeChildren(
          payload,
          id,
          startAt,
          {
            frequency,
            interval,
            weekdays: weekdays.length ? weekdays : null,
            until,
            count,
            timezone: tz,
          },
          {
            durationMin,
            status: statusValue,
            notes,
            kind,
            student: kind === 'individual' ? student : undefined,
            group: kind === 'group' ? group : undefined,
          },
        )
      }
    } else {
      // Create path.
      const parent = await payload.create({
        collection: 'schedule-slots',
        overrideAccess: true,
        data: {
          startAt: startAt.toISOString(),
          durationMin,
          kind,
          student: kind === 'individual' ? student : undefined,
          group: kind === 'group' ? group : undefined,
          status: statusValue,
          notes: notes || null,
          isRecurring,
          isRecurringChild: false,
          recurrenceParent: null,
          recurrence: isRecurring
            ? {
                frequency,
                interval,
                weekdays: weekdays.length ? weekdays : null,
                until,
                count,
                timezone: tz,
              }
            : undefined,
        },
      })

      if (isRecurring) {
        await materializeChildren(
          payload,
          parent.id,
          startAt,
          {
            frequency,
            interval,
            weekdays: weekdays.length ? weekdays : null,
            until,
            count,
            timezone: tz,
          },
          {
            durationMin,
            status: statusValue,
            notes,
            kind,
            student: kind === 'individual' ? student : undefined,
            group: kind === 'group' ? group : undefined,
          },
        )
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      success: false,
      error: `Не удалось сохранить слот. ${message}`,
    }
  }

  revalidatePath('/cabinet/schedule')
  return { success: true }
}

type ChildPayload = {
  durationMin: number
  status: SlotStatus
  notes: string
  kind: 'individual' | 'group'
  student?: string
  group?: string
}

/**
 * Materialize recurrence children (skipping the parent's own time) as real
 * `schedule-slots` documents pointing back to the parent. Each child shares
 * the parent's duration, target (student/group), status and notes.
 */
async function materializeChildren(
  payload: Awaited<ReturnType<typeof getPayloadClient>>,
  parentId: string,
  parentStart: Date,
  rule: RecurrenceRule,
  child: ChildPayload,
) {
  // Expand far enough ahead. Use `until` if set, otherwise 1 year cap.
  const rangeEnd = rule.until
    ? new Date(rule.until)
    : new Date(parentStart.getTime() + 365 * 86_400_000)
  const occurrences = expandRecurrence(parentStart, rule, rangeEnd)

  // Skip the first occurrence (it's the parent itself).
  for (let i = 1; i < occurrences.length; i += 1) {
    await payload.create({
      collection: 'schedule-slots',
      overrideAccess: true,
      data: {
        startAt: occurrences[i].toISOString(),
        durationMin: child.durationMin,
        status: child.status,
        notes: child.notes || null,
        kind: child.kind,
        student: child.kind === 'individual' ? child.student : undefined,
        group: child.kind === 'group' ? child.group : undefined,
        isRecurring: false,
        isRecurringChild: true,
        recurrenceParent: parentId,
        recurrence: undefined,
      },
    })
  }
}

/**
 * Admin-only action: delete a schedule slot by id.
 */
export async function deleteSlotAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const me = await getCurrentUser()
  if (!me || !isAdminLike(me.role)) {
    return { success: false, error: 'Недостаточно прав.' }
  }

  const id = String(formData.get('id') ?? '').trim()
  if (!id) {
    return { success: false, error: 'Не указан ID слота.' }
  }

  const payload = await getPayloadClient()
  try {
    // If this is a recurrence parent, remove its materialized children too.
    const existing = await payload.findByID({
      collection: 'schedule-slots',
      id,
      overrideAccess: true,
    })
    if (existing.isRecurring) {
      await payload.delete({
        collection: 'schedule-slots',
        where: {
          and: [{ recurrenceParent: { equals: id } }, { isRecurringChild: { equals: true } }],
        },
        overrideAccess: true,
      })
    }
    await payload.delete({
      collection: 'schedule-slots',
      id,
      overrideAccess: true,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Не удалось удалить слот. ${message}` }
  }

  revalidatePath('/cabinet/schedule')
  return { success: true }
}

/**
 * Admin-only: save attendance for a slot and mark it as done.
 *
 * Reads `slotId` and multiple `student_<id> = 'true'|'false'` pairs from
 * FormData. Sets the slot's `attendance` array and transitions status to
 * `done`, which triggers the write-off hook (only for present students).
 */
export async function saveAttendanceAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const me = await getCurrentUser()
  if (!me || !isAdminLike(me.role)) {
    return { success: false, error: 'Недостаточно прав.' }
  }

  const slotId = String(formData.get('slotId') ?? '').trim()
  if (!slotId) {
    return { success: false, error: 'Не указан ID тренировки.' }
  }

  const attendance: Array<{ student: string; present: boolean }> = []
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('student_')) {
      const studentId = key.slice('student_'.length)
      if (studentId) {
        attendance.push({ student: studentId, present: String(value) !== 'false' })
      }
    }
  }

  if (attendance.length === 0) {
    return { success: false, error: 'Нет учеников для отметки.' }
  }

  const payload = await getPayloadClient()

  try {
    await payload.update({
      collection: 'schedule-slots',
      id: slotId,
      overrideAccess: true,
      data: {
        attendance,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Не удалось сохранить журнал. ${message}` }
  }

  revalidatePath('/cabinet/schedule')
  return { success: true }
}
