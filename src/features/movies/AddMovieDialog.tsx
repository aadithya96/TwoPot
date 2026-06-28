import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material'
import MovieIcon from '@mui/icons-material/Movie'
import { posterUrl, type TmdbMovie } from './tmdb'
import { useTmdbSearch } from './useTmdbSearch'
import { useAddMovie } from './useMovies'

export interface AddMovieDialogProps {
  open: boolean
  onClose: () => void
  householdId: string
  userId: string
  /** TMDB ids already on the watchlist, so they show as added rather than addable. */
  existingTmdbIds: number[]
}

/** Dialog to search TMDB and add a movie to the shared watchlist. */
export function AddMovieDialog({ open, onClose, householdId, userId, existingTmdbIds }: AddMovieDialogProps) {
  const [query, setQuery] = useState('')
  const [wasOpen, setWasOpen] = useState(open)
  const search = useTmdbSearch()
  const addMovie = useAddMovie()
  // mutate is referentially stable in React Query v5, so it's a safe effect dep.
  const { mutate: runSearch } = search

  // Reset the query when the dialog opens (adjust-state-during-render pattern,
  // matching CreateGoalDialog). Stale results are hidden by gating on `query`.
  if (open && !wasOpen) {
    setWasOpen(true)
    setQuery('')
  } else if (!open && wasOpen) {
    setWasOpen(false)
  }

  // Debounce the query: search 400ms after the user stops typing.
  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed === '') return
    const handle = setTimeout(() => runSearch(trimmed), 400)
    return () => clearTimeout(handle)
  }, [query, runSearch])

  const existing = new Set(existingTmdbIds)
  // Only surface results once there's a query, so a prior session's matches
  // don't flash when the dialog reopens.
  const results: TmdbMovie[] = query.trim() === '' ? [] : (search.data ?? [])

  const handleAdd = (movie: TmdbMovie) => {
    addMovie.mutate({ householdId, userId, movie })
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add a movie</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          placeholder="Search for a movie…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          sx={{ mt: 1 }}
        />

        {search.isPending && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {search.isError && (
          <Typography color="error" variant="bodyMedium" sx={{ py: 2 }}>
            Search failed. Check that TMDB is configured and try again.
          </Typography>
        )}

        {!search.isPending && query.trim() !== '' && results.length === 0 && search.isSuccess && (
          <Typography color="text.secondary" variant="bodyMedium" sx={{ py: 2 }}>
            No matches found.
          </Typography>
        )}

        <List>
          {results.map((movie) => {
            const poster = posterUrl(movie.posterPath, 'w185')
            const alreadyAdded = existing.has(movie.tmdbId)
            return (
              <ListItem
                key={movie.tmdbId}
                secondaryAction={
                  <Button
                    size="small"
                    variant={alreadyAdded ? 'text' : 'contained'}
                    disabled={alreadyAdded || addMovie.isPending}
                    onClick={() => handleAdd(movie)}
                  >
                    {alreadyAdded ? 'Added' : 'Add'}
                  </Button>
                }
              >
                <ListItemAvatar>
                  {poster ? (
                    <Box
                      component="img"
                      src={poster}
                      alt={movie.title}
                      loading="lazy"
                      sx={{ width: 40, height: 60, objectFit: 'cover', borderRadius: 1 }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: 40,
                        height: 60,
                        borderRadius: 1,
                        bgcolor: 'action.hover',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <MovieIcon sx={{ color: 'text.disabled' }} />
                    </Box>
                  )}
                </ListItemAvatar>
                <ListItemText
                  primary={movie.title}
                  secondary={
                    [movie.releaseYear, movie.genres.slice(0, 2).join(', ')].filter(Boolean).join(' · ') ||
                    undefined
                  }
                  sx={{ pr: 8 }}
                />
              </ListItem>
            )
          })}
        </List>
      </DialogContent>
    </Dialog>
  )
}
