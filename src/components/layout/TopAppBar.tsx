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
  Drawer,
  List,
  ListItem,
  ListItemButton,
  Box,
  Divider,
} from '@mui/material'
import { useNavigate, useLocation } from 'react-router-dom'
import { APP_MAX_WIDTH } from '@/lib/layout'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import MenuIcon from '@mui/icons-material/Menu'
import SettingsIcon from '@mui/icons-material/Settings'
import LogoutIcon from '@mui/icons-material/Logout'
import HomeIcon from '@mui/icons-material/Home'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import ReceiptIcon from '@mui/icons-material/Receipt'
import ReceiptOutlinedIcon from '@mui/icons-material/ReceiptOutlined'
import PieChartIcon from '@mui/icons-material/PieChart'
import PieChartOutlineIcon from '@mui/icons-material/PieChartOutlined'
import TrackChangesIcon from '@mui/icons-material/TrackChanges'
import TrackChangesOutlinedIcon from '@mui/icons-material/TrackChangesOutlined'
import MovieIcon from '@mui/icons-material/Movie'
import MovieOutlinedIcon from '@mui/icons-material/MovieOutlined'
import ChecklistIcon from '@mui/icons-material/Checklist'
import ChecklistOutlinedIcon from '@mui/icons-material/ChecklistOutlined'
import InsightsIcon from '@mui/icons-material/Insights'
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'

const ROOT_TAB_PATHS = ['/', '/expenses', '/budgets', '/goals']

const NAV_ITEMS = [
  { label: 'Home', path: '/', Icon: HomeOutlinedIcon, ActiveIcon: HomeIcon },
  { label: 'Expenses', path: '/expenses', Icon: ReceiptOutlinedIcon, ActiveIcon: ReceiptIcon },
  { label: 'Budgets', path: '/budgets', Icon: PieChartOutlineIcon, ActiveIcon: PieChartIcon },
  { label: 'Goals', path: '/goals', Icon: TrackChangesOutlinedIcon, ActiveIcon: TrackChangesIcon },
  { label: 'Movies', path: '/movies', Icon: MovieOutlinedIcon, ActiveIcon: MovieIcon },
  { label: 'Tasks', path: '/tasks', Icon: ChecklistOutlinedIcon, ActiveIcon: ChecklistIcon },
  { label: 'Insights', path: '/insights', Icon: InsightsOutlinedIcon, ActiveIcon: InsightsIcon },
  { label: 'Settings', path: '/settings', Icon: SettingsOutlinedIcon, ActiveIcon: SettingsIcon },
] as const

function isNavActive(pathname: string, path: string): boolean {
  return path === '/' ? pathname === '/' : pathname.startsWith(path)
}

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
  const [drawerOpen, setDrawerOpen] = useState(false)

  const isRootTab = ROOT_TAB_PATHS.includes(location.pathname)
  const initial = displayName?.trim().charAt(0).toUpperCase() || '?'

  return (
    <>
      <AppBar position="sticky" sx={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <Toolbar sx={{ width: '100%', maxWidth: APP_MAX_WIDTH, mx: 'auto' }}>
          {isRootTab ? (
            <IconButton
              aria-label="Open navigation menu"
              edge="start"
              color="inherit"
              onClick={() => setDrawerOpen(true)}
              sx={{ mr: 1 }}
            >
              <MenuIcon />
            </IconButton>
          ) : (
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

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{ display: { xs: 'block', md: 'none' } }}
        slotProps={{ paper: { sx: { width: 280 } } }}
      >
        <Box sx={{ px: 3, py: 2.5 }}>
          <Typography variant="titleLarge" component="span" sx={{ color: 'primary.main', fontWeight: 600 }}>
            TwoPot
          </Typography>
        </Box>
        <Divider />

        <List sx={{ flexGrow: 1, px: 1, py: 1 }}>
          {NAV_ITEMS.map((item) => {
            const active = isNavActive(location.pathname, item.path)
            const Icon = active ? item.ActiveIcon : item.Icon
            return (
              <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  selected={active}
                  onClick={() => {
                    navigate(item.path)
                    setDrawerOpen(false)
                  }}
                  sx={{
                    borderRadius: 2,
                    '&.Mui-selected': { bgcolor: 'primary.light', color: 'primary.dark' },
                    '&.Mui-selected:hover': { bgcolor: 'primary.light' },
                    '&.Mui-selected .MuiListItemIcon-root': { color: 'primary.dark' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <Icon />
                  </ListItemIcon>
                  <ListItemText slotProps={{ primary: { variant: 'labelLarge' } }}>
                    {item.label}
                  </ListItemText>
                </ListItemButton>
              </ListItem>
            )
          })}
        </List>

        <Divider />
        <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar src={avatarUrl ?? undefined} alt={displayName ?? 'Account'} sx={{ width: 36, height: 36 }}>
            {avatarUrl ? null : initial}
          </Avatar>
          <Typography
            variant="bodyMedium"
            component="span"
            sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {displayName ?? 'Account'}
          </Typography>
          <ListItemButton
            onClick={() => {
              setDrawerOpen(false)
              onSignOut()
            }}
            aria-label="Sign out"
            sx={{ flex: 'none', borderRadius: 2, width: 'auto', p: 1 }}
          >
            <LogoutIcon fontSize="small" />
          </ListItemButton>
        </Box>
      </Drawer>
    </>
  )
}
