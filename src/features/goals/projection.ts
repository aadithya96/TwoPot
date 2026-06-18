import type { GoalContribution } from '@/types/app'

const MS_PER_DAY = 1000 * 60 * 60 * 24

/**
 * Computes a simple average contribution rate (paise per day) from contribution history, taken as
 * total contributed amount divided by the number of days since the earliest contribution. This is a
 * rough heuristic — it does not account for irregular contribution patterns or recent trend changes.
 */
export function computeAverageDailyRate(contributions: GoalContribution[]): number {
  if (contributions.length === 0) return 0

  const timestamps = contributions.map((c) => new Date(c.created_at).getTime())
  const earliest = Math.min(...timestamps)
  const daysElapsed = Math.max((Date.now() - earliest) / MS_PER_DAY, 1)
  const total = contributions.reduce((sum, c) => sum + c.amount, 0)

  return total / daysElapsed
}

export interface ProjectionInput {
  currentAmount: number
  targetAmount: number
  averageDailyRate: number
}

/**
 * Estimates a "projected completion" date label by linearly extrapolating the remaining amount at
 * the average daily contribution rate. Returns null when already complete or when the rate is zero
 * (no history to extrapolate from). This is a simple heuristic, not a statistical forecast.
 */
export function estimateProjectedCompletion({
  currentAmount,
  targetAmount,
  averageDailyRate,
}: ProjectionInput): string | null {
  const remaining = targetAmount - currentAmount
  if (remaining <= 0) return null
  if (averageDailyRate <= 0) return null

  const daysRemaining = Math.ceil(remaining / averageDailyRate)
  const completionDate = new Date(Date.now() + daysRemaining * MS_PER_DAY)

  return completionDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric', day: 'numeric' })
}
