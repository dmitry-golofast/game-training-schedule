import type { CollectionConfig, Where } from 'payload'

/**
 * The application's auth collection.
 *
 * `auth: true` auto-adds email + password fields and exposes the login,
 * logout, me, forgot-password and reset-password endpoints (REST, GraphQL
 * and Local API). The JWT is stored in an httpOnly `payload-token` cookie.
 *
 * Three roles:
 *  - `user`   — ученик. Видит и редактирует только свои данные.
 *  - `parent` — родитель / законный представитель. Видит свои данные и
 *               данные своих детей (связь через поле `parent` у ученика).
 *  - `admin`  — тренер / администратор. Видит всех, создаёт учеников.
 *
 * Роль `admin` при публичной регистрации выдаётся только по инвайт-коду
 * (см. `registerAction`); поле `role` защищено field-level `access.update`,
 * чтобы привилегию нельзя было повысить через API.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'role', 'parent', 'updatedAt'],
  },
  auth: {
    // JWT lifetime (seconds). 2h is a reasonable default for a web cabinet.
    tokenExpiration: 7200,
    // Lock the account for 10 minutes after 5 failed login attempts.
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
    // Allow API keys for headless / programmatic integrations (optional).
    useAPIKey: true,
  },
  access: {
    // admin → все; parent → себя + своих детей; user → только себя.
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      if (user.role === 'parent') {
        const where: Where = {
          $or: [{ id: { equals: user.id } }, { parent: { equals: user.id } }],
        }
        return where
      }
      return { id: { equals: user.id } } satisfies Where
    },
    // Публичная саморегистрация. Итоговая роль определяется сервером
    // (registerAction / createStudentAction), а не этим правилом доступа.
    create: () => true,
    // admin → любого; parent → себя + детей; user → только себя.
    update: ({ req: { user }, id }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      if (user.role === 'parent') {
        const where: Where = {
          $or: [{ id: { equals: user.id } }, { parent: { equals: user.id } }],
        }
        return where
      }
      return user.id === id
    },
    // Только admin может удалять пользователей.
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      admin: {
        description: 'Полное имя (генерируется автоматически из ФИО).',
        readOnly: true,
      },
    },
    {
      name: 'lastName',
      type: 'text',
      admin: { description: 'Фамилия' },
    },
    {
      name: 'firstName',
      type: 'text',
      admin: { description: 'Имя' },
    },
    {
      name: 'middleName',
      type: 'text',
      admin: { description: 'Отчество (необязательно)' },
    },
    {
      name: 'birthDate',
      type: 'date',
      admin: { description: 'Дата рождения' },
    },
    {
      name: 'parentPhone',
      type: 'text',
      admin: {
        description: 'Телефон родителя (обязательно для учащихся до 18 лет).',
        condition: (data) => data.role === 'user',
      },
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'user',
      options: [
        { label: 'Ученик', value: 'user' },
        { label: 'Родитель', value: 'parent' },
        { label: 'Тренер (администратор)', value: 'admin' },
      ],
      // Only admins can grant or change roles — prevents privilege escalation.
      access: {
        create: () => true,
        update: ({ req: { user } }) => user?.role === 'admin',
      },
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      admin: {
        position: 'sidebar',
        description: 'Законный представитель ученика (роль «Родитель»).',
        // Поле имеет смысл только для учеников.
        condition: (data) => data.role === 'user',
      },
    },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'timezone',
      type: 'text',
      admin: {
        description: 'IANA timezone, e.g. Europe/Moscow',
      },
    },
    {
      name: 'reminderLeadHours',
      type: 'number',
      defaultValue: 24,
      admin: {
        description: 'За сколько часов до тренировки присылать напоминание (0 — отключить).',
        position: 'sidebar',
      },
    },
    {
      name: 'preferences',
      type: 'json',
      admin: {
        description: 'Arbitrary user preferences (UI state, notifications, …).',
      },
    },
  ],
}
