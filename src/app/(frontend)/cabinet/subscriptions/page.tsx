import { SubscriptionsClient } from '@/app/(frontend)/cabinet/subscriptions/subscriptions-client'
import { getCurrentUser, getPayloadClient } from '@/lib/payload'
import { isAdminLike } from '@/lib/roles'

export const metadata = { title: 'Абонементы' }

export default async function SubscriptionsPage() {
  const me = await getCurrentUser()
  if (!me) return null

  const payload = await getPayloadClient()
  const admin = isAdminLike(me.role)

  const result = await payload.find({
    collection: 'subscription-templates',
    sort: 'title',
    limit: 200,
    depth: 1,
    overrideAccess: true,
  })

  const templates = result.docs.map((t) => {
    // `image` is an upload relationship; at depth 1 Payload populates it as
    // the media document (with `url`/`alt`). It may also be a string id or
    // absent entirely.
    const img =
      t.image && typeof t.image === 'object'
        ? { url: t.image.url ?? null, alt: t.image.alt ?? null, id: String(t.image.id) }
        : null

    return {
      id: t.id,
      title: t.title,
      kind: t.kind,
      totalCredits: t.totalCredits,
      price: t.price ?? null,
      durationDays: t.durationDays ?? null,
      notes: t.notes ?? null,
      imageUrl: img?.url ?? null,
      imageAlt: img?.alt ?? null,
      imageId: img?.id ?? null,
    }
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Абонементы</h1>
        <p className="text-sm text-muted-foreground">
          {admin
            ? 'Каталог шаблонов абонементов. Привязка ученикам — в профиле ученика.'
            : 'Доступные абонементы.'}
        </p>
      </div>
      <SubscriptionsClient templates={templates} isAdmin={admin} />
    </div>
  )
}
