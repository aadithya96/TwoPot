import { Box, Stack, Typography } from '@mui/material'
import { InsightsPage as InsightsFeaturePage } from '@/features/insights'
import { SettlementHistory, BalanceTrend, useBalanceTrend } from '@/features/settlement'
import { useHouseholdStore } from '@/stores/householdStore'

/** Thin route wrapper combining the insights feature's page with the household's settlement history. */
export function InsightsPage() {
  const householdId = useHouseholdStore((state) => state.householdId)
  const members = useHouseholdStore((state) => state.members)
  const { data: balanceTrend } = useBalanceTrend(householdId ?? undefined)

  return (
    <Box sx={{ p: 2, pb: 12 }}>
      <Stack spacing={3}>
        <InsightsFeaturePage />
        {members.length > 1 && <BalanceTrend data={balanceTrend ?? []} members={members} />}
        <Box>
          <Typography variant="titleMedium" sx={{ mb: 1 }}>
            Settlement history
          </Typography>
          <SettlementHistory householdId={householdId ?? undefined} />
        </Box>
      </Stack>
    </Box>
  )
}
