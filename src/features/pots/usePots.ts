import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import { fairPctA } from '@/features/splitting/useIncomeSplit'
import type { Database } from '@/types/db'

/** How the shared-pot target is funded by each partner. */
export type PotAllocationRule = 'equal' | 'proportional' | 'custom'

/** A household member as it factors into the two-pots model. */
export interface PotMember {
  userId: string
  displayName: string
  avatarUrl: string | null
  /** Monthly income in paise, or null if not set. */
  income: number | null
  /** Explicit shared-pot contribution in paise (used by the 'custom' rule). */
  contribution: number | null
  /** 0 for the first-joined member ("member A"), 1 for the partner. */
  rank: number
}

/** Persisted two-pots configuration for a household. */
export interface PotConfig {
  /** Whether the two-pots model is turned on for the household. */
  enabled: boolean
  rule: PotAllocationRule
  /** Monthly shared-pot target in paise (used by 'equal'/'proportional'). */
  sharedPotTarget: number | null
  /** Members ordered by join date. */
  members: PotMember[]
}

/** A member's resolved allocation: what they fund and what stays personal. */
export interface PotMemberAllocation {
  userId: string
  displayName: string
  avatarUrl: string | null
  income: number | null
  /** Amount this member puts into the shared pot this month (paise). */
  contribution: number
  /** Income minus contribution (paise); null when income isn't set. */
  personalPot: number | null
}

/** The shared pot plus each partner's personal pot, derived from a {@link PotConfig}. */
export interface PotAllocation {
  rule: PotAllocationRule
  /** Total funded into the shared pot — the sum of both contributions (paise). */
  sharedPot: number
  members: PotMemberAllocation[]
}

/**
 * Resolves how much each partner contributes to the shared pot, and what is left
 * in their personal pot, from the household's allocation rule and incomes.
 *
 * - `equal`: each funds half the target.
 * - `proportional`: each funds the target in proportion to their income; falls
 *   back to an equal split when incomes aren't both set.
 * - `custom`: each partner's explicit contribution is used as-is.
 *
 * Contributions are kept as whole paise that sum exactly to the funded pot.
 */
export function computeAllocation(
  rule: PotAllocationRule,
  sharedPotTarget: number | null,
  members: PotMember[]
): PotAllocation {
  const ordered = [...members].sort((a, b) => a.rank - b.rank)
  const [memberA, memberB] = ordered

  const contributions = new Map<string, number>()

  if (memberA && memberB) {
    if (rule === 'custom') {
      contributions.set(memberA.userId, Math.max(0, Math.round(memberA.contribution ?? 0)))
      contributions.set(memberB.userId, Math.max(0, Math.round(memberB.contribution ?? 0)))
    } else {
      const target = Math.max(0, Math.round(sharedPotTarget ?? 0))
      const pctA = rule === 'proportional' ? fairPctA(memberA.income, memberB.income) : null
      const contributionA =
        pctA != null ? Math.round((target * pctA) / 100) : Math.floor(target / 2)
      contributions.set(memberA.userId, contributionA)
      contributions.set(memberB.userId, target - contributionA)
    }
  }

  const allocatedMembers: PotMemberAllocation[] = ordered.map((member) => {
    const contribution = contributions.get(member.userId) ?? 0
    return {
      userId: member.userId,
      displayName: member.displayName,
      avatarUrl: member.avatarUrl,
      income: member.income,
      contribution,
      personalPot: member.income == null ? null : member.income - contribution,
    }
  })

  const sharedPot = allocatedMembers.reduce((sum, member) => sum + member.contribution, 0)

  return { rule, sharedPot, members: allocatedMembers }
}

/** Current-month spend split into shared and per-member personal totals. */
export interface SpendingBreakdown {
  /** Total of expenses owned by the household ('shared'). */
  sharedSpent: number
  /** Personal-expense totals keyed by the member they belong to. */
  personalSpentByUser: Map<string, number>
}

/**
 * Sums a list of expenses into the shared pot and each partner's personal pot.
 * Personal expenses are attributed to `personal_user_id`, falling back to the
 * payer when it isn't set.
 */
export function summarizeSpending(
  expenses: ReadonlyArray<{
    owner: 'shared' | 'personal'
    personal_user_id: string | null
    paid_by: string
    amount: number
  }>
): SpendingBreakdown {
  let sharedSpent = 0
  const personalSpentByUser = new Map<string, number>()
  for (const expense of expenses) {
    if (expense.owner === 'shared') {
      sharedSpent += expense.amount
    } else {
      const userId = expense.personal_user_id ?? expense.paid_by
      personalSpentByUser.set(userId, (personalSpentByUser.get(userId) ?? 0) + expense.amount)
    }
  }
  return { sharedSpent, personalSpentByUser }
}

/** Fetches the two-pots configuration and per-member incomes/contributions. */
export function usePotConfig(householdId: string | undefined): UseQueryResult<PotConfig> {
  return useQuery({
    queryKey: queryKeys.potConfig(householdId ?? 'anonymous'),
    queryFn: async (): Promise<PotConfig> => {
      if (!householdId) {
        return { enabled: false, rule: 'proportional', sharedPotTarget: null, members: [] }
      }

      const { data: household, error: householdError } = await supabase
        .from('households')
        .select('pot_enabled, pot_allocation_rule, shared_pot_target')
        .eq('id', householdId)
        .single()
      if (householdError) throw householdError

      const { data: rows, error: membersError } = await supabase
        .from('household_members')
        .select('user_id, income, pot_contribution, joined_at, profiles(display_name, avatar_url)')
        .eq('household_id', householdId)
        .order('joined_at', { ascending: true })
      if (membersError) throw membersError

      const members: PotMember[] = (rows ?? []).map((row, index) => {
        const profile = row.profiles as unknown as {
          display_name: string
          avatar_url: string | null
        } | null
        return {
          userId: row.user_id,
          displayName: profile?.display_name ?? 'Member',
          avatarUrl: profile?.avatar_url ?? null,
          income: row.income,
          contribution: row.pot_contribution,
          rank: index,
        }
      })

      return {
        enabled: household.pot_enabled,
        rule: household.pot_allocation_rule,
        sharedPotTarget: household.shared_pot_target,
        members,
      }
    },
    enabled: Boolean(householdId),
  })
}

/** Updates the household-level two-pots settings (enabled, rule, target). */
export function useUpdatePotConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      householdId: string
      enabled?: boolean
      rule?: PotAllocationRule
      sharedPotTarget?: number | null
    }) => {
      const patch: Database['public']['Tables']['households']['Update'] = {}
      if (input.enabled !== undefined) patch.pot_enabled = input.enabled
      if (input.rule !== undefined) patch.pot_allocation_rule = input.rule
      if (input.sharedPotTarget !== undefined) patch.shared_pot_target = input.sharedPotTarget
      const { error } = await supabase.from('households').update(patch).eq('id', input.householdId)
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.potConfig(variables.householdId) })
    },
  })
}

/** Updates a single member's explicit shared-pot contribution (in paise). */
export function useUpdateMemberContribution() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      householdId: string
      userId: string
      contribution: number | null
    }) => {
      const { error } = await supabase
        .from('household_members')
        .update({ pot_contribution: input.contribution })
        .eq('household_id', input.householdId)
        .eq('user_id', input.userId)
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.potConfig(variables.householdId) })
    },
  })
}
