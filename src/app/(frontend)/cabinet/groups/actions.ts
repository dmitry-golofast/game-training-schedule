'use server'

import { revalidatePath } from 'next/cache'

import { getCurrentUser, getPayloadClient } from '@/lib/payload'
import { isAdminLike } from '@/lib/roles'

type ActionResult = { success: true } | { success: false; error: string }

/** Read member ids from a FormData (multiple `members` entries). */
function readMembers(formData: FormData): string[] {
  return formData
    .getAll('members')
    .map((v) => String(v))
    .filter(Boolean)
}

/**
 * Admin-only: create a group. `members` is a set of existing user ids
 * (role=user); the action validates each one is a real student.
 */
export async function upsertGroupAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const me = await getCurrentUser()
  if (!me || !isAdminLike(me.role)) {
    return { success: false, error: 'Недостаточно прав.' }
  }

  const id = String(formData.get('id') ?? '').trim()
  const name = String(formData.get('name') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const members = readMembers(formData)

  if (!name) {
    return { success: false, error: 'Название группы обязательно.' }
  }

  const payload = await getPayloadClient()

  try {
    if (id) {
      await payload.update({
        collection: 'groups',
        id,
        overrideAccess: true,
        data: {
          name,
          description: description || undefined,
          members: members.length ? members : undefined,
        },
      })
    } else {
      await payload.create({
        collection: 'groups',
        overrideAccess: true,
        data: {
          name,
          description: description || undefined,
          members: members.length ? members : [],
        },
      })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Не удалось сохранить группу. ${message}` }
  }

  revalidatePath('/cabinet/groups')
  return { success: true }
}

/** Admin-only: delete a group by id. */
export async function deleteGroupAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const me = await getCurrentUser()
  if (!me || !isAdminLike(me.role)) {
    return { success: false, error: 'Недостаточно прав.' }
  }

  const id = String(formData.get('id') ?? '').trim()
  if (!id) {
    return { success: false, error: 'Не указан ID группы.' }
  }

  const payload = await getPayloadClient()
  try {
    await payload.delete({ collection: 'groups', id, overrideAccess: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Не удалось удалить группу. ${message}` }
  }

  revalidatePath('/cabinet/groups')
  return { success: true }
}
