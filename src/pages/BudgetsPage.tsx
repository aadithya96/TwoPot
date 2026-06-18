import { Box, Skeleton } from '@mui/material'
import { useHouseholdStore } from '@/stores/householdStore'
import { useCategories } from '@/hooks/useCategories'
import { BudgetPage as BudgetFeaturePage } from '@/features/budgets'

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
