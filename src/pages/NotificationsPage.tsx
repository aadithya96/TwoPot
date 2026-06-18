import { Box, Typography } from '@mui/material'
import { useCurrentUser } from '@/features/auth'
import { NotificationSettings } from '@/features/notifications'

/** Settings sub-page wrapping per-event notification preferences for the current user. */
export function NotificationsPage() {
  const { data: currentUser } = useCurrentUser()

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, pb: { xs: 12, md: 4 } }}>
      <Typography variant="titleLarge" sx={{ mb: 2 }}>
        Notifications
      </Typography>
      {currentUser && (
        <NotificationSettings userId={currentUser.id} storedPrefs={currentUser.notification_prefs} />
      )}
    </Box>
  )
}
