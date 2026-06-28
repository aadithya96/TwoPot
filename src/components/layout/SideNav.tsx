import {
  Avatar,
  Box,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material'
import { useNavigate, useLocation } from 'react-router-dom'
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
import InsightsIcon from '@mui/icons-material/Insights'
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined'
import SettingsIcon from '@mui/icons-material/Settings'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import LogoutIcon from '@mui/icons-material/Logout'
import { SIDE_NAV_WIDTH } from '@/lib/layout'

const NAV_ITEMS = [
  { label: 'Home', path: '/', Icon: HomeOutlinedIcon, ActiveIcon: HomeIcon },
  { label: 'Expenses', path: '/expenses', Icon: ReceiptOutlinedIcon, ActiveIcon: ReceiptIcon },
  { label: 'Budgets', path: '/budgets', Icon: PieChartOutlineIcon, ActiveIcon: PieChartIcon },
  { label: 'Goals', path: '/goals', Icon: TrackChangesOutlinedIcon, ActiveIcon: TrackChangesIcon },
  { label: 'Movies', path: '/movies', Icon: MovieOutlinedIcon, ActiveIcon: MovieIcon },
  { label: 'Insights', path: '/insights', Icon: InsightsOutlinedIcon, ActiveIcon: InsightsIcon },
  { label: 'Settings', path: '/settings', Icon: SettingsOutlinedIcon, ActiveIcon: SettingsIcon },
] as const

export interface SideNavProps {
  /** Avatar image URL for the account row. */
  avatarUrl?: string | null
  /** Display name shown in the account row and used for the avatar fallback. */
  displayName?: string | null
  /** Called when the user selects "Sign out". */
  onSignOut: () => void
}

function isActive(pathname: string, path: string): boolean {
  return path === '/' ? pathname === '/' : pathname.startsWith(path)
}

/**
 * Persistent left navigation rail shown on desktop (md and up). Replaces the
 * mobile bottom nav and top app bar with brand, full route navigation, and an
 * account/sign-out section.
 */
export function SideNav({ avatarUrl, displayName, onSignOut }: SideNavProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const initial = displayName?.trim().charAt(0).toUpperCase() || '?'

  return (
    <Drawer
      variant="permanent"
      sx={{
        display: { xs: 'none', md: 'block' },
        width: SIDE_NAV_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: SIDE_NAV_WIDTH,
          boxSizing: 'border-box',
          borderRight: 1,
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <Box sx={{ px: 3, py: 2.5 }}>
        <Typography variant="titleLarge" component="span" sx={{ color: 'primary.main', fontWeight: 600 }}>
          TwoPot
        </Typography>
      </Box>
      <Divider />

      <List sx={{ flexGrow: 1, px: 1, py: 1 }}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(location.pathname, item.path)
          const Icon = active ? item.ActiveIcon : item.Icon
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={active}
                onClick={() => navigate(item.path)}
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
          onClick={onSignOut}
          aria-label="Sign out"
          sx={{ flex: 'none', borderRadius: 2, width: 'auto', p: 1 }}
        >
          <LogoutIcon fontSize="small" />
        </ListItemButton>
      </Box>
    </Drawer>
  )
}
