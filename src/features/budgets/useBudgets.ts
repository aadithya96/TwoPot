import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import type { Budget, BudgetUsage } from '@/types/app'

/** Fraction of budget spent at which a category is considered "at warning". */
const WARNING_THRESHOLD = 0.8
/** Fraction of budget spent at which a category is considered "exceeded". */
const EXCEEDED_THRESHOLD = 1.0

/** Fetches per-category budget usage (spent vs. budgeted) for a household from the `budget_usage` view. */
export function useBudgetUsage(householdId: string | undefined): UseQueryResult<BudgetUsage[]> {
  return useQuery({
    queryKey: queryKeys.budgetUsage(householdId ?? 'anonymous'),
    queryFn: async (): Promise<BudgetUsage[]> => {
      if (!householdId) return []
      const { data, error } = await supabase
        .from('budget_usage')
        .select('*')
        .eq('household_id', householdId)
      if (error) throw error
      return data ?? []
    },
    enabled: Boolean(householdId),
  })
}

/** Derives which budget categories are at warning (>=80% spent) or exceeded (>=100% spent) from usage data. */
export function useBudgetAlerts(householdId: string | undefined): {
  warning: BudgetUsage[]
  exceeded: BudgetUsage[]
} {
  const { data } = useBudgetUsage(householdId)

  return useMemo(() => {
    const rows = data ?? []
    const warning: BudgetUsage[] = []
    const exceeded: BudgetUsage[] = []
    for (const row of rows) {
      if (row.budget_amount <= 0) continue
      const ratio = row.spent_amount / row.budget_amount
      if (ratio >= EXCEEDED_THRESHOLD) {
        exceeded.push(row)
      } else if (ratio >= WARNING_THRESHOLD) {
        warning.push(row)
      }
    }
    return { warning, exceeded }
  }, [data])
}

/** Input for creating or updating a household's monthly/yearly budget for a category. */
export interface SetBudgetInput {
  householdId: string
  categoryId: string
  amount: number
  period: Budget['period']
  rollover: boolean
}

/** Upserts a household budget (unique on household_id+category_id+period), invalidating budget usage on success. */
export function useSetBudget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: SetBudgetInput): Promise<Budget> => {
      const { data, error } = await supabase
        .from('budgets')
        .upsert(
          {
            household_id: input.householdId,
            category_id: input.categoryId,
            amount: input.amount,
            period: input.period,
            rollover: input.rollover,
          },
          { onConflict: 'household_id,category_id,period' }
        )
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.budgetUsage(variables.householdId) })
    },
  })
}
