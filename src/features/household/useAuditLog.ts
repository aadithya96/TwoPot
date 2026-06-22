import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import type { AuditLogEntryWithActor } from '@/types/app'

/** How many recent audit entries to load. */
const AUDIT_LOG_LIMIT = 100

/**
 * Fetches the household's recent activity / audit entries (newest first),
 * joined with the acting member's profile.
 */
export function useAuditLog(
  householdId: string | undefined
): UseQueryResult<AuditLogEntryWithActor[]> {
  return useQuery({
    queryKey: queryKeys.auditLog(householdId ?? 'anonymous'),
    queryFn: async (): Promise<AuditLogEntryWithActor[]> => {
      if (!householdId) return []
      const { data, error } = await supabase
        .from('audit_log')
        .select('*, actor:profiles!actor_id(id, display_name, avatar_url)')
        .eq('household_id', householdId)
        .order('created_at', { ascending: false })
        .limit(AUDIT_LOG_LIMIT)
      if (error) throw error
      return data as unknown as AuditLogEntryWithActor[]
    },
    enabled: Boolean(householdId),
  })
}
