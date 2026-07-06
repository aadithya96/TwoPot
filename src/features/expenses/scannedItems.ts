/** A line item parsed from a scanned image, with a user-toggleable include flag. */
export interface ScannedItem {
  name: string
  /** Line total in rupees (0 when the price wasn't detected). */
  priceRupees: number
  /** Whether this item counts toward the amount and description. */
  included: boolean
}

/**
 * Computes the expense amount (in integer paise) from scanned line items.
 *
 * When the scan produced a grand total (`totalRupees`), we start from it and
 * subtract only the excluded items' prices — so delivery fees, taxes and
 * discounts baked into the total stay in the amount even as items are toggled
 * off. When there's no grand total, the amount is the sum of the included
 * items' prices instead.
 */
export function itemisedAmountPaise(items: ScannedItem[], totalRupees: number | null): number {
  const excludedRupees = items
    .filter((item) => !item.included)
    .reduce((sum, item) => sum + item.priceRupees, 0)
  const includedRupees = items
    .filter((item) => item.included)
    .reduce((sum, item) => sum + item.priceRupees, 0)
  const rupees = totalRupees != null ? Math.max(0, totalRupees - excludedRupees) : includedRupees
  return Math.round(rupees * 100)
}

/** Builds an expense description from the names of the included line items. */
export function itemisedDescription(items: ScannedItem[]): string {
  return items
    .filter((item) => item.included)
    .map((item) => item.name)
    .join(', ')
}
