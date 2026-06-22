import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material'
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined'
import { useHouseholdMembers } from '@/features/auth'

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
            {members.map(({ profile, role, joined_at }) => (
              <ListItem key={profile.id} disableGutters>
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
            ))}
          </List>
        ) : (
          <Box sx={{ mt: 1 }}>
            <Typography variant="bodyMedium" color="text.secondary">
              No members yet.
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}
