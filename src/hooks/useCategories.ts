import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import type { Category } from '@/types/app'

/** Fetches a household's expense categories, ordered by name. */
export function useCategories(householdId: string | undefined): UseQueryResult<Category[]> {
  return useQuery({
    queryKey: queryKeys.categories(householdId ?? 'anonymous'),
    queryFn: async (): Promise<Category[]> => {
      if (!householdId) return []
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('household_id', householdId)
        .order('name', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    enabled: Boolean(householdId),
  })
}
