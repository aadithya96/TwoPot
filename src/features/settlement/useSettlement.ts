import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import { monthStartDate } from '@/lib/dates'
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
        period_month: monthStartDate(periodMonth),
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
        .eq('period_month', monthStartDate(periodMonth))
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
            period_month: monthStartDate(input.periodMonth),
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.balanceTrend(variables.householdId) })
    },
  })
}

/** One month's share of a multi-month settle-up. */
export interface SettleMonthInput {
  periodMonth: string
  amount: number
  owedBy: string
  owedTo: string
}

/**
 * Nets a balance-trend history into an all-months settle-up: the single
 * "who owes whom overall" figure (null when the couple is square) plus the
 * per-month outstanding entries that marking it settled should record.
 */
export function summarizeOutstanding(rows: BalanceTrendRow[]): {
  settlement: SettlementResult | null
  months: SettleMonthInput[]
} {
  const memberA = rows[0]?.member_a
  const memberB = rows[0]?.member_b
  const total = rows[rows.length - 1]?.running_balance ?? 0

  const months = rows
    .filter((row) => row.outstanding_amount !== 0)
    .map((row) => ({
      periodMonth: row.period_month.slice(0, 7),
      amount: Math.abs(row.outstanding_amount),
      owedBy: row.outstanding_amount > 0 ? row.member_b : row.member_a,
      owedTo: row.outstanding_amount > 0 ? row.member_a : row.member_b,
    }))

  const settlement =
    total !== 0 && memberA && memberB
      ? {
          owedBy: total > 0 ? memberB : memberA,
          owedTo: total > 0 ? memberA : memberB,
          amount: Math.abs(total),
        }
      : null

  return { settlement, months }
}

/**
 * Marks several months settled in one upsert — used by the "All months"
 * option of the settle-up card. Each month keeps its own amount/direction so
 * the settlement history stays per-month.
 */
export function useMarkMonthsSettled() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { householdId: string; months: SettleMonthInput[] }): Promise<void> => {
      const settledAt = new Date().toISOString()
      const { error } = await supabase.from('settlements').upsert(
        input.months.map((month) => ({
          household_id: input.householdId,
          period_month: monthStartDate(month.periodMonth),
          amount: month.amount,
          owed_by: month.owedBy,
          owed_to: month.owedTo,
          settled: true,
          settled_at: settledAt,
        })),
        { onConflict: 'household_id,period_month' }
      )
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      for (const month of variables.months) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.settlement(variables.householdId, month.periodMonth),
        })
        void queryClient.invalidateQueries({
          queryKey: queryKeys.settlementRecord(variables.householdId, month.periodMonth),
        })
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.settlementHistory(variables.householdId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.balanceTrend(variables.householdId) })
    },
  })
}

/** One month of the balance between the two household members, from `balance_trend`. */
export interface BalanceTrendRow {
  period_month: string
  member_a: string
  member_b: string
  /** That month's shared-expense flows netted out. */
  net_amount: number
  /** `net_amount` minus any settled amount recorded for the month (0 once settled). */
  outstanding_amount: number
  /** Cumulative outstanding balance up to and including the month. */
  running_balance: number
}

/**
 * Fetches the last several months of balance between the household's two
 * members via the `balance_trend` RPC, oldest first. All amounts are signed
 * from `member_a`'s (the earlier-joined member's) perspective: positive means
 * they're owed money, negative means they owe it.
 */
export function useBalanceTrend(householdId: string | undefined): UseQueryResult<BalanceTrendRow[]> {
  return useQuery({
    queryKey: queryKeys.balanceTrend(householdId ?? 'anonymous'),
    queryFn: async (): Promise<BalanceTrendRow[]> => {
      if (!householdId) return []
      const { data, error } = await supabase.rpc('balance_trend', { p_household_id: householdId })
      if (error) throw error
      // Fall back to the per-month net when migration 027 hasn't run yet, so
      // a deploy ahead of the DB migration degrades to the old behaviour
      // instead of charting undefined values.
      return (data ?? []).map((row) => ({
        ...row,
        outstanding_amount: row.outstanding_amount ?? row.net_amount,
        running_balance: row.running_balance ?? row.net_amount,
      }))
    },
    enabled: Boolean(householdId),
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
