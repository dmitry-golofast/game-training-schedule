import { NextResponse } from 'next/server'

import { sendDueReminders } from '@/lib/email'
import { getPayloadClient } from '@/lib/payload'

/**
 * Cron endpoint for sending slot reminders.
 *
 * Protect with a shared secret via the `CRON_SECRET` env var. Call from an
 * external scheduler (Vercel Cron, systemd timer, etc.) roughly once per
 * hour. Example:
 *
 *   curl -H "Authorization: Bearer $CRON_SECRET" \
 *     https://your-app/api/cron/send-reminders
 */
export async function GET(req: Request) {
  const auth = req.headers.get('authorization') ?? ''
  const expected = process.env.CRON_SECRET
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const leadHours = Number(process.env.REMINDER_LEAD_HOURS ?? 24) || 24

  try {
    const payload = await getPayloadClient()
    const sent = await sendDueReminders(payload, { leadHours, toleranceMin: 65 })
    return NextResponse.json({ ok: true, sent })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
