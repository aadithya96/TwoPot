import { useQuery, useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import { monthRange } from '@/lib/dates'
import type { ExpenseWithRelations } from '@/types/app'

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
}

/** Fetches all expenses for a household within the given "YYYY-MM" month, newest first. */
export function useExpenses(
  householdId: string | undefined,
  month: string
): UseQueryResult<ExpenseWithRelations[]> {
  return useQuery({
    queryKey: queryKeys.expenses(householdId ?? 'anonymous', month),
    queryFn: async () => {
      if (!householdId) return []
      const { start, end } = monthRange(month)
      const { data, error } = await supabase
        .from('expenses')
        .select(EXPENSE_SELECT)
        .eq('household_id', householdId)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: false })
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
        })
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      const month = variables.date.slice(0, 7)
      void queryClient.invalidateQueries({ queryKey: queryKeys.expenses(variables.householdId, month) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.budgetUsage(variables.householdId) })
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
        })
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      const month = variables.date.slice(0, 7)
      void queryClient.invalidateQueries({ queryKey: queryKeys.expenses(variables.householdId, month) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.budgetUsage(variables.householdId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.expense(variables.id) })
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.expenses(variables.householdId, variables.month) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.budgetUsage(variables.householdId) })
    },
  })
}
