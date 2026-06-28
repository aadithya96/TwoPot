import { useMutation, type UseMutationResult } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { MovieWithRatings, Profile } from '@/types/app'
import type { MovieRecommendation } from './tmdb'

interface RecommendResponse {
  results: MovieRecommendation[]
  reason?: string
}

/** Result of a recommendation run: the picks plus an optional "why empty" reason. */
export interface RecommendationResult {
  results: MovieRecommendation[]
  reason?: 'not_enough_ratings' | 'no_candidates'
}

function displayName(members: Profile[], userId: string): string {
  return members.find((m) => m.id === userId)?.display_name ?? 'Someone'
}

/**
 * Runs the hybrid recommendation engine via the `recommend-movies` edge
 * function: it pulls a TMDB candidate pool from the household's favourites and
 * has Claude rank it for both people. We send the rated movies (with each
 * member's score) and the full set of watchlist TMDB ids to exclude.
 */
export function useMovieRecommendations(): UseMutationResult<
  RecommendationResult,
  Error,
  { movies: MovieWithRatings[]; members: Profile[] }
> {
  return useMutation({
    mutationFn: async ({ movies, members }): Promise<RecommendationResult> => {
      const ratedMovies = movies
        .filter((m) => m.ratings.length > 0)
        .map((m) => ({
          tmdbId: m.tmdb_id,
          title: m.title,
          genres: m.genres,
          ratings: m.ratings.map((r) => ({ name: displayName(members, r.user_id), rating: r.rating })),
        }))

      const { data, error } = await supabase.functions.invoke<RecommendResponse>('recommend-movies', {
        body: {
          ratedMovies,
          excludeTmdbIds: movies.map((m) => m.tmdb_id),
        },
      })
      if (error) throw error
      return {
        results: data?.results ?? [],
        reason: data?.reason as RecommendationResult['reason'],
      }
    },
  })
}
