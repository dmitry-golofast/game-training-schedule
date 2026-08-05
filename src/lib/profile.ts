// Re-export pure helpers so existing server-side imports keep working.
// Server modules import from '@/lib/profile'; client components import the
// browser-safe subset from '@/lib/profile-shared' to avoid pulling in
// `payload` / `sharp` (Node-only).
export { buildDisplayName, computeAge, resolveAvatarUrl } from '@/lib/profile-shared'

import { getPayloadClient } from '@/lib/payload'

/**
 * Read an image file from `formData[fieldName]` and upload it into the `media`
 * collection, returning the new media id. Returns:
 *  - `null` when no file was attached (so the caller can skip touching avatar).
 *  - `{ id }` on success.
 *  - `{ error }` on failure.
 *
 * Mirrors the upload pattern used in `groups/actions.ts` (uploadPreviewFile)
 * and `subscriptions/actions.ts`.
 *
 * Server-only — do not import from client components.
 */
export async function uploadAvatarFile(
  formData: FormData,
  fieldName: string = 'avatar',
): Promise<{ id: string } | { error: string } | null> {
  const file = formData.get(fieldName)
  if (!(file instanceof File) || file.size === 0) return null

  const payload = await getPayloadClient()
  try {
    const arrayBuffer = await file.arrayBuffer()
    const created = await payload.create({
      collection: 'media',
      overrideAccess: true,
      data: { alt: file.name || 'avatar' },
      file: {
        data: Buffer.from(arrayBuffer),
        mimetype: file.type || 'image/*',
        name: file.name,
        size: file.size,
      },
    })
    if (!created?.id) {
      return { error: 'Не удалось загрузить изображение.' }
    }
    return { id: String(created.id) }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { error: `Ошибка загрузки изображения. ${message}` }
  }
}
