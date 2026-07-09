import { useQuery, useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import { monthRange } from '@/lib/dates'
import { notifyPartnerOfExpense } from '@/features/notifications/notifyPartner'
import type { Expense, ExpenseWithRelations } from '@/types/app'

const EXPENSE_SELECT = '*, category:categories(*), payer:profiles!paid_by(id, display_name, avatar_url)'

/** Fields required to create a new expense row. */
export interface ExpenseInput {
  householdId: string
  categoryId: string | null
  paidBy: string
  owner: 'shared' | 'personal'
  personalUserId: string | null
  amount: number
  description: string
  notes: string | null
  date: string
  splitType: 'equal' | 'custom' | 'payer_covers'
  splitPctA: number | null
  isRecurring: boolean
  receiptUrl: string | null
}

/** Sentinel month value for {@link useExpenses} that fetches every expense, ignoring the date range. */
export const ALL_MONTHS = 'all'

/**
 * Fetches expenses for a household, newest first. Pass a "YYYY-MM" month to scope
 * to that month, or {@link ALL_MONTHS} to fetch every expense across all time.
 */
export function useExpenses(
  householdId: string | undefined,
  month: string
): UseQueryResult<ExpenseWithRelations[]> {
  return useQuery({
    queryKey: queryKeys.expenses(householdId ?? 'anonymous', month),
    queryFn: async () => {
      if (!householdId) return []
      let query = supabase.from('expenses').select(EXPENSE_SELECT).eq('household_id', householdId)
      if (month !== ALL_MONTHS) {
        const { start, end } = monthRange(month)
        query = query.gte('date', start).lte('date', end)
      }
      const { data, error } = await query.order('date', { ascending: false })
      if (error) throw error
      return data as unknown as ExpenseWithRelations[]
    },
    enabled: Boolean(householdId),
  })
}

/** Inserts a new expense row and invalidates the affected expenses/budget-usage caches. */
export function useAddExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ExpenseInput) => {
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          household_id: input.householdId,
          category_id: input.categoryId,
          paid_by: input.paidBy,
          owner: input.owner,
          personal_user_id: input.personalUserId,
          amount: input.amount,
          description: input.description,
          notes: input.notes,
          date: input.date,
          split_type: input.splitType,
          split_pct_a: input.splitPctA,
          is_recurring: input.isRecurring,
          receipt_url: input.receiptUrl,
        })
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      const month = variables.date.slice(0, 7)
      void queryClient.invalidateQueries({ queryKey: queryKeys.expensesForHousehold(variables.householdId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.budgetUsage(variables.householdId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.settlement(variables.householdId, month) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.balanceTrend(variables.householdId) })
      void notifyPartnerOfExpense({
        payerId: variables.paidBy,
        amount: variables.amount,
        description: variables.description,
        owner: variables.owner,
      })
    },
  })
}

/** Updates an existing expense by id and invalidates the affected expenses/budget-usage caches. */
export function useUpdateExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: ExpenseInput & { id: string }) => {
      const { data, error } = await supabase
        .from('expenses')
        .update({
          category_id: input.categoryId,
          paid_by: input.paidBy,
          owner: input.owner,
          personal_user_id: input.personalUserId,
          amount: input.amount,
          description: input.description,
          notes: input.notes,
          date: input.date,
          split_type: input.splitType,
          split_pct_a: input.splitPctA,
          is_recurring: input.isRecurring,
          receipt_url: input.receiptUrl,
        })
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      const month = variables.date.slice(0, 7)
      void queryClient.invalidateQueries({ queryKey: queryKeys.expensesForHousehold(variables.householdId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.budgetUsage(variables.householdId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.expense(variables.id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.settlement(variables.householdId, month) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.balanceTrend(variables.householdId) })
    },
  })
}

interface DeleteExpenseContext {
  previous: Array<readonly [readonly unknown[], ExpenseWithRelations[] | undefined]>
}

/** Deletes an expense by id, optimistically removing it from the cached month list. */
export function useDeleteExpense() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, { id: string; householdId: string; month: string }, DeleteExpenseContext>({
    mutationFn: async ({ id }) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, householdId, month }) => {
      const queryKey = queryKeys.expenses(householdId, month)
      await queryClient.cancelQueries({ queryKey })
      const previousList = queryClient.getQueryData<ExpenseWithRelations[]>(queryKey)
      if (previousList) {
        queryClient.setQueryData<ExpenseWithRelations[]>(
          queryKey,
          previousList.filter((expense) => expense.id !== id)
        )
      }
      return { previous: [[queryKey, previousList]] }
    },
    onError: (_error, _variables, context) => {
      context?.previous.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data)
      })
    },
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.expensesForHousehold(variables.householdId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.budgetUsage(variables.householdId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.settlement(variables.householdId, variables.month) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.balanceTrend(variables.householdId) })
    },
  })
}

/**
 * Restores a previously deleted expense by re-inserting the row snapshot the
 * audit log captured at delete time (see migration 033). The original id is
 * preserved, so restoring the same deletion twice fails with a unique-violation
 * rather than duplicating the expense. Invalidates the same caches an add does.
 */
export function useRestoreExpense() {
  const queryClient = useQueryClient()

  return useMutation<Expense, Error, { snapshot: Expense }>({
    mutationFn: async ({ snapshot }) => {
      const { data, error } = await supabase
        .from('expenses')
        .insert(snapshot)
        .select('*')
        .single()
      if (error) throw error
      return data as Expense
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.expensesForHousehold(data.household_id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.budgetUsage(data.household_id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.settlement(data.household_id, data.date.slice(0, 7)) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.balanceTrend(data.household_id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.auditLog(data.household_id) })
    },
  })
}
