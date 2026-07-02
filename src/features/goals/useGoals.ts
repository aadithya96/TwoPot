import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import type { GoalContribution, SavingsGoal } from '@/types/app'
import { computeMfMarketValue } from './backing'

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

/** How a new goal is backed (see backing.ts / migration 026). */
export type CreateGoalBacking =
  | { type: 'manual' }
  | { type: 'bank_account'; bankLabel: string; upiVpa: string }
  | {
      type: 'mutual_fund'
      schemeCode: number
      schemeName: string
      /** Units already held, if the fund pre-exists the goal. */
      units: number
      /** Latest NAV in rupees, when it could be fetched at creation time. */
      nav: number | null
      /** ISO date of that NAV. */
      navDate: string | null
    }

/** Input for creating a new savings goal. */
export interface CreateGoalInput {
  householdId: string
  name: string
  icon: string
  color: string
  targetAmount: number
  deadline: string | null
  backing: CreateGoalBacking
}

/** Creates a new savings goal for the household, invalidating the household's goals list on success. */
export function useCreateGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateGoalInput): Promise<SavingsGoal> => {
      const { backing } = input
      const { data, error } = await supabase
        .from('savings_goals')
        .insert({
          household_id: input.householdId,
          name: input.name,
          icon: input.icon,
          color: input.color,
          target_amount: input.targetAmount,
          deadline: input.deadline,
          backing_type: backing.type,
          ...(backing.type === 'bank_account' && {
            backing_bank_label: backing.bankLabel,
            backing_upi_vpa: backing.upiVpa,
          }),
          ...(backing.type === 'mutual_fund' && {
            backing_mf_scheme_code: backing.schemeCode,
            backing_mf_scheme_name: backing.schemeName,
            backing_mf_units: backing.units,
            backing_mf_nav: backing.nav,
            backing_mf_nav_date: backing.navDate,
            backing_mf_refreshed_at: backing.nav !== null ? new Date().toISOString() : null,
            // Pre-existing units are already worth something at the latest NAV.
            current_amount: backing.nav !== null ? computeMfMarketValue(backing.units, backing.nav) : 0,
          }),
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
  /**
   * For mutual-fund-backed goals: units this contribution bought. When set, the goal's value is
   * bumped by units (via `increment_goal_mf_units`) instead of by the raw amount, so it keeps
   * tracking market value.
   */
  mfUnits?: number
}

/**
 * Records a contribution towards a goal: inserts a `goal_contributions` row and bumps the goal's
 * `current_amount` via the `increment_goal_amount` RPC (or `increment_goal_mf_units` for
 * mutual-fund-backed goals). Invalidates the goal's contribution history and the household's goals
 * list (since `current_amount` changed).
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

      const { error: incrementError } =
        input.mfUnits !== undefined
          ? await supabase.rpc('increment_goal_mf_units', {
              goal_id: input.goalId,
              delta_units: input.mfUnits,
            })
          : await supabase.rpc('increment_goal_amount', {
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
