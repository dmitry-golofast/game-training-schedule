# 🎮 Game Training Schedule

Личный кабинет для управления расписанием тренировок: индивидуальные и групповые занятия, роли (ученик / родитель / тренер), повторяющиеся слоты, email-напоминания и мульти-таймзона.

> **Стек:** Next.js 16 (App Router, Turbopack) · Payload CMS 3.86 (auth, Local API, REST + GraphQL) · MongoDB · Tailwind CSS v4 · shadcn/ui · React 19 · TypeScript 5.7

---

## ✨ Возможности

### Роли и доступ

| Роль                       | Регистрация                             | Возможности                                      |
| -------------------------- | --------------------------------------- | ------------------------------------------------ |
| **Ученик** (`user`)        | Самостоятельно или тренером             | Видит и управляет только своими тренировками     |
| **Родитель** (`parent`)    | Самостоятельно                          | Видит тренировки своих детей (по связи `parent`) |
| **Тренер-админ** (`admin`) | По коду-приглашению `ADMIN_INVITE_CODE` | Полное управление: ученики, группы, расписание   |

- Защита от повышения привилегий: поле `role` закрывается field-level `access` — нельзя повысить себя через API.
- Изоляция данных на уровне БД через Where-запросы (см. `src/payload/access/`).

### Расписание

- **Три режима просмотра:** День / Месяц / Год — с навигацией по периодам и кнопкой «Сегодня».
- **День:** временная сетка 8:00–22:00 с шагом 30 минут, клик по слоту → создание/редактирование тренировки.
- **Месяц:** календарь Пн–Вс со счётчиками и точками статусов + сводка выбранного дня.
- **Год:** 12 мини-месяцев с тепловой плотностью нагрузки и индикаторами статусов.
- **Индивидуальные и групповые тренировки:** слот `kind` = `individual` (один ученик) или `group` (целая группа).
- **Повторяющиеся слоты (RRULE-стиль):** ежедневно/еженедельно, выбор дней недели, окончание по дате или количеству. При создании серии материализуются конкретные вхождения.
- **Статусы:** Запланировано / Завершено / Отменено — с цветовой кодировкой.

### Группы

- Раздел `/cabinet/groups` (только для тренера): объединение учеников в группы.
- Создание/редактирование/удаление, управление составом через мультиселект.
- Групповые слоты видны всем участникам группы и их родителям.

### Часовые пояса

- Время хранится в **UTC**, отображается и вводится в **часовом поясе пользователя** (поле `user.timezone`, по умолчанию UTC).
- Сетка дня, метки времени и диапазоны запросов строятся в TZ пользователя — слот всегда попадает на тот день, который видит пользователь, независимо от TZ сервера.
- Выбор пояса — в профиле (`/cabinet/profile`).

### Уведомления

- **При создании слота** — email ученику (и родителю) с деталями; для групповой тренировки — каждому участнику.
- **Напоминание перед тренировкой** — cron-эндпоинт `/api/cron/send-reminders` (защищён `CRON_SECRET`), рассылает напоминания по окну `REMINDER_LEAD_HOURS`.
- Без настроенного SMTP письма пишутся в консоль (удобно в dev).

### Кабинет

- Server-side guard: аноним → `/login`; рольроверяемый доступ к разделам.
- Профиль: имя, часовой пояс, время напоминания.
- Ученики (для тренера): список, создание с автогенерацией временного пароля, привязка родителя.

---

## 🚀 Быстрый старт

### Требования

- **Node.js** ≥ 20.9 (рекомендуется LTS 22 — см. `.nvmrc`)
- **pnpm** ≥ 9 (`corepack enable && corepack prepare pnpm@latest --activate`)
- **MongoDB** ≥ 6 (локально или через `docker compose up mongo -d`)

### Установка

```bash
pnpm install
cp .env.example .env
#   PAYLOAD_SECRET:     openssl rand -hex 32
#   ADMIN_INVITE_CODE:  код для регистрации тренеров (напр. trainer-secret-2026)
#   SMTP_*, S3_*:       можно оставить пустыми для локальной разработки
pnpm dev
```

Откройте [http://localhost:3000](http://localhost:3000).

### Создание первого тренера

1. Откройте `/register`, выберите роль **Тренер** и введите `ADMIN_INVITE_CODE`.
2. Либо создайте первого пользователя через `/admin` (Payload предложит это при пустой БД).

---

## 🗂 Структура проекта

```
src/
├── app/
│   ├── (frontend)/
│   │   ├── (marketing)/            # лендинг
│   │   ├── (auth)/                 # login, register + server actions
│   │   ├── (cabinet)/
│   │   │   ├── layout.tsx          # server-side auth guard
│   │   │   ├── profile/            # профиль: имя, TZ, напоминания
│   │   │   ├── students/           # ученики (только admin)
│   │   │   ├── groups/             # группы (только admin)
│   │   │   └── schedule/           # расписание: day / month / year
│   │   ├── globals.css             # Tailwind v4 @theme + shadcn токены
│   │   └── layout.tsx              # fonts, providers
│   ├── (payload)/                  # Payload admin + REST + GraphQL (генерируется)
│   └── api/cron/send-reminders/    # cron-эндпоинт напоминаний
├── collections/
│   ├── Users.ts                    # auth + роли + parent + timezone + reminderLeadHours
│   ├── ScheduleSlots.ts            # слоты (kind, student/group, recurrence, status)
│   ├── Groups.ts                   # группы с members
│   ├── Media.ts, UserNotes.ts
├── payload/access/                 # access-функции (owned, student-scoped)
├── components/
│   ├── ui/                         # shadcn-компоненты
│   └── cabinet/                    # CabinetShell, UserMenu, providers
├── lib/
│   ├── payload.ts                  # getPayloadClient, getCurrentUser
│   ├── datetime.ts                 # календарные примитивы (timezone-agnostic)
│   ├── timezone.ts                 # TZ-конвертации (wallClockToUtc, formatTzParts, …)
│   ├── recurrence.ts               # расширение повторений (expandRecurrence)
│   ├── email.ts                    # шаблоны и рассылка уведомлений/напоминаний
│   └── utils.ts                    # cn()
├── payload.config.ts
└── payload-types.ts                # авто-генерируется
```

---

## 🛠 Команды

| Команда                             | Описание                                    |
| ----------------------------------- | ------------------------------------------- |
| `pnpm dev`                          | Dev-сервер (Turbopack)                      |
| `pnpm build` / `pnpm start`         | Production-сборка / запуск                  |
| `pnpm lint` / `pnpm lint:fix`       | ESLint / с авто-фиксом                      |
| `pnpm format` / `pnpm format:check` | Prettier (write / check)                    |
| `pnpm typecheck`                    | `tsc --noEmit`                              |
| `pnpm generate:types`               | Регенерация `payload-types.ts`              |
| `pnpm generate:importmap`           | Регенерация Payload admin import map        |
| `pnpm payload`                      | Payload CLI (миграции, пользователи и т.д.) |

---

## ⚙️ Переменные окружения

| Переменная               | Назначение                                                      |
| ------------------------ | --------------------------------------------------------------- |
| `DATABASE_URI`           | MongoDB connection string                                       |
| `PAYLOAD_SECRET`         | Секрет для JWT (32+ символа)                                    |
| `NEXT_PUBLIC_SERVER_URL` | Базовый URL приложения                                          |
| `ADMIN_INVITE_CODE`      | Код для self-service регистрации тренеров                       |
| `SMTP_*`                 | Настройки Nodemailer (отключено — письма в консоль)             |
| `S3_*`                   | S3-совместимое хранилище медиа (отключено — локальное `/media`) |
| `REMINDER_LEAD_HOURS`    | За сколько часов до тренировки напоминать (по умолчанию 24)     |
| `CRON_SECRET`            | Секрет для защиты `/api/cron/send-reminders`                    |

---

## 🔐 Безопасность

- **Auth:** JWT в httpOnly `payload-token` cookie, lockout после 5 неудачных попыток.
- **Privilege escalation:** поле `role` защищено field-level `access.update`; итоговая роль при регистрации определяется сервером.
- **Isolation:** доступ к слотам фильтруется на уровне БД — ученик видит только свои, родитель — детей, тренер — все.
- **Cron:** эндпоинт напоминаний защищён Bearer-токеном `CRON_SECRET`.

---

## 🔧 Качество кода

- **ESLint 9** (flat config, `@next/eslint-plugin-next` + `typescript-eslint`).
- **Prettier 3** с `prettier-plugin-tailwindcss`.
- **husky + lint-staged** — pre-commit проверка staged-файлов.
- **commitlint** — [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:` …).
- **typecheck**, **format:check**, **build** — все зелёные.

---

## 📚 Полезные ссылки

- [Payload CMS docs](https://payloadcms.com/docs)
- [Next.js docs](https://nextjs.org/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Tailwind CSS v4](https://tailwindcss.com/docs)

---

## Лицензия

MIT
