import type { ReactNode } from 'react'
import { Box, Typography, Button } from '@mui/material'

export interface EmptyStateProps {
  /** Icon element rendered above the title, e.g. an MUI icon component. */
  icon: ReactNode
  /** Primary message. */
  title: string
  /** Secondary, supporting message. */
  subtitle?: string
  /** Optional call-to-action label; requires `onAction` to render. */
  actionLabel?: string
  /** Handler invoked when the action button is pressed. */
  onAction?: () => void
}

/** Centered icon + title + subtitle + optional action button for empty list states. */
export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 1,
        p: 4,
        color: 'text.secondary',
      }}
    >
      <Box sx={{ fontSize: 48, color: 'text.disabled', display: 'flex' }}>{icon}</Box>
      <Typography variant="titleMedium" color="text.primary">
        {title}
      </Typography>
      {subtitle && <Typography variant="bodyMedium">{subtitle}</Typography>}
      {actionLabel && onAction && (
        <Button variant="outlined" onClick={onAction} sx={{ mt: 1 }}>
          {actionLabel}
        </Button>
      )}
    </Box>
  )
}
