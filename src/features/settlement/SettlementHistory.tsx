import { Chip, List, ListItem, ListItemText, Skeleton, Stack, Typography } from '@mui/material'
import { formatINR } from '@/lib/currency'
import { formatMonth } from '@/lib/dates'
import { useSettlementHistory } from './useSettlement'

export interface SettlementHistoryProps {
  /** Household whose settlement history should be displayed. */
  householdId: string | undefined
}

/** Timeline list of past months' settlements, each with a settled/pending badge and formatted amount. */
export function SettlementHistory({ householdId }: SettlementHistoryProps) {
  const { data: history, isLoading } = useSettlementHistory(householdId)

  if (isLoading) {
    return (
      <Stack spacing={1} sx={{ p: 2 }}>
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} variant="rounded" height={56} />
        ))}
      </Stack>
    )
  }

  if ((history ?? []).length === 0) {
    return (
      <Typography variant="bodyMedium" color="text.secondary" sx={{ p: 2 }}>
        No past settlements yet.
      </Typography>
    )
  }

  return (
    <List>
      {(history ?? []).map((settlement) => (
        <ListItem
          key={settlement.id}
          secondaryAction={
            <Chip
              label={settlement.settled ? 'Settled' : 'Pending'}
              color={settlement.settled ? 'success' : 'warning'}
              size="small"
            />
          }
        >
          <ListItemText
            primary={formatMonth(settlement.period_month)}
            secondary={formatINR(settlement.amount)}
          />
        </ListItem>
      ))}
    </List>
  )
}
