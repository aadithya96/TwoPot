import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'

/** One row of the `monthly_by_category` RPC result. */
export interface MonthlyByCategoryRow {
  category_id: string
  category_name: string
  category_color: string
  total_amount: number
}

/** One row of the `monthly_trend` RPC result. */
export interface MonthlyTrendRow {
  month: string
  total_amount: number
}

/** One row of the `person_contributions` RPC result: one member's total for one month. */
export interface PersonContributionRow {
  month: string
  user_id: string
  display_name: string
  total_amount: number
}

/**
 * Minimal typed view over `supabase.rpc` for insights functions that are not
 * (yet) declared in the generated `Database['public']['Functions']` map.
 * Scoped to this module to avoid touching `src/types/db.ts`.
 */
interface InsightsRpcClient {
  rpc(
    fn: 'monthly_by_category',
    args: { p_household_id: string; p_month: string }
  ): Promise<{ data: MonthlyByCategoryRow[] | null; error: { message: string } | null }>
  rpc(
    fn: 'monthly_trend',
    args: { p_household_id: string }
  ): Promise<{ data: MonthlyTrendRow[] | null; error: { message: string } | null }>
  rpc(
    fn: 'person_contributions',
    args: { p_household_id: string }
  ): Promise<{ data: PersonContributionRow[] | null; error: { message: string } | null }>
}

const insightsClient = supabase as unknown as InsightsRpcClient

/** Fetches per-category spend totals for `householdId` in `month` (YYYY-MM-DD or YYYY-MM). */
export function useMonthlyByCategory(
  householdId: string | undefined,
  month: string
): UseQueryResult<MonthlyByCategoryRow[]> {
  return useQuery({
    queryKey: queryKeys.monthlyByCategory(householdId ?? 'none', month),
    queryFn: async () => {
      const { data, error } = await insightsClient.rpc('monthly_by_category', {
        p_household_id: householdId as string,
        p_month: month,
      })
      if (error) throw new Error(error.message)
      return data ?? []
    },
    enabled: Boolean(householdId),
  })
}

/** Fetches the last several months of total spend for `householdId`. */
export function useMonthlyTrend(householdId: string | undefined): UseQueryResult<MonthlyTrendRow[]> {
  return useQuery({
    queryKey: queryKeys.monthlyTrend(householdId ?? 'none'),
    queryFn: async () => {
      const { data, error } = await insightsClient.rpc('monthly_trend', {
        p_household_id: householdId as string,
      })
      if (error) throw new Error(error.message)
      return data ?? []
    },
    enabled: Boolean(householdId),
  })
}

/**
 * Fetches each household member's monthly spend totals (used to render a
 * grouped bar chart of contributions over time). `month` selects the React
 * Query cache key's scope (e.g. the currently viewed month) even though the
 * RPC itself returns multi-month history.
 */
export function usePersonContributions(
  householdId: string | undefined,
  month: string
): UseQueryResult<PersonContributionRow[]> {
  return useQuery({
    queryKey: queryKeys.personContributions(householdId ?? 'none', month),
    queryFn: async () => {
      const { data, error } = await insightsClient.rpc('person_contributions', {
        p_household_id: householdId as string,
      })
      if (error) throw new Error(error.message)
      return data ?? []
    },
    enabled: Boolean(householdId),
  })
}
