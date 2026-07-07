import type { TaskPriority } from '@/types/app'

/** Priority choices in ascending order, with the palette colour used for chips/flags. */
export const PRIORITY_OPTIONS: ReadonlyArray<{
  value: TaskPriority
  label: string
  /** MUI theme colour key used for the chip. */
  color: 'default' | 'info' | 'warning' | 'error'
}> = [
  { value: 'low', label: 'Low', color: 'info' },
  { value: 'medium', label: 'Medium', color: 'default' },
  { value: 'high', label: 'High', color: 'error' },
]

const PRIORITY_RANK: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 }

/** Sort comparator putting higher-priority items first. */
export function byPriority(a: TaskPriority, b: TaskPriority): number {
  return PRIORITY_RANK[a] - PRIORITY_RANK[b]
}

/** Looks up the display metadata for a stored priority value, falling back to medium. */
export function priorityMeta(value: string) {
  return PRIORITY_OPTIONS.find((option) => option.value === value) ?? PRIORITY_OPTIONS[1]
}
