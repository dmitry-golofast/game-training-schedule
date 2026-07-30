import { notFound } from 'next/navigation'

import { GroupsClient } from '@/app/(frontend)/cabinet/groups/groups-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getCurrentUser, getPayloadClient } from '@/lib/payload'
import { isAdminLike } from '@/lib/roles'

export const metadata = { title: 'Группы' }

type StudentRef = { id: string; name: string; email: string }
type GroupItem = {
  id: string
  name: string
  description?: string | null
  members: StudentRef[]
}

export default async function GroupsPage() {
  const me = await getCurrentUser()
  if (!me || !isAdminLike(me.role)) notFound()

  const payload = await getPayloadClient()

  const groupsResult = await payload.find({
    collection: 'groups',
    sort: 'name',
    limit: 200,
    overrideAccess: true,
    depth: 1,
  })

  const studentsResult = await payload.find({
    collection: 'users',
    where: { role: { equals: 'user' } },
    sort: 'name',
    limit: 500,
    overrideAccess: true,
  })
  const students: StudentRef[] = studentsResult.docs.map((s) => ({
    id: s.id,
    name: s.name || s.email,
    email: s.email,
  }))

  const groups: GroupItem[] = groupsResult.docs.map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description ?? null,
    members: (g.members ?? [])
      .map((m) =>
        typeof m === 'object' && m !== null
          ? { id: m.id, name: m.name || m.email, email: m.email }
          : null,
      )
      .filter((m): m is StudentRef => m !== null),
  }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Группы</h1>
        <p className="text-sm text-muted-foreground">Всего: {groups.length}</p>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Пока нет групп</CardTitle>
            <CardDescription>Создайте первую группу кнопкой выше.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {groups.map((group) => (
            <Card key={group.id}>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{group.name}</h3>
                    {group.description ? (
                      <p className="text-xs text-muted-foreground">{group.description}</p>
                    ) : null}
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {group.members.length} уч.
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {group.members.length === 0 ? (
                    <span className="text-xs text-muted-foreground">нет участников</span>
                  ) : (
                    group.members.slice(0, 8).map((m) => (
                      <span
                        key={m.id}
                        className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                      >
                        {m.name}
                      </span>
                    ))
                  )}
                  {group.members.length > 8 ? (
                    <span className="text-xs text-muted-foreground">
                      +{group.members.length - 8}
                    </span>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <GroupsClient groups={groups} students={students} />
    </div>
  )
}
