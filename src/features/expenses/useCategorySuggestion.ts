import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import type { CategorizedDescription } from './categorySuggestion'

const HISTORY_LIMIT = 200

/**
 * Fetches a household's recent (description, category) pairs to power
 * client-side category suggestions — see `suggestCategory`. Kept separate
 * from `useExpenses` since it only needs two narrow columns and a much
 * longer lookback window than a single month.
 */
export function useCategorySuggestionHistory(
  householdId: string | undefined
): UseQueryResult<CategorizedDescription[]> {
  return useQuery({
    queryKey: queryKeys.categorySuggestionHistory(householdId ?? 'none'),
    queryFn: async (): Promise<CategorizedDescription[]> => {
      const { data, error } = await supabase
        .from('expenses')
        .select('description, category_id')
        .eq('household_id', householdId as string)
        .not('category_id', 'is', null)
        .order('date', { ascending: false })
        .limit(HISTORY_LIMIT)
      if (error) throw error
      return (data ?? []).map((row) => ({ description: row.description, categoryId: row.category_id }))
    },
    enabled: Boolean(householdId),
    staleTime: 5 * 60 * 1000,
  })
}
