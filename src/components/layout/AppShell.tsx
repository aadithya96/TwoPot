import { Box, CircularProgress } from '@mui/material'
import { Outlet } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { APP_MAX_WIDTH, DESKTOP_MAX_WIDTH } from '@/lib/layout'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { TopAppBar } from './TopAppBar'
import { BottomNav } from './BottomNav'
import { SideNav } from './SideNav'

export interface AppShellProps {
  /** Title passed through to the `TopAppBar`. */
  title?: string
  /** Avatar image URL passed through to the `TopAppBar`/`SideNav`. */
  avatarUrl?: string | null
  /** Display name passed through to the `TopAppBar`/`SideNav`. */
  displayName?: string | null
  /** Called when the user selects "Sign out". */
  onSignOut: () => void
}

/** Indicator diameter at the pull threshold, matched to the spinner size. */
const INDICATOR_SIZE = 28

/**
 * Adaptive app shell. On desktop (md+) a persistent `SideNav` rail sits beside a
 * scrollable content column. On mobile it falls back to a sticky `TopAppBar` and
 * a fixed `BottomNav`. The active route renders via `Outlet` in both layouts.
 *
 * The scrollable content column supports pull-to-refresh: dragging down from the
 * top refetches every active query, so mobile users have a manual way to sync
 * (matching the native gesture) rather than relying solely on realtime.
 */
export function AppShell({ title, avatarUrl, displayName, onSignOut }: AppShellProps) {
  const queryClient = useQueryClient()
  const { ref, isRefreshing, pullDistance } = usePullToRefresh(() =>
    queryClient.invalidateQueries()
  )

  const indicatorActive = isRefreshing || pullDistance > 0

  return (
    <Box sx={{ height: '100dvh', display: 'flex' }}>
      <SideNav avatarUrl={avatarUrl} displayName={displayName} onSignOut={onSignOut} />

      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: { xs: 'block', md: 'none' } }}>
          <TopAppBar
            title={title}
            avatarUrl={avatarUrl}
            displayName={displayName}
            onSignOut={onSignOut}
          />
        </Box>

        <Box
          ref={ref}
          component="main"
          sx={{
            position: 'relative',
            flex: 1,
            overflowY: 'auto',
            // Pages must never pan sideways: anything wider than the viewport
            // (e.g. a horizontal card row) has to scroll inside its own box.
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
            // Contain vertical overscroll so the pull gesture doesn't also
            // rubber-band the page/browser chrome behind it.
            overscrollBehaviorY: 'contain',
            paddingBottom: { xs: 'calc(80px + env(safe-area-inset-bottom))', md: 4 },
          }}
        >
          {/* Pull-to-refresh indicator: fades/slides in with the pull and spins
              while refreshing. Positioned absolutely so it never shifts layout. */}
          <Box
            aria-hidden={!indicatorActive}
            sx={{
              position: 'absolute',
              top: 8,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 2,
              opacity: indicatorActive ? 1 : 0,
              transform: `translateY(${isRefreshing ? INDICATOR_SIZE / 2 : Math.max(pullDistance - INDICATOR_SIZE, 0)}px)`,
              transition: pullDistance > 0 && !isRefreshing ? 'none' : 'opacity 0.2s, transform 0.2s',
            }}
          >
            <CircularProgress
              size={INDICATOR_SIZE}
              // Before the release, reflect pull progress; once refreshing, spin.
              variant={isRefreshing ? 'indeterminate' : 'determinate'}
              value={isRefreshing ? undefined : Math.min((pullDistance / 64) * 100, 100)}
            />
          </Box>

          <Box
            sx={{
              width: '100%',
              maxWidth: { xs: APP_MAX_WIDTH, md: DESKTOP_MAX_WIDTH },
              mx: 'auto',
              px: { md: 3 },
            }}
          >
            <Outlet />
          </Box>
        </Box>
      </Box>

      <BottomNav />
    </Box>
  )
}
