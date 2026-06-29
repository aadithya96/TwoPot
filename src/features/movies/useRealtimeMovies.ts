import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'

/**
 * Subscribes to Supabase Realtime changes on `movies` and `movie_ratings` for a
 * household, invalidating the watchlist query so the other partner's adds,
 * status changes, and ratings appear live. Both tables carry household_id, so a
 * single household-scoped filter works for each.
 */
export function useRealtimeMovies(householdId: string | undefined): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!householdId) return

    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.movies(householdId) })
    }

    const channel = supabase
      .channel(`movies:${householdId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'movies', filter: `household_id=eq.${householdId}` },
        invalidate
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'movie_ratings', filter: `household_id=eq.${householdId}` },
        invalidate
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [householdId, queryClient])
}
