import { describe, expect, it, vi } from 'vitest'

// These are pure-function tests; stub the Supabase client so importing the
// module under test doesn't construct a real client (which needs env vars).
vi.mock('@/lib/supabase', () => ({ supabase: {} }))

import { computeAllocation, summarizeSpending, type PotMember } from './usePots'

function member(overrides: Partial<PotMember> & Pick<PotMember, 'userId' | 'rank'>): PotMember {
  return {
    displayName: overrides.userId,
    avatarUrl: null,
    income: null,
    contribution: null,
    ...overrides,
  }
}

const a = member({ userId: 'a', rank: 0, income: 60_000_00 })
const b = member({ userId: 'b', rank: 1, income: 40_000_00 })

describe('computeAllocation', () => {
  it('splits the target equally under the equal rule', () => {
    const result = computeAllocation('equal', 10_000_00, [a, b])
    expect(result.sharedPot).toBe(10_000_00)
    expect(result.members.map((m) => m.contribution)).toEqual([5_000_00, 5_000_00])
  })

  it('splits the target by income under the proportional rule', () => {
    const result = computeAllocation('proportional', 10_000_00, [a, b])
    // 60/40 income ratio -> 60% / 40% of the target.
    expect(result.members.find((m) => m.userId === 'a')?.contribution).toBe(6_000_00)
    expect(result.members.find((m) => m.userId === 'b')?.contribution).toBe(4_000_00)
    expect(result.sharedPot).toBe(10_000_00)
  })

  it('falls back to an equal split when incomes are missing (proportional)', () => {
    const result = computeAllocation('proportional', 10_000_00, [
      member({ userId: 'a', rank: 0 }),
      member({ userId: 'b', rank: 1, income: 40_000_00 }),
    ])
    expect(result.members.map((m) => m.contribution)).toEqual([5_000_00, 5_000_00])
  })

  it('uses explicit contributions under the custom rule', () => {
    const result = computeAllocation('custom', null, [
      member({ userId: 'a', rank: 0, income: 60_000_00, contribution: 8_000_00 }),
      member({ userId: 'b', rank: 1, income: 40_000_00, contribution: 2_000_00 }),
    ])
    expect(result.sharedPot).toBe(10_000_00)
    expect(result.members.map((m) => m.contribution)).toEqual([8_000_00, 2_000_00])
  })

  it('derives each personal pot as income minus contribution', () => {
    const result = computeAllocation('equal', 10_000_00, [a, b])
    expect(result.members.find((m) => m.userId === 'a')?.personalPot).toBe(55_000_00)
    expect(result.members.find((m) => m.userId === 'b')?.personalPot).toBe(35_000_00)
  })

  it('leaves the personal pot null when income is unknown', () => {
    const result = computeAllocation('equal', 10_000_00, [
      member({ userId: 'a', rank: 0 }),
      member({ userId: 'b', rank: 1, income: 40_000_00 }),
    ])
    expect(result.members.find((m) => m.userId === 'a')?.personalPot).toBeNull()
  })

  it('keeps contributions summing exactly to an odd target', () => {
    const result = computeAllocation('equal', 1_001, [a, b])
    expect(result.members[0].contribution + result.members[1].contribution).toBe(1_001)
  })
})

describe('summarizeSpending', () => {
  it('separates shared spend from each member’s personal spend', () => {
    const result = summarizeSpending([
      { owner: 'shared', personal_user_id: null, paid_by: 'a', amount: 1_000 },
      { owner: 'shared', personal_user_id: null, paid_by: 'b', amount: 2_000 },
      { owner: 'personal', personal_user_id: 'a', paid_by: 'a', amount: 500 },
      { owner: 'personal', personal_user_id: 'b', paid_by: 'a', amount: 700 },
    ])
    expect(result.sharedSpent).toBe(3_000)
    expect(result.personalSpentByUser.get('a')).toBe(500)
    expect(result.personalSpentByUser.get('b')).toBe(700)
  })

  it('attributes a personal expense to the payer when personal_user_id is null', () => {
    const result = summarizeSpending([
      { owner: 'personal', personal_user_id: null, paid_by: 'a', amount: 900 },
    ])
    expect(result.personalSpentByUser.get('a')).toBe(900)
  })
})
