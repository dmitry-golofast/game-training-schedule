import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

type Payment = {
  id: string
  amount: number
  currency?: string | null
  periodFrom: string
  periodTo: string
  method?: string | null
  paidAt: string
  student?: { id: string; name: string } | null
}

const METHOD_LABEL: Record<string, string> = {
  cash: 'Наличные',
  card: 'Карта',
  transfer: 'Перевод',
}

const CURRENCY_SYMBOL: Record<string, string> = { RUB: '₽', USD: '$', EUR: '€' }

/**
 * Read-only payment history table. The most recent payment (by `paidAt`,
 * already sorted desc by the server) is visually highlighted.
 */
export function PaymentHistory({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) {
    return <p className="text-sm text-muted-foreground">Оплат пока нет.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Дата</TableHead>
          <TableHead>Сумма</TableHead>
          <TableHead>Период</TableHead>
          <TableHead className="hidden sm:table-cell">Способ</TableHead>
          {payments[0]?.student ? (
            <TableHead className="hidden md:table-cell">Ученик</TableHead>
          ) : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.map((p, idx) => (
          <TableRow key={p.id} className={cn(idx === 0 && 'bg-primary/5')}>
            <TableCell className="font-medium">{p.paidAt?.slice(0, 10)}</TableCell>
            <TableCell>
              {p.amount} {CURRENCY_SYMBOL[p.currency ?? 'RUB'] ?? p.currency ?? 'RUB'}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {p.periodFrom?.slice(0, 10)} — {p.periodTo?.slice(0, 10)}
            </TableCell>
            <TableCell className="hidden text-xs sm:table-cell">
              {p.method ? (METHOD_LABEL[p.method] ?? p.method) : '—'}
            </TableCell>
            {payments[0]?.student ? (
              <TableCell className="hidden text-xs md:table-cell">
                {p.student?.name ?? '—'}
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
