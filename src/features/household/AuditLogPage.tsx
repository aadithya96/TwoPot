import {
  Avatar,
  Box,
  Card,
  CircularProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
} from '@mui/material'
import { useHouseholdStore } from '@/stores/householdStore'
import { useAuditLog } from './useAuditLog'
import type { AuditLogEntryWithActor } from '@/types/app'

/** Friendly singular noun for each audited table. */
const ENTITY_LABELS: Record<string, string> = {
  expenses: 'expense',
  categories: 'category',
  budgets: 'budget',
  savings_goals: 'goal',
  settlements: 'settlement',
  household_members: 'member',
}

/** Past-tense verb for each recorded action. */
const ACTION_VERBS: Record<string, string> = {
  created: 'added',
  updated: 'updated',
  deleted: 'removed',
}

/** Builds a one-line description like: Added expense "Lunch". */
function describe(entry: AuditLogEntryWithActor): string {
  const verb = ACTION_VERBS[entry.action] ?? entry.action
  const noun = ENTITY_LABELS[entry.entity_type] ?? entry.entity_type
  const label = entry.summary ? ` "${entry.summary}"` : ''
  const capitalised = verb.charAt(0).toUpperCase() + verb.slice(1)
  return `${capitalised} ${noun}${label}`
}

/** Formats a timestamp as an absolute, locale-aware date + time. */
function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Settings sub-page: a chronological log of every operation members performed. */
export function AuditLogPage() {
  const householdId = useHouseholdStore((state) => state.householdId)
  const { data: entries, isLoading, isError } = useAuditLog(householdId ?? undefined)

  return (
    <Box
      sx={{
        p: { xs: 2, md: 3 },
        pb: { xs: 12, md: 4 },
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Typography variant="titleLarge">Activity log</Typography>
      <Typography variant="bodyMedium" color="text.secondary">
        Every change made by members of your household.
      </Typography>

      {isLoading ? (
        <CircularProgress size={24} />
      ) : isError ? (
        <Card>
          <Box sx={{ p: 3 }}>
            <Typography variant="bodyMedium" color="text.secondary">
              The activity log isn&apos;t available yet.
            </Typography>
          </Box>
        </Card>
      ) : entries && entries.length > 0 ? (
        <Card>
          <List disablePadding>
            {entries.map((entry) => (
              <ListItem key={entry.id} divider>
                <ListItemAvatar>
                  <Avatar src={entry.actor?.avatar_url ?? undefined}>
                    {entry.actor?.display_name?.[0] ?? '?'}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={describe(entry)}
                  secondary={`${entry.actor?.display_name ?? 'Someone'} · ${formatTimestamp(entry.created_at)}`}
                />
              </ListItem>
            ))}
          </List>
        </Card>
      ) : (
        <Card>
          <Box sx={{ p: 3 }}>
            <Typography variant="bodyMedium" color="text.secondary">
              No activity yet. Changes members make will show up here.
            </Typography>
          </Box>
        </Card>
      )}
    </Box>
  )
}
