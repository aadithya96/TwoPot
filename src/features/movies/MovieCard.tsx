import { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import MovieIcon from '@mui/icons-material/Movie'
import type { MovieWithRatings, Profile } from '@/types/app'
import { posterUrl, ratingForUser } from './tmdb'
import { RatingStars } from './RatingStars'
import { useRateMovie, useRemoveMovie, useSetMovieStatus } from './useMovies'

export interface MovieCardProps {
  movie: MovieWithRatings
  members: Profile[]
  currentUserId: string
}

/**
 * A single watchlist movie: poster, title/year, genres, a per-person rating row
 * for each member, and an overflow menu to toggle watched state or remove it.
 */
export function MovieCard({ movie, members, currentUserId }: MovieCardProps) {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const rateMovie = useRateMovie()
  const setStatus = useSetMovieStatus()
  const removeMovie = useRemoveMovie()

  const poster = posterUrl(movie.poster_path)
  const isWatched = movie.status === 'watched'

  const handleRate = (rating: number) => {
    rateMovie.mutate({
      movieId: movie.id,
      householdId: movie.household_id,
      userId: currentUserId,
      rating,
    })
  }

  return (
    <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ position: 'relative', aspectRatio: '2 / 3', bgcolor: 'action.hover' }}>
        {poster ? (
          <Box
            component="img"
            src={poster}
            alt={movie.title}
            loading="lazy"
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <MovieIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
          </Box>
        )}
        {isWatched && (
          <Chip
            label="Watched"
            size="small"
            color="success"
            sx={{ position: 'absolute', top: 8, left: 8 }}
          />
        )}
        <IconButton
          size="small"
          aria-label="Movie options"
          onClick={(event) => setMenuAnchor(event.currentTarget)}
          sx={{
            position: 'absolute',
            top: 4,
            right: 4,
            bgcolor: 'rgba(0,0,0,0.4)',
            color: 'common.white',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' },
          }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
        <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
          <MenuItem
            onClick={() => {
              setStatus.mutate({
                movieId: movie.id,
                householdId: movie.household_id,
                status: isWatched ? 'to_watch' : 'watched',
              })
              setMenuAnchor(null)
            }}
          >
            {isWatched ? 'Move to watchlist' : 'Mark as watched'}
          </MenuItem>
          <MenuItem
            onClick={() => {
              removeMovie.mutate({ movieId: movie.id, householdId: movie.household_id })
              setMenuAnchor(null)
            }}
            sx={{ color: 'error.main' }}
          >
            Remove
          </MenuItem>
        </Menu>
      </Box>

      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1, p: 1.5 }}>
        <Box>
          <Typography variant="titleSmall" sx={{ lineHeight: 1.2 }}>
            {movie.title}
          </Typography>
          {movie.release_year && (
            <Typography variant="bodySmall" color="text.secondary">
              {movie.release_year}
            </Typography>
          )}
        </Box>

        {movie.genres.length > 0 && (
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
            {movie.genres.slice(0, 2).map((genre) => (
              <Chip key={genre} label={genre} size="small" variant="outlined" />
            ))}
          </Stack>
        )}

        <Stack spacing={0.5} sx={{ mt: 'auto', pt: 1 }}>
          {members.map((member) => (
            <RatingStars
              key={member.id}
              name={member.display_name}
              avatarUrl={member.avatar_url}
              value={ratingForUser(movie, member.id)}
              editable={member.id === currentUserId}
              onChange={handleRate}
            />
          ))}
        </Stack>
      </CardContent>
    </Card>
  )
}
