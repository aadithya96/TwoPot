-- 021_upi_vpa.sql
-- Optional UPI VPA (Virtual Payment Address, e.g. "name@bank") per profile,
-- so a partner settling up can deep-link straight into their UPI app with
-- the amount pre-filled instead of looking up the payee manually.

alter table public.profiles
  add column upi_vpa text;
