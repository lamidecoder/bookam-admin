-- ============================================
-- BOOKAM ADMIN — additive migration
-- Run in Supabase SQL Editor. Genuinely safe to re-run end to end.
-- Adds ONLY what's missing for the admin dashboard's
-- Pricing, Users (suspend), and Calendar-block-reason screens.
-- Everything else (Properties, Calendar, Bookings, Transactions)
-- is built entirely on the existing schema — no changes needed.
-- ============================================

-- 1. PROFILES — guest contact + suspension (needed for Users page)
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists status text default 'active'
  check (status in ('active', 'suspended'));
alter table public.profiles add column if not exists suspension_reason text;
alter table public.profiles add column if not exists suspended_at timestamp with time zone;

-- The original schema file never defines RLS for `profiles` (it predates
-- this migration, created by Supabase's auth scaffold). Without this,
-- whatever default policy exists likely restricts each user to their own
-- row only — which would make the admin Users page return just the admin's
-- own profile. This is additive and won't remove any existing policy.
alter table public.profiles enable row level security;

-- IMPORTANT: a policy on `profiles` cannot safely query `profiles` from
-- inside its own USING clause — Postgres can throw "infinite recursion
-- detected in policy for relation profiles". The other tables' admin
-- policies (properties/bookings/blocked_dates) check role via a subquery
-- into profiles, which is fine since that's a *different* table. For a
-- policy ON profiles itself, use a SECURITY DEFINER function instead,
-- which runs with elevated privilege and bypasses RLS recursion.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
  on public.profiles for select using (
    auth.uid() = id or public.is_admin()
  );

drop policy if exists "Admins can update any profile" on public.profiles;
create policy "Admins can update any profile"
  on public.profiles for update using (
    auth.uid() = id or public.is_admin()
  );

drop policy if exists "Users can insert own profile on signup" on public.profiles;
create policy "Users can insert own profile on signup"
  on public.profiles for insert with check (auth.uid() = id);

-- 2. PROPERTIES — weekend pricing (Pricing Control screen)
-- price_per_night already exists and IS the base/platform rate.
-- This only adds the weekend override shown in the Figma.
alter table public.properties add column if not exists weekend_enabled boolean default false;
alter table public.properties add column if not exists weekend_rate numeric;

-- Optional, NOT applied automatically: the spec says cancellation fee can
-- never be zero. The admin UI now blocks saving a zero fee, but the
-- column itself has no DB-level constraint. Uncomment below to enforce it
-- at the database too — left commented because it would fail this script
-- if any live property currently has 0 or null in that column, and I
-- can't check your actual data from here.
-- alter table public.properties add constraint cancellation_fee_not_zero
--   check (cancellation_fee_percent > 0);

-- 3. SPECIAL_RATES — date-range price overrides (Pricing Control screen)
-- e.g. Christmas Week, Valentine's Week. One row per override per property.
create table if not exists public.special_rates (
  id uuid default gen_random_uuid() primary key,
  property_id uuid references public.properties on delete cascade not null,
  start_date date not null,
  end_date date not null,
  rate numeric not null,
  reason text,
  created_at timestamp with time zone default now()
);
alter table public.special_rates enable row level security;

drop policy if exists "Anyone can view special rates" on public.special_rates;
create policy "Anyone can view special rates"
  on special_rates for select using (true);

drop policy if exists "Admins can manage special rates" on public.special_rates;
create policy "Admins can manage special rates"
  on special_rates for all using (public.is_admin());

-- 4. BLOCKED_DATES — admin notes (Calendar block workflow has a Notes field)
alter table public.blocked_dates add column if not exists notes text;

-- 5. Realtime — make sure the admin's live subscriptions actually fire.
-- IF NOT EXISTS for ALTER PUBLICATION ADD TABLE requires Postgres 15+
-- (Supabase projects created since ~2023 are on 15+; if this specific
-- line errors with a syntax error on your project, drop "if not exists"
-- and just run it once manually instead).
alter publication supabase_realtime add table if not exists special_rates;
alter publication supabase_realtime add table if not exists profiles;

-- Note: there is NO separate "transactions" table by design.
-- The Transactions page is built directly off `bookings`
-- (status='confirmed'/'completed' = payment, status='cancelled' = refund),
-- since that's what the real schema already tracks. A failed Paystack
-- attempt currently never creates a booking row at all — flagged in
-- AUDIT_NOTES.md as a real gap, not silently invented around.
