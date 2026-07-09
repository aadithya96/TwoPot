import { describe, expect, it } from 'vitest'
import { getDeletedExpenseSnapshot, isDeletedExpenseEntry } from './deletedExpense'
import type { AuditLogEntry, Expense } from '@/types/app'

function entry(overrides: Partial<AuditLogEntry>): AuditLogEntry {
  return {
    id: 'audit-1',
    household_id: 'hh-1',
    actor_id: 'user-1',
    action: 'deleted',
    entity_type: 'expenses',
    entity_id: 'exp-1',
    summary: 'Groceries',
    metadata: {},
    created_at: '2026-07-09T00:00:00Z',
    ...overrides,
  }
}

const snapshot: Expense = {
  id: 'exp-1',
  household_id: 'hh-1',
  category_id: 'cat-1',
  paid_by: 'user-1',
  owner: 'shared',
  personal_user_id: null,
  amount: 500_00,
  description: 'Groceries',
  notes: null,
  date: '2026-07-01',
  split_type: 'equal',
  split_pct_a: null,
  is_recurring: false,
  recurrence_rule: null,
  receipt_url: null,
  goal_id: null,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
}

describe('isDeletedExpenseEntry', () => {
  it('is true only for expense deletions', () => {
    expect(isDeletedExpenseEntry(entry({}))).toBe(true)
    expect(isDeletedExpenseEntry(entry({ action: 'created' }))).toBe(false)
    expect(isDeletedExpenseEntry(entry({ entity_type: 'budgets' }))).toBe(false)
  })
})

describe('getDeletedExpenseSnapshot', () => {
  it('returns the captured snapshot for a deletion entry', () => {
    const result = getDeletedExpenseSnapshot(entry({ metadata: { amount: 500_00, snapshot } }))
    expect(result).toEqual(snapshot)
  })

  it('returns null when no snapshot was captured (older deletions)', () => {
    expect(getDeletedExpenseSnapshot(entry({ metadata: { amount: 500_00 } }))).toBeNull()
  })

  it('returns null for non-deletion or non-expense entries', () => {
    expect(getDeletedExpenseSnapshot(entry({ action: 'created', metadata: { snapshot } }))).toBeNull()
    expect(getDeletedExpenseSnapshot(entry({ entity_type: 'budgets', metadata: { snapshot } }))).toBeNull()
  })

  it('returns null when the snapshot is malformed', () => {
    expect(getDeletedExpenseSnapshot(entry({ metadata: { snapshot: { id: 'exp-1' } } }))).toBeNull()
    expect(getDeletedExpenseSnapshot(entry({ metadata: { snapshot: 'nope' } }))).toBeNull()
  })
})
