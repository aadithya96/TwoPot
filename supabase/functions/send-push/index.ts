// supabase/functions/send-push/index.ts
//
// Deno Edge Function. Accepts { user_id, title, body, url } and sends a Web
// Push notification to every subscription on file for that user. Expired
// or invalid subscriptions (HTTP 410/404 from the push service) are removed
// from push_subscriptions.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'

interface SendPushRequest {
  user_id: string
  title: string
  body: string
  url?: string
}

interface PushSubscriptionRow {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT')
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')

function isSendPushRequest(value: unknown): value is SendPushRequest {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.user_id === 'string' && typeof v.title === 'string' && typeof v.body === 'string'
}

Deno.serve(async (req: Request) => {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY', { status: 500 })
  }
  if (!VAPID_SUBJECT || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return new Response('Missing VAPID_SUBJECT, VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY', { status: 500 })
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }

  if (!isSendPushRequest(payload)) {
    return new Response('Body must include user_id, title, body', { status: 400 })
  }

  const { user_id, title, body, url } = payload

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: subs, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', user_id)

  if (error) {
    return new Response(`Query failed: ${error.message}`, { status: 500 })
  }

  const subscriptions = (subs ?? []) as PushSubscriptionRow[]
  let sent = 0
  let removed = 0

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title, body, url: url ?? '/' })
      )
      sent += 1
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode
      if (statusCode === 404 || statusCode === 410) {
        // Subscription is gone — clean it up so we stop retrying it.
        await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id)
        removed += 1
      } else {
        console.error(`Push failed for subscription ${sub.id}: ${String(err)}`)
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, total: subscriptions.length, sent, removed }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
