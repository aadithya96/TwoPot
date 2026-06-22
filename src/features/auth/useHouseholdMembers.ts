import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import type { Profile } from '@/types/app'
import { useSession } from './useAuth'

/** A household member: their profile plus membership metadata (role, join date). */
export interface HouseholdMemberWithProfile {
  profile: Profile
  role: string
  joined_at: string
}

/**
 * Fetches the members of a household together with each member's role and the
 * date they joined, ordered by join date (earliest first). Powers the
 * "Members" section in settings.
 */
export function useHouseholdMembers(
  householdId: string | undefined
): UseQueryResult<HouseholdMemberWithProfile[]> {
  return useQuery({
    queryKey: ['householdMembers', householdId ?? 'anonymous'],
    queryFn: async (): Promise<HouseholdMemberWithProfile[]> => {
      if (!householdId) return []
      const { data, error } = await supabase
        .from('household_members')
        .select('role, joined_at, profiles(*)')
        .eq('household_id', householdId)
        .order('joined_at', { ascending: true })
      if (error) throw error

      return (data ?? [])
        .map((row) => {
          const profile = row.profiles as unknown as Profile | null
          if (!profile) return null
          return { profile, role: row.role, joined_at: row.joined_at }
        })
        .filter((member): member is HouseholdMemberWithProfile => member != null)
    },
    enabled: Boolean(householdId),
  })
}

/** Arguments for removing a member from a household. */
export interface RemoveMemberArgs {
  householdId: string
  /** The user_id of the member to remove. */
  memberId: string
  /** When true, the member's expenses are kept; when false, they are deleted. */
  keepExpenses: boolean
}

/**
 * Removes a member from a household (owner-only). Optionally keeps or deletes
 * the removed member's expenses, then refreshes the household, members, and any
 * data that depends on the removed expenses.
 */
export function useRemoveMember() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const userId = session?.user.id

  return useMutation({
    mutationFn: async ({ householdId, memberId, keepExpenses }: RemoveMemberArgs) => {
      const { error } = await supabase.rpc('remove_member', {
        p_household_id: householdId,
        p_member_id: memberId,
        p_keep_expenses: keepExpenses,
      })
      if (error) throw error
    },
    onSuccess: (_data, { householdId }) => {
      void queryClient.invalidateQueries({ queryKey: ['householdMembers', householdId] })
      void queryClient.invalidateQueries({ queryKey: queryKeys.household(userId ?? 'anonymous') })
      // Removing expenses (and the member) invalidates anything derived from them.
      void queryClient.invalidateQueries({ queryKey: ['expenses'] })
      void queryClient.invalidateQueries({ queryKey: ['settlement'] })
      void queryClient.invalidateQueries({ queryKey: ['settlementHistory', householdId] })
      void queryClient.invalidateQueries({ queryKey: queryKeys.budgetUsage(householdId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.auditLog(householdId) })
    },
  })
}
