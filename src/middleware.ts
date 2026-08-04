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
 *    Payload's `admin.access.admin` only hides the panel UI — Payload still
 *    mints a `payload-token` for ANY authenticated user of the `users`
 *    collection (students, parents, trainers), which lets them reach `/admin`
 *    and even see the panel chrome. This guard reads the role from the JWT in
 *    `payload-token` and hard-redirects non-admins (and unauthenticated
 *    visitors) to the home page of whichever host served the request:
 *      eventfit.ru/admin       → eventfit.ru/
 *      app.eventfit.ru/admin   → app.eventfit.ru/
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  // ── Guard 2: admin panel access control ──────────────────────
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return guardAdmin(request, pathname)
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

function guardAdmin(request: NextRequest, pathname: string) {
  const token = request.cookies.get('payload-token')?.value
  const role = token ? getRoleFromToken(token) : null

  // Admin → allow through to the panel (including /admin/login, which an
  // already-authed admin simply skips past).
  if (role === 'admin') {
    return NextResponse.next()
  }

  // Everyone else — non-admins AND unauthenticated visitors — gets bounced
  // to the home page of whichever host served the request:
  //   eventfit.ru/admin       → eventfit.ru/
  //   app.eventfit.ru/admin   → app.eventfit.ru/
  // `new URL('/', request.url)` preserves the current host and protocol.
  return NextResponse.redirect(new URL('/', request.url))
}

/**
 * Decode the Payload JWT (without verifying the signature — that's fine here,
 * because this is only a UI gate; Payload's own access control is the real
 * authority server-side). Returns the `role` claim or null if the token is
 * malformed / missing the claim.
 *
 * Payload includes collection fields directly in the JWT payload, so `role`
 * is present as a top-level claim.
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
  // Host that served this request. Behind nginx we trust x-forwarded-host
  // (nginx sets `Host`/`proxy_set_header Host $host`), then fall back to the
  // direct `host` header.
  const currentHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''

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

  const url = new URL(`${pathname}${search}`, request.url)
  url.host = appHost
  // `resolveAppHost` returns only the hostname; the protocol comes from the
  // env-derived base URL so prod stays on https.
  const protocol = getAppProtocol()
  url.protocol = protocol
  return NextResponse.redirect(url, 307)
}

// ── Helpers ─────────────────────────────────────────────────────

/**
 * True for localhost / loopback / private dev IPs — never redirect these.
 */
function isDevHost(host: string): boolean {
  // Strip the port if present (localhost:3000, 127.0.0.1:3000).
  const hostname = host.split(':')[0].toLowerCase()
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return true
  }
  // Private network ranges used during local/dev testing.
  if (
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.')
  ) {
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
 * Falls back to the request's protocol if the env var is missing.
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
