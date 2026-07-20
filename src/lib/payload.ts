import { headers } from 'next/headers.js'
import { getPayload } from 'payload'

import config from '@/payload.config'

/**
 * Singleton Payload Local API client.
 * Safe to call repeatedly — `getPayload` caches the instance per config.
 */
export const getPayloadClient = () => getPayload({ config })

/**
 * Resolve the currently authenticated user from the incoming request's
 * `payload-token` cookie. Intended for use in Server Components and
 * Server Actions (reads `next/headers`).
 *
 * Returns `null` when no session is present.
 */
export async function getCurrentUser() {
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: await headers() })
  return user
}
