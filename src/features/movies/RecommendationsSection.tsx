import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import MovieIcon from '@mui/icons-material/Movie'
import type { MovieWithRatings, Profile } from '@/types/app'
import { posterUrl, type MovieRecommendation, type TmdbMovie } from './tmdb'
import { useMovieRecommendations } from './useMovieRecommendations'
import { useAddMovie } from './useMovies'

export interface RecommendationsSectionProps {
  movies: MovieWithRatings[]
  members: Profile[]
  householdId: string
  userId: string
}

const EMPTY_REASON: Record<string, string> = {
  not_enough_ratings:
    'Rate a few watched movies first — once you both score some favourites, we can suggest what to watch next.',
  no_candidates: "Couldn't find fresh suggestions from your current favourites. Try rating a few more movies.",
}

/**
 * The "For you" tab: runs the hybrid TMDB + Claude recommendation engine on
 * demand and shows reasoned picks both partners are likely to enjoy, each
 * addable to the watchlist in one tap.
 */
export function RecommendationsSection({ movies, members, householdId, userId }: RecommendationsSectionProps) {
  const recommend = useMovieRecommendations()
  const addMovie = useAddMovie()

  const existing = new Set(movies.map((m) => m.tmdb_id))
  const result = recommend.data

  const handleGenerate = () => {
    recommend.mutate({ movies, members })
  }

  const handleAdd = (rec: MovieRecommendation) => {
    const movie: TmdbMovie = {
      tmdbId: rec.tmdbId,
      title: rec.title,
      posterPath: rec.posterPath,
      releaseYear: rec.releaseYear,
      overview: rec.overview,
      genres: rec.genres,
      voteAverage: rec.voteAverage,
    }
    addMovie.mutate({ householdId, userId, movie })
  }

  return (
    <Box>
      <Stack spacing={1} sx={{ alignItems: 'center', textAlign: 'center', py: 2 }}>
        <Typography variant="bodyMedium" color="text.secondary">
          Smart picks for the two of you, based on what you&apos;ve both rated highly.
        </Typography>
        <Button
          variant="contained"
          startIcon={recommend.isPending ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
          disabled={recommend.isPending}
          onClick={handleGenerate}
        >
          {result ? 'Refresh picks' : 'Get recommendations'}
        </Button>
      </Stack>

      {recommend.isError && (
        <Typography color="error" variant="bodyMedium" align="center" sx={{ py: 2 }}>
          Couldn&apos;t generate recommendations right now. Please try again.
        </Typography>
      )}

      {result && result.results.length === 0 && (
        <Typography color="text.secondary" variant="bodyMedium" align="center" sx={{ py: 4, px: 2 }}>
          {EMPTY_REASON[result.reason ?? ''] ?? 'No suggestions yet — rate a few movies and try again.'}
        </Typography>
      )}

      <Stack spacing={1.5} sx={{ mt: 1 }}>
        {(result?.results ?? []).map((rec) => {
          const poster = posterUrl(rec.posterPath, 'w185')
          const alreadyAdded = existing.has(rec.tmdbId)
          return (
            <Card key={rec.tmdbId}>
              <CardContent sx={{ display: 'flex', gap: 1.5, p: 1.5, '&:last-child': { pb: 1.5 } }}>
                {poster ? (
                  <Box
                    component="img"
                    src={poster}
                    alt={rec.title}
                    loading="lazy"
                    sx={{ width: 60, height: 90, objectFit: 'cover', borderRadius: 1, flexShrink: 0 }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: 60,
                      height: 90,
                      borderRadius: 1,
                      bgcolor: 'action.hover',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <MovieIcon sx={{ color: 'text.disabled' }} />
                  </Box>
                )}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="titleSmall">
                    {rec.title}
                    {rec.releaseYear ? ` (${rec.releaseYear})` : ''}
                  </Typography>
                  <Typography variant="bodySmall" color="text.secondary" sx={{ mt: 0.5 }}>
                    {rec.reason}
                  </Typography>
                  <Button
                    size="small"
                    sx={{ mt: 1 }}
                    variant={alreadyAdded ? 'text' : 'outlined'}
                    disabled={alreadyAdded || addMovie.isPending}
                    onClick={() => handleAdd(rec)}
                  >
                    {alreadyAdded ? 'On your list' : 'Add to watchlist'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )
        })}
      </Stack>
    </Box>
  )
}
