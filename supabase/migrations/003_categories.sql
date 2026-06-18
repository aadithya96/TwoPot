-- 003_categories.sql
-- Per-household expense categories, with default seed set.
-- NOTE: `icon` stores a @mui/icons-material export name (e.g. 'RestaurantOutlined'),
-- not a lucide-react name — the frontend renders icons via MUI.

create table public.categories (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  name          text not null,
  icon          text not null default 'CircleOutlined',
  color         text not null default '#6366f1',
  is_default    boolean not null default false,
  created_at    timestamptz not null default now()
);

-- Seed the default category set for a newly created household.
create or replace function public.seed_default_categories(hid uuid)
returns void
language sql
as $$
  insert into public.categories (household_id, name, icon, color, is_default) values
    (hid, 'Food & Dining',   'RestaurantOutlined',     '#f59e0b', true),
    (hid, 'Transport',       'DirectionsCarOutlined',  '#3b82f6', true),
    (hid, 'Utilities',       'BoltOutlined',           '#8b5cf6', true),
    (hid, 'Health',          'FavoriteOutlined',       '#ef4444', true),
    (hid, 'Entertainment',   'TheatersOutlined',       '#ec4899', true),
    (hid, 'Groceries',       'ShoppingCartOutlined',   '#10b981', true),
    (hid, 'Home',            'HomeOutlined',           '#f97316', true),
    (hid, 'Personal',        'PersonOutlined',         '#6b7280', true),
    (hid, 'Travel',          'FlightOutlined',         '#14b8a6', true),
    (hid, 'Miscellaneous',   'MoreHorizOutlined',      '#9ca3af', true);
$$;
