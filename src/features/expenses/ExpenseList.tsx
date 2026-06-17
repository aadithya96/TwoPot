import { useMemo, useState } from 'react'
import { Box, Button, IconButton, Skeleton, Stack, Typography } from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import { formatMonth, formatRelativeDate, monthKey, shiftMonth } from '@/lib/dates'
import { ExpenseRow } from './ExpenseRow'
import { AddExpenseSheet } from './AddExpenseSheet'
import { useExpenses } from './useExpenses'
import type { Category } from '@/types/app'

export interface ExpenseListProps {
  /** Household whose expenses should be shown. */
  householdId: string
  /** Id of the user currently viewing the list. */
  currentUserId: string
  /** Categories available for the household, passed to rows and the add sheet. */
  categories: Category[]
}

/** Month-navigable list of expenses grouped by date, with loading/empty states. */
export function ExpenseList({ householdId, currentUserId, categories }: ExpenseListProps) {
  const [month, setMonth] = useState(() => monthKey())
  const [addOpen, setAddOpen] = useState(false)
  const { data: expenses, isLoading } = useExpenses(householdId, month)

  const grouped = useMemo(() => {
    const groups = new Map<string, typeof expenses>()
    for (const expense of expenses ?? []) {
      const list = groups.get(expense.date) ?? []
      list.push(expense)
      groups.set(expense.date, list)
    }
    return Array.from(groups.entries())
  }, [expenses])

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} sx={{ py: 1 }}>
        <IconButton onClick={() => setMonth((current) => shiftMonth(current, -1))} aria-label="Previous month">
          <ChevronLeftIcon />
        </IconButton>
        <Typography variant="titleMedium">{formatMonth(month)}</Typography>
        <IconButton onClick={() => setMonth((current) => shiftMonth(current, 1))} aria-label="Next month">
          <ChevronRightIcon />
        </IconButton>
      </Stack>

      {isLoading && (
        <Stack spacing={0.5} sx={{ px: 2 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" height={64} />
          ))}
        </Stack>
      )}

      {!isLoading && grouped.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <ReceiptLongIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
          <Typography variant="bodyLarge" color="text.secondary" sx={{ mt: 1 }}>
            No expenses yet
          </Typography>
          <Button variant="contained" sx={{ mt: 2 }} onClick={() => setAddOpen(true)}>
            Add your first
          </Button>
        </Box>
      )}

      {!isLoading &&
        grouped.map(([date, dayExpenses]) => (
          <Box key={date}>
            <Typography variant="labelLarge" color="text.secondary" sx={{ px: 2, py: 1 }}>
              {formatRelativeDate(date)}
            </Typography>
            {dayExpenses?.map((expense) => (
              <ExpenseRow
                key={expense.id}
                expense={expense}
                currentUserId={currentUserId}
                householdId={householdId}
                month={month}
                categories={categories}
              />
            ))}
          </Box>
        ))}

      <AddExpenseSheet open={addOpen} onClose={() => setAddOpen(false)} categories={categories} />
    </Box>
  )
}
