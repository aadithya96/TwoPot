import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/** Subscribes to Supabase Realtime changes on `expenses` for a household and invalidates its cached lists. */
export function useRealtimeExpenses(householdId: string | undefined): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!householdId) return

    const channel = supabase
      .channel(`expenses-${householdId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `household_id=eq.${householdId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['expenses', householdId] })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [householdId, queryClient])
}
