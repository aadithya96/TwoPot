import { Box, CircularProgress } from '@mui/material'
import { Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { RealtimeProvider } from '@/components/RealtimeProvider'
import { signOut, useCurrentUser, useSession } from './useAuth'
import { useHousehold } from './useHousehold'

/**
 * Route guard for the authenticated app shell: redirects to `/login` when
 * there is no session, to `/onboarding` when the user has no household yet,
 * and otherwise mounts realtime subscriptions and renders the nested routes
 * inside the `AppShell` layout.
 */
export function AuthGuard() {
  const { data: session, isLoading: isSessionLoading } = useSession()
  const { data: household, isLoading: isHouseholdLoading } = useHousehold()
  const { data: profile } = useCurrentUser()

  if (isSessionLoading || (session && isHouseholdLoading)) {
    return (
      <Box
        sx={{
          height: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (!household) {
    return <Navigate to="/onboarding" replace />
  }

  return (
    <RealtimeProvider householdId={household.household.id}>
      <AppShell
        avatarUrl={profile?.avatar_url}
        displayName={profile?.display_name}
        onSignOut={() => void signOut()}
      />
    </RealtimeProvider>
  )
}
