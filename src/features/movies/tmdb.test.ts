import { describe, expect, it } from 'vitest'
import type { MovieWithRatings, MovieRating } from '@/types/app'
import { averageRating, posterUrl, ratingForUser, recommendationSeeds } from './tmdb'

function rating(userId: string, value: number): MovieRating {
  return {
    id: `r-${userId}`,
    movie_id: 'm1',
    household_id: 'h1',
    user_id: userId,
    rating: value,
    created_at: '',
    updated_at: '',
  }
}

function movie(id: string, ratings: MovieRating[]): MovieWithRatings {
  return {
    id,
    household_id: 'h1',
    tmdb_id: Number(id.replace(/\D/g, '')) || 0,
    title: `Movie ${id}`,
    poster_path: null,
    release_year: 2020,
    overview: '',
    genres: [],
    added_by: 'a',
    status: 'watched',
    watched_at: null,
    created_at: '',
    ratings,
  }
}

describe('posterUrl', () => {
  it('builds a CDN url at the requested size', () => {
    expect(posterUrl('/abc.jpg', 'w500')).toBe('https://image.tmdb.org/t/p/w500/abc.jpg')
  })

  it('defaults to w342', () => {
    expect(posterUrl('/abc.jpg')).toBe('https://image.tmdb.org/t/p/w342/abc.jpg')
  })

  it('returns null when there is no poster path', () => {
    expect(posterUrl(null)).toBeNull()
    expect(posterUrl(undefined)).toBeNull()
    expect(posterUrl('')).toBeNull()
  })
})

describe('ratingForUser', () => {
  it('returns the matching user rating', () => {
    const m = movie('m1', [rating('u1', 4), rating('u2', 2)])
    expect(ratingForUser(m, 'u1')).toBe(4)
    expect(ratingForUser(m, 'u2')).toBe(2)
  })

  it('returns null when the user has not rated', () => {
    expect(ratingForUser(movie('m1', []), 'u1')).toBeNull()
  })
})

describe('averageRating', () => {
  it('averages both members ratings', () => {
    expect(averageRating(movie('m1', [rating('u1', 5), rating('u2', 4)]))).toBe(4.5)
  })

  it('is 0 when unrated', () => {
    expect(averageRating(movie('m1', []))).toBe(0)
  })
})

describe('recommendationSeeds', () => {
  it('keeps only movies averaging 3.5+, best first', () => {
    const loved = movie('m1', [rating('u1', 5), rating('u2', 4)]) // 4.5
    const ok = movie('m2', [rating('u1', 4), rating('u2', 3)]) // 3.5
    const meh = movie('m3', [rating('u1', 2), rating('u2', 3)]) // 2.5
    const unrated = movie('m4', [])

    const seeds = recommendationSeeds([ok, meh, loved, unrated])
    expect(seeds.map((m) => m.id)).toEqual(['m1', 'm2'])
  })
})
