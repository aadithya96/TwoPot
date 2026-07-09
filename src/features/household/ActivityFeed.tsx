import { useState } from 'react'
import { Avatar, Card, List, ListItem, ListItemAvatar, ListItemButton, ListItemText, Link as MuiLink, Skeleton, Stack, Typography } from '@mui/material'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { Link as RouterLink } from 'react-router-dom'
import { useAuditLog } from './useAuditLog'
import { describeAuditEntry, formatRelativeTime } from './activityFeed'
import { isDeletedExpenseEntry } from './deletedExpense'
import { DeletedExpenseSheet } from './DeletedExpenseSheet'
import type { AuditLogEntryWithActor } from '@/types/app'

/** How many recent entries to show in the compact feed. */
const FEED_LIMIT = 5

export interface ActivityFeedProps {
  /** Household whose recent activity should be displayed. */
  householdId: string
}

/**
 * Compact "Aadi added ₹500 groceries"-style feed of the household's most
 * recent activity, with a link through to the full activity log. Updates
 * live as members make changes (see `RealtimeProvider`'s `audit_log` subscription).
 */
export function ActivityFeed({ householdId }: ActivityFeedProps) {
  const { data: entries, isLoading } = useAuditLog(householdId)
  const recent = (entries ?? []).slice(0, FEED_LIMIT)
  const [selected, setSelected] = useState<AuditLogEntryWithActor | null>(null)

  if (isLoading) {
    return <Skeleton variant="rounded" height={120} />
  }

  if (recent.length === 0) return null

  return (
    <Stack spacing={1}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Typography variant="titleMedium">Activity</Typography>
        <MuiLink component={RouterLink} to="/settings/activity" variant="labelLarge">
          See all
        </MuiLink>
      </Stack>
      <Card>
        <List disablePadding>
          {recent.map((entry) => {
            const primary = `${entry.actor?.display_name ?? 'Someone'} ${describeAuditEntry(entry).toLowerCase()}`
            const secondary = formatRelativeTime(entry.created_at)
            // A deleted expense can be inspected and restored; tapping opens
            // its detail sheet. Other entries are informational only.
            if (isDeletedExpenseEntry(entry)) {
              return (
                <ListItem key={entry.id} divider disablePadding>
                  <ListItemButton onClick={() => setSelected(entry)}>
                    <ListItemAvatar>
                      <Avatar src={entry.actor?.avatar_url ?? undefined} alt={entry.actor?.display_name ?? ''}>
                        {entry.actor?.display_name?.[0] ?? '?'}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={primary} secondary={secondary} />
                    <ChevronRightIcon color="disabled" />
                  </ListItemButton>
                </ListItem>
              )
            }
            return (
              <ListItem key={entry.id} divider>
                <ListItemAvatar>
                  <Avatar src={entry.actor?.avatar_url ?? undefined} alt={entry.actor?.display_name ?? ''}>
                    {entry.actor?.display_name?.[0] ?? '?'}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText primary={primary} secondary={secondary} />
              </ListItem>
            )
          })}
        </List>
      </Card>

      {selected && (
        <DeletedExpenseSheet
          open={Boolean(selected)}
          onClose={() => setSelected(null)}
          entry={selected}
          householdId={householdId}
        />
      )}
    </Stack>
  )
}
