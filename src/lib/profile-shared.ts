import type { Media } from '@/payload-types'

/**
 * Pure helpers shared between server and client code.
 *
 * IMPORTANT: this module MUST NOT import anything that pulls in `payload`,
 * `sharp`, or other Node-only deps — it is imported by client components
 * (e.g. profile-edit-form, edit-student-dialog). Keep it dependency-free.
 */

/** Compute age in full years from a birth date string. Returns null if invalid/empty. */
export function computeAge(birthDate?: string | null): number | null {
  if (!birthDate) return null
  const d = new Date(birthDate)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const monthDiff = now.getMonth() - d.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < d.getDate())) {
    age -= 1
  }
  return age >= 0 ? age : null
}

/** Build a display name from name parts (Фамилия Имя Отчество). */
export function buildDisplayName(
  firstName?: string | null,
  lastName?: string | null,
  middleName?: string | null,
): string {
  return [lastName, firstName, middleName].filter(Boolean).join(' ').trim()
}

/** Resolve a public URL from a populated avatar media doc (or null). */
export function resolveAvatarUrl(avatar: unknown): string | null {
  if (!avatar || typeof avatar !== 'object') return null
  const media = avatar as Partial<Media>
  return media.url || media.thumbnailURL || null
}
