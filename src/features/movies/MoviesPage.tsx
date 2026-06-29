import { useState } from 'react'
import { Box, Fab, Skeleton, Stack, Tab, Tabs, Typography } from '@mui/material'
import Add from '@mui/icons-material/Add'
import { useHouseholdStore } from '@/stores/householdStore'
import { useCurrentUser } from '@/features/auth/useAuth'
import { useMovies } from './useMovies'
import { useRealtimeMovies } from './useRealtimeMovies'
import { MovieCard } from './MovieCard'
import { AddMovieDialog } from './AddMovieDialog'
import { RecommendationsSection } from './RecommendationsSection'

type TabValue = 'to_watch' | 'watched' | 'for_you'

/**
 * Movies hub: a shared watchlist with "To watch" and "Watched" tabs (each a
 * card grid with per-person ratings), plus a "For you" tab driving the hybrid
 * recommendation engine. A FAB opens TMDB search to add titles.
 */
export function MoviesPage() {
  const householdId = useHouseholdStore((state) => state.householdId)
  const members = useHouseholdStore((state) => state.members)
  const { data: currentUser } = useCurrentUser()
  const { data: movies, isLoading } = useMovies(householdId ?? undefined)
  const [tab, setTab] = useState<TabValue>('to_watch')
  const [dialogOpen, setDialogOpen] = useState(false)

  useRealtimeMovies(householdId ?? undefined)

  if (!householdId || !currentUser) return null

  const allMovies = movies ?? []
  const toWatch = allMovies.filter((m) => m.status === 'to_watch')
  const watched = allMovies.filter((m) => m.status === 'watched')
  const shown = tab === 'watched' ? watched : toWatch

  const emptyCopy =
    tab === 'watched'
      ? 'No watched movies yet. Mark something as watched to rate it.'
      : 'Nothing on the watchlist yet. Tap + to add a movie you both want to see.'

  return (
    <Box sx={{ p: 2, pb: 10, position: 'relative', minHeight: '100%' }}>
      <Tabs
        value={tab}
        onChange={(_event, next: TabValue) => setTab(next)}
        variant="fullWidth"
        sx={{ mb: 2 }}
      >
        <Tab label="To watch" value="to_watch" />
        <Tab label="Watched" value="watched" />
        <Tab label="For you" value="for_you" />
      </Tabs>

      {tab === 'for_you' ? (
        <RecommendationsSection
          movies={allMovies}
          members={members}
          householdId={householdId}
          userId={currentUser.id}
        />
      ) : isLoading ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 2,
          }}
        >
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} variant="rounded" sx={{ aspectRatio: '2 / 3' }} />
          ))}
        </Box>
      ) : shown.length === 0 ? (
        <Stack spacing={1} sx={{ alignItems: 'center', py: 8 }}>
          <Typography variant="titleMedium">
            {tab === 'watched' ? 'No watched movies' : 'Your watchlist is empty'}
          </Typography>
          <Typography variant="bodyMedium" color="text.secondary" align="center">
            {emptyCopy}
          </Typography>
        </Stack>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 2,
          }}
        >
          {shown.map((movie) => (
            <MovieCard key={movie.id} movie={movie} members={members} currentUserId={currentUser.id} />
          ))}
        </Box>
      )}

      {tab !== 'for_you' && (
        <Fab
          color="primary"
          onClick={() => setDialogOpen(true)}
          sx={{ position: 'fixed', bottom: { xs: 96, md: 32 }, right: { xs: 16, md: 32 } }}
          aria-label="Add movie"
        >
          <Add />
        </Fab>
      )}

      <AddMovieDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        householdId={householdId}
        userId={currentUser.id}
        existingTmdbIds={allMovies.map((m) => m.tmdb_id)}
      />
    </Box>
  )
}
