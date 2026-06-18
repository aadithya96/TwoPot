import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import type { Settlement } from '@/types/app'

/** Net settlement owed between household members for a given period, as returned by `compute_settlement`. */
export interface SettlementResult {
  owedBy: string
  owedTo: string
  amount: number
}

/** Computes the net amount owed between household members for a given month via the `compute_settlement` RPC. */
export function useSettlement(
  householdId: string | undefined,
  periodMonth: string
): UseQueryResult<SettlementResult | null> {
  return useQuery({
    queryKey: queryKeys.settlement(householdId ?? 'anonymous', periodMonth),
    queryFn: async (): Promise<SettlementResult | null> => {
      if (!householdId) return null
      const { data, error } = await supabase.rpc('compute_settlement', {
        household_id: householdId,
        period_month: periodMonth,
      })
      if (error) throw error
      const row = data?.[0]
      if (!row) return null
      return { owedBy: row.owed_by, owedTo: row.owed_to, amount: row.amount }
    },
    enabled: Boolean(householdId),
  })
}

/** Looks up whether a household/month's settlement has already been marked settled. */
export function useIsSettled(
  householdId: string | undefined,
  periodMonth: string
): UseQueryResult<boolean> {
  return useQuery({
    queryKey: queryKeys.settlementRecord(householdId ?? 'anonymous', periodMonth),
    queryFn: async (): Promise<boolean> => {
      if (!householdId) return false
      const { data, error } = await supabase
        .from('settlements')
        .select('settled')
        .eq('household_id', householdId)
        .eq('period_month', periodMonth)
        .maybeSingle()
      if (error) throw error
      return data?.settled ?? false
    },
    enabled: Boolean(householdId),
  })
}

/** Input for marking a period's settlement as settled. */
export interface MarkSettledInput {
  householdId: string
  periodMonth: string
  amount: number
  owedBy: string
  owedTo: string
}

/** Upserts a `settlements` row marking a period as settled, invalidating settlement and history queries. */
export function useMarkSettled() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: MarkSettledInput): Promise<Settlement> => {
      const { data, error } = await supabase
        .from('settlements')
        .upsert(
          {
            household_id: input.householdId,
            period_month: input.periodMonth,
            amount: input.amount,
            owed_by: input.owedBy,
            owed_to: input.owedTo,
            settled: true,
            settled_at: new Date().toISOString(),
          },
          { onConflict: 'household_id,period_month' }
        )
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.settlement(variables.householdId, variables.periodMonth),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.settlementRecord(variables.householdId, variables.periodMonth),
      })
      void queryClient.invalidateQueries({ queryKey: queryKeys.settlementHistory(variables.householdId) })
    },
  })
}

/** Fetches past settlements for a household, most recent period first. */
export function useSettlementHistory(householdId: string | undefined): UseQueryResult<Settlement[]> {
  return useQuery({
    queryKey: queryKeys.settlementHistory(householdId ?? 'anonymous'),
    queryFn: async (): Promise<Settlement[]> => {
      if (!householdId) return []
      const { data, error } = await supabase
        .from('settlements')
        .select('*')
        .eq('household_id', householdId)
        .order('period_month', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: Boolean(householdId),
  })
}
