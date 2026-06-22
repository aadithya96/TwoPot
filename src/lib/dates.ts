/** Returns the "YYYY-MM" key for a given date, defaulting to today. */
export function monthKey(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

/** Returns the inclusive start/end ISO dates for a given "YYYY-MM" month key. */
export function monthRange(key: string): { start: string; end: string } {
  const [year, month] = key.split('-').map(Number)
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0)
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
}

/** Returns the first-of-month ISO date ("YYYY-MM-01") for a "YYYY-MM" key, as stored in date columns. */
export function monthStartDate(key: string): string {
  return `${key}-01`
}

/** Formats a "YYYY-MM" month key for display, e.g. "June 2025". */
export function formatMonth(key: string): string {
  const [year, month] = key.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })
}

/** Formats an ISO date as "Today", "Yesterday", or a locale date string. */
export function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

  if (isSameDay(date, today)) return 'Today'
  if (isSameDay(date, yesterday)) return 'Yesterday'
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Shifts a "YYYY-MM" month key forward or backward by a number of months. */
export function shiftMonth(key: string, delta: number): string {
  const [year, month] = key.split('-').map(Number)
  const date = new Date(year, month - 1 + delta, 1)
  return monthKey(date)
}
