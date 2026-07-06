import { createContext, useEffect, useState, type ReactNode } from 'react'
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
  // Bumped whenever the app returns to the foreground. Including it in the
  // subscription effect's deps tears down and rebuilds the realtime channels
  // on a fresh socket — see `handleForeground` below.
  const [foregroundTick, setForegroundTick] = useState(0)

  // Mobile browsers (iOS Safari especially) suspend the realtime WebSocket
  // while a PWA is backgrounded and do NOT replay changes missed during the
  // suspension, so an expense a partner adds while the app is away never
  // arrives — the list looks stale until the user force-quits and reopens.
  // On every return to the foreground we (1) refetch active queries so the UI
  // catches up immediately and (2) rebuild the realtime channels so future
  // live updates resume on a healthy socket. A short throttle collapses the
  // burst of visibilitychange/pageshow/focus events a single resume can fire.
  useEffect(() => {
    let lastRun = 0

    const handleForeground = (): void => {
      if (document.visibilityState !== 'visible') return
      const now = Date.now()
      if (now - lastRun < 1000) return
      lastRun = now
      void queryClient.invalidateQueries()
      setForegroundTick((tick) => tick + 1)
    }

    document.addEventListener('visibilitychange', handleForeground)
    window.addEventListener('pageshow', handleForeground)
    window.addEventListener('focus', handleForeground)

    return () => {
      document.removeEventListener('visibilitychange', handleForeground)
      window.removeEventListener('pageshow', handleForeground)
      window.removeEventListener('focus', handleForeground)
    }
  }, [queryClient])

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
  }, [householdId, queryClient, foregroundTick])

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
