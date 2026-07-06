import { Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { AppShellSkeleton } from '@/components/layout/AppShellSkeleton'
import { RealtimeProvider } from '@/components/RealtimeProvider'
import { usePushSubscriptionRefresh } from '@/features/notifications/usePushNotifications'
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

  // Latest-active-device push: re-assert this device's subscription (if any)
  // as the user's active one on each app open.
  usePushSubscriptionRefresh(profile?.id)

  if (isSessionLoading || (session && isHouseholdLoading)) {
    return <AppShellSkeleton />
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
