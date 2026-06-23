import { Avatar, Card, List, ListItem, ListItemAvatar, ListItemText, Link as MuiLink, Skeleton, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useAuditLog } from './useAuditLog'
import { describeAuditEntry, formatRelativeTime } from './activityFeed'

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
          {recent.map((entry) => (
            <ListItem key={entry.id} divider>
              <ListItemAvatar>
                <Avatar src={entry.actor?.avatar_url ?? undefined} alt={entry.actor?.display_name ?? ''}>
                  {entry.actor?.display_name?.[0] ?? '?'}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={`${entry.actor?.display_name ?? 'Someone'} ${describeAuditEntry(entry).toLowerCase()}`}
                secondary={formatRelativeTime(entry.created_at)}
              />
            </ListItem>
          ))}
        </List>
      </Card>
    </Stack>
  )
}
