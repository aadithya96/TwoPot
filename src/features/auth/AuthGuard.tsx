import { Box, CircularProgress } from '@mui/material'
import { Navigate, Outlet } from 'react-router-dom'
import { useSession } from './useAuth'
import { useHousehold } from './useHousehold'

/**
 * Route guard for the authenticated app shell: redirects to `/login` when
 * there is no session, to `/onboarding` when the user has no household yet,
 * and otherwise renders the nested routes.
 */
export function AuthGuard() {
  const { data: session, isLoading: isSessionLoading } = useSession()
  const { data: household, isLoading: isHouseholdLoading } = useHousehold()

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

  return <Outlet />
}
