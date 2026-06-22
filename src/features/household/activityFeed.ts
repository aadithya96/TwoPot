import type { AuditLogEntryWithActor } from '@/types/app'

/** Friendly singular noun for each audited table. */
const ENTITY_LABELS: Record<string, string> = {
  expenses: 'expense',
  categories: 'category',
  budgets: 'budget',
  savings_goals: 'goal',
  settlements: 'settlement',
  household_members: 'member',
}

/** Past-tense verb for each recorded action. */
const ACTION_VERBS: Record<string, string> = {
  created: 'added',
  updated: 'updated',
  deleted: 'removed',
}

/** Builds a one-line description like: Added expense "Lunch". */
export function describeAuditEntry(entry: AuditLogEntryWithActor): string {
  const verb = ACTION_VERBS[entry.action] ?? entry.action
  const noun = ENTITY_LABELS[entry.entity_type] ?? entry.entity_type
  const label = entry.summary ? ` "${entry.summary}"` : ''
  const capitalised = verb.charAt(0).toUpperCase() + verb.slice(1)
  return `${capitalised} ${noun}${label}`
}

const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 60 * 60],
  ['month', 30 * 24 * 60 * 60],
  ['day', 24 * 60 * 60],
  ['hour', 60 * 60],
  ['minute', 60],
]

const relativeFormatter = new Intl.RelativeTimeFormat('en-IN', { numeric: 'auto' })

/** Formats a timestamp as a short relative label, e.g. "2h ago", falling back to "Just now". */
export function formatRelativeTime(iso: string): string {
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000
  for (const [unit, unitSeconds] of RELATIVE_UNITS) {
    const value = Math.floor(seconds / unitSeconds)
    if (value >= 1) return relativeFormatter.format(-value, unit)
  }
  return 'Just now'
}
