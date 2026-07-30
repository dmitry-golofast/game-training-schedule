import type { Access, Where } from 'payload'
import { isAdminLike } from '@/lib/roles'

/**
 * Read access scoped by a `student` relationship field.
 *
 * Reused by collections that belong to a student: `subscriptions`,
 * `payments`, `credit-transactions`, `sick-leaves`, `documents`.
 *
 *  - Anonymous → denied (`false`).
 *  - `admin`   → sees everything (`true`).
 *  - `user`    → only rows where `student` is themselves.
 *  - `parent`  → only rows where `student.parent` is themselves
 *                (nested Where across the relationship).
 *
 * Returning a `Where` query is the idiomatic Payload mechanism: the
 * constraint is merged into the DB query itself, so disallowed records
 * never leave the database.
 */
export const studentOwnerScopedOrAdmin: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isAdminLike(user.role)) return true
  if (user.role === 'user') {
    return { student: { equals: user.id } } satisfies Where
  }
  if (user.role === 'parent') {
    // Payload supports nested Where across relationships at runtime; the
    // type definitions don't model the nested field shape, so we assert.
    return { student: { parent: { equals: user.id } } } as Where
  }
  return false
}
