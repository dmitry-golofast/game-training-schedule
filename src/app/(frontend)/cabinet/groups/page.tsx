import { notFound } from 'next/navigation'

import { GroupsClient } from '@/app/(frontend)/cabinet/groups/groups-client'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getCurrentUser, getPayloadClient } from '@/lib/payload'
import { isAdminLike } from '@/lib/roles'

export const metadata = { title: 'Группы' }

type StudentRef = { id: string; name: string; email: string }
type GroupItem = {
  id: string
  name: string
  description?: string | null
  members: StudentRef[]
  imageUrl?: string | null
  imageAlt?: string | null
  imageId?: string | null
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

  const groups: GroupItem[] = groupsResult.docs.map((g) => {
    // `preview` is an upload relationship; at depth 1 Payload populates it as
    // the media document (with `url`/`alt`). It may also be a string id or
    // absent entirely.
    const preview =
      g.preview && typeof g.preview === 'object'
        ? { url: g.preview.url ?? null, alt: g.preview.alt ?? null, id: String(g.preview.id) }
        : null

    return {
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
      imageUrl: preview?.url ?? null,
      imageAlt: preview?.alt ?? null,
      imageId: preview?.id ?? null,
    }
  })

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
      ) : null}

      <GroupsClient groups={groups} students={students} />
    </div>
  )
}
