import { createContext, useEffect, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

/** Tables that broadcast realtime Postgres changes scoped to a household. */
const REALTIME_TABLES = ['expenses', 'budgets', 'savings_goals', 'settlements'] as const

const RealtimeContext = createContext<null>(null)

/** Props for {@link RealtimeProvider}. */
export interface RealtimeProviderProps {
  householdId: string | null | undefined
  children: ReactNode
}

/**
 * Mounts Supabase Realtime subscriptions for the active household's expenses, budgets,
 * goals, and settlements, invalidating the corresponding React Query caches on any change.
 * Renders children unconditionally; subscribes to nothing if `householdId` is falsy.
 */
export function RealtimeProvider({ householdId, children }: RealtimeProviderProps) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!householdId) return

    const channels: RealtimeChannel[] = REALTIME_TABLES.map((table) => {
      const channel = supabase
        .channel(`realtime:${table}:${householdId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table, filter: `household_id=eq.${householdId}` },
          () => {
            void queryClient.invalidateQueries({ queryKey: [queryKeyPrefix(table), householdId] })
          }
        )
        .subscribe((status, error) => {
          if (status === 'SUBSCRIBED') {
            console.info(`[realtime] connected to ${table}`)
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn(`[realtime] reconnect attempt for ${table}`, error)
          } else if (status === 'CLOSED') {
            console.info(`[realtime] disconnected from ${table}`)
          }
        })

      return channel
    })

    return () => {
      channels.forEach((channel) => {
        void supabase.removeChannel(channel)
      })
    }
  }, [householdId, queryClient])

  return <RealtimeContext.Provider value={null}>{children}</RealtimeContext.Provider>
}

/** Maps a Postgres table name to the React Query key prefix used for its cached data. */
function queryKeyPrefix(table: (typeof REALTIME_TABLES)[number]): string {
  switch (table) {
    case 'expenses':
      return 'expenses'
    case 'budgets':
      return 'budgetUsage'
    case 'savings_goals':
      return 'goals'
    case 'settlements':
      return 'settlement'
  }
}
