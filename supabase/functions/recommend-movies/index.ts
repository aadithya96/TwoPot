// supabase/functions/recommend-movies/index.ts
//
// Deno Edge Function. The hybrid recommendation engine for a household's two
// movie-watchers:
//   1. TMDB generates a candidate pool by pulling /movie/{id}/recommendations
//      for the movies the pair rated highly (real, fetchable movies only — this
//      is what prevents the LLM from inventing titles).
//   2. Claude ranks that pool for *both* people's tastes and writes a one-line
//      reason per pick, returning the chosen TMDB ids.
//   3. We validate the returned ids against the pool and hydrate them with the
//      candidate metadata before responding.
//
// Requires TMDB_API_KEY (shared with the `tmdb` function) and ANTHROPIC_API_KEY
// (shared with parse-expense / scan-receipt).

const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY')
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const ANTHROPIC_MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-haiku-4-5-20251001'
const TMDB_BASE = 'https://api.themoviedb.org/3'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const JSON_HEADERS = { ...CORS_HEADERS, 'Content-Type': 'application/json' }

const GENRE_NAMES: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance',
  878: 'Science Fiction', 10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
}

interface Candidate {
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
}

/** A movie the household has already rated, with each member's score. */
interface RatedMovie {
  tmdbId: number
  title: string
  genres: string[]
  ratings: { name: string; rating: number }[]
}

interface RequestBody {
  ratedMovies: RatedMovie[]
  // tmdbIds already on the watchlist (rated or not) — never recommend these.
  excludeTmdbIds: number[]
}

function toCandidate(movie: TmdbMovie): Candidate {
  const releaseYear = movie.release_date ? Number(movie.release_date.slice(0, 4)) || null : null
  return {
    tmdbId: movie.id,
    title: movie.title ?? 'Untitled',
    posterPath: movie.poster_path ?? null,
    releaseYear,
    overview: movie.overview ?? '',
    genres: (movie.genre_ids ?? [])
      .map((id) => GENRE_NAMES[id])
      .filter((name): name is string => Boolean(name)),
    voteAverage: typeof movie.vote_average === 'number' ? movie.vote_average : 0,
  }
}

async function tmdbRecommendations(seedId: number): Promise<TmdbMovie[]> {
  const url = new URL(`${TMDB_BASE}/movie/${seedId}/recommendations`)
  url.searchParams.set('api_key', TMDB_API_KEY!)
  url.searchParams.set('language', 'en-US')
  url.searchParams.set('page', '1')
  try {
    const response = await fetch(url, { headers: { accept: 'application/json' } })
    if (!response.ok) return []
    const data = (await response.json()) as { results?: TmdbMovie[] }
    return data.results ?? []
  } catch {
    return []
  }
}

/** Average rating across both members for a movie (drives seed selection). */
function avgRating(movie: RatedMovie): number {
  if (movie.ratings.length === 0) return 0
  return movie.ratings.reduce((sum, r) => sum + r.rating, 0) / movie.ratings.length
}

async function buildCandidatePool(
  ratedMovies: RatedMovie[],
  exclude: Set<number>
): Promise<Candidate[]> {
  // Seed from the most-loved movies first; cap the number of TMDB calls.
  const seeds = [...ratedMovies]
    .filter((m) => avgRating(m) >= 3.5)
    .sort((a, b) => avgRating(b) - avgRating(a))
    .slice(0, 8)

  const lists = await Promise.all(seeds.map((seed) => tmdbRecommendations(seed.tmdbId)))

  const byId = new Map<number, Candidate>()
  for (const list of lists) {
    for (const movie of list) {
      if (exclude.has(movie.id) || byId.has(movie.id)) continue
      byId.set(movie.id, toCandidate(movie))
    }
  }
  return [...byId.values()].sort((a, b) => b.voteAverage - a.voteAverage).slice(0, 30)
}

function buildTasteSummary(ratedMovies: RatedMovie[]): string {
  const lines = ratedMovies.map((m) => {
    const scores = m.ratings.map((r) => `${r.name}: ${r.rating}/5`).join(', ')
    const genres = m.genres.length > 0 ? ` [${m.genres.join(', ')}]` : ''
    return `- ${m.title}${genres} — ${scores}`
  })
  return lines.join('\n')
}

function buildPrompt(ratedMovies: RatedMovie[], candidates: Candidate[]): string {
  const taste = buildTasteSummary(ratedMovies)
  const pool = candidates
    .map(
      (c) =>
        `${c.tmdbId} | ${c.title}${c.releaseYear ? ` (${c.releaseYear})` : ''} | ${c.genres.join(', ') || 'n/a'} | ${c.overview.slice(0, 180)}`
    )
    .join('\n')

  return (
    'You recommend movies for two people who watch together. Here is how they ' +
    'have rated movies so far (1-5 each):\n\n' +
    `${taste}\n\n` +
    'Below is a pool of candidate movies, one per line as ' +
    '"tmdbId | title (year) | genres | overview". Pick the 6 that BOTH people are ' +
    'most likely to enjoy together, balancing their tastes rather than favouring ' +
    'one person. Only choose from the pool.\n\n' +
    `${pool}\n\n` +
    'Respond with ONLY a JSON array (no markdown, no prose) of the form ' +
    '[{"tmdbId": number, "reason": string}], where "reason" is one short sentence ' +
    '(max ~20 words) on why it suits the two of them. Return at most 6 items.'
  )
}

interface RankedPick {
  tmdbId: number
  reason: string
}

function parseModelJson(text: string): RankedPick[] {
  const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  const parsed = JSON.parse(cleaned) as unknown
  if (!Array.isArray(parsed)) return []
  return parsed
    .filter((item): item is { tmdbId: unknown; reason: unknown } => typeof item === 'object' && item !== null)
    .map((item) => ({
      tmdbId: typeof item.tmdbId === 'number' ? item.tmdbId : NaN,
      reason: typeof item.reason === 'string' ? item.reason.trim() : '',
    }))
    .filter((item) => Number.isFinite(item.tmdbId))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS })
  }
  if (!TMDB_API_KEY || !ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'TMDB_API_KEY and ANTHROPIC_API_KEY must be configured' }), {
      status: 500,
      headers: JSON_HEADERS,
    })
  }

  let body: RequestBody
  try {
    body = await req.json()
    if (!Array.isArray(body.ratedMovies)) throw new Error('missing ratedMovies')
  } catch {
    return new Response(JSON.stringify({ error: 'Expected JSON body with a "ratedMovies" array' }), {
      status: 400,
      headers: JSON_HEADERS,
    })
  }

  const exclude = new Set<number>(
    Array.isArray(body.excludeTmdbIds)
      ? body.excludeTmdbIds.filter((id): id is number => typeof id === 'number')
      : []
  )

  // Need at least one well-liked movie to seed recommendations from.
  const seedCount = body.ratedMovies.filter((m) => avgRating(m) >= 3.5).length
  if (seedCount === 0) {
    return new Response(JSON.stringify({ results: [], reason: 'not_enough_ratings' }), {
      headers: JSON_HEADERS,
    })
  }

  let candidates: Candidate[]
  try {
    candidates = await buildCandidatePool(body.ratedMovies, exclude)
  } catch (error) {
    console.error(`candidate pool error: ${error instanceof Error ? error.message : String(error)}`)
    return new Response(JSON.stringify({ error: 'Could not reach TMDB' }), {
      status: 502,
      headers: JSON_HEADERS,
    })
  }

  if (candidates.length === 0) {
    return new Response(JSON.stringify({ results: [], reason: 'no_candidates' }), {
      headers: JSON_HEADERS,
    })
  }

  const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 600,
      messages: [{ role: 'user', content: buildPrompt(body.ratedMovies, candidates) }],
    }),
  })

  if (!apiResponse.ok) {
    const detail = await apiResponse.text()
    console.error(`Anthropic API error ${apiResponse.status}: ${detail}`)
    return new Response(JSON.stringify({ error: 'Recommendation failed' }), {
      status: 502,
      headers: JSON_HEADERS,
    })
  }

  const payload = await apiResponse.json()
  const modelText: string = payload?.content?.[0]?.text ?? ''

  let picks: RankedPick[]
  try {
    picks = parseModelJson(modelText)
  } catch {
    console.error(`Failed to parse model output: ${modelText}`)
    return new Response(JSON.stringify({ error: 'Could not rank recommendations' }), {
      status: 422,
      headers: JSON_HEADERS,
    })
  }

  // Hydrate each pick from the candidate pool, dropping any id the model
  // invented or that wasn't actually offered (anti-hallucination guard).
  const poolById = new Map(candidates.map((c) => [c.tmdbId, c]))
  const results = picks
    .map((pick) => {
      const movie = poolById.get(pick.tmdbId)
      return movie ? { ...movie, reason: pick.reason } : null
    })
    .filter((item): item is Candidate & { reason: string } => item !== null)
    .slice(0, 6)

  return new Response(JSON.stringify({ results }), { headers: JSON_HEADERS })
})
