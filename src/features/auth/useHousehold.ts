import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import type { Household, Profile } from '@/types/app'
import { useHouseholdStore } from '@/stores/householdStore'
import { useSession } from './useAuth'

/** A household together with the profiles of its (up to two) members. */
export interface HouseholdWithMembers {
  household: Household
  members: Profile[]
}

/**
 * Looks up the household the current user belongs to (via `household_members`),
 * including both members' profiles, and syncs the result into `useHouseholdStore`.
 */
export function useHousehold(): UseQueryResult<HouseholdWithMembers | null> {
  const { data: session } = useSession()
  const userId = session?.user.id
  const setHousehold = useHouseholdStore((state) => state.setHousehold)
  const clearHousehold = useHouseholdStore((state) => state.clear)

  const query = useQuery({
    queryKey: queryKeys.household(userId ?? 'anonymous'),
    queryFn: async (): Promise<HouseholdWithMembers | null> => {
      if (!userId) return null

      const { data: membership, error: membershipError } = await supabase
        .from('household_members')
        .select('household_id, households(*)')
        .eq('user_id', userId)
        .maybeSingle()
      if (membershipError) throw membershipError
      if (!membership) return null

      const household = membership.households as unknown as Household

      const { data: memberRows, error: membersError } = await supabase
        .from('household_members')
        .select('user_id, profiles(*)')
        .eq('household_id', membership.household_id)
      if (membersError) throw membersError

      const members = (memberRows ?? [])
        .map((row) => row.profiles as unknown as Profile)
        .filter((profile): profile is Profile => profile != null)

      return { household, members }
    },
    enabled: Boolean(userId),
  })

  useEffect(() => {
    if (query.data) {
      setHousehold(query.data.household.id, query.data.members)
    } else if (query.data === null && query.isFetched) {
      clearHousehold()
    }
  }, [query.data, query.isFetched, setHousehold, clearHousehold])

  return query
}

/**
 * Creates a new household for the current user: inserts the household row,
 * adds the user as 'owner' member, seeds default categories, and generates
 * a 48h invite code for the partner.
 */
export function useCreateHousehold() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const userId = session?.user.id

  return useMutation({
    mutationFn: async (name: string): Promise<{ household: Household; inviteCode: string }> => {
      if (!userId) throw new Error('Not signed in')

      // Create the household and the creator's owner-membership atomically via
      // a security-definer RPC. Doing the two inserts client-side would fail:
      // the household read-back is filtered by an RLS policy that requires a
      // membership row which doesn't exist yet at insert time.
      const { data: household, error: householdError } = await supabase
        .rpc('create_household', { name })
        .single<Household>()
      if (householdError) throw householdError

      const { error: seedError } = await supabase.rpc('seed_default_categories', {
        hid: household.id,
      })
      if (seedError) throw seedError

      const { data: inviteCode, error: inviteError } = await supabase.rpc('generate_invite', {
        household_id: household.id,
      })
      if (inviteError) throw inviteError

      return { household, inviteCode: inviteCode ?? '' }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.household(userId ?? 'anonymous') })
    },
  })
}

/** Joins an existing household using a partner's 6-digit invite code. */
export function useJoinHousehold() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const userId = session?.user.id

  return useMutation({
    mutationFn: async (code: string): Promise<string> => {
      const { data, error } = await supabase.rpc('accept_invite', { code })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.household(userId ?? 'anonymous') })
    },
  })
}

/**
 * Removes the current user from their household so they can create or join a
 * different one. If they were the last member the household is deleted; if they
 * were the owner of a shared household, ownership passes to the remaining
 * member. Clears the cached household so the app routes back to onboarding.
 */
export function useLeaveHousehold() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const clearHousehold = useHouseholdStore((state) => state.clear)
  const userId = session?.user.id

  return useMutation({
    mutationFn: async (householdId: string): Promise<void> => {
      const { error } = await supabase.rpc('leave_household', { p_household_id: householdId })
      if (error) throw error
    },
    onSuccess: (_data, householdId) => {
      clearHousehold()
      void queryClient.invalidateQueries({ queryKey: queryKeys.household(userId ?? 'anonymous') })
      void queryClient.invalidateQueries({ queryKey: ['householdMembers', householdId] })
    },
  })
}

/** Generates (or regenerates) a 48h invite code for the current household. */
export function useGenerateInvite() {
  return useMutation({
    mutationFn: async (householdId: string): Promise<string> => {
      const { data, error } = await supabase.rpc('generate_invite', { household_id: householdId })
      if (error) throw error
      return data
    },
  })
}
