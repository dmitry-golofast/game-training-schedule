'use server'

import { cookies } from 'next/headers.js'
import { redirect } from 'next/navigation'

import { getPayloadClient } from '@/lib/payload'

// Payload stores its JWT in this httpOnly cookie. Must match the default
// configured by Payload (see `auth.cookies` in buildConfig to override).
const PAYLOAD_TOKEN_COOKIE = 'payload-token'
// Keep in sync with `auth.tokenExpiration` on the users collection (7200s).
const TOKEN_MAX_AGE = 7200
// Whether the app is served over HTTPS — drives the `secure` flag on the
// session cookie so it is only ever sent over an encrypted connection.
// Derived from NEXT_PUBLIC_SERVER_URL (inlined at build time). The same
// single source of truth is used by login / register / logout below.
const IS_HTTPS = (process.env.NEXT_PUBLIC_SERVER_URL ?? '').startsWith('https')

/**
 * Cookie domain scoped so the session is shared across the apex domain and
 * all its subdomains (eventfit.ru, app.eventfit.ru, www.eventfit.ru).
 *
 * Without an explicit `domain`, the cookie is bound to whichever host served
 * the login form (e.g. app.eventfit.ru), so the apex domain never sees it
 * and the user appears logged-out on the landing. Setting `domain` to the
 * registrable apex (".eventfit.ru") makes the cookie visible everywhere.
 *
 * Returns undefined in local dev (localhost has no parent domain, and an
 * empty/undefined `domain` keeps the cookie on the current host — which is
 * exactly what we want for localhost).
 */
const COOKIE_DOMAIN = (() => {
  const base = process.env.NEXT_PUBLIC_SERVER_URL ?? ''
  try {
    const host = new URL(base).hostname
    // Only set a domain for real hostnames — skip localhost / IPs.
    if (host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return undefined
    return `.${host}`
  } catch {
    return undefined
  }
})()

/**
 * Sign in via Payload's Local API. On success the JWT returned by
 * `payload.login` is written to the httpOnly `payload-token` cookie so
 * subsequent Server Components / Local API calls resolve the session.
 */
export async function loginAction(_prev: unknown, formData: FormData) {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: 'Введите email и пароль.' }
  }

  let token: string | undefined
  try {
    const payload = await getPayloadClient()
    const result = await payload.login({
      collection: 'users',
      data: { email, password },
    })
    token = result.token
  } catch {
    return { error: 'Неверный email или пароль.' }
  }

  if (!token) {
    return { error: 'Не удалось войти. Попробуйте позже.' }
  }

  const cookieStore = await cookies()
  cookieStore.set(PAYLOAD_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: IS_HTTPS,
    path: '/',
    sameSite: 'lax',
    maxAge: TOKEN_MAX_AGE,
    domain: COOKIE_DOMAIN,
  })

  redirect('/cabinet')
}

/**
 * Public registration with self-selected role.
 *
 *  - `user`   (ученик)   — всегда разрешено.
 *  - `parent` (родитель) — всегда разрешено.
 *  - `admin`  (тренер)   — ТОЛЬКО при верном коде приглашения
 *                          (`ADMIN_INVITE_CODE` env). Если код не задан в
 *                          окружении, self-service регистрация админов
 *                          полностью запрещена.
 *
 * Итоговая роль всегда выставляется сервером — клиентское значение из формы
 * НЕ доверяется: если запрошен `admin`, но код неверен, операция целиком
 * отклоняется (роль не «падает» до user, чтобы не плодить аккаунты).
 */
export async function registerAction(_prev: unknown, formData: FormData) {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const password = String(formData.get('password') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  const rawRole = String(formData.get('role') ?? 'user')
  const inviteCode = String(formData.get('inviteCode') ?? '').trim()

  if (!email || !password) {
    return { error: 'Заполните все обязательные поля.' }
  }
  if (password.length < 8) {
    return { error: 'Пароль должен быть не короче 8 символов.' }
  }

  // Determine the final role server-side.
  const requestedRole: 'user' | 'parent' | 'trainer' =
    rawRole === 'parent' || rawRole === 'trainer' ? rawRole : 'user'

  let role: 'user' | 'parent' | 'trainer' = 'user'
  if (requestedRole === 'trainer') {
    const expected = process.env.ADMIN_INVITE_CODE?.trim()
    if (!expected) {
      // Self-service trainer registration is disabled.
      return {
        error: 'Регистрация тренеров отключена. Обратитесь к администратору.',
      }
    }
    if (!inviteCode || inviteCode !== expected) {
      return { error: 'Неверный код приглашения.' }
    }
    role = 'trainer'
  } else {
    role = requestedRole
  }

  const payload = await getPayloadClient()

  try {
    await payload.create({
      collection: 'users',
      data: { email, password, name, role },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (/already|exists|duplicate/i.test(message)) {
      return { error: 'Пользователь с таким email уже существует.' }
    }
    return { error: 'Не удалось создать аккаунт. Попробуйте позже.' }
  }

  // Auto-login after registration.
  let token: string | undefined
  try {
    const result = await payload.login({
      collection: 'users',
      data: { email, password },
    })
    token = result.token
  } catch {
    redirect('/login')
  }

  if (token) {
    const cookieStore = await cookies()
    cookieStore.set(PAYLOAD_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: IS_HTTPS,
      path: '/',
      sameSite: 'lax',
      maxAge: TOKEN_MAX_AGE,
      domain: COOKIE_DOMAIN,
    })
  }

  redirect('/cabinet')
}

/**
 * Clear the session cookie and send the user back to the home page.
 */
export async function logoutAction() {
  const cookieStore = await cookies()
  // Delete with explicit options to match how the cookie was set.
  cookieStore.set(PAYLOAD_TOKEN_COOKIE, '', {
    httpOnly: true,
    secure: IS_HTTPS,
    path: '/',
    sameSite: 'lax',
    domain: COOKIE_DOMAIN,
    maxAge: 0,
    expires: new Date(0),
  })
  redirect('/')
}
