import { useQuery } from '@tanstack/react-query'
import { Box, CircularProgress, Stack } from '@mui/material'
import { useHouseholdStore } from '@/stores/householdStore'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import type { Expense } from '@/types/app'
import {
  useMonthlyByCategory,
  useMonthlyTrend,
  usePersonContributions,
  useCategoryAnomalies,
} from './useInsights'
import { StatCards } from './StatCards'
import { SpendByCategory } from './SpendByCategory'
import { MonthlyTrend } from './MonthlyTrend'
import { PersonContributions } from './PersonContributions'
import { AnomalyNudges } from './AnomalyNudges'

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

/**
 * Lazy-loaded insights page composing stat cards and the three deferred
 * charts. Reads the active household from `useHouseholdStore` to avoid a
 * cross-feature dependency on the in-progress household feature.
 */
export function InsightsPage() {
  const householdId = useHouseholdStore((state) => state.householdId)
  const members = useHouseholdStore((state) => state.members)
  const month = currentMonth()

  const expensesQuery = useQuery({
    queryKey: queryKeys.expenses(householdId ?? 'none', month),
    queryFn: async (): Promise<Expense[]> => {
      const start = `${month}-01`
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('household_id', householdId as string)
        .gte('date', start)
      if (error) throw error
      return data
    },
    enabled: Boolean(householdId),
  })

  const categoryQuery = useMonthlyByCategory(householdId ?? undefined, month)
  const trendQuery = useMonthlyTrend(householdId ?? undefined)
  const contributionsQuery = usePersonContributions(householdId ?? undefined, month)
  const anomaliesQuery = useCategoryAnomalies(householdId ?? undefined, month)

  if (!householdId) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Stack spacing={3} sx={{ p: 2 }}>
      <StatCards expenses={expensesQuery.data ?? []} />
      <AnomalyNudges data={anomaliesQuery.data ?? []} />
      <SpendByCategory data={categoryQuery.data ?? []} />
      <MonthlyTrend data={trendQuery.data ?? []} />
      <PersonContributions data={contributionsQuery.data ?? []} members={members} />
    </Stack>
  )
}
