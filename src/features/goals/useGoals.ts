import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import type { GoalContribution, SavingsGoal } from '@/types/app'

/** Fetches all savings goals for a household, most recently created first. */
export function useGoals(householdId: string | undefined): UseQueryResult<SavingsGoal[]> {
  return useQuery({
    queryKey: queryKeys.goals(householdId ?? 'anonymous'),
    queryFn: async (): Promise<SavingsGoal[]> => {
      if (!householdId) return []
      const { data, error } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('household_id', householdId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: Boolean(householdId),
  })
}

/** Input for creating a new savings goal. */
export interface CreateGoalInput {
  householdId: string
  name: string
  icon: string
  color: string
  targetAmount: number
  deadline: string | null
}

/** Creates a new savings goal for the household, invalidating the household's goals list on success. */
export function useCreateGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateGoalInput): Promise<SavingsGoal> => {
      const { data, error } = await supabase
        .from('savings_goals')
        .insert({
          household_id: input.householdId,
          name: input.name,
          icon: input.icon,
          color: input.color,
          target_amount: input.targetAmount,
          deadline: input.deadline,
        })
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.goals(variables.householdId) })
    },
  })
}

/** Input for recording a contribution towards a savings goal. */
export interface ContributeInput {
  goalId: string
  householdId: string
  userId: string
  amount: number
  note: string | null
}

/**
 * Records a contribution towards a goal: inserts a `goal_contributions` row and bumps the goal's
 * `current_amount` via the `increment_goal_amount` RPC. Invalidates the goal's contribution history
 * and the household's goals list (since `current_amount` changed).
 */
export function useContribute() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ContributeInput): Promise<GoalContribution> => {
      const { data, error } = await supabase
        .from('goal_contributions')
        .insert({
          goal_id: input.goalId,
          user_id: input.userId,
          amount: input.amount,
          note: input.note,
        })
        .select('*')
        .single()
      if (error) throw error

      const { error: incrementError } = await supabase.rpc('increment_goal_amount', {
        goal_id: input.goalId,
        delta: input.amount,
      })
      if (incrementError) throw incrementError

      return data
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.goalContributions(variables.goalId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.goals(variables.householdId) })
    },
  })
}

/** Fetches the contribution history for a single savings goal, most recent first. */
export function useGoalContributions(goalId: string | undefined): UseQueryResult<GoalContribution[]> {
  return useQuery({
    queryKey: queryKeys.goalContributions(goalId ?? 'anonymous'),
    queryFn: async (): Promise<GoalContribution[]> => {
      if (!goalId) return []
      const { data, error } = await supabase
        .from('goal_contributions')
        .select('*')
        .eq('goal_id', goalId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: Boolean(goalId),
  })
}
