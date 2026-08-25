-- Cycling Cities Tool 2: contribution inbox
--
-- This schema is an INBOX, not the live data source. Contributors write here;
-- the published site keeps reading the static JSON files until a maintainer
-- promotes a verified row. That keeps the review gate the project depends on.
--
-- Run in the Supabase SQL editor, or as a migration. Requires pgcrypto for
-- gen_random_uuid(), which Supabase enables by default.

-- ---------------------------------------------------------------- people --

create table if not exists public.contributor (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  affiliation text,
  created_at  timestamptz not null default now()
);

-- A contributor may write only for the cities listed here. This table is the
-- whole authorisation model: adding a row is how you authorise someone.
create table if not exists public.contributor_city (
  user_id    uuid not null references public.contributor(user_id) on delete cascade,
  city_slug  text not null,
  primary key (user_id, city_slug)
);

-- ----------------------------------------------------------- submissions --

do $$ begin
  create type public.submission_status as enum ('draft', 'submitted', 'verified', 'rejected');
exception when duplicate_object then null;
end $$;

create table if not exists public.modal_split_submission (
  id            uuid primary key default gen_random_uuid(),
  submitted_by  uuid not null references auth.users(id) on delete restrict,
  status        public.submission_status not null default 'draft',

  -- where
  city_slug       text not null,
  point_id        text not null,
  point_name      text not null,
  lat             double precision not null check (lat between -90 and 90),
  lon             double precision not null check (lon between -180 and 180),
  location_basis  text not null
                  check (location_basis in ('historical map', 'street address',
                                            'modern equivalent', 'approximate')),
  -- when
  year            int not null check (year between 1800 and 2100),
  observed_date   date,
  observed_hours  text,

  -- what was counted
  mode_bicycle    numeric check (mode_bicycle >= 0),
  mode_walking    numeric check (mode_walking >= 0),
  mode_transit    numeric check (mode_transit >= 0),
  mode_car        numeric check (mode_car >= 0),
  unit            text not null check (unit in ('count', 'percent')),
  total_observed  numeric check (total_observed >= 0),

  -- the categories the source actually used, before anyone folded them into four
  original_categories text,
  mapping_notes       text,

  -- how it was derived
  derivation      text check (derivation in ('measured', 'estimated', 'interpolated')),
  method          text,

  -- where it came from
  source_citation text,
  source_archive  text,
  source_reference text,
  source_url      text,
  verified_by     text,
  verified_on     date,
  notes           text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- The project's own rule, written as a constraint rather than left to habit:
  -- nothing becomes 'verified' without a named checker and a real citation.
  constraint verified_needs_provenance check (
    status <> 'verified' or (
      verified_by is not null
      and verified_on is not null
      and derivation is not null
      and source_citation is not null
      and source_citation <> '[TO BE CONFIRMED]'
    )
  ),

  -- percentages must not quietly add up to more than a whole
  constraint percent_within_100 check (
    unit <> 'percent' or
    coalesce(mode_bicycle, 0) + coalesce(mode_walking, 0)
      + coalesce(mode_transit, 0) + coalesce(mode_car, 0) <= 100.5
  ),

  -- one row per point per year per contributor
  unique (submitted_by, city_slug, point_id, year)
);

create index if not exists modal_split_submission_city_year
  on public.modal_split_submission (city_slug, year);

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists modal_split_submission_touch on public.modal_split_submission;
create trigger modal_split_submission_touch
  before update on public.modal_split_submission
  for each row execute function public.touch_updated_at();

-- --------------------------------------------------- row level security --
-- Nothing below grants anonymous access. The published site does not read
-- this table at all; it reads the static JSON that a maintainer writes.

alter table public.contributor            enable row level security;
alter table public.contributor_city       enable row level security;
alter table public.modal_split_submission enable row level security;

create policy "read own profile" on public.contributor
  for select to authenticated using (user_id = auth.uid());

create policy "read own city grants" on public.contributor_city
  for select to authenticated using (user_id = auth.uid());

create policy "read own submissions" on public.modal_split_submission
  for select to authenticated using (submitted_by = auth.uid());

-- A contributor may only insert rows for a city they have been granted, and
-- only as their own. They cannot insert something already marked verified.
create policy "insert into granted cities" on public.modal_split_submission
  for insert to authenticated with check (
    submitted_by = auth.uid()
    and status in ('draft', 'submitted')
    and exists (
      select 1 from public.contributor_city c
      where c.user_id = auth.uid()
        and c.city_slug = modal_split_submission.city_slug
    )
  );

-- Editing is allowed while a row is still theirs and not yet accepted. The
-- WITH CHECK clause is what stops a contributor promoting their own row.
create policy "edit own unaccepted rows" on public.modal_split_submission
  for update to authenticated
  using (submitted_by = auth.uid() and status in ('draft', 'submitted'))
  with check (submitted_by = auth.uid() and status in ('draft', 'submitted'));

create policy "delete own drafts" on public.modal_split_submission
  for delete to authenticated
  using (submitted_by = auth.uid() and status = 'draft');

-- Verification and rejection are deliberately not expressible through any
-- policy. A maintainer does them with the service role, server side.

-- ------------------------------------------------------------- scans ----
-- Create a PRIVATE storage bucket named 'submission-scans' in the dashboard,
-- then restrict it to the owner's own folder:
--
-- create policy "own folder read" on storage.objects for select to authenticated
--   using (bucket_id = 'submission-scans' and (storage.foldername(name))[1] = auth.uid()::text);
-- create policy "own folder write" on storage.objects for insert to authenticated
--   with check (bucket_id = 'submission-scans' and (storage.foldername(name))[1] = auth.uid()::text);
