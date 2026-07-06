import { useState } from 'react'
import { Alert, Box, Button, CircularProgress, Skeleton, Stack, Typography } from '@mui/material'
import { useHouseholdStore } from '@/stores/householdStore'
import type { Category } from '@/types/app'
import { useBudgetAlerts, useBudgetUsage } from './useBudgets'
import { useRealtimeBudgets } from './useRealtimeBudgets'
import { BudgetCategoryRow } from './BudgetCategoryRow'
import { SetBudgetDialog } from './SetBudgetDialog'

export interface OverallBudgetRingProps {
  /** Total amount spent across all budgeted categories, in paise. */
  spent: number
  /** Total budgeted amount across all categories, in paise. */
  budget: number
}

/** Returns the MD3 palette token name (success/warning/error) for a given spent/budget ratio. */
function colorForRatio(ratio: number): 'success' | 'warning' | 'error' {
  if (ratio >= 1) return 'error'
  if (ratio >= 0.8) return 'warning'
  return 'success'
}

/** Circular ring showing total spend as a percentage of total budget, colored green/amber/red by threshold. */
function OverallBudgetRing({ spent, budget }: OverallBudgetRingProps) {
  const ratio = budget > 0 ? spent / budget : 0
  const percent = Math.round(ratio * 100)
  const color = colorForRatio(ratio)

  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <CircularProgress
        variant="determinate"
        value={Math.min(percent, 100)}
        size={120}
        thickness={4}
        color={color}
      />
      <Box
        sx={{
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography variant="headlineSmall" component="span">
          {percent}%
        </Typography>
        <Typography variant="labelSmall" color="text.secondary">
          of budget
        </Typography>
      </Box>
    </Box>
  )
}

export interface BudgetPageProps {
  /** Categories available for setting new budgets. */
  categories: Category[]
}

/** Budgets overview: overall spend ring, an at-risk alert banner, per-category rows, and a button to add budgets. */
export function BudgetPage({ categories }: BudgetPageProps) {
  const householdId = useHouseholdStore((state) => state.householdId)
  const { data: usage, isLoading } = useBudgetUsage(householdId ?? undefined)
  const { warning, exceeded } = useBudgetAlerts(householdId ?? undefined)
  const [dialogOpen, setDialogOpen] = useState(false)

  useRealtimeBudgets(householdId ?? undefined)

  const totals = (usage ?? []).reduce(
    (acc, row) => ({ spent: acc.spent + row.spent_amount, budget: acc.budget + row.budget_amount }),
    { spent: 0, budget: 0 }
  )

  if (!householdId) return null

  if (isLoading) {
    return (
      <Stack spacing={2} sx={{ p: 2 }}>
        <Skeleton variant="circular" width={120} height={120} sx={{ alignSelf: 'center' }} />
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} variant="rounded" height={56} />
        ))}
      </Stack>
    )
  }

  const atRiskCount = warning.length + exceeded.length

  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <OverallBudgetRing spent={totals.spent} budget={totals.budget} />
      </Box>

      {atRiskCount > 0 && (
        <Alert severity="warning">
          {atRiskCount} {atRiskCount === 1 ? 'category is' : 'categories are'} at or near its budget limit.
        </Alert>
      )}

      <Stack divider={<Box sx={{ borderBottom: 1, borderColor: 'divider' }} />}>
        {(usage ?? []).map((row) => (
          <BudgetCategoryRow
            key={`${row.category_id}-${row.period_month}`}
            usage={row}
            householdId={householdId}
            categories={categories}
          />
        ))}
      </Stack>

      <Button variant="text" onClick={() => setDialogOpen(true)} sx={{ alignSelf: 'flex-start' }}>
        + Set budget
      </Button>

      <SetBudgetDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        householdId={householdId}
        categories={categories}
      />
    </Stack>
  )
}
