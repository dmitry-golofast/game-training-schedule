'use client'

import { Link2OffIcon, LinkIcon } from 'lucide-react'
import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'

import {
  linkChildAction,
  unlinkChildAction,
} from '@/app/(frontend)/cabinet/profile/children-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Child = {
  id: string
  name: string
  email: string
  birthDate?: string | null
}

export function ChildrenSection({ children }: { children: Child[] }) {
  const [linkState, linkAction] = useActionState(linkChildAction, undefined)
  const [unlinkState, unlinkAction] = useActionState(unlinkChildAction, undefined)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  const linkShown = useRef(false)
  const unlinkShown = useRef(false)

  useEffect(() => {
    if (!linkState) return
    if (linkShown.current) return
    linkShown.current = true
    if (linkState.success) {
      toast.success('Ученик привязан.')
      formRef.current?.reset()
    } else if ('error' in linkState) {
      toast.error(linkState.error)
      linkShown.current = false
    }
  }, [linkState])

  useEffect(() => {
    if (!unlinkState) return
    if (unlinkShown.current) return
    unlinkShown.current = true
    if (unlinkState.success) {
      toast.success('Ученик отвязан.')
    } else if ('error' in unlinkState) {
      toast.error(unlinkState.error)
      unlinkShown.current = false
    }
  }, [unlinkState])

  return (
    <div className="flex flex-col gap-4">
      {/* Current children */}
      <div className="flex flex-col gap-2">
        {children.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Пока нет привязанных детей. Привяжите по email ученика ниже.
          </p>
        ) : (
          children.map((child) => (
            <div
              key={child.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{child.name}</span>
                <span className="text-xs text-muted-foreground">{child.email}</span>
                {child.birthDate ? (
                  <span className="text-xs text-muted-foreground">
                    рожд. {child.birthDate.slice(0, 10)}
                  </span>
                ) : null}
              </div>
              <form action={unlinkAction} onSubmit={() => startTransition(() => {})}>
                <input type="hidden" name="childId" value={child.id} />
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  disabled={isPending}
                >
                  <Link2OffIcon className="size-4 text-muted-foreground" />
                </Button>
              </form>
            </div>
          ))
        )}
      </div>

      {/* Link form */}
      <form
        ref={formRef}
        action={linkAction}
        onSubmit={() => startTransition(() => {})}
        className="flex items-end gap-2"
      >
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="child-email">Привязать ученика по email</Label>
          <Input
            id="child-email"
            name="childEmail"
            type="email"
            placeholder="uchim@yandex.ru"
            required
          />
        </div>
        <Button type="submit" disabled={isPending}>
          <LinkIcon />
          Привязать
        </Button>
      </form>
    </div>
  )
}
