-- 025_movies.sql
-- A shared movie watchlist for the household's two members, plus per-person
-- 1-5 star ratings. Movies carry TMDB metadata (id, poster, year, genres,
-- overview) captured at add time so the list renders without re-hitting TMDB.
--
-- Ratings are per person: each member rates a movie independently (one row per
-- (movie, user)), which is what the recommendation engine needs to reason about
-- both people's tastes. household_id is denormalised onto movie_ratings so the
-- realtime client can filter rating changes with the same household_id=eq.<id>
-- predicate it uses for every other table.

create table public.movies (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  tmdb_id       integer not null,
  title         text not null,
  poster_path   text,
  release_year  integer,
  overview      text,
  genres        text[] not null default '{}',
  added_by      uuid references public.profiles(id),
  status        text not null default 'to_watch' check (status in ('to_watch', 'watched')),
  watched_at    timestamptz,
  created_at    timestamptz not null default now(),
  -- The same TMDB title can't be added twice to one household's list.
  unique (household_id, tmdb_id)
);

create index movies_household_id_idx on public.movies (household_id);

create table public.movie_ratings (
  id            uuid primary key default gen_random_uuid(),
  movie_id      uuid not null references public.movies(id) on delete cascade,
  household_id  uuid not null references public.households(id) on delete cascade,
  user_id       uuid not null references public.profiles(id),
  rating        smallint not null check (rating between 1 and 5),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- One rating per person per movie; upserts target this constraint.
  unique (movie_id, user_id)
);

create index movie_ratings_movie_id_idx on public.movie_ratings (movie_id);
create index movie_ratings_household_id_idx on public.movie_ratings (household_id);

-- RLS: household members get full CRUD on their own household's rows, matching
-- the shape used by every other household-scoped table (see 009_rls.sql).
alter table public.movies enable row level security;
alter table public.movie_ratings enable row level security;

create policy "movies: household members" on public.movies
  for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "movie_ratings: household members" on public.movie_ratings
  for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

-- Realtime: stream changes to both partners' devices. replica identity full so
-- DELETE/UPDATE events carry household_id for the client-side filter (see
-- 024_realtime_publication.sql for the full rationale).
alter table public.movies replica identity full;
alter table public.movie_ratings replica identity full;

alter publication supabase_realtime add table public.movies;
alter publication supabase_realtime add table public.movie_ratings;

-- Table-level grants for tables created via plain CREATE TABLE (see 023_grants.sql).
-- 023's `alter default privileges` covers tables created after it, but we grant
-- explicitly here too so this migration is self-contained.
grant all on public.movies to anon, authenticated, service_role;
grant all on public.movie_ratings to anon, authenticated, service_role;
