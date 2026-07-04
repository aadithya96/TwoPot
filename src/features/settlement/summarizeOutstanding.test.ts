import { describe, expect, it, vi } from 'vitest'

// Pure-function tests; stub the Supabase client so importing the module under
// test doesn't construct a real client (which needs env vars).
vi.mock('@/lib/supabase', () => ({ supabase: {} }))

import { summarizeOutstanding, type BalanceTrendRow } from './useSettlement'

function row(overrides: Partial<BalanceTrendRow> & Pick<BalanceTrendRow, 'period_month'>): BalanceTrendRow {
  return {
    member_a: 'a',
    member_b: 'b',
    net_amount: 0,
    outstanding_amount: 0,
    running_balance: 0,
    ...overrides,
  }
}

describe('summarizeOutstanding', () => {
  it('returns no settlement when there is no history', () => {
    expect(summarizeOutstanding([])).toEqual({ settlement: null, months: [] })
  })

  it('returns no settlement when every month is settled', () => {
    const result = summarizeOutstanding([
      row({ period_month: '2026-05-01', net_amount: 10_000_00, running_balance: 0 }),
      row({ period_month: '2026-06-01', net_amount: -4_000_00, running_balance: 0 }),
    ])
    expect(result.settlement).toBeNull()
    expect(result.months).toEqual([])
  })

  it('nets multiple outstanding months into one settlement owed to member_a', () => {
    const result = summarizeOutstanding([
      row({ period_month: '2026-05-01', outstanding_amount: 10_000_00, running_balance: 10_000_00 }),
      row({ period_month: '2026-06-01', outstanding_amount: -4_000_00, running_balance: 6_000_00 }),
    ])
    expect(result.settlement).toEqual({ owedBy: 'b', owedTo: 'a', amount: 6_000_00 })
    expect(result.months).toEqual([
      { periodMonth: '2026-05', amount: 10_000_00, owedBy: 'b', owedTo: 'a' },
      { periodMonth: '2026-06', amount: 4_000_00, owedBy: 'a', owedTo: 'b' },
    ])
  })

  it('flips the direction when member_a owes overall', () => {
    const result = summarizeOutstanding([
      row({ period_month: '2026-06-01', outstanding_amount: -2_500_00, running_balance: -2_500_00 }),
    ])
    expect(result.settlement).toEqual({ owedBy: 'a', owedTo: 'b', amount: 2_500_00 })
  })

  it('skips settled months but keeps them in the running balance', () => {
    const result = summarizeOutstanding([
      // Settled month: net flow existed but nothing outstanding.
      row({ period_month: '2026-05-01', net_amount: 8_000_00, outstanding_amount: 0, running_balance: 0 }),
      row({ period_month: '2026-06-01', outstanding_amount: 3_000_00, running_balance: 3_000_00 }),
    ])
    expect(result.settlement).toEqual({ owedBy: 'b', owedTo: 'a', amount: 3_000_00 })
    expect(result.months).toEqual([{ periodMonth: '2026-06', amount: 3_000_00, owedBy: 'b', owedTo: 'a' }])
  })
})
