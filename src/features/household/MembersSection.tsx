import { useState } from 'react'
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material'
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined'
import PersonRemoveOutlinedIcon from '@mui/icons-material/PersonRemoveOutlined'
import { useSnackbar } from 'notistack'
import { useHouseholdMembers, useRemoveMember, useSession } from '@/features/auth'
import type { HouseholdMemberWithProfile } from '@/features/auth'

export interface MembersSectionProps {
  /** Household whose members are listed. */
  householdId: string
}

/** Formats an ISO timestamp as a "joined" date label, e.g. "Joined 5 Jun 2025". */
function joinedLabel(isoDate: string): string {
  const formatted = new Date(isoDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  return `Joined ${formatted}`
}

/** Settings card listing the people who have joined the household. */
export function MembersSection({ householdId }: MembersSectionProps) {
  const { data: members, isLoading } = useHouseholdMembers(householdId)
  const { data: session } = useSession()
  const removeMember = useRemoveMember()
  const { enqueueSnackbar } = useSnackbar()

  const currentUserId = session?.user.id
  const isOwner = (members ?? []).some(
    (member) => member.profile.id === currentUserId && member.role === 'owner'
  )

  // The member pending removal (drives the confirmation dialog), or null.
  const [pending, setPending] = useState<HouseholdMemberWithProfile | null>(null)

  const handleRemove = async (keepExpenses: boolean) => {
    if (!pending) return
    try {
      await removeMember.mutateAsync({
        householdId,
        memberId: pending.profile.id,
        keepExpenses,
      })
      enqueueSnackbar(
        keepExpenses
          ? `Removed ${pending.profile.display_name}, kept their expenses`
          : `Removed ${pending.profile.display_name} and their expenses`,
        { variant: 'success' }
      )
      setPending(null)
    } catch (error) {
      enqueueSnackbar(error instanceof Error ? error.message : 'Could not remove member', {
        variant: 'error',
      })
    }
  }

  return (
    <Card>
      <CardContent>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 0.5 }}>
          <GroupOutlinedIcon />
          <Typography variant="titleMedium" sx={{ flex: 1 }}>
            Members
          </Typography>
          {members && members.length > 0 && (
            <Typography variant="bodyMedium" color="text.secondary">
              {members.length}
            </Typography>
          )}
        </Stack>

        {isLoading ? (
          <CircularProgress size={20} sx={{ mt: 1 }} />
        ) : members && members.length > 0 ? (
          <List disablePadding>
            {members.map((member) => {
              const { profile, role, joined_at } = member
              const canRemove = isOwner && role !== 'owner' && profile.id !== currentUserId
              return (
                <ListItem
                  key={profile.id}
                  disableGutters
                  secondaryAction={
                    canRemove ? (
                      <IconButton
                        edge="end"
                        aria-label={`Remove ${profile.display_name}`}
                        onClick={() => setPending(member)}
                      >
                        <PersonRemoveOutlinedIcon />
                      </IconButton>
                    ) : undefined
                  }
                >
                  <ListItemAvatar>
                    <Avatar src={profile.avatar_url ?? undefined}>{profile.display_name[0]}</Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <span>{profile.display_name}</span>
                        {role === 'owner' && <Chip size="small" label="Owner" />}
                      </Stack>
                    }
                    secondary={joinedLabel(joined_at)}
                  />
                </ListItem>
              )
            })}
          </List>
        ) : (
          <Box sx={{ mt: 1 }}>
            <Typography variant="bodyMedium" color="text.secondary">
              No members yet.
            </Typography>
          </Box>
        )}
      </CardContent>

      <Dialog open={pending !== null} onClose={() => !removeMember.isPending && setPending(null)}>
        <DialogTitle>Remove {pending?.profile.display_name}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Choose what happens to {pending?.profile.display_name}&apos;s expenses. You can keep them
            in the household ledger, or remove everything they added. This can&apos;t be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ flexWrap: 'wrap', gap: 1, px: 3, pb: 2 }}>
          <Button onClick={() => setPending(null)} disabled={removeMember.isPending}>
            Cancel
          </Button>
          <Button onClick={() => void handleRemove(true)} disabled={removeMember.isPending}>
            Keep expenses
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => void handleRemove(false)}
            disabled={removeMember.isPending}
          >
            Remove everything
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  )
}
