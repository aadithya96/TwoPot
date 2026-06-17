import { useState } from 'react'
import {
  List,
  ListItem,
  ListItemText,
  Switch,
  Button,
  Stack,
  CircularProgress,
} from '@mui/material'
import { supabase } from '@/lib/supabase'
import type { Database, Json } from '@/types/db'
import { usePushNotificationActions } from './usePushNotifications'

/**
 * Minimal typed view over `supabase.from('profiles').update(...)`. The
 * generated `db.ts` stub's table rows omit a `Relationships` field that
 * `@supabase/postgrest-js`'s `update<Row>` generic needs to infer `Row`,
 * which otherwise collapses to `never`. Scoped here rather than editing
 * `src/types/db.ts`, which this agent does not own.
 */
interface ProfilesUpdateClient {
  from(table: 'profiles'): {
    update(values: Database['public']['Tables']['profiles']['Update']): {
      eq(column: 'id', value: string): Promise<{ error: { message: string } | null }>
    }
  }
}

interface NotificationPrefs {
  budgetEightyPercent: boolean
  budgetExceeded: boolean
  partnerLargeExpense: boolean
  settlementReady: boolean
  goalComplete: boolean
}

const DEFAULT_PREFS: NotificationPrefs = {
  budgetEightyPercent: true,
  budgetExceeded: true,
  partnerLargeExpense: true,
  settlementReady: true,
  goalComplete: true,
}

const PREF_LABELS: Array<{ key: keyof NotificationPrefs; label: string }> = [
  { key: 'budgetEightyPercent', label: 'Budget reaches 80%' },
  { key: 'budgetExceeded', label: 'Budget exceeded' },
  { key: 'partnerLargeExpense', label: "Partner's large expense" },
  { key: 'settlementReady', label: 'Settlement ready' },
  { key: 'goalComplete', label: 'Goal completed' },
]

function isNotificationPrefs(value: unknown): value is NotificationPrefs {
  if (typeof value !== 'object' || value === null) return false
  return Object.keys(DEFAULT_PREFS).every((key) => typeof (value as Record<string, unknown>)[key] === 'boolean')
}

function parsePrefs(json: Json | null): NotificationPrefs {
  return isNotificationPrefs(json) ? json : DEFAULT_PREFS
}

export interface NotificationSettingsProps {
  /** Current user's id, used to read/write `profiles.notification_prefs`. */
  userId: string
  /** Stored notification preferences JSON from the user's profile row. */
  storedPrefs: Json | null
}

/**
 * Toggle list for per-event notification preferences, persisted to
 * `profiles.notification_prefs`, plus an "Enable notifications" action when
 * the user has not yet subscribed to push.
 */
export function NotificationSettings({ userId, storedPrefs }: NotificationSettingsProps) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(() => parsePrefs(storedPrefs))
  const { isSubscribed, isLoading, subscribe } = usePushNotificationActions(userId)

  const handleToggle = (key: keyof NotificationPrefs): void => {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    const client = supabase as unknown as ProfilesUpdateClient
    void client
      .from('profiles')
      .update({ notification_prefs: next as unknown as Json })
      .eq('id', userId)
  }

  return (
    <Stack spacing={2}>
      {!isSubscribed && (
        <Button
          variant="contained"
          onClick={() => {
            void subscribe()
          }}
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          Enable notifications
        </Button>
      )}
      <List disablePadding>
        {PREF_LABELS.map(({ key, label }) => (
          <ListItem
            key={key}
            secondaryAction={
              <Switch
                edge="end"
                checked={prefs[key]}
                onChange={() => handleToggle(key)}
                slotProps={{ input: { 'aria-label': label } }}
              />
            }
          >
            <ListItemText primary={label} />
          </ListItem>
        ))}
      </List>
    </Stack>
  )
}
