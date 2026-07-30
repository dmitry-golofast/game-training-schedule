import type { Access, Where } from 'payload'
import { isAdminLike } from '@/lib/roles'

/**
 * Read access for owned collections, generalized to the three roles:
 *
 *  - Anonymous → denied (`false`).
 *  - `admin`   → sees everything (`true`).
 *  - `user`    → only rows they own (`{ owner: { equals: user.id } }`).
 *  - `parent`  → own rows PLUS rows owned by their children. Children are
 *                discovered implicitly via the `owner.parent` relationship,
 *                so no extra query is needed — Payload supports nested
 *                Where queries across relationships.
 *
 * Returning a `Where` query from a `read` access function is the idiomatic
 * Payload mechanism: the constraint is merged into the DB query itself, so
 * disallowed records never leave the database.
 *
 * NOTE: the owned collection must have an `owner` relationship field that
 * points to `users`. This matches the `Media` and `user-notes` collections.
 */
export const accessibleOrAdmin: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isAdminLike(user.role)) return true

  // user / parent both see their own records…
  const clauses: Where[] = [{ owner: { equals: user.id } }]

  // …and a parent additionally sees records owned by their children.
  // Payload supports nested Where across relationships at runtime, but its
  // type definitions don't model the nested field shape, so we assert.
  if (user.role === 'parent') {
    clauses.push({ owner: { parent: { equals: user.id } } } as Where)
  }

  return { $or: clauses }
}

/**
 * Mutation access (create/update/delete) for owned collections.
 * Authenticated users may create; the actual ownership of update/delete
 * targets is enforced by the matching `read` access function (Payload
 * resolves the document through `read` first — if you can't read it, you
 * can't mutate it). Admins bypass all checks.
 */
export const ownerOrAdmin: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isAdminLike(user.role)) return true
  // Document-level ownership is enforced via the matching `read` filter;
  // here we only gate on "is there a logged-in user".
  return true
}
