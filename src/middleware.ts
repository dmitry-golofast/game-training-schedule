import { NextResponse, type NextRequest } from 'next/server'

/**
 * Redirect /login and /register to the `app` subdomain.
 *
 * The landing lives on the apex domain (eventfit.ru), but auth flows live on
 * the `app` subdomain (app.eventfit.ru). When a user opens an auth route on
 * the apex domain — e.g. by following an old bookmark — this middleware
 * bounces them to the same path on the `app` subdomain so the session cookie
 * is scoped to a single host (see `actions.ts`, where the cookie is set
 * without an explicit `domain`, binding it to whichever host served the form).
 *
 * Behavior:
 *  - eventfit.ru/login         → 307 https://app.eventfit.ru/login
 *  - eventfit.ru/register      → 307 https://app.eventfit.ru/register
 *  - app.eventfit.ru/login     → no redirect (form submits here)
 *  - localhost / dev IPs       → no redirect (keeps local dev working)
 *  - other paths               → not matched by `matcher`
 *
 * The app host is derived from NEXT_PUBLIC_SERVER_URL (the apex domain): the
 * protocol is preserved and `app.` is prepended to the hostname.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl

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
  // Rebuild with the new host/protocol. Using NextResponse.redirect keeps
  // Vercel/standalone happy.
  return NextResponse.redirect(url, 307)
}

export const config = {
  // Only run for the auth routes — everything else bypasses middleware.
  matcher: ['/login', '/register'],
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
