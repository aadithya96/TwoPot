import type { MovieWithRatings } from '@/types/app'

/** A movie returned by the `tmdb` edge function (search or recommendation pool). */
export interface TmdbMovie {
  tmdbId: number
  title: string
  posterPath: string | null
  releaseYear: number | null
  overview: string
  genres: string[]
  voteAverage: number
}

/** A recommendation: a TMDB movie plus the LLM's one-line reason. */
export interface MovieRecommendation extends TmdbMovie {
  reason: string
}

/** Base CDN URL for TMDB poster images; append a poster_path (which starts with "/"). */
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'

/**
 * Builds a TMDB poster image URL, or null when there is no poster path.
 * `size` is a TMDB image size token (e.g. w185, w342, w500).
 */
export function posterUrl(posterPath: string | null | undefined, size: 'w185' | 'w342' | 'w500' = 'w342'): string | null {
  if (!posterPath) return null
  return `${TMDB_IMAGE_BASE}/${size}${posterPath}`
}

/** A member's rating for a movie, or null if they haven't rated it. */
export function ratingForUser(movie: MovieWithRatings, userId: string): number | null {
  return movie.ratings.find((r) => r.user_id === userId)?.rating ?? null
}

/** Average of both members' ratings (0 when unrated). Used to seed recommendations. */
export function averageRating(movie: MovieWithRatings): number {
  if (movie.ratings.length === 0) return 0
  return movie.ratings.reduce((sum, r) => sum + r.rating, 0) / movie.ratings.length
}

/**
 * Picks the watched movies the household liked enough to seed recommendations
 * from — those with an average rating of 3.5+ — best-loved first.
 */
export function recommendationSeeds(movies: MovieWithRatings[]): MovieWithRatings[] {
  return movies
    .filter((m) => averageRating(m) >= 3.5)
    .sort((a, b) => averageRating(b) - averageRating(a))
}
