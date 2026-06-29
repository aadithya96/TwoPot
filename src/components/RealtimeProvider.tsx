import { createContext, useEffect, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

/** Tables that broadcast realtime Postgres changes scoped to a household. */
// Movies are intentionally absent: nothing outside the Movies page reacts to
// movie changes, and that page subscribes itself via `useRealtimeMovies`. Keeping
// them out of the app-wide provider avoids two redundant channels on every page.
const REALTIME_TABLES = ['expenses', 'budgets', 'savings_goals', 'settlements', 'audit_log'] as const

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
            for (const prefix of affectedQueryPrefixes(table)) {
              void queryClient.invalidateQueries({ queryKey: [prefix, householdId] })
            }
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

/**
 * Maps a Postgres table name to the React Query key prefixes whose cached data
 * derives from it. A single change can affect multiple caches: expenses feed the
 * settlement computation and the balance trend, so editing an expense must
 * invalidate those as well, not just the expense list.
 */
function affectedQueryPrefixes(table: (typeof REALTIME_TABLES)[number]): readonly string[] {
  switch (table) {
    case 'expenses':
      return ['expenses', 'settlement', 'balanceTrend']
    case 'budgets':
      return ['budgetUsage']
    case 'savings_goals':
      return ['goals']
    case 'settlements':
      return ['settlement', 'balanceTrend']
    case 'audit_log':
      return ['auditLog']
  }
}
