// Thin client for MFAPI.in (https://www.mfapi.in) — a free, no-auth JSON
// mirror of AMFI's daily NAV feed covering every Indian mutual fund scheme.
// Groww and Zerodha Coin both sell these same AMFI schemes, so selecting a
// scheme here identifies the fund a user actually holds at either broker
// without needing broker credentials (neither broker exposes a public
// mutual-fund API — see docs/ARCHITECTURE.md).

const MFAPI_BASE_URL = 'https://api.mfapi.in'

/** A mutual fund scheme as returned by the MFAPI search endpoint. */
export interface MfScheme {
  schemeCode: number
  schemeName: string
}

/** Latest published NAV for a scheme. */
export interface MfLatestNav {
  schemeCode: number
  schemeName: string
  /** NAV in rupees (AMFI publishes 4-decimal NAVs). */
  nav: number
  /** NAV date as ISO "YYYY-MM-DD". */
  navDate: string
}

interface MfLatestResponse {
  meta?: { scheme_code?: number; scheme_name?: string }
  data?: { date?: string; nav?: string }[]
  status?: string
}

/**
 * Converts AMFI's "DD-MM-YYYY" date strings into ISO "YYYY-MM-DD".
 * Returns null when the input doesn't match.
 */
export function parseAmfiDate(date: string): string | null {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(date)
  if (!match) return null
  const [, day, month, year] = match
  return `${year}-${month}-${day}`
}

/** Searches all AMFI schemes by name, e.g. "parag parikh flexi". */
export async function searchMfSchemes(query: string, signal?: AbortSignal): Promise<MfScheme[]> {
  const response = await fetch(`${MFAPI_BASE_URL}/mf/search?q=${encodeURIComponent(query)}`, { signal })
  if (!response.ok) throw new Error(`MF scheme search failed (${response.status})`)
  const schemes = (await response.json()) as MfScheme[]
  return Array.isArray(schemes) ? schemes : []
}

/** Fetches the latest NAV for a scheme, or null when the scheme has no published NAV. */
export async function fetchLatestNav(schemeCode: number, signal?: AbortSignal): Promise<MfLatestNav | null> {
  const response = await fetch(`${MFAPI_BASE_URL}/mf/${schemeCode}/latest`, { signal })
  if (!response.ok) throw new Error(`NAV lookup failed for scheme ${schemeCode} (${response.status})`)
  const body = (await response.json()) as MfLatestResponse

  const entry = body.data?.[0]
  const nav = Number.parseFloat(entry?.nav ?? '')
  const navDate = entry?.date ? parseAmfiDate(entry.date) : null
  if (!entry || !Number.isFinite(nav) || nav <= 0 || !navDate) return null

  return {
    schemeCode: body.meta?.scheme_code ?? schemeCode,
    schemeName: body.meta?.scheme_name ?? '',
    nav,
    navDate,
  }
}
