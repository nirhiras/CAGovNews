-- CAGovNews subscribers table
create table if not exists public.subscribers (
  id               uuid primary key default gen_random_uuid(),
  email            text unique not null,
  first_name       text,
  last_name        text,
  primary_county   text not null,
  extra_counties   text[] default '{}',
  topics           text[] default '{}',
  news_levels      text[] default '{state,county,city}',
  frequencies      text[] default '{daily}',
  active           boolean default true,
  agreed_at        timestamptz,
  confirmed_at     timestamptz,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

alter table public.subscribers enable row level security;

-- Service role can do everything
create policy "service_role_all_subscribers" on public.subscribers
  for all to service_role using (true) with check (true);

-- Allow anonymous inserts (subscribe form)
create policy "anon_insert_subscribers" on public.subscribers
  for insert to anon with check (true);

-- Index for email lookups
create index if not exists subscribers_email_idx on public.subscribers(email);
create index if not exists subscribers_county_idx on public.subscribers(primary_county);
create index if not exists subscribers_active_idx  on public.subscribers(active);
