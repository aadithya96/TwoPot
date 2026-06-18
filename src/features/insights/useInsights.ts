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

/** Fetches per-category spend totals for `householdId` in `month` (YYYY-MM). */
export function useMonthlyByCategory(
  householdId: string | undefined,
  month: string
): UseQueryResult<MonthlyByCategoryRow[]> {
  return useQuery({
    queryKey: queryKeys.monthlyByCategory(householdId ?? 'none', month),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('monthly_by_category', {
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
      const { data, error } = await supabase.rpc('monthly_trend', {
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
      const { data, error } = await supabase.rpc('person_contributions', {
        p_household_id: householdId as string,
      })
      if (error) throw new Error(error.message)
      return data ?? []
    },
    enabled: Boolean(householdId),
  })
}
