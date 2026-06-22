// supabase/functions/settlement-reminders/index.ts
//
// Deno Edge Function. Intended to be triggered by a periodic cron job (e.g.
// pg_cron -> pg_net, or an external scheduler) — weekly is a sensible
// cadence. For every household with an unsettled, non-zero current-month
// settlement, pushes a reminder to whichever member owes money, respecting
// their `settlementReady` notification preference.

import { createClient } from 'jsr:@supabase/supabase-js@2'

interface HouseholdRow {
  household_id: string
}

interface SettlementRpcRow {
  owed_by: string
  owed_to: string
  amount: number
}

interface ProfileRow {
  id: string
  display_name: string
  notification_prefs: Record<string, unknown> | null
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

/** First-of-month date string (YYYY-MM-DD) for the current month. */
function currentMonthStart(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10)
}

function formatINR(paise: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100)
}

function prefEnabled(prefs: Record<string, unknown> | null, key: string): boolean {
  if (!prefs) return true
  const value = prefs[key]
  return typeof value === 'boolean' ? value : true
}

Deno.serve(async () => {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY', { status: 500 })
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const periodMonth = currentMonthStart()

  const { data: households, error: householdsError } = await supabaseAdmin
    .from('monthly_settlement')
    .select('household_id')
    .eq('period_month', periodMonth)

  if (householdsError) {
    return new Response(`Query failed: ${householdsError.message}`, { status: 500 })
  }

  const householdIds = [...new Set((households as HouseholdRow[] | null ?? []).map((row) => row.household_id))]
  let reminded = 0

  for (const householdId of householdIds) {
    const { data: settlementRows, error: settlementError } = await supabaseAdmin.rpc('compute_settlement', {
      household_id: householdId,
      period_month: periodMonth,
    })
    if (settlementError) {
      console.error(`compute_settlement failed for ${householdId}: ${settlementError.message}`)
      continue
    }

    const settlement = (settlementRows as SettlementRpcRow[] | null)?.[0]
    if (!settlement || settlement.amount <= 0) continue

    const { data: existing } = await supabaseAdmin
      .from('settlements')
      .select('settled')
      .eq('household_id', householdId)
      .eq('period_month', periodMonth)
      .maybeSingle()
    if (existing?.settled) continue

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, display_name, notification_prefs')
      .in('id', [settlement.owed_by, settlement.owed_to])
    if (profilesError) {
      console.error(`Profile lookup failed for ${householdId}: ${profilesError.message}`)
      continue
    }

    const debtor = (profiles as ProfileRow[] | null)?.find((p) => p.id === settlement.owed_by)
    const creditor = (profiles as ProfileRow[] | null)?.find((p) => p.id === settlement.owed_to)
    if (!debtor || !prefEnabled(debtor.notification_prefs, 'settlementReady')) continue

    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: debtor.id,
        title: 'Settlement reminder',
        body: `You owe ${creditor?.display_name ?? 'your partner'} ${formatINR(settlement.amount)} this month.`,
        url: '/',
      }),
    })
    if (response.ok) reminded += 1
  }

  return new Response(JSON.stringify({ ok: true, households: householdIds.length, reminded }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
