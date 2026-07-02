// supabase/functions/refresh-mf-nav/index.ts
//
// Deno Edge Function. Intended to be triggered by an hourly cron job
// (e.g. pg_cron -> pg_net, or an external scheduler). Refreshes the market
// value of every mutual-fund-backed savings goal: fetches the latest NAV
// for each distinct AMFI scheme from MFAPI.in (a free, no-auth mirror of
// AMFI's daily NAV feed) and restates each goal's current_amount as
// units x NAV via the refresh_goal_mf_value RPC.
//
// AMFI only publishes NAVs once per business day, so most hourly runs are
// no-ops value-wise, but the hourly cadence picks the new NAV up promptly
// after publication and keeps backing_mf_refreshed_at honest.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const MFAPI_BASE_URL = 'https://api.mfapi.in'

interface MfGoalRow {
  id: string
  backing_mf_scheme_code: number
}

interface MfLatestResponse {
  data?: { date?: string; nav?: string }[]
}

/** Converts AMFI's "DD-MM-YYYY" date strings into ISO "YYYY-MM-DD", or null. */
function parseAmfiDate(date: string): string | null {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(date)
  if (!match) return null
  const [, day, month, year] = match
  return `${year}-${month}-${day}`
}

/** Fetches the latest NAV (rupees) + ISO date for a scheme, or null when unavailable. */
async function fetchLatestNav(schemeCode: number): Promise<{ nav: number; navDate: string } | null> {
  const response = await fetch(`${MFAPI_BASE_URL}/mf/${schemeCode}/latest`)
  if (!response.ok) return null
  const body = (await response.json()) as MfLatestResponse
  const entry = body.data?.[0]
  const nav = Number.parseFloat(entry?.nav ?? '')
  const navDate = entry?.date ? parseAmfiDate(entry.date) : null
  if (!Number.isFinite(nav) || nav <= 0 || !navDate) return null
  return { nav, navDate }
}

Deno.serve(async () => {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY', { status: 500 })
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data, error } = await supabaseAdmin
    .from('savings_goals')
    .select('id, backing_mf_scheme_code')
    .eq('backing_type', 'mutual_fund')
    .not('backing_mf_scheme_code', 'is', null)

  if (error) {
    return new Response(`Query failed: ${error.message}`, { status: 500 })
  }

  const goals = (data ?? []) as MfGoalRow[]

  // Fetch each distinct scheme's NAV once, however many goals share it.
  const schemeCodes = [...new Set(goals.map((goal) => goal.backing_mf_scheme_code))]
  const navByScheme = new Map<number, { nav: number; navDate: string }>()
  for (const schemeCode of schemeCodes) {
    try {
      const latest = await fetchLatestNav(schemeCode)
      if (latest) navByScheme.set(schemeCode, latest)
      else console.error(`No usable NAV for scheme ${schemeCode}`)
    } catch (fetchError) {
      console.error(`NAV fetch failed for scheme ${schemeCode}: ${String(fetchError)}`)
    }
  }

  let refreshed = 0
  for (const goal of goals) {
    const latest = navByScheme.get(goal.backing_mf_scheme_code)
    if (!latest) continue

    const { error: refreshError } = await supabaseAdmin.rpc('refresh_goal_mf_value', {
      goal_id: goal.id,
      new_nav: latest.nav,
      new_nav_date: latest.navDate,
    })

    if (refreshError) {
      console.error(`Failed to refresh goal ${goal.id}: ${refreshError.message}`)
      continue
    }

    refreshed += 1
  }

  return new Response(
    JSON.stringify({ ok: true, goals: goals.length, schemes: schemeCodes.length, refreshed }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
