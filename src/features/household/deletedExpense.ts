import type { AuditLogEntry, Expense } from '@/types/app'

/**
 * True when an audit entry records the deletion of an expense — the only kind
 * of activity that can be inspected in detail and restored.
 */
export function isDeletedExpenseEntry(entry: AuditLogEntry): boolean {
  return entry.entity_type === 'expenses' && entry.action === 'deleted'
}

/**
 * Reads the full pre-delete expense row captured in a deletion audit entry's
 * metadata (see migration 033). Returns null for non-expense-deletion entries,
 * or for expense deletions recorded before snapshots were captured — those
 * predate the feature and can be shown but not restored.
 */
export function getDeletedExpenseSnapshot(entry: AuditLogEntry): Expense | null {
  if (!isDeletedExpenseEntry(entry)) return null
  const metadata = entry.metadata
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null
  const snapshot = (metadata as Record<string, unknown>).snapshot
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return null
  const row = snapshot as Partial<Expense>
  // A usable snapshot must at least identify the row and its household so the
  // restore re-insert can target the right place.
  if (typeof row.id !== 'string' || typeof row.household_id !== 'string') return null
  return snapshot as Expense
}
