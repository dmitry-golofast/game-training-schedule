/**
 * Role helpers.
 *
 * Two management roles share the same cabinet capabilities:
 *  - `admin`   — superuser: cabinet + Payload `/admin` panel.
 *  - `trainer` — gym owner / trainer: cabinet only (no Payload panel).
 *
 * Student-facing roles:
 *  - `user`   — student.
 *  - `parent` — legal representative.
 */
export function isAdminLike(role?: string | null): boolean {
  return role === 'admin' || role === 'trainer'
}
