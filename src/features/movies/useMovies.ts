import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import type { MovieWithRatings } from '@/types/app'
import type { TmdbMovie } from './tmdb'

/** Fetches the household's watchlist with both members' ratings embedded, newest first. */
export function useMovies(householdId: string | undefined): UseQueryResult<MovieWithRatings[]> {
  return useQuery({
    queryKey: queryKeys.movies(householdId ?? 'anonymous'),
    queryFn: async (): Promise<MovieWithRatings[]> => {
      if (!householdId) return []
      const { data, error } = await supabase
        .from('movies')
        .select('*, ratings:movie_ratings(*)')
        .eq('household_id', householdId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as MovieWithRatings[]
    },
    enabled: Boolean(householdId),
  })
}

/** Input for adding a TMDB movie to a household's watchlist. */
export interface AddMovieInput {
  householdId: string
  userId: string
  movie: TmdbMovie
}

/**
 * Adds a movie to the watchlist, capturing its TMDB metadata at add time.
 * Relies on the `(household_id, tmdb_id)` unique constraint to dedupe.
 */
export function useAddMovie() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ householdId, userId, movie }: AddMovieInput): Promise<void> => {
      const { error } = await supabase.from('movies').insert({
        household_id: householdId,
        tmdb_id: movie.tmdbId,
        title: movie.title,
        poster_path: movie.posterPath,
        release_year: movie.releaseYear,
        overview: movie.overview,
        genres: movie.genres,
        added_by: userId,
      })
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.movies(variables.householdId) })
    },
  })
}

/** Removes a movie (and its ratings, via cascade) from the watchlist. */
export function useRemoveMovie() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ movieId }: { movieId: string; householdId: string }): Promise<void> => {
      const { error } = await supabase.from('movies').delete().eq('id', movieId)
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.movies(variables.householdId) })
    },
  })
}

/** Marks a movie as watched or back to "to watch", stamping watched_at accordingly. */
export function useSetMovieStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      movieId,
      status,
    }: {
      movieId: string
      householdId: string
      status: 'to_watch' | 'watched'
    }): Promise<void> => {
      const { error } = await supabase
        .from('movies')
        .update({
          status,
          watched_at: status === 'watched' ? new Date().toISOString() : null,
        })
        .eq('id', movieId)
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.movies(variables.householdId) })
    },
  })
}

/** Input for setting a member's rating on a movie. */
export interface RateMovieInput {
  movieId: string
  householdId: string
  userId: string
  rating: number
}

/**
 * Upserts the current member's 1-5 rating for a movie (one row per member per
 * movie, keyed by the `(movie_id, user_id)` unique constraint).
 */
export function useRateMovie() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ movieId, householdId, userId, rating }: RateMovieInput): Promise<void> => {
      const { error } = await supabase.from('movie_ratings').upsert(
        {
          movie_id: movieId,
          household_id: householdId,
          user_id: userId,
          rating,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'movie_id,user_id' }
      )
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.movies(variables.householdId) })
    },
  })
}
