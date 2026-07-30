import { NextResponse } from 'next/server'

import { getPayloadClient } from '@/lib/payload'

/**
 * Cron endpoint: auto-complete past planned slots that have attendance
 * journal filled.
 *
 * Logic:
 *  1. Find all slots with status `planned` and `startAt` in the past.
 *  2. For each: if `attendance` array is filled → set status `done`
 *     (the afterChange hook handles per-student write-off).
 *  3. If attendance is empty → leave as `planned` (trainer hasn't marked yet).
 *
 * Protect with CRON_SECRET. Call ~every hour from external scheduler.
 */
export async function GET(req: Request) {
  const auth = req.headers.get('authorization') ?? ''
  const expected = process.env.CRON_SECRET
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = await getPayloadClient()
    const now = new Date().toISOString()

    // Find all planned slots with startAt in the past.
    const result = await payload.find({
      collection: 'schedule-slots',
      where: {
        and: [{ status: { equals: 'planned' } }, { startAt: { less_than: now } }],
      },
      limit: 500,
      overrideAccess: true,
      depth: 0,
    })

    let completed = 0
    let skipped = 0

    for (const slot of result.docs) {
      // Check if attendance journal has been filled.
      const hasAttendance = Array.isArray(slot.attendance) && slot.attendance.length > 0

      if (hasAttendance) {
        // The afterChange hook will fire on planned→done transition
        // and handle per-student write-off based on attendance.
        await payload.update({
          collection: 'schedule-slots',
          id: slot.id,
          overrideAccess: true,
          data: { status: 'done' },
        })
        completed += 1
      } else {
        // No attendance yet — leave as planned.
        skipped += 1
      }
    }

    return NextResponse.json({
      ok: true,
      checked: result.docs.length,
      completed,
      skipped,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
