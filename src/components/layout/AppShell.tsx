import { Box } from '@mui/material'
import { Outlet } from 'react-router-dom'
import { APP_MAX_WIDTH, DESKTOP_MAX_WIDTH } from '@/lib/layout'
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

/**
 * Adaptive app shell. On desktop (md+) a persistent `SideNav` rail sits beside a
 * scrollable content column. On mobile it falls back to a sticky `TopAppBar` and
 * a fixed `BottomNav`. The active route renders via `Outlet` in both layouts.
 */
export function AppShell({ title, avatarUrl, displayName, onSignOut }: AppShellProps) {
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
          component="main"
          sx={{
            flex: 1,
            overflowY: 'auto',
            // Pages must never pan sideways: anything wider than the viewport
            // (e.g. a horizontal card row) has to scroll inside its own box.
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
            paddingBottom: { xs: 'calc(80px + env(safe-area-inset-bottom))', md: 4 },
          }}
        >
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
