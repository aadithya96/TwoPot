import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material'
import { useNavigate, useLocation } from 'react-router-dom'
import { APP_MAX_WIDTH } from '@/lib/layout'
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

const TABS = [
  { label: 'Home', path: '/', Icon: HomeOutlinedIcon, ActiveIcon: HomeIcon },
  { label: 'Expenses', path: '/expenses', Icon: ReceiptOutlinedIcon, ActiveIcon: ReceiptIcon },
  { label: 'Budgets', path: '/budgets', Icon: PieChartOutlineIcon, ActiveIcon: PieChartIcon },
  {
    label: 'Goals',
    path: '/goals',
    Icon: TrackChangesOutlinedIcon,
    ActiveIcon: TrackChangesIcon,
  },
  { label: 'Movies', path: '/movies', Icon: MovieOutlinedIcon, ActiveIcon: MovieIcon },
] as const

/** Fixed bottom tab bar for the four root routes, synced with the router location. */
export function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  const activeIndex = TABS.findIndex((tab) =>
    tab.path === '/' ? location.pathname === '/' : location.pathname.startsWith(tab.path)
  )

  return (
    <Paper
      elevation={3}
      sx={{
        display: { xs: 'block', md: 'none' },
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'calc(80px + env(safe-area-inset-bottom))',
        zIndex: (theme) => theme.zIndex.appBar,
      }}
    >
      <BottomNavigation
        showLabels
        value={activeIndex === -1 ? 0 : activeIndex}
        onChange={(_event, newValue: number) => {
          const tab = TABS[newValue]
          if (tab) navigate(tab.path)
        }}
        sx={{
          height: '100%',
          width: '100%',
          maxWidth: APP_MAX_WIDTH,
          mx: 'auto',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {TABS.map((tab, index) => {
          const isActive = index === activeIndex
          const Icon = isActive ? tab.ActiveIcon : tab.Icon
          return (
            <BottomNavigationAction
              key={tab.path}
              label={tab.label}
              icon={<Icon />}
              sx={{
                color: isActive ? 'primary.main' : undefined,
                '&.Mui-selected': { color: 'primary.main' },
              }}
            />
          )
        })}
      </BottomNavigation>
    </Paper>
  )
}
