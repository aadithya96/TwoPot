import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import type { Profile } from '@/types/app'
import { useHouseholdStore } from '@/stores/householdStore'

/**
 * Fetches the current Supabase auth session and keeps it fresh by subscribing
 * to `supabase.auth.onAuthStateChange`, invalidating the session query on change.
 */
export function useSession(): UseQueryResult<Session | null> {
  const queryClient = useQueryClient()

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.session })
    })
    return () => subscription.subscription.unsubscribe()
  }, [queryClient])

  return useQuery({
    queryKey: queryKeys.session,
    queryFn: async () => {
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      return data.session
    },
  })
}

/** Fetches the `profiles` row for the currently signed-in user, if any. */
export function useCurrentUser(): UseQueryResult<Profile | null> {
  const { data: session } = useSession()
  const userId = session?.user.id

  return useQuery({
    queryKey: queryKeys.profile(userId ?? 'anonymous'),
    queryFn: async () => {
      if (!userId) return null
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: Boolean(userId),
  })
}

/** Updates the current user's UPI VPA (e.g. "name@bank"), used for one-tap settle-up links. */
export function useUpdateUpiVpa() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, upiVpa }: { userId: string; upiVpa: string | null }) => {
      const { error } = await supabase.from('profiles').update({ upi_vpa: upiVpa }).eq('id', userId)
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile(variables.userId) })
    },
  })
}

/** Starts the Google OAuth sign-in flow, redirecting back to `VITE_APP_URL`. */
export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: import.meta.env.VITE_APP_URL },
  })
  if (error) throw error
}

/** Signs the current user out of Supabase and clears the persisted household store. */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
  useHouseholdStore.getState().clear()
}
