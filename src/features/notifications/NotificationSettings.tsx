import { useState } from 'react'
import {
  Alert,
  List,
  ListItem,
  ListItemText,
  Switch,
  Button,
  Stack,
  CircularProgress,
} from '@mui/material'
import { supabase } from '@/lib/supabase'
import type { Json } from '@/types/db'
import { usePushNotificationActions } from './usePushNotifications'

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
  const [subscribeError, setSubscribeError] = useState<string | null>(null)
  const { isSubscribed, isLoading, subscribe } = usePushNotificationActions(userId)

  const handleSubscribe = (): void => {
    setSubscribeError(null)
    subscribe().catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setSubscribeError(
          'Notifications are blocked for TwoPot. Allow them in your browser or system settings, then try again.'
        )
      } else {
        setSubscribeError(error instanceof Error ? error.message : 'Could not enable notifications.')
      }
    })
  }

  const handleToggle = (key: keyof NotificationPrefs): void => {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    void supabase
      .from('profiles')
      .update({ notification_prefs: next as unknown as Json })
      .eq('id', userId)
  }

  return (
    <Stack spacing={2}>
      {!isSubscribed && (
        <Button
          variant="contained"
          onClick={handleSubscribe}
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          Enable notifications
        </Button>
      )}
      {subscribeError && <Alert severity="error">{subscribeError}</Alert>}
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
