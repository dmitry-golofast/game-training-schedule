'use server'

import { revalidatePath } from 'next/cache'

import { getCurrentUser, getPayloadClient } from '@/lib/payload'

type ActionResult = { success: true } | { success: false; error: string }

/**
 * Upload a document for the signed-in user (or a selected child for parents,
 * or any student for admins). The file is attached as a Payload upload.
 */
export async function uploadDocumentAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const me = await getCurrentUser()
  if (!me) {
    return { success: false, error: 'Необходим вход.' }
  }

  const file = formData.get('file')
  const docTypeRaw = String(formData.get('docType') ?? 'other')
  const docType: 'medic' | 'contract' | 'other' =
    docTypeRaw === 'medic' || docTypeRaw === 'contract' ? docTypeRaw : 'other'
  const title = String(formData.get('title') ?? '').trim()
  const notes = String(formData.get('notes') ?? '').trim()
  const student = String(formData.get('student') ?? '').trim()

  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: 'Выберите файл.' }
  }
  if (!title) {
    return { success: false, error: 'Укажите название.' }
  }
  if (!student) {
    return { success: false, error: 'Укажите ученика.' }
  }

  const payload = await getPayloadClient()

  // Create the media document via the Payload upload collection. We pass the
  // file through FormData-like options.
  try {
    const arrayBuffer = await file.arrayBuffer()
    const created = await payload.create({
      collection: 'documents',
      overrideAccess: true,
      data: {
        student,
        docType,
        title,
        notes: notes || undefined,
        filename: file.name,
      },
      file: {
        data: Buffer.from(arrayBuffer),
        mimetype: file.type,
        name: file.name,
        size: file.size,
      },
    })
    if (!created) {
      return { success: false, error: 'Не удалось загрузить файл.' }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Ошибка загрузки. ${message}` }
  }

  revalidatePath('/cabinet/profile')
  return { success: true }
}

/** Delete a document (admin or owner). */
export async function deleteDocumentAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const me = await getCurrentUser()
  if (!me) {
    return { success: false, error: 'Необходим вход.' }
  }

  const id = String(formData.get('id') ?? '').trim()
  if (!id) return { success: false, error: 'Не указан ID.' }

  const payload = await getPayloadClient()
  try {
    await payload.delete({ collection: 'documents', id, overrideAccess: me.role === 'admin' })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Не удалось удалить. ${message}` }
  }

  revalidatePath('/cabinet/profile')
  return { success: true }
}
