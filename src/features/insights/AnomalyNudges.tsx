import { Alert, Stack, Typography } from '@mui/material'
import { formatINR } from '@/lib/currency'
import type { CategoryAnomalyRow } from './useInsights'

export interface AnomalyNudgesProps {
  /** Categories running well above their recent average for the selected month. */
  data: CategoryAnomalyRow[]
}

/** Nudges for categories spending well above their recent average, e.g. "Dining is 2.1x your usual this month". */
export function AnomalyNudges({ data }: AnomalyNudgesProps) {
  if (data.length === 0) return null

  return (
    <Stack spacing={1}>
      {data.map((row) => (
        <Alert key={row.category_id} severity="warning" variant="outlined" icon={false}>
          <Typography variant="bodyMedium">
            <strong>{row.category_name}</strong> is {row.ratio.toFixed(1)}x your usual this month —{' '}
            {formatINR(row.current_amount)} vs a typical {formatINR(Math.round(row.avg_amount))}.
          </Typography>
        </Alert>
      ))}
    </Stack>
  )
}
