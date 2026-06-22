import type { SvgIconProps } from '@mui/material'
import type { ComponentType } from 'react'
import Flight from '@mui/icons-material/Flight'
import Home from '@mui/icons-material/Home'
import DirectionsCar from '@mui/icons-material/DirectionsCar'
import School from '@mui/icons-material/School'
import Favorite from '@mui/icons-material/Favorite'
import BeachAccess from '@mui/icons-material/BeachAccess'
import Savings from '@mui/icons-material/Savings'
import Celebration from '@mui/icons-material/Celebration'
import Flag from '@mui/icons-material/Flag'

/**
 * Registry mapping the icon keys stored on `savings_goals.icon` to their
 * components. Goals store a short key (e.g. `'flight'`) — or the legacy default
 * `'Flag'` — rather than an emoji, so display surfaces resolve through this map.
 */
export const GOAL_ICONS: Record<string, ComponentType<SvgIconProps>> = {
  flight: Flight,
  home: Home,
  car: DirectionsCar,
  school: School,
  favorite: Favorite,
  beach: BeachAccess,
  savings: Savings,
  celebration: Celebration,
  Flag,
}

/** Ordered icon keys offered when picking an icon for a goal. */
export const GOAL_ICON_KEYS = ['flight', 'home', 'car', 'school', 'favorite', 'beach', 'savings', 'celebration']
