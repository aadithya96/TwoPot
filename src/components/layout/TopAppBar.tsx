import { useState } from 'react'
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material'
import { useNavigate, useLocation } from 'react-router-dom'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SettingsIcon from '@mui/icons-material/Settings'
import LogoutIcon from '@mui/icons-material/Logout'

const ROOT_TAB_PATHS = ['/', '/expenses', '/budgets', '/goals']

export interface TopAppBarProps {
  /** Title text shown in the app bar; falls back to nothing if omitted. */
  title?: string
  /** Avatar image URL for the account menu trigger. */
  avatarUrl?: string | null
  /** Display name used for the avatar's alt text and menu fallback initial. */
  displayName?: string | null
  /** Called when the user selects "Sign out" from the account menu. */
  onSignOut: () => void
}

/** Sticky top app bar with back/title on the left and an account menu on the right. */
export function TopAppBar({ title, avatarUrl, displayName, onSignOut }: TopAppBarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  const isRootTab = ROOT_TAB_PATHS.includes(location.pathname)
  const initial = displayName?.trim().charAt(0).toUpperCase() || '?'

  return (
    <AppBar position="sticky" sx={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <Toolbar>
        {!isRootTab && (
          <IconButton
            aria-label="Go back"
            edge="start"
            color="inherit"
            onClick={() => navigate(-1)}
            sx={{ mr: 1 }}
          >
            <ArrowBackIcon />
          </IconButton>
        )}
        <Typography variant="titleLarge" component="h1" sx={{ flexGrow: 1 }}>
          {title}
        </Typography>
        <IconButton
          aria-label="Open account menu"
          onClick={(event) => setAnchorEl(event.currentTarget)}
          color="inherit"
        >
          <Avatar src={avatarUrl ?? undefined} alt={displayName ?? 'Account'} sx={{ width: 32, height: 32 }}>
            {avatarUrl ? null : initial}
          </Avatar>
        </IconButton>
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
          <MenuItem
            onClick={() => {
              setAnchorEl(null)
              navigate('/settings')
            }}
          >
            <ListItemIcon>
              <SettingsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Settings</ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => {
              setAnchorEl(null)
              onSignOut()
            }}
          >
            <ListItemIcon>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Sign out</ListItemText>
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  )
}
