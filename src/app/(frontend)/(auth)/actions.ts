'use server'

import { cookies } from 'next/headers.js'
import { redirect } from 'next/navigation'

import { getPayloadClient } from '@/lib/payload'

// Payload stores its JWT in this httpOnly cookie. Must match the default
// configured by Payload (see `auth.cookies` in buildConfig to override).
const PAYLOAD_TOKEN_COOKIE = 'payload-token'
// Keep in sync with `auth.tokenExpiration` on the users collection (7200s).
const TOKEN_MAX_AGE = 7200

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
  const isHttps = (process.env.NEXT_PUBLIC_SERVER_URL ?? '').startsWith('https')
  cookieStore.set(PAYLOAD_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: isHttps,
    path: '/',
    sameSite: 'lax',
    maxAge: TOKEN_MAX_AGE,
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
  const requestedRole: 'user' | 'parent' | 'admin' =
    rawRole === 'parent' || rawRole === 'admin' ? rawRole : 'user'

  let role: 'user' | 'parent' | 'admin' = 'user'
  if (requestedRole === 'admin') {
    const expected = process.env.ADMIN_INVITE_CODE?.trim()
    if (!expected) {
      // Self-service admin registration is disabled.
      return {
        error: 'Регистрация тренеров отключена. Обратитесь к администратору.',
      }
    }
    if (!inviteCode || inviteCode !== expected) {
      return { error: 'Неверный код приглашения.' }
    }
    role = 'admin'
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
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
      maxAge: TOKEN_MAX_AGE,
    })
  }

  redirect('/cabinet')
}

/**
 * Clear the session cookie and send the user back to the home page.
 */
export async function logoutAction() {
  const cookieStore = await cookies()
  cookieStore.delete(PAYLOAD_TOKEN_COOKIE)
  redirect('/')
}
