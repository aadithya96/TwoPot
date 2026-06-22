import type { SvgIconProps } from '@mui/material'
import type { ComponentType } from 'react'
import RestaurantOutlinedIcon from '@mui/icons-material/RestaurantOutlined'
import DirectionsCarOutlinedIcon from '@mui/icons-material/DirectionsCarOutlined'
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined'
import FavoriteOutlinedIcon from '@mui/icons-material/FavoriteOutlined'
import TheatersOutlinedIcon from '@mui/icons-material/TheatersOutlined'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined'
import FlightOutlinedIcon from '@mui/icons-material/FlightOutlined'
import MoreHorizOutlinedIcon from '@mui/icons-material/MoreHorizOutlined'
import CircleOutlinedIcon from '@mui/icons-material/CircleOutlined'
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined'
import LocalCafeOutlinedIcon from '@mui/icons-material/LocalCafeOutlined'
import FitnessCenterOutlinedIcon from '@mui/icons-material/FitnessCenterOutlined'
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined'
import PetsOutlinedIcon from '@mui/icons-material/PetsOutlined'
import CardGiftcardOutlinedIcon from '@mui/icons-material/CardGiftcardOutlined'
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined'
import PhoneIphoneOutlinedIcon from '@mui/icons-material/PhoneIphoneOutlined'
import CheckroomOutlinedIcon from '@mui/icons-material/CheckroomOutlined'
import ChildCareOutlinedIcon from '@mui/icons-material/ChildCareOutlined'
import LocalHospitalOutlinedIcon from '@mui/icons-material/LocalHospitalOutlined'

/**
 * Registry mapping the `@mui/icons-material` export names stored in
 * `categories.icon` to their components. Categories store an icon *name*
 * (e.g. `'RestaurantOutlined'`) rather than an emoji, so display surfaces
 * resolve the name through this map.
 */
export const CATEGORY_ICONS: Record<string, ComponentType<SvgIconProps>> = {
  RestaurantOutlined: RestaurantOutlinedIcon,
  DirectionsCarOutlined: DirectionsCarOutlinedIcon,
  BoltOutlined: BoltOutlinedIcon,
  FavoriteOutlined: FavoriteOutlinedIcon,
  TheatersOutlined: TheatersOutlinedIcon,
  ShoppingCartOutlined: ShoppingCartOutlinedIcon,
  HomeOutlined: HomeOutlinedIcon,
  PersonOutlined: PersonOutlinedIcon,
  FlightOutlined: FlightOutlinedIcon,
  MoreHorizOutlined: MoreHorizOutlinedIcon,
  CircleOutlined: CircleOutlinedIcon,
  CategoryOutlined: CategoryOutlinedIcon,
  LocalCafeOutlined: LocalCafeOutlinedIcon,
  FitnessCenterOutlined: FitnessCenterOutlinedIcon,
  SchoolOutlined: SchoolOutlinedIcon,
  PetsOutlined: PetsOutlinedIcon,
  CardGiftcardOutlined: CardGiftcardOutlinedIcon,
  SavingsOutlined: SavingsOutlinedIcon,
  PhoneIphoneOutlined: PhoneIphoneOutlinedIcon,
  CheckroomOutlined: CheckroomOutlinedIcon,
  ChildCareOutlined: ChildCareOutlinedIcon,
  LocalHospitalOutlined: LocalHospitalOutlinedIcon,
}

/** Ordered icon names offered when picking an icon for a category. */
export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS)
