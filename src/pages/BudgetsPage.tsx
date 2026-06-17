import { useQuery } from '@tanstack/react-query'
import { Box, Skeleton } from '@mui/material'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import { useHouseholdStore } from '@/stores/householdStore'
import { BudgetPage as BudgetFeaturePage } from '@/features/budgets'
import type { Category } from '@/types/app'

/** Fetches the household's expense categories, needed to let the budgets feature offer category pickers. */
function useCategories(householdId: string | undefined) {
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

/** Thin route wrapper that loads categories and renders the budgets feature's page. */
export function BudgetsPage() {
  const householdId = useHouseholdStore((state) => state.householdId)
  const { data: categories, isLoading } = useCategories(householdId ?? undefined)

  if (isLoading) {
    return (
      <Box sx={{ p: 2 }}>
        <Skeleton variant="rounded" height={200} />
      </Box>
    )
  }

  return <BudgetFeaturePage categories={categories ?? []} />
}
