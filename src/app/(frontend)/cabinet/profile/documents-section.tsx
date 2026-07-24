'use client'

import { FileTextIcon, Trash2Icon, UploadIcon } from 'lucide-react'
import { useActionState, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import {
  deleteDocumentAction,
  uploadDocumentAction,
} from '@/app/(frontend)/cabinet/profile/documents-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

type Student = { id: string; name: string }
type DocItem = {
  id: string
  docType: 'medic' | 'contract' | 'other'
  title: string
  filename?: string | null
  url?: string | null
  createdAt: string
  student: Student | null
}

const TYPE_LABEL: Record<string, string> = {
  medic: 'Медсправка',
  contract: 'Договор / чек',
  other: 'Другое',
}

export function DocumentsSection({
  documents,
  students,
  canSelectStudent,
}: {
  documents: DocItem[]
  students: Student[]
  canSelectStudent: boolean
}) {
  const [uploadState, uploadAction] = useActionState(uploadDocumentAction, undefined)
  const [deleteState, deleteAction] = useActionState(deleteDocumentAction, undefined)
  const [pending, setPending] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(students[0]?.id ?? '')
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (uploadState?.success) {
      toast.success('Документ загружен.')
      setPending(false)
      formRef.current?.reset()
    } else if (uploadState && !uploadState.success) {
      toast.error(uploadState.error)
      setPending(false)
    }
  }, [uploadState])

  useEffect(() => {
    if (deleteState?.success) {
      toast.success('Документ удалён.')
    } else if (deleteState && !deleteState.success) {
      toast.error(deleteState.error)
    }
  }, [deleteState])

  return (
    <div className="flex flex-col gap-4">
      {/* Upload form */}
      <form ref={formRef} action={uploadAction} className="flex flex-col gap-3">
        {canSelectStudent ? (
          <>
            <input type="hidden" name="student" value={selectedStudent} />
            <div className="flex flex-col gap-2">
              <Label>Ученик</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Выберите ученика" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        ) : (
          <input type="hidden" name="student" value={students[0]?.id ?? ''} />
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="doc-type">Тип документа</Label>
          <Select name="docType" defaultValue="other">
            <SelectTrigger id="doc-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="medic">Медсправка</SelectItem>
              <SelectItem value="contract">Договор / чек</SelectItem>
              <SelectItem value="other">Другое</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="doc-title">Название</Label>
          <Input id="doc-title" name="title" required placeholder="Напр. Справка от 15.07" />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="doc-file">Файл (PDF, изображение)</Label>
          <Input
            id="doc-file"
            name="file"
            type="file"
            accept="application/pdf,image/*"
            required
            onChange={() => setPending(false)}
          />
        </div>

        <div>
          <Button type="submit" disabled={pending} onClick={() => setPending(true)}>
            <UploadIcon />
            {pending ? 'Загрузка…' : 'Загрузить'}
          </Button>
        </div>
      </form>

      {/* Documents list */}
      <div className="flex flex-col gap-2">
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">Документов пока нет.</p>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 rounded-md border border-border p-3"
            >
              <FileTextIcon className="size-5 shrink-0 text-muted-foreground" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{doc.title}</span>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs',
                      doc.docType === 'medic'
                        ? 'bg-primary/10 text-primary'
                        : doc.docType === 'contract'
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-muted/60 text-muted-foreground',
                    )}
                  >
                    {TYPE_LABEL[doc.docType] ?? doc.docType}
                  </span>
                </div>
                {doc.student ? (
                  <span className="text-xs text-muted-foreground">{doc.student.name}</span>
                ) : null}
              </div>
              {doc.url ? (
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  Открыть
                </a>
              ) : null}
              <form action={deleteAction}>
                <input type="hidden" name="id" value={doc.id} />
                <Button type="submit" variant="ghost" size="icon" className="size-8">
                  <Trash2Icon className="size-4" />
                </Button>
              </form>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
