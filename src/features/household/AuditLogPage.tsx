import { useState } from 'react'
import {
  Avatar,
  Box,
  Card,
  CircularProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { useHouseholdStore } from '@/stores/householdStore'
import { useAuditLog } from './useAuditLog'
import { describeAuditEntry } from './activityFeed'
import { isDeletedExpenseEntry } from './deletedExpense'
import { DeletedExpenseSheet } from './DeletedExpenseSheet'
import type { AuditLogEntryWithActor } from '@/types/app'

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
  const [selected, setSelected] = useState<AuditLogEntryWithActor | null>(null)

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
            {entries.map((entry) => {
              const secondary = `${entry.actor?.display_name ?? 'Someone'} · ${formatTimestamp(entry.created_at)}`
              // Deleted expenses can be inspected and restored; tapping opens
              // their detail sheet. Other entries are informational only.
              if (isDeletedExpenseEntry(entry)) {
                return (
                  <ListItem key={entry.id} divider disablePadding>
                    <ListItemButton onClick={() => setSelected(entry)}>
                      <ListItemAvatar>
                        <Avatar src={entry.actor?.avatar_url ?? undefined}>
                          {entry.actor?.display_name?.[0] ?? '?'}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText primary={describeAuditEntry(entry)} secondary={secondary} />
                      <ChevronRightIcon color="disabled" />
                    </ListItemButton>
                  </ListItem>
                )
              }
              return (
                <ListItem key={entry.id} divider>
                  <ListItemAvatar>
                    <Avatar src={entry.actor?.avatar_url ?? undefined}>
                      {entry.actor?.display_name?.[0] ?? '?'}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText primary={describeAuditEntry(entry)} secondary={secondary} />
                </ListItem>
              )
            })}
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

      {householdId && selected && (
        <DeletedExpenseSheet
          open={Boolean(selected)}
          onClose={() => setSelected(null)}
          entry={selected}
          householdId={householdId}
        />
      )}
    </Box>
  )
}
