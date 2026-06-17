import { Box } from '@mui/material'
import { Outlet } from 'react-router-dom'
import { TopAppBar } from './TopAppBar'
import { BottomNav } from './BottomNav'

export interface AppShellProps {
  /** Title passed through to the `TopAppBar`. */
  title?: string
  /** Avatar image URL passed through to the `TopAppBar`. */
  avatarUrl?: string | null
  /** Display name passed through to the `TopAppBar`. */
  displayName?: string | null
  /** Called when the user selects "Sign out" from the `TopAppBar` menu. */
  onSignOut: () => void
}

/**
 * Full-height flex-column app shell: sticky `TopAppBar`, scrollable `<main>`
 * rendering the active route via `Outlet`, and a fixed `BottomNav`.
 */
export function AppShell({ title, avatarUrl, displayName, onSignOut }: AppShellProps) {
  return (
    <Box className="app-shell" sx={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <TopAppBar
        title={title}
        avatarUrl={avatarUrl}
        displayName={displayName}
        onSignOut={onSignOut}
      />
      <Box
        component="main"
        sx={{
          flex: 1,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: 'calc(80px + env(safe-area-inset-bottom))',
        }}
      >
        <Outlet />
      </Box>
      <BottomNav />
    </Box>
  )
}
