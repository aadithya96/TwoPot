const formatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })

/** Formats a paise integer amount as an INR currency string, e.g. "₹1,234.50". */
export function formatINR(paise: number): string {
  return formatter.format(paise / 100)
}

/** Converts a rupees display string (e.g. "12.50") into an integer paise amount. */
export function toStorageAmount(rupees: string): number {
  const value = Number.parseFloat(rupees)
  return Number.isFinite(value) ? Math.round(value * 100) : 0
}

/** Converts an integer paise amount into a rupees number for display/computation. */
export function fromStorageAmount(paise: number): number {
  return paise / 100
}
