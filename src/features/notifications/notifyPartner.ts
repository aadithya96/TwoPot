import { supabase } from '@/lib/supabase'
import { formatINR } from '@/lib/currency'
import { useHouseholdStore } from '@/stores/householdStore'

/** Only push for shared expenses at or above ₹1,000 (amounts are stored in paise). */
const LARGE_EXPENSE_THRESHOLD = 100_000

/** Reads a boolean notification preference, defaulting to on when unset/malformed. */
function prefEnabled(prefs: unknown, key: string): boolean {
  if (typeof prefs !== 'object' || prefs === null) return true
  const value = (prefs as Record<string, unknown>)[key]
  return typeof value === 'boolean' ? value : true
}

export interface NotifyPartnerInput {
  payerId: string
  amount: number
  description: string
  owner: 'shared' | 'personal'
}

/**
 * Fires a "partner's large expense" push notification (best-effort, never
 * throws) to the household's other member(s) when a shared expense at or
 * above the large-expense threshold is added. Reads the active household
 * straight from `useHouseholdStore` since this runs outside React (a
 * mutation's `onSuccess`), and relies on the `send-push` edge function to
 * no-op for members without a stored push subscription.
 */
export async function notifyPartnerOfExpense({ payerId, amount, description, owner }: NotifyPartnerInput): Promise<void> {
  if (owner !== 'shared' || amount < LARGE_EXPENSE_THRESHOLD) return

  const { householdId, members } = useHouseholdStore.getState()
  if (!householdId) return

  const payer = members.find((member) => member.id === payerId)
  const recipients = members.filter(
    (member) => member.id !== payerId && prefEnabled(member.notification_prefs, 'partnerLargeExpense')
  )
  if (recipients.length === 0) return

  const title = `${payer?.display_name ?? 'Your partner'} added an expense`
  const body = `${formatINR(amount)} for ${description}`

  await Promise.all(
    recipients.map((recipient) =>
      supabase.functions
        .invoke('send-push', { body: { user_id: recipient.id, title, body, url: '/' } })
        .catch(() => undefined)
    )
  )
}
