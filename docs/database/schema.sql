-- Cycling Cities Tool 2: contribution inbox
--
-- This schema is an INBOX, not the live data source. The browser can only insert
-- into it; nothing on the published site reads from it. A maintainer reads it with
-- the service role key (scripts/inbox.mjs), verifies rows, and exports them into
-- the static JSON the site publishes. Git stays the record of what changed.
--
-- There are no accounts. A contributor is identified by the name and email they
-- type, and the maintainer checks that against the people Ruth has named. That is
-- enough while the link is shared privately and the site is noindex; if unwanted
-- submissions ever appear, add Turnstile in front of the form or switch the insert
-- policy to authenticated users. Nothing below has to change for that.
--
-- Run in the Supabase SQL editor, or as a migration.

create extension if not exists pgcrypto;

-- ------------------------------------------------------------------ types --

do $$ begin
  create type public.contribution_kind as enum ('modal_split', 'image', 'story', 'map', 'pin', 'review');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.contribution_status as enum ('submitted', 'verified', 'rejected', 'archived');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------ provenance --
-- The project's honesty rule, written as a function so the table can enforce it:
-- a row is only 'verified' when its payload names a source. Which field counts as
-- the source differs by kind and follows the templates in docs/data-submission/.

create or replace function public.contribution_has_source(k public.contribution_kind, p jsonb)
returns boolean language sql immutable as $$
  select case k
    when 'modal_split' then coalesce(p->>'source_citation', '') not in ('', '[TO BE CONFIRMED]')
    when 'story'       then coalesce(p->>'sources', '') not in ('', '[TO BE CONFIRMED]')
    when 'image'       then coalesce(p->>'archive', '') <> '' and coalesce(p->>'rights_statement', '') <> ''
    when 'map'         then coalesce(p->>'archive', p->>'source_url', '') <> '' and coalesce(p->>'rights_statement', '') <> ''
    else false
  end
$$;

-- ---------------------------------------------------------------- table --

create table if not exists public.contribution (
  id              uuid primary key default gen_random_uuid(),
  kind            public.contribution_kind not null,
  status          public.contribution_status not null default 'submitted',

  -- who and where
  city_slug       text check (city_slug is null or city_slug ~ '^[a-z]{3,8}$'),
  submitted_name  text not null check (length(btrim(submitted_name)) between 1 and 120),
  submitted_email text check (submitted_email is null or (
                    length(submitted_email) <= 254
                    and submitted_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')),
  client_lang     text check (client_lang is null or client_lang in ('en', 'zh', 'nl')),
  tool            text not null default 'cc-tool2' check (length(tool) <= 40),

  -- the submission itself: one template row, one pin, or one set of review decisions
  payload         jsonb not null check (jsonb_typeof(payload) = 'object' and pg_column_size(payload) <= 65536),

  -- filled by the maintainer, never by the browser
  verified_by     text,
  verified_on     date,
  review_note     text,
  exported_at     timestamptz,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- nothing becomes 'verified' without a named checker, a date and a source; pins and
  -- review decisions are proposals and cannot be verified at all, only archived
  constraint verified_needs_provenance check (
    status <> 'verified' or (
      verified_by is not null
      and verified_on is not null
      and kind in ('modal_split', 'image', 'story', 'map')
      and public.contribution_has_source(kind, payload)
    )
  )
);

create index if not exists contribution_status_created on public.contribution (status, created_at);
create index if not exists contribution_kind_city on public.contribution (kind, city_slug);

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists contribution_touch on public.contribution;
create trigger contribution_touch
  before update on public.contribution
  for each row execute function public.touch_updated_at();

-- A coarse flood guard. A filled template arrives as one request with many rows, so
-- the threshold is generous; it exists to stop a runaway script, not a busy researcher.
-- security definer because the inserting role may not read the table.
create or replace function public.contribution_rate_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.submitted_email is not null and (
    select count(*) from public.contribution
    where submitted_email = new.submitted_email and created_at > now() - interval '10 minutes'
  ) >= 500 then
    raise exception 'too many submissions from this address in a short time';
  end if;
  return new;
end $$;

drop trigger if exists contribution_rate on public.contribution;
create trigger contribution_rate
  before insert on public.contribution
  for each row execute function public.contribution_rate_guard();

-- --------------------------------------------------- row level security --
-- The browser holds the anon key. It may insert, and only as a plain submission;
-- it cannot read anything back, change anything, or delete anything. There is no
-- policy for select, update or delete on purpose: the maintainer's service role
-- bypasses RLS, and that is the only reader.

alter table public.contribution enable row level security;

revoke all on public.contribution from anon, authenticated;
grant insert on public.contribution to anon;

drop policy if exists "anon may submit" on public.contribution;
create policy "anon may submit" on public.contribution
  for insert to anon
  with check (
    status = 'submitted'
    and verified_by is null
    and verified_on is null
    and review_note is null
    and exported_at is null
  );

-- The page must send Prefer: return=minimal. With no select policy, an insert that
-- asks for its row back is refused, which is the intended behaviour.

-- ------------------------------------------------------------ hardening --
-- From the Supabase security advisor: pin search_path on every function, and stop the
-- API roles from calling the trigger functions by RPC. Triggers still fire; the check
-- constraint still evaluates, because anon keeps execute on contribution_has_source.

alter function public.contribution_has_source(public.contribution_kind, jsonb) set search_path = '';
alter function public.touch_updated_at() set search_path = '';
revoke execute on function public.contribution_rate_guard() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
