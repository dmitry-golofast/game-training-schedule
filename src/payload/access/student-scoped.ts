import type { Access, Where } from 'payload'
import { isAdminLike } from '@/lib/roles'

/**
 * Read access for student-scoped collections (`schedule-slots`).
 *
 * A slot targets EITHER a single student (`kind: 'individual'`, `student`)
 * OR a group (`kind: 'group'`, `group.members`). Access resolves:
 *
 *  - Anonymous → denied (`false`).
 *  - `admin`   → sees everything (`true`).
 *  - `user`    → individual slots where `student = self`, OR group slots
 *                whose group's `members` contains self.
 *  - `parent`  → individual slots where `student.parent = self`, OR group
 *                slots whose group's `members` includes a child of self.
 *
 * Returning a `Where` query is the idiomatic Payload mechanism: the
 * constraint is merged into the DB query itself, so disallowed records
 * never leave the database. Payload supports nested Where across
 * relationships and `in`/`equals` over relationship arrays at runtime; the
 * type definitions don't model those nested shapes, so several clauses are
 * asserted to `Where`.
 */
export const studentScopedOrAdmin: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isAdminLike(user.role)) return true

  if (user.role === 'user') {
    const where: Where = {
      $or: [
        { kind: { equals: 'individual' }, student: { equals: user.id } },
        // Payload supports nested Where across relationships at runtime; the
        // type definitions don't model the nested field shape, so we assert.
        {
          kind: { equals: 'group' },
          group: { members: { in: [user.id] } },
        } as Where,
        // Backwards-compat: slots without `kind` (created before groups) are
        // treated as individual and scoped to the assigned student.
        { student: { equals: user.id } },
      ],
    }
    return where
  }

  if (user.role === 'parent') {
    const where: Where = {
      $or: [
        {
          kind: { equals: 'individual' },
          student: { parent: { equals: user.id } },
        } as Where,
        {
          kind: { equals: 'group' },
          group: { members: { parent: { equals: user.id } } },
        } as Where,
        {
          student: { parent: { equals: user.id } },
        } as Where,
      ],
    }
    return where
  }

  return false
}
