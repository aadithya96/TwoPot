import { Avatar, Box, Rating, Typography } from '@mui/material'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'

export interface RatingStarsProps {
  /** Display name of the person whose rating this row shows. */
  name: string
  /** Their avatar image URL, if any. */
  avatarUrl?: string | null
  /** Their current rating (1-5), or null if unrated. */
  value: number | null
  /** When false, the stars are read-only (the partner's rating). */
  editable: boolean
  /** Called with the new rating when an editable row changes (never null). */
  onChange?: (rating: number) => void
}

/**
 * One person's star rating for a movie: their avatar, name, and a 5-star control.
 * Editable for the current user, read-only for their partner.
 */
export function RatingStars({ name, avatarUrl, value, editable, onChange }: RatingStarsProps) {
  const initial = name.trim().charAt(0).toUpperCase() || '?'
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Avatar src={avatarUrl ?? undefined} alt={name} sx={{ width: 24, height: 24, fontSize: 12 }}>
        {avatarUrl ? null : initial}
      </Avatar>
      <Typography variant="bodySmall" color="text.secondary" sx={{ minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {name}
      </Typography>
      <Rating
        name={`rating-${name}`}
        size="small"
        value={value}
        readOnly={!editable}
        emptyIcon={<StarBorderIcon fontSize="inherit" />}
        icon={<StarIcon fontSize="inherit" />}
        onChange={(_event, next) => {
          if (editable && next != null) onChange?.(next)
        }}
      />
    </Box>
  )
}
