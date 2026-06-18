import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'

/** A household member with their income, ordered by join date (rank 0 = member A). */
export interface IncomeSplitMember {
  userId: string
  displayName: string
  avatarUrl: string | null
  /** Income in paise, or null if not set. */
  income: number | null
  /** 0 for the first-joined member ("member A"), 1 for the partner. */
  rank: number
}

/** Resolved income-split configuration for a household. */
export interface IncomeSplitData {
  /** Whether income-based splitting is turned on for the household. */
  enabled: boolean
  /** Members ordered by join date. */
  members: IncomeSplitMember[]
  /**
   * The percentage of shared costs member A should bear, derived from incomes
   * (memberA / total). Null when both incomes aren't set or sum to zero.
   * Maps directly to an expense's `split_pct_a`.
   */
  defaultPctA: number | null
}

/**
 * Computes member A's fair share of shared costs from the two incomes, as a
 * percentage suitable for `split_pct_a`. Returns null when it can't be derived.
 */
export function fairPctA(incomeA: number | null, incomeB: number | null): number | null {
  if (incomeA == null || incomeB == null) return null
  const total = incomeA + incomeB
  if (total <= 0) return null
  return Math.round((incomeA / total) * 100)
}

/** Fetches income-split settings and per-member incomes for a household. */
export function useIncomeSplit(householdId: string | undefined): UseQueryResult<IncomeSplitData> {
  return useQuery({
    queryKey: queryKeys.incomeSplit(householdId ?? 'anonymous'),
    queryFn: async (): Promise<IncomeSplitData> => {
      if (!householdId) return { enabled: false, members: [], defaultPctA: null }

      const { data: household, error: householdError } = await supabase
        .from('households')
        .select('income_split_enabled')
        .eq('id', householdId)
        .single()
      if (householdError) throw householdError

      const { data: rows, error: membersError } = await supabase
        .from('household_members')
        .select('user_id, income, joined_at, profiles(display_name, avatar_url)')
        .eq('household_id', householdId)
        .order('joined_at', { ascending: true })
      if (membersError) throw membersError

      const members: IncomeSplitMember[] = (rows ?? []).map((row, index) => {
        const profile = row.profiles as unknown as { display_name: string; avatar_url: string | null } | null
        return {
          userId: row.user_id,
          displayName: profile?.display_name ?? 'Member',
          avatarUrl: profile?.avatar_url ?? null,
          income: row.income,
          rank: index,
        }
      })

      return {
        enabled: household.income_split_enabled,
        members,
        defaultPctA: fairPctA(members[0]?.income ?? null, members[1]?.income ?? null),
      }
    },
    enabled: Boolean(householdId),
  })
}

/** Updates a single member's income (in paise). */
export function useUpdateMemberIncome() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { householdId: string; userId: string; income: number | null }) => {
      const { error } = await supabase
        .from('household_members')
        .update({ income: input.income })
        .eq('household_id', input.householdId)
        .eq('user_id', input.userId)
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.incomeSplit(variables.householdId) })
    },
  })
}

/** Turns income-based splitting on or off for a household. */
export function useToggleIncomeSplit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { householdId: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('households')
        .update({ income_split_enabled: input.enabled })
        .eq('id', input.householdId)
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.incomeSplit(variables.householdId) })
    },
  })
}
