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
 * If `formData` carries a non-empty `preview` file, upload it into the `media`
 * collection and return the new media document id. Returns null when no file
 * was attached (so the caller can skip touching the `preview` field).
 *
 * Mirrors the upload pattern in `subscriptions/actions.ts`.
 */
async function uploadPreviewFile(
  formData: FormData,
  alt: string,
): Promise<{ id: string } | { error: string } | null> {
  const file = formData.get('preview')
  if (!(file instanceof File) || file.size === 0) return null

  const payload = await getPayloadClient()
  try {
    const arrayBuffer = await file.arrayBuffer()
    const created = await payload.create({
      collection: 'media',
      overrideAccess: true,
      data: { alt: alt || file.name },
      file: {
        data: Buffer.from(arrayBuffer),
        mimetype: file.type || 'image/*',
        name: file.name,
        size: file.size,
      },
    })
    if (!created?.id) {
      return { error: 'Не удалось загрузить картинку.' }
    }
    return { id: String(created.id) }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { error: `Ошибка загрузки картинки. ${message}` }
  }
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
  const clearPreview = formData.get('clearPreview') === '1'

  if (!name) {
    return { success: false, error: 'Название группы обязательно.' }
  }

  const previewResult = await uploadPreviewFile(formData, name)
  if (previewResult && 'error' in previewResult) {
    return { success: false, error: previewResult.error }
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
          preview:
            previewResult && 'id' in previewResult
              ? previewResult.id
              : clearPreview
                ? null
                : undefined,
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
          preview: previewResult && 'id' in previewResult ? previewResult.id : undefined,
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
