import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/app'

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
