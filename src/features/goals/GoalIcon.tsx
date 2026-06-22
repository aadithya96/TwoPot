import type { SvgIconProps } from '@mui/material'
import { Box } from '@mui/material'
import Savings from '@mui/icons-material/Savings'
import { GOAL_ICONS } from './goalIcons'

export interface GoalIconProps extends SvgIconProps {
  /** The stored goal icon value — a registry key, or any other string (e.g. an emoji). */
  icon: string | null | undefined
}

/**
 * Renders a savings goal's icon. If `icon` is a known registry key it renders
 * that vector icon; otherwise it falls back to rendering the raw string (so any
 * legacy emoji value still displays), or a default piggy-bank when empty.
 */
export function GoalIcon({ icon, ...props }: GoalIconProps) {
  const Icon = icon ? GOAL_ICONS[icon] : undefined
  if (Icon) return <Icon {...props} />

  if (!icon) {
    return <Savings {...props} />
  }

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
        fontSize: props.fontSize === 'small' ? '1rem' : '1.25rem',
      }}
    >
      {icon}
    </Box>
  )
}
