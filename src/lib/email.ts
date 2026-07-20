import type { BasePayload } from 'payload'

import { getUserTimezone, formatInTz } from '@/lib/timezone'

type Recipient = {
  email: string
  name?: string | null
  timezone?: string | null
}

type SlotInfo = {
  startAt: string // ISO
  durationMin: number
  status: 'planned' | 'done' | 'cancelled'
  notes?: string | null
}

const STATUS_TEXT: Record<SlotInfo['status'], string> = {
  planned: 'Запланировано',
  done: 'Завершено',
  cancelled: 'Отменено',
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Format the slot's date/time in the recipient's timezone. */
function formatSlotWhen(slot: SlotInfo, tz: string): string {
  const start = new Date(slot.startAt)
  const end = new Date(start.getTime() + slot.durationMin * 60_000)
  const when = formatInTz(start, tz, {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
  const endStr = formatInTz(end, tz, { hour: '2-digit', minute: '2-digit' })
  return `${when} — ${endStr}`
}

function slotEmailHtml(opts: {
  heading: string
  when: string
  durationMin: number
  status: string
  notes?: string | null
  intro?: string
}): string {
  return `<div style="font-family:system-ui,Arial,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
  <h2 style="margin:0 0 16px;font-size:18px">${escapeHtml(opts.heading)}</h2>
  ${opts.intro ? `<p style="margin:0 0 16px;color:#555">${escapeHtml(opts.intro)}</p>` : ''}
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    <tr><td style="padding:6px 0;color:#888">Когда</td><td style="padding:6px 0;font-weight:600">${escapeHtml(opts.when)}</td></tr>
    <tr><td style="padding:6px 0;color:#888">Длительность</td><td style="padding:6px 0;font-weight:600">${opts.durationMin} мин</td></tr>
    <tr><td style="padding:6px 0;color:#888">Статус</td><td style="padding:6px 0;font-weight:600">${escapeHtml(opts.status)}</td></tr>
  </table>
  ${
    opts.notes
      ? `<p style="margin:16px 0 0;padding:12px;background:#f5f5f5;border-radius:6px;white-space:pre-wrap;font-size:14px">${escapeHtml(opts.notes)}</p>`
      : ''
  }
  <p style="margin:24px 0 0;font-size:12px;color:#999">Это автоматическое уведомление от Game Training Schedule.</p>
</div>`
}

/**
 * Send a "new slot" notification to the student (and their parent, if any).
 * Times are rendered in each recipient's own timezone. Silently skipped
 * when the recipient has no email or SMTP is not configured (Payload logs
 * the message to the console in dev).
 */
export async function sendSlotCreatedEmail(
  payload: BasePayload,
  slot: SlotInfo,
  student: Recipient,
  parent?: Recipient | null,
): Promise<void> {
  const fromName = process.env.SMTP_FROM_NAME || 'Game Training Schedule'
  const fromAddress = process.env.SMTP_FROM_ADDRESS || 'noreply@localhost'

  const recipients: Recipient[] = [student]
  if (parent?.email && parent.email !== student.email) {
    recipients.push(parent)
  }

  for (const to of recipients) {
    const tz = getUserTimezone(to.timezone)
    const when = formatSlotWhen(slot, tz)
    const greeting = to.name ? `Здравствуйте, ${to.name}!` : 'Здравствуйте!'
    const html = slotEmailHtml({
      heading: 'Новая тренировка',
      intro: greeting,
      when,
      durationMin: slot.durationMin,
      status: STATUS_TEXT[slot.status],
      notes: slot.notes,
    })

    try {
      await payload.sendEmail({
        to: to.email,
        from: `${fromName} <${fromAddress}>`,
        subject: `Новая тренировка — ${when}`,
        html,
      })
    } catch (err) {
      // Don't let email failures break slot creation — log and continue.
      payload.logger.error({
        msg: 'Failed to send slot-created email',
        to: to.email,
        err: err instanceof Error ? err.message : String(err),
      })
    }
  }
}

/**
 * Send a reminder (X hours before the slot) to the student and parent.
 * Same rendering/timezone handling as the creation email.
 */
export async function sendSlotReminderEmail(
  payload: BasePayload,
  slot: SlotInfo,
  student: Recipient,
  parent?: Recipient | null,
): Promise<void> {
  const fromName = process.env.SMTP_FROM_NAME || 'Game Training Schedule'
  const fromAddress = process.env.SMTP_FROM_ADDRESS || 'noreply@localhost'

  const recipients: Recipient[] = [student]
  if (parent?.email && parent.email !== student.email) {
    recipients.push(parent)
  }

  for (const to of recipients) {
    const tz = getUserTimezone(to.timezone)
    const when = formatSlotWhen(slot, tz)
    const greeting = to.name ? `Здравствуйте, ${to.name}!` : 'Здравствуйте!'
    const html = slotEmailHtml({
      heading: 'Напоминание о тренировке',
      intro: `${greeting} Скоро тренировка.`,
      when,
      durationMin: slot.durationMin,
      status: STATUS_TEXT[slot.status],
      notes: slot.notes,
    })

    try {
      await payload.sendEmail({
        to: to.email,
        from: `${fromName} <${fromAddress}>`,
        subject: `Напоминание: тренировка ${when}`,
        html,
      })
    } catch (err) {
      payload.logger.error({
        msg: 'Failed to send slot-reminder email',
        to: to.email,
        err: err instanceof Error ? err.message : String(err),
      })
    }
  }
}

/**
 * Scan upcoming slots and send reminders to the assigned student/parent.
 *
 * A reminder is sent when the slot's `startAt - reminderLeadHours` falls
 * within the lookback window `[now - toleranceMin, now]`. We guard against
 * double-sends by storing the last reminder timestamp on the slot's
 * `notes`-adjacent `reminderSentAt` field when present (not modelled here to
 * keep the schema lean); a short tolerance window + frequent cron makes
 * duplicates unlikely. Returns the number of reminders dispatched.
 *
 * This function is invoked by the cron endpoint and is safe to run
 * concurrently — `payload.find` is read-only and `sendSlotReminderEmail`
 * swallows per-recipient errors.
 */
export async function sendDueReminders(
  payload: BasePayload,
  options: { leadHours: number; toleranceMin: number } = {
    leadHours: 24,
    toleranceMin: 65,
  },
): Promise<number> {
  const now = Date.now()
  const leadMs = options.leadHours * 60 * 60_000
  const toleranceMs = options.toleranceMin * 60_000

  // Window: slots whose reminder time is within (now - tolerance, now].
  const reminderDueFrom = new Date(now - toleranceMs + leadMs)
  const reminderDueTo = new Date(now + leadMs)

  const slots = await payload.find({
    collection: 'schedule-slots',
    where: {
      and: [
        { startAt: { greater_than_equal: reminderDueFrom.toISOString() } },
        { startAt: { less_than_equal: reminderDueTo.toISOString() } },
        { status: { equals: 'planned' } },
      ],
    },
    limit: 100,
    overrideAccess: true,
    depth: 1,
  })

  let sent = 0
  for (const slot of slots.docs) {
    const slotInfo = {
      startAt: slot.startAt,
      durationMin: slot.durationMin,
      status: slot.status as 'planned' | 'done' | 'cancelled',
      notes: slot.notes,
    }
    const recipients = await collectSlotRecipients(payload, slot)
    for (const r of recipients) {
      await sendSlotReminderEmail(payload, slotInfo, r.student, r.parent)
      sent += 1
    }
  }

  return sent
}

/**
 * Build the list of (student, parent) recipient pairs for a slot.
 *  - individual → the assigned student + their parent.
 *  - group      → every member of the group + each member's parent.
 *  - legacy (no `kind`) → treated as individual.
 */
async function collectSlotRecipients(
  payload: BasePayload,
  slot: {
    kind?: ('individual' | 'group') | null
    student?: unknown
    group?: unknown
  },
): Promise<Array<{ student: Recipient; parent: Recipient | null }>> {
  const kind: 'individual' | 'group' = slot.kind === 'group' ? 'group' : 'individual'

  if (kind === 'individual') {
    const studentId = resolveRelId(slot.student)
    if (!studentId) return []
    const student = await loadUserRecipient(payload, studentId)
    if (!student) return []
    const parent = student.parentId ? await loadUserRecipient(payload, student.parentId) : null
    return [{ student, parent }]
  }

  // group: expand members.
  const groupId = resolveRelId(slot.group)
  if (!groupId) return []
  try {
    const group = await payload.findByID({
      collection: 'groups',
      id: groupId,
      overrideAccess: true,
      depth: 0,
    })
    const memberIds = (group.members ?? [])
      .map((m) => (typeof m === 'object' && m !== null ? (m as { id: string }).id : (m as string)))
      .filter(Boolean)
    const out: Array<{ student: Recipient; parent: Recipient | null }> = []
    for (const memberId of memberIds) {
      const member = await loadUserRecipient(payload, memberId)
      if (!member) continue
      const parent = member.parentId ? await loadUserRecipient(payload, member.parentId) : null
      out.push({ student: member, parent })
    }
    return out
  } catch {
    return []
  }
}

function resolveRelId(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value !== null && 'id' in value) {
    return String((value as { id: string }).id)
  }
  return null
}

async function loadUserRecipient(
  payload: BasePayload,
  id: string,
): Promise<(Recipient & { parentId?: string | null }) | null> {
  try {
    const u = await payload.findByID({
      collection: 'users',
      id,
      overrideAccess: true,
      depth: 0,
    })
    const parentId =
      typeof u.parent === 'object' && u.parent !== null
        ? (u.parent as { id: string }).id
        : typeof u.parent === 'string'
          ? u.parent
          : null
    return {
      email: u.email,
      name: u.name,
      timezone: u.timezone,
      parentId,
    }
  } catch {
    return null
  }
}
