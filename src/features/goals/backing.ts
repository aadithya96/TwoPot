/** How a savings goal is backed in the real world. */
export type GoalBackingType = 'manual' | 'bank_account' | 'mutual_fund'

/** Number of decimal places mutual fund units are tracked at (matches the DB column). */
export const MF_UNITS_DECIMALS = 4

/**
 * Market value (in paise) of a mutual fund holding: units x NAV (rupees).
 * Mirrors the `round(units * nav * 100)` restatement done in SQL so client
 * previews agree with what the DB will store.
 */
export function computeMfMarketValue(units: number, nav: number): number {
  return Math.round(units * nav * 100)
}

/**
 * Units a contribution of `amountPaise` buys at the given NAV (rupees),
 * truncated to {@link MF_UNITS_DECIMALS} decimals. Returns 0 when the NAV is
 * unknown/invalid so callers can fall back to "no units recorded".
 */
export function estimateUnitsForAmount(amountPaise: number, nav: number): number {
  if (!Number.isFinite(nav) || nav <= 0) return 0
  const factor = 10 ** MF_UNITS_DECIMALS
  return Math.floor((amountPaise / 100 / nav) * factor) / factor
}

/**
 * Loose validity check for a UPI VPA ("handle@bank"). NPCI allows letters,
 * digits, dot, hyphen and underscore in the handle; the suffix is the PSP's
 * alphabetic identifier.
 */
export function isValidUpiVpa(vpa: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]*@[a-zA-Z]{2,}$/.test(vpa.trim())
}
