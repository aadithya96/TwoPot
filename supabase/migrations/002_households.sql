-- 002_households.sql
-- A household links the two users of the app together as a unit, plus a
-- simple 6-digit invite-code flow for the second user to join.

create table public.households (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null default 'Our Home',
  invite_code         text,
  invite_expires_at   timestamptz,
  created_at          timestamptz not null default now()
);

create table public.household_members (
  household_id  uuid not null references public.households(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  role          text not null default 'member', -- 'owner' | 'member'
  joined_at     timestamptz not null default now(),
  primary key (household_id, user_id)
);

-- Generate (or regenerate) a 6-digit invite code for a household, valid 48h.
-- Caller must already be a member of the household.
create or replace function public.generate_invite(household_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  code text;
begin
  if not exists (
    select 1 from public.household_members hm
    where hm.household_id = generate_invite.household_id
      and hm.user_id = auth.uid()
  ) then
    raise exception 'Not a member of this household';
  end if;

  code := lpad(floor(random() * 1000000)::text, 6, '0');

  update public.households
    set invite_code = code,
        invite_expires_at = now() + interval '48 hours'
    where id = generate_invite.household_id;

  return code;
end;
$$;

-- Look up a household by invite code (checking expiry), join the calling
-- user to it, and return the household_id.
create or replace function public.accept_invite(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
begin
  select id into hid
    from public.households h
    where h.invite_code = accept_invite.code
      and h.invite_expires_at is not null
      and h.invite_expires_at > now();

  if hid is null then
    raise exception 'Invalid or expired invite code';
  end if;

  insert into public.household_members (household_id, user_id)
    values (hid, auth.uid())
    on conflict do nothing;

  return hid;
end;
$$;
