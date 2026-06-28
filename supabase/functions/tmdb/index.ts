// supabase/functions/tmdb/index.ts
//
// Deno Edge Function. Server-side proxy for The Movie Database (TMDB) so the
// API key never reaches the browser. Two actions:
//   { action: 'search', query }      -> movie search for the add-movie dialog
//   { action: 'recommendations', tmdbIds } -> a candidate pool seeded from the
//        household's highly-rated movies, used by the recommend-movies function.
//
// Requires a TMDB_API_KEY secret (a v3 API key from https://www.themoviedb.org/
// settings/api). Poster paths are returned raw; the client prepends the TMDB
// image CDN base URL.

const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY')
const TMDB_BASE = 'https://api.themoviedb.org/3'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const JSON_HEADERS = { ...CORS_HEADERS, 'Content-Type': 'application/json' }

/** A movie as the client consumes it: TMDB raw fields flattened to our shape. */
interface MovieResult {
  tmdbId: number
  title: string
  posterPath: string | null
  releaseYear: number | null
  overview: string
  genres: string[]
  voteAverage: number
}

interface TmdbMovie {
  id: number
  title?: string
  poster_path?: string | null
  release_date?: string
  overview?: string
  vote_average?: number
  genre_ids?: number[]
  genres?: { id: number; name: string }[]
}

// TMDB genre id -> name. Stable, public list; inlined to avoid a /genre/movie/list
// round-trip on every request. Search/recommendation results return genre_ids.
const GENRE_NAMES: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
}

function toMovieResult(movie: TmdbMovie): MovieResult {
  const releaseYear = movie.release_date ? Number(movie.release_date.slice(0, 4)) || null : null
  const genres = movie.genres
    ? movie.genres.map((g) => g.name)
    : (movie.genre_ids ?? []).map((id) => GENRE_NAMES[id]).filter((name): name is string => Boolean(name))
  return {
    tmdbId: movie.id,
    title: movie.title ?? 'Untitled',
    posterPath: movie.poster_path ?? null,
    releaseYear,
    overview: movie.overview ?? '',
    genres,
    voteAverage: typeof movie.vote_average === 'number' ? movie.vote_average : 0,
  }
}

async function tmdbGet(path: string, params: Record<string, string>): Promise<unknown> {
  const url = new URL(`${TMDB_BASE}${path}`)
  url.searchParams.set('api_key', TMDB_API_KEY!)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  const response = await fetch(url, { headers: { accept: 'application/json' } })
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`TMDB ${response.status}: ${detail}`)
  }
  return response.json()
}

async function search(query: string): Promise<MovieResult[]> {
  const data = (await tmdbGet('/search/movie', {
    query,
    include_adult: 'false',
    language: 'en-US',
    page: '1',
  })) as { results?: TmdbMovie[] }
  return (data.results ?? []).slice(0, 12).map(toMovieResult)
}

/**
 * Builds a deduplicated candidate pool from TMDB's per-movie recommendations,
 * seeded by the supplied tmdbIds (the household's favourites). Excludes the
 * seeds themselves so we never recommend a movie already on the list.
 */
async function recommendations(seedIds: number[]): Promise<MovieResult[]> {
  const seeds = seedIds.slice(0, 8)
  const lists = await Promise.all(
    seeds.map(async (id) => {
      try {
        const data = (await tmdbGet(`/movie/${id}/recommendations`, {
          language: 'en-US',
          page: '1',
        })) as { results?: TmdbMovie[] }
        return data.results ?? []
      } catch {
        return [] as TmdbMovie[]
      }
    })
  )

  const seedSet = new Set(seeds)
  const byId = new Map<number, MovieResult>()
  for (const list of lists) {
    for (const movie of list) {
      if (seedSet.has(movie.id) || byId.has(movie.id)) continue
      byId.set(movie.id, toMovieResult(movie))
    }
  }
  // Strongest candidates first so the LLM ranker sees the best options even if
  // we cap the pool downstream.
  return [...byId.values()].sort((a, b) => b.voteAverage - a.voteAverage).slice(0, 40)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS })
  }
  if (!TMDB_API_KEY) {
    return new Response(JSON.stringify({ error: 'TMDB_API_KEY is not configured' }), {
      status: 500,
      headers: JSON_HEADERS,
    })
  }

  let body: { action?: string; query?: string; tmdbIds?: number[] }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Expected a JSON body' }), {
      status: 400,
      headers: JSON_HEADERS,
    })
  }

  try {
    if (body.action === 'search') {
      const query = typeof body.query === 'string' ? body.query.trim() : ''
      if (query === '') {
        return new Response(JSON.stringify({ results: [] }), { headers: JSON_HEADERS })
      }
      return new Response(JSON.stringify({ results: await search(query) }), { headers: JSON_HEADERS })
    }

    if (body.action === 'recommendations') {
      const ids = Array.isArray(body.tmdbIds)
        ? body.tmdbIds.filter((id): id is number => typeof id === 'number' && Number.isFinite(id))
        : []
      if (ids.length === 0) {
        return new Response(JSON.stringify({ results: [] }), { headers: JSON_HEADERS })
      }
      return new Response(JSON.stringify({ results: await recommendations(ids) }), {
        headers: JSON_HEADERS,
      })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: JSON_HEADERS,
    })
  } catch (error) {
    console.error(`tmdb function error: ${error instanceof Error ? error.message : String(error)}`)
    return new Response(JSON.stringify({ error: 'TMDB request failed' }), {
      status: 502,
      headers: JSON_HEADERS,
    })
  }
})
