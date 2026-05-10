-- cagovnews.com — Initial Schema
-- Run this in Supabase SQL Editor: supabase.com > your project > SQL Editor

create extension if not exists "pgcrypto";

-- ── AGENCIES ──────────────────────────────────────────────────
create table public.agencies (
  id         serial primary key,
  slug       text unique not null,
  name       text not null,
  site_url   text not null,
  news_url   text,
  color_hex  text,
  active     boolean default true,
  created_at timestamptz default now()
);

-- ── RELEASES ──────────────────────────────────────────────────
create table public.releases (
  id             uuid primary key default gen_random_uuid(),
  agency_slug    text not null references public.agencies(slug),
  title          text not null,
  summary        text,
  published_date date not null,
  tag            text,
  source_url     text not null,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  unique (agency_slug, source_url)
);

create index on public.releases (published_date desc);
create index on public.releases (agency_slug);
create index on public.releases (tag);

-- ── ARCHIVED CONTENT ──────────────────────────────────────────
create table public.release_content (
  release_id         uuid primary key references public.releases(id) on delete cascade,
  raw_html           text,
  extracted_text     text,
  extracted_markdown text,
  scraped_at         timestamptz not null default now(),
  last_checked_at    timestamptz,
  scrape_status      text default 'ok',
  http_status        int,
  content_hash       text,
  source_still_live  boolean default true,
  archive_url        text
);

-- ── PROFILES ──────────────────────────────────────────────────
create table public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  email            text,
  full_name        text,
  plan             text default 'free',
  digest_enabled   boolean default true,
  digest_frequency text default 'weekly',
  agency_filter    text[],
  tag_filter       text[],
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ── SUBSCRIPTIONS ─────────────────────────────────────────────
create table public.subscriptions (
  id                     serial primary key,
  user_id                uuid not null references public.profiles(id),
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  stripe_price_id        text,
  status                 text,
  current_period_end     timestamptz,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

-- ── EMAIL LOG ─────────────────────────────────────────────────
create table public.email_log (
  id         serial primary key,
  user_id    uuid references public.profiles(id),
  email_type text not null,
  subject    text,
  resend_id  text,
  sent_at    timestamptz default now(),
  status     text default 'sent'
);

-- ── CRAWL LOG ─────────────────────────────────────────────────
create table public.crawl_log (
  id               serial primary key,
  started_at       timestamptz default now(),
  finished_at      timestamptz,
  agencies_checked int default 0,
  releases_found   int default 0,
  releases_new     int default 0,
  errors           jsonb,
  triggered_by     text default 'cron'
);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────
alter table public.agencies        enable row level security;
alter table public.releases        enable row level security;
alter table public.release_content enable row level security;
alter table public.profiles        enable row level security;
alter table public.subscriptions   enable row level security;
alter table public.email_log       enable row level security;
alter table public.crawl_log       enable row level security;

-- Public read on content tables
create policy "public_read_agencies"        on public.agencies        for select using (true);
create policy "public_read_releases"        on public.releases        for select using (true);
create policy "public_read_release_content" on public.release_content for select using (true);
create policy "public_read_crawl_log"       on public.crawl_log       for select using (true);

-- Users can only access their own data
create policy "own_profile_select"  on public.profiles       for select using (auth.uid() = id);
create policy "own_profile_update"  on public.profiles       for update using (auth.uid() = id);
create policy "own_subscription"    on public.subscriptions  for select using (auth.uid() = user_id);
create policy "own_email_log"       on public.email_log      for select using (auth.uid() = user_id);

-- ── TRIGGERS ──────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger releases_updated_at
  before update on public.releases
  for each row execute function public.set_updated_at();

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
