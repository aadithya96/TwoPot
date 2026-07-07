import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'

/** Subscribes to Supabase Realtime changes on `tasks` for a household, invalidating the task list on change. */
export function useRealtimeTasks(householdId: string | undefined): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!householdId) return

    const channel = supabase
      .channel(`tasks:${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `household_id=eq.${householdId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.tasks(householdId) })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [householdId, queryClient])
}
