import { useState } from 'react'
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Link as MuiLink,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Switch,
  Typography,
} from '@mui/material'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined'
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined'
import { Link as RouterLink } from 'react-router-dom'
import { useCurrentUser, signOut } from '@/features/auth'
import { useHouseholdStore } from '@/stores/householdStore'
import { useDarkMode } from '@/hooks/useDarkMode'
import { IncomeSplitSettings } from '@/features/splitting'

/**
 * Settings screen: profile summary, dark-mode toggle, links to notification and household
 * settings, and a sign-out action.
 */
export function SettingsPage() {
  const { data: currentUser } = useCurrentUser()
  const members = useHouseholdStore((state) => state.members)
  const householdId = useHouseholdStore((state) => state.householdId)
  const fallbackProfile = members[0] ?? null

  const displayName = currentUser?.display_name ?? fallbackProfile?.display_name ?? 'You'
  const avatarUrl = currentUser?.avatar_url ?? fallbackProfile?.avatar_url ?? undefined

  const { darkMode, setDarkMode } = useDarkMode()

  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut()
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <Box sx={{ p: 2, pb: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Card>
        <CardContent>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Avatar src={avatarUrl} sx={{ width: 56, height: 56 }}>
              {displayName[0]}
            </Avatar>
            <Typography variant="titleLarge">{displayName}</Typography>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <List disablePadding>
          <ListItem
            secondaryAction={
              <Switch
                checked={darkMode}
                onChange={(event) => setDarkMode(event.target.checked)}
                slotProps={{ input: { 'aria-label': 'Toggle dark mode' } }}
              />
            }
          >
            <ListItemIcon>
              <DarkModeOutlinedIcon />
            </ListItemIcon>
            <ListItemText primary="Dark mode" />
          </ListItem>
          <Divider component="li" />
          <ListItem component={RouterLink} to="/settings/notifications">
            <ListItemIcon>
              <NotificationsOutlinedIcon />
            </ListItemIcon>
            <ListItemText primary="Notifications" />
          </ListItem>
        </List>
      </Card>

      <Card>
        <CardContent>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1 }}>
            <GroupOutlinedIcon />
            <Typography variant="titleMedium">Household</Typography>
          </Stack>
          <Typography variant="bodyMedium" color="text.secondary" sx={{ mb: 1.5 }}>
            Invite your partner to share expenses, budgets, and goals.
          </Typography>
          <MuiLink component={RouterLink} to="/settings/household" variant="labelLarge">
            Manage invite code
          </MuiLink>
        </CardContent>
      </Card>

      {householdId && <IncomeSplitSettings householdId={householdId} />}

      <Button
        variant="text"
        color="error"
        onClick={handleSignOut}
        disabled={isSigningOut}
        sx={{ alignSelf: 'flex-start' }}
      >
        Sign out
      </Button>
    </Box>
  )
}
