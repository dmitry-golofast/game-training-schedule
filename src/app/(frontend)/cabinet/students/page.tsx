import Link from 'next/link'
import { notFound } from 'next/navigation'

import { StudentsClient } from '@/app/(frontend)/cabinet/students/students-client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getPayloadClient, getCurrentUser } from '@/lib/payload'
import { computeAge, resolveAvatarUrl } from '@/lib/profile'
import { isAdminLike } from '@/lib/roles'

export const metadata = { title: 'Ученики' }

function initials(value?: string | null) {
  if (!value) return '?'
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export default async function StudentsPage() {
  const me = await getCurrentUser()

  // Only trainers manage students.
  if (!me || !isAdminLike(me.role)) {
    notFound()
  }

  const payload = await getPayloadClient()

  // All students (admin bypasses access). depth:1 populates avatar + parent.
  const studentsResult = await payload.find({
    collection: 'users',
    where: { role: { equals: 'user' } },
    sort: '-createdAt',
    limit: 100,
    overrideAccess: true,
    depth: 1,
  })

  // Candidate parents for the create-student form.
  const parentsResult = await payload.find({
    collection: 'users',
    where: { role: { equals: 'parent' } },
    sort: 'name',
    limit: 200,
    overrideAccess: true,
  })

  const parents = parentsResult.docs.map((p) => ({
    id: p.id,
    name: p.name || p.email,
    email: p.email,
  }))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ученики</h1>
          <p className="text-sm text-muted-foreground">Всего: {studentsResult.totalDocs}</p>
        </div>
        <StudentsClient parents={parents} />
      </div>

      {studentsResult.docs.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Пока нет учеников</CardTitle>
            <CardDescription>Добавьте первого ученика кнопкой выше.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardContent className="px-0 py-0">
            <ul className="divide-y divide-border">
              {studentsResult.docs.map((student) => {
                const parentUser = typeof student.parent === 'object' ? student.parent : null
                const avatarUrl = resolveAvatarUrl(student.avatar)
                const age = computeAge(student.birthDate)
                const isMinor = age !== null && age < 18
                const fullName =
                  [student.lastName, student.firstName].filter(Boolean).join(' ') ||
                  student.name ||
                  'Без имени'
                return (
                  <li key={student.id}>
                    <Link
                      href={`/cabinet/students/${student.id}`}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent"
                    >
                      <Avatar className="size-10 shrink-0">
                        {avatarUrl ? <AvatarImage src={avatarUrl} alt={fullName} /> : null}
                        <AvatarFallback>{initials(fullName)}</AvatarFallback>
                      </Avatar>

                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate font-medium">{fullName}</span>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                          <span className="truncate">{student.email}</span>
                          {age !== null ? <span>· {age} лет</span> : null}
                          {student.phone ? (
                            <span className="truncate">· тел: {student.phone}</span>
                          ) : null}
                          {isMinor && student.parentPhone ? (
                            <span className="truncate">· родитель: {student.parentPhone}</span>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="hidden text-right text-xs text-muted-foreground sm:block">
                          {parentUser ? (
                            <span>
                              Акк. родителя:{' '}
                              <span className="font-medium text-foreground">
                                {parentUser.name || parentUser.email}
                              </span>
                            </span>
                          ) : null}
                        </div>
                        <span className="text-muted-foreground">→</span>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
