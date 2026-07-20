import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  CollectionConfig,
} from 'payload'

import { sendSlotCreatedEmail } from '@/lib/email'
import { studentScopedOrAdmin } from '@/payload/access/student-scoped'

const ALLOWED_DURATIONS = [30, 60, 90, 120]

export type SlotKind = 'individual' | 'group'

/**
 * A single training slot in the trainer's schedule.
 *
 * A slot targets either ONE student (`kind: 'individual'`, `student`) or a
 * whole GROUP (`kind: 'group'`, `group`). The two target fields are mutually
 * exclusive; a `beforeChange` hook enforces consistency.
 *
 * Access model:
 *  - `admin`  — full CRUD (manages the schedule).
 *  - `user`   — read-only, sees individual slots where `student = self` and
 *               group slots whose `group.members` contains self.
 *  - `parent` — read-only, sees slots of their children (analogous rule).
 */
export const ScheduleSlots: CollectionConfig = {
  slug: 'schedule-slots',
  admin: {
    group: 'Cabinet',
    defaultColumns: ['startAt', 'kind', 'student', 'group', 'status', 'durationMin'],
  },
  access: {
    read: studentScopedOrAdmin,
    create: ({ req: { user } }) => user?.role === 'admin',
    update: ({ req: { user } }) => user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  hooks: {
    /**
     * Enforce that the chosen `kind` matches its target field:
     *  - individual → `student` required, `group` cleared.
     *  - group      → `group`   required, `student` cleared.
     */
    beforeChange: [
      (({ data }) => {
        if (!data) return data
        const kind: SlotKind = data.kind === 'group' ? 'group' : 'individual'
        data.kind = kind
        if (kind === 'individual') {
          if (!data.student) {
            throw new Error('Для индивидуальной тренировки укажите ученика.')
          }
          data.group = undefined
        } else {
          if (!data.group) {
            throw new Error('Для групповой тренировки выберите группу.')
          }
          data.student = undefined
        }
        return data
      }) satisfies CollectionBeforeChangeHook,
    ],
    afterChange: [
      /**
       * On creation, notify the slot's recipients about the new session.
       *  - individual → the assigned student (+ their parent).
       *  - group      → every member of the group (+ their parents).
       *
       * Skipped for materialized recurrence children to avoid spamming
       * recipients when a whole series is created at once — only the parent
       * slot triggers a notification in that case.
       */
      (async ({ doc, operation, req }) => {
        if (operation !== 'create') return
        if (doc.isRecurringChild) return

        const slot = doc as unknown as {
          id: string
          startAt: string
          durationMin: number
          status: 'planned' | 'done' | 'cancelled'
          notes?: string | null
          kind: SlotKind
          student: string | { id: string } | null
          group: string | { id: string; members?: string[] | { id: string }[] } | null
        }

        const slotInfo = {
          startAt: slot.startAt,
          durationMin: slot.durationMin,
          status: slot.status,
          notes: slot.notes,
        }

        try {
          if (slot.kind === 'individual' && slot.student) {
            const studentId = typeof slot.student === 'object' ? slot.student.id : slot.student
            const student = await req.payload.findByID({
              collection: 'users',
              id: studentId,
              overrideAccess: true,
              depth: 1,
            })
            const parentDoc = await resolveParent(req.payload, student.parent)
            await sendSlotCreatedEmail(
              req.payload,
              slotInfo,
              {
                email: student.email,
                name: student.name,
                timezone: student.timezone,
              },
              parentDoc,
            )
          } else if (slot.kind === 'group' && slot.group) {
            const groupId = typeof slot.group === 'object' ? slot.group.id : slot.group
            const group = await req.payload.findByID({
              collection: 'groups',
              id: groupId,
              overrideAccess: true,
              depth: 1,
            })
            const memberIds = (group.members ?? [])
              .map((m) => (typeof m === 'object' && m !== null ? m.id : (m as string)))
              .filter(Boolean)
            // Notify every member (+ parent).
            for (const memberId of memberIds) {
              const member = await req.payload.findByID({
                collection: 'users',
                id: memberId,
                overrideAccess: true,
                depth: 1,
              })
              if (!member) continue
              const parentDoc = await resolveParent(req.payload, member.parent)
              await sendSlotCreatedEmail(
                req.payload,
                slotInfo,
                {
                  email: member.email,
                  name: member.name,
                  timezone: member.timezone,
                },
                parentDoc,
              )
            }
          }
        } catch {
          // Email/notification failures must not break slot creation.
        }
      }) satisfies CollectionAfterChangeHook,
    ],
  },
  fields: [
    {
      name: 'startAt',
      type: 'date',
      required: true,
      admin: {
        description: 'Дата и время начала тренировки.',
      },
    },
    {
      name: 'durationMin',
      type: 'number',
      required: true,
      defaultValue: 60,
      validate: (value: unknown) => {
        const n = typeof value === 'number' ? value : Number(value)
        if (!ALLOWED_DURATIONS.includes(n)) {
          return `Допустимы: ${ALLOWED_DURATIONS.join('/')} мин`
        }
        return true
      },
    },
    {
      name: 'kind',
      type: 'select',
      required: true,
      defaultValue: 'individual',
      options: [
        { label: 'Индивидуальная', value: 'individual' },
        { label: 'Групповая', value: 'group' },
      ],
      admin: {
        description: 'Индивидуальная (один ученик) или групповая тренировка.',
      },
    },
    {
      name: 'student',
      type: 'relationship',
      relationTo: 'users',
      required: false,
      filterOptions: () => ({
        role: { equals: 'user' },
      }),
      admin: {
        condition: (data) => data.kind !== 'group',
        description: 'Заполняется только для индивидуальной тренировки.',
      },
    },
    {
      name: 'group',
      type: 'relationship',
      relationTo: 'groups',
      required: false,
      admin: {
        condition: (data) => data.kind === 'group',
        description: 'Заполняется только для групповой тренировки.',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'planned',
      options: [
        { label: 'Запланировано', value: 'planned' },
        { label: 'Завершено', value: 'done' },
        { label: 'Отменено', value: 'cancelled' },
      ],
    },
    {
      name: 'notes',
      type: 'textarea',
      admin: {
        description: 'План тренировки или комментарии тренера.',
      },
    },
    // ── Recurrence ──────────────────────────────────────────────
    // A slot is EITHER a one-off, a recurrence "parent" (template + rule),
    // or a materialized "child" of a parent. Parents have `isRecurring: true`
    // and a `recurrence` rule; children carry `isRecurringChild: true` and a
    // pointer back to their parent so they can be cleaned up on edit.
    {
      name: 'isRecurring',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Повторять слот по расписанию.',
        condition: (data) => !data.isRecurringChild,
      },
    },
    {
      name: 'recurrence',
      type: 'group',
      admin: {
        condition: (data) => Boolean(data.isRecurring) && !data.isRecurringChild,
      },
      fields: [
        {
          name: 'frequency',
          type: 'select',
          required: true,
          defaultValue: 'weekly',
          options: [
            { label: 'Ежедневно', value: 'daily' },
            { label: 'Еженедельно', value: 'weekly' },
          ],
        },
        {
          name: 'interval',
          type: 'number',
          required: true,
          defaultValue: 1,
          admin: {
            description: 'Каждую N-ю неделю/день (1..4).',
            step: 1,
          },
          validate: (value: unknown) => {
            const n = Number(value)
            if (!Number.isInteger(n) || n < 1 || n > 4) {
              return 'Интервал: целое от 1 до 4.'
            }
            return true
          },
        },
        {
          name: 'weekdays',
          type: 'number',
          hasMany: true,
          admin: {
            description: 'Дни недели (0=Вс … 6=Сб). Только для еженедельного повторения.',
          },
        },
        {
          name: 'until',
          type: 'date',
          admin: {
            description: 'Дата окончания серии (необязательно, если задано количество).',
          },
        },
        {
          name: 'count',
          type: 'number',
          admin: {
            description: 'Количество повторений (необязательно, если задана дата окончания).',
          },
        },
        {
          name: 'timezone',
          type: 'text',
          required: true,
          defaultValue: 'UTC',
          admin: {
            description: 'IANA timezone, в которой задано время начала серии.',
          },
        },
      ],
    },
    {
      name: 'isRecurringChild',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        hidden: true,
      },
    },
    {
      name: 'recurrenceParent',
      type: 'relationship',
      relationTo: 'schedule-slots',
      admin: {
        hidden: true,
        condition: (data) => Boolean(data.isRecurringChild),
      },
    },
  ],
}

/**
 * Resolve a student's parent into a recipient shape for email notifications.
 * `parent` may be undefined (no parent linked), an id string, or an already
 * populated user object — returns null in the first two-after-lookup cases.
 */
async function resolveParent(
  payload: import('payload').BasePayload,
  parent: unknown,
): Promise<{ email: string; name?: string | null; timezone?: string | null } | null> {
  if (!parent) return null
  if (typeof parent === 'object' && parent !== null && 'email' in parent) {
    const p = parent as { email: string; name?: string | null; timezone?: string | null }
    return { email: p.email, name: p.name, timezone: p.timezone }
  }
  try {
    const p = await payload.findByID({
      collection: 'users',
      id: String(parent),
      overrideAccess: true,
    })
    return { email: p.email, name: p.name, timezone: p.timezone }
  } catch {
    return null
  }
}
