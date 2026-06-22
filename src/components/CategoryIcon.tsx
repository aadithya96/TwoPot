import type { SvgIconProps } from '@mui/material'
import { Box } from '@mui/material'
import CircleOutlinedIcon from '@mui/icons-material/CircleOutlined'
import { CATEGORY_ICONS } from './categoryIcons'

export interface CategoryIconProps extends SvgIconProps {
  /** The stored icon value — a registry name, or any other string (e.g. an emoji). */
  icon: string | null | undefined
}

/**
 * Renders a category's icon. If `icon` is a known `@mui/icons-material` export
 * name it renders that vector icon; otherwise it falls back to rendering the
 * raw string (so legacy emoji values still display) inside an aligned box.
 */
export function CategoryIcon({ icon, ...props }: CategoryIconProps) {
  const Icon = icon ? CATEGORY_ICONS[icon] : undefined
  if (Icon) return <Icon {...props} />

  if (!icon) {
    return <CircleOutlinedIcon {...props} />
  }

  // Legacy / emoji fallback: render the text so it lines up like an icon.
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
