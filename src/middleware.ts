import { NextResponse, type NextRequest } from 'next/server'

/**
 * Two independent guards share this single middleware file:
 *
 * 1) /login & /register → redirect to the `app` subdomain.
 *    The landing lives on the apex domain (eventfit.ru), but auth flows live
 *    on app.eventfit.ru. Opening an auth route on the apex domain bounces to
 *    the same path on `app.` so the session cookie is scoped to one host.
 *
 * 2) /admin → reject anyone who is not an `admin`.
 *    Payload still mints a `payload-token` for ANY authenticated user of the
 *    `users` collection (students, parents, trainers), which lets them reach
 *    `/admin` and even see the panel chrome. This guard reads the role from
 *    the JWT in `payload-token` and hard-redirects non-admins (and
 *    unauthenticated visitors) to the home page of whichever host served the
 *    request — without touching the session cookie:
 *      eventfit.ru/admin       → eventfit.ru/
 *      app.eventfit.ru/admin   → app.eventfit.ru/
 *
 * NOTE on ports: Next.js runs on port 3000 inside the container and nginx
 * proxies to it, so `request.url` carries `:3000`. Redirects MUST be built
 * from the public-facing host/proto headers (see `publicOrigin`) to avoid
 * leaking the internal port into the browser's URL bar.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  // ── Guard 2: admin panel access control ──────────────────────
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return guardAdmin(request)
  }

  // ── Guard 1: auth routes → app subdomain ─────────────────────
  return guardAuthSubdomain(request, pathname, search)
}

export const config = {
  // Run for auth routes and everything under /admin (including /admin/login,
  // which the admin guard lets through so admins can sign in).
  matcher: ['/login', '/register', '/admin', '/admin/:path*'],
}

// ── Guard 2: admin panel ────────────────────────────────────────

function guardAdmin(request: NextRequest) {
  const token = request.cookies.get('payload-token')?.value
  const role = token ? getRoleFromToken(token) : null

  // Admin → allow through to the panel (including /admin/login, which an
  // already-authed admin simply skips past).
  if (role === 'admin') {
    return NextResponse.next()
  }

  // Everyone else — non-admins AND unauthenticated visitors — gets bounced
  // to the home page of whichever host served the request. The session
  // cookie is intentionally left untouched: a logged-in student keeps their
  // cabinet session, they just can't see the admin panel.
  return NextResponse.redirect(publicOrigin(request, '/'))
}

/**
 * Decode the Payload JWT (without verifying the signature — that's fine here,
 * because this is only a UI gate; Payload's own access control is the real
 * authority server-side). Returns the `role` claim or null if the token is
 * malformed / missing the claim.
 *
 * Payload includes collection fields directly in the JWT payload, so `role`
 * is present as a top-level claim (requires `saveToJWT: true` on the field).
 */
function getRoleFromToken(token: string): string | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    // JWT payload is base64url. Convert to base64, then decode.
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = Buffer.from(b64, 'base64').toString('utf-8')
    const payload = JSON.parse(json) as { role?: string }
    return payload.role ?? null
  } catch {
    return null
  }
}

// ── Guard 1: auth routes → app subdomain ────────────────────────

function guardAuthSubdomain(request: NextRequest, pathname: string, search: string) {
  const currentHost = resolveRequestHost(request)

  // Skip local development hosts — never redirect when running locally.
  if (isDevHost(currentHost)) {
    return NextResponse.next()
  }

  const appHost = resolveAppHost()
  // If the app host can't be resolved (env not set / not a domain), do
  // nothing rather than risk a broken redirect.
  if (!appHost) {
    return NextResponse.next()
  }

  // Already on the app subdomain — nothing to do (prevents a redirect loop).
  if (currentHost === appHost) {
    return NextResponse.next()
  }

  // Build the redirect URL from the public-facing host/protocol so the
  // internal container port (:3000) never leaks into the Location header.
  const proto = resolveRequestProto(request)
  const target = new URL(`${pathname}${search}`, `${proto}//${appHost}`)
  return NextResponse.redirect(target, 307)
}

// ── Helpers: public-facing origin (no internal port) ────────────

/**
 * The hostname the browser used to reach us, with any port stripped.
 * Prefers nginx's `x-forwarded-host`, then the `host` header.
 *
 * Why: `request.url` and `request.nextUrl.host` carry the in-container port
 * (3000) because nginx proxies to app:3000. The browser-facing host lives in
 * the forwarded headers, so redirects built from it won't include :3000.
 */
function resolveRequestHost(request: NextRequest): string {
  const raw = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
  // Strip the port (e.g. "app.eventfit.ru:443" → "app.eventfit.ru").
  return raw.split(':')[0].toLowerCase()
}

/**
 * The protocol the browser used. Prefers `x-forwarded-proto` (set by nginx
 * to "https" on the TLS-terminated listener), falls back to the env-derived
 * protocol, then to "https".
 */
function resolveRequestProto(request: NextRequest): string {
  const xfp = request.headers.get('x-forwarded-proto')
  if (xfp) return xfp.includes('https') ? 'https:' : 'http:'
  return getAppProtocol()
}

/**
 * Build a redirect URL for the given path using the public-facing host/proto
 * of the current request — never the internal `request.url` (which leaks
 * the container port :3000).
 */
function publicOrigin(request: NextRequest, path: string): URL {
  const host = resolveRequestHost(request)
  const proto = resolveRequestProto(request)
  return new URL(path, `${proto}//${host}`)
}

// ── Helpers: dev / app-host resolution ──────────────────────────

/**
 * True for localhost / loopback / private dev IPs — never redirect these.
 */
function isDevHost(host: string): boolean {
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
    return true
  }
  // Private network ranges used during local/dev testing.
  if (host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.')) {
    return true
  }
  return false
}

/**
 * Resolve the `app` subdomain hostname from NEXT_PUBLIC_SERVER_URL.
 * e.g. "https://eventfit.ru" → "app.eventfit.ru".
 * Returns null if the env var is missing or not a parseable URL.
 */
function resolveAppHost(): string | null {
  const base = process.env.NEXT_PUBLIC_SERVER_URL
  if (!base) return null
  try {
    const parsed = new URL(base)
    const hostname = parsed.hostname
    if (!hostname) return null
    return `app.${hostname}`
  } catch {
    return null
  }
}

/**
 * Protocol ("https:" / "http:") derived from NEXT_PUBLIC_SERVER_URL.
 * Falls back to "https:" if the env var is missing or unparseable.
 */
function getAppProtocol(): string {
  const base = process.env.NEXT_PUBLIC_SERVER_URL
  if (base) {
    try {
      return new URL(base).protocol
    } catch {
      // fall through
    }
  }
  return 'https:'
}
