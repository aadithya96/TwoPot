import { useQuery } from '@tanstack/react-query'
import { Box, Chip, List, ListItem, ListItemText, Skeleton, Typography } from '@mui/material'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import { formatINR } from '@/lib/currency'
import type { ExpenseWithRelations } from '@/types/app'

const EXPENSE_SELECT = '*, category:categories(*), payer:profiles!paid_by(id, display_name, avatar_url)'

/** Fetches all expenses flagged as recurring for a household. */
function useRecurringExpenses(householdId: string) {
  return useQuery({
    queryKey: queryKeys.recurringExpenses(householdId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select(EXPENSE_SELECT)
        .eq('household_id', householdId)
        .eq('is_recurring', true)
        .order('date', { ascending: false })
      if (error) throw error
      return data as unknown as ExpenseWithRelations[]
    },
  })
}

export interface RecurringListProps {
  /** Household whose recurring expenses should be listed. */
  householdId: string
}

/** Lists expenses marked as recurring for a household, showing their stored recurrence rule. */
export function RecurringList({ householdId }: RecurringListProps) {
  const { data: expenses, isLoading } = useRecurringExpenses(householdId)

  if (isLoading) {
    return (
      <Box sx={{ px: 2 }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} variant="rounded" height={64} sx={{ mb: 0.5 }} />
        ))}
      </Box>
    )
  }

  if (!expenses || expenses.length === 0) {
    return (
      <Typography variant="bodyLarge" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
        No recurring expenses
      </Typography>
    )
  }

  return (
    <List>
      {expenses.map((expense) => (
        <ListItem key={expense.id} divider>
          <ListItemText
            primary={expense.description}
            secondary={
              // Next-due-date computation from recurrence_rule is out of scope for now;
              // show the raw stored rule string as a placeholder.
              expense.recurrence_rule ?? 'No schedule set'
            }
          />
          <Chip size="small" label="Recurring" sx={{ mr: 1 }} />
          <Typography variant="titleMedium">{formatINR(expense.amount)}</Typography>
        </ListItem>
      ))}
    </List>
  )
}
