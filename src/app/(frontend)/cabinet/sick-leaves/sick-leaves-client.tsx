'use client'

import { CheckIcon, FileTextIcon, XIcon } from 'lucide-react'
import { useActionState, useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { reviewSickLeaveAction } from '@/app/(frontend)/cabinet/sick-leaves/actions'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type Item = {
  id: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  reviewNote?: string | null
  reviewedAt?: string | null
  createdAt: string
  student: { id: string; name: string } | null
  slot: { id: string; startAt: string } | null
  documentUrl?: string | null
  documentTitle?: string | null
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-primary/10 text-primary',
  approved: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  rejected: 'bg-destructive/10 text-destructive',
}
const STATUS_LABEL: Record<string, string> = {
  pending: 'На рассмотрении',
  approved: 'Одобрено',
  rejected: 'Отклонено',
}

export function SickLeavesClient({ items, canManage }: { items: Item[]; canManage: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Заявок на больничный пока нет.</p>
      ) : (
        items.map((item) => <SickLeaveRow key={item.id} item={item} canManage={canManage} />)
      )}
    </div>
  )
}

function SickLeaveRow({ item, canManage }: { item: Item; canManage: boolean }) {
  const [state, formAction] = useActionState(reviewSickLeaveAction, undefined)
  const [pending, startTransition] = useTransition()
  const [reviewNote, setReviewNote] = useState('')

  useEffect(() => {
    if (state?.success) {
      toast.success('Заявка рассмотрена.')
    } else if (state && !state.success) {
      toast.error(state.error)
    }
  }, [state])

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="font-medium">{item.student?.name ?? '—'}</span>
          {item.slot ? (
            <span className="ml-2 text-xs text-muted-foreground">
              тренировка {new Date(item.slot.startAt).toLocaleString('ru-RU')}
            </span>
          ) : null}
        </div>
        <span
          className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_BADGE[item.status])}
        >
          {STATUS_LABEL[item.status]}
        </span>
      </div>

      <p className="text-sm">{item.reason}</p>

      {/* Medical certificate link */}
      {item.documentUrl ? (
        <a
          href={item.documentUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          <FileTextIcon className="size-3.5" />
          {item.documentTitle || 'Справка'}
        </a>
      ) : null}

      {item.reviewNote ? (
        <p className="text-xs text-muted-foreground">Комментарий тренера: {item.reviewNote}</p>
      ) : null}

      {canManage && item.status === 'pending' ? (
        <form
          action={formAction}
          onSubmit={() => startTransition(() => {})}
          className="flex flex-col gap-2"
        >
          <input type="hidden" name="id" value={item.id} />
          <Textarea
            name="reviewNote"
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            rows={1}
            placeholder="Комментарий (необязательно)"
          />
          <div className="flex gap-2">
            <Button
              type="submit"
              name="decision"
              value="approved"
              variant="default"
              disabled={pending}
            >
              <CheckIcon />
              Одобрить
            </Button>
            <Button
              type="submit"
              name="decision"
              value="rejected"
              variant="outline"
              disabled={pending}
            >
              <XIcon />
              Отклонить
            </Button>
          </div>
        </form>
      ) : null}

      {item.reviewedAt ? (
        <p className="text-xs text-muted-foreground">
          Рассмотрено: {new Date(item.reviewedAt).toLocaleString('ru-RU')}
        </p>
      ) : null}
    </div>
  )
}
