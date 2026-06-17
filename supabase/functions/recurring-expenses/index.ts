// supabase/functions/recurring-expenses/index.ts
//
// Deno Edge Function. Intended to be triggered by a monthly cron job
// (e.g. pg_cron -> pg_net, or an external scheduler) on the 1st of each
// month. Finds active recurring expenses whose `date` falls in a prior
// month (i.e. they're due to recur) and inserts a new expense row for the
// current month, copying the original's fields. Only monthly recurrence is
// supported for now — `recurrence_rule` is expected to be the literal
// string 'monthly' (extend the switch below for other frequencies later).

import { createClient } from 'jsr:@supabase/supabase-js@2'

interface ExpenseRow {
  id: string
  household_id: string
  category_id: string | null
  paid_by: string
  owner: 'shared' | 'personal'
  personal_user_id: string | null
  amount: number
  description: string
  notes: string | null
  date: string
  split_type: 'equal' | 'custom' | 'payer_covers'
  split_pct_a: number | null
  is_recurring: boolean
  recurrence_rule: string | null
  receipt_url: string | null
  goal_id: string | null
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

/** First-of-month string (YYYY-MM-DD) for the month containing `date`. */
function monthStart(date: Date): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10)
}

/** Advances a YYYY-MM-DD date string by exactly one calendar month. */
function advanceOneMonth(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + 1)
  return d.toISOString().slice(0, 10)
}

Deno.serve(async () => {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY', { status: 500 })
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const currentMonthStart = monthStart(new Date())

  // Recurring expenses are "due" once their stored date falls before the
  // current month — i.e. they haven't been re-created yet this month.
  const { data: due, error } = await supabaseAdmin
    .from('expenses')
    .select('*')
    .eq('is_recurring', true)
    .eq('recurrence_rule', 'monthly')
    .lt('date', currentMonthStart)

  if (error) {
    return new Response(`Query failed: ${error.message}`, { status: 500 })
  }

  const dueExpenses = (due ?? []) as ExpenseRow[]
  let inserted = 0

  for (const expense of dueExpenses) {
    const nextDate = advanceOneMonth(expense.date)

    const { error: insertError } = await supabaseAdmin.from('expenses').insert({
      household_id: expense.household_id,
      category_id: expense.category_id,
      paid_by: expense.paid_by,
      owner: expense.owner,
      personal_user_id: expense.personal_user_id,
      amount: expense.amount,
      description: expense.description,
      notes: expense.notes,
      date: nextDate,
      split_type: expense.split_type,
      split_pct_a: expense.split_pct_a,
      is_recurring: true,
      recurrence_rule: expense.recurrence_rule,
      receipt_url: null,
      goal_id: expense.goal_id,
    })

    if (insertError) {
      console.error(`Failed to insert recurring expense ${expense.id}: ${insertError.message}`)
      continue
    }

    // Advance the original row's date so it isn't picked up again until
    // the following month, and tracks the latest occurrence.
    const { error: updateError } = await supabaseAdmin
      .from('expenses')
      .update({ date: nextDate })
      .eq('id', expense.id)

    if (updateError) {
      console.error(`Failed to advance date for expense ${expense.id}: ${updateError.message}`)
      continue
    }

    inserted += 1
  }

  return new Response(JSON.stringify({ ok: true, processed: dueExpenses.length, inserted }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
