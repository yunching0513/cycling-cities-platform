# The contribution inbox

How authorised people get data into the tool without anyone being able to write to
the published site.

## The decision that comes first

This project's rule is that no figure appears in the interface unless the file says
where it came from and a named person checked it. A database that lets contributors
write straight into the published site would remove the person.

So the inbox is exactly that: an inbox. The browser can put things in it. Nothing on
the site reads from it. A maintainer takes things out, checks them, and commits them
to the static JSON the site actually shows. Git keeps the record. The review gate the
project depends on is untouched.

## Why there are no accounts

The first design of this inbox (August 2026) had invitation-only accounts with
magic-link sign-in and a per-city authorisation table. It was sound and it was more
than the situation needs. The people sending data are a handful of named researchers
whom Ruth has introduced by email; the link to the tool is shared privately; the site
is marked noindex. Under those conditions a login protects nothing that is not already
protected by the fact that the inbox is write-only and reviewed by a person.

What identification does need is a name and an email on every submission, so that a
row can be traced and a question asked. The table requires the name and validates the
email. The maintainer checks both against the people who were introduced. That is the
whole authorisation model for now.

If unwanted submissions ever appear, two upgrades are ready without changing the rest:
put Cloudflare Turnstile in front of the form, or switch the insert policy from `anon`
to `authenticated` and bring back the magic links. The August schema is in git history.

## What the database enforces

`schema.sql` in this folder. One table, `contribution`, with a `kind` (modal split,
image, story, map, pin, or review decisions), a `status`, the submitter's name and
email, and the submission as JSON.

| Rule | Where it lives |
|---|---|
| The browser may only insert | Row Level Security: an insert policy for `anon`, no select, update or delete policy at all |
| An insert is always a plain submission | the policy's `with check`: status `submitted`, no verifier, no export date |
| Nothing is readable through the key in the page | no select policy; `revoke all` from `anon` and `authenticated`, then `grant insert` |
| A name is required, an email must look like one | check constraints |
| Nothing becomes verified without a checker, a date and a source | the `verified_needs_provenance` constraint, using `contribution_has_source()` |
| Pins and review decisions can never be verified | the same constraint: they are proposals, so they can only be archived |
| A runaway script cannot fill the table | a before-insert trigger counting rows per email per ten minutes |
| The payload cannot be arbitrarily large | 64 KB per row |

The `service_role` key bypasses every policy. It never appears in the browser, in this
repository, or in a deployed page. It lives in the maintainer's shell environment for
the length of a session, and `scripts/inbox.mjs` reads it from there.

## The flow, end to end

1. A contributor opens the site, chooses what they have, downloads the template, fills
   it, and drops it back on the same page. The page checks the columns against the
   template, turns empty cells into nulls, and posts one row per line. Or they email
   the file; both paths lead to the same place.
2. Rows sit in the inbox as `submitted`. The site does not change.
3. The maintainer runs `node scripts/inbox.mjs list`, looks at each row, and either
   verifies it (`verify <id> --by "Name"`), rejects it, or leaves it.
4. `node scripts/inbox.mjs export` writes rows into `data/*.json`: verified rows as
   verified, submitted rows as unconfirmed, marked so on every screen. The maintainer
   reads the diff and commits. Vercel rebuilds.
5. The contributor sees their rows, marked unconfirmed until a person has signed them.

A pin from the citizen-science flow goes to `docs/inbox/` as GeoJSON for the team to
consider; it never becomes a site record on its own. A set of review decisions goes to
`docs/inbox/` as JSON for the maintainer to apply by hand, which is what "reviewing
produces a proposal, not a change" means in practice.

## Where it is

Provisioned on 2026-09-06: Supabase project `cycling-cities-inbox`, reference
`opjipfsyxyxghbjvxtur`, region Frankfurt (`eu-central-1`), free tier, in the
maintainer's organisation. `schema.sql` was applied as two migrations
(`contribution_inbox`, `contribution_inbox_hardening`), and the project's security
advisor reports nothing outstanding.

`config.js` carries the project URL and the publishable key. That file is committed on
purpose: the key is public by design and Row Level Security is what protects the data.
The same day the inbox was exercised from the browser with the anon key and refused
everything it should: a select, an update, a delete, an insert marked verified, an
insert with a malformed email, and an insert asking for its row back. Plain inserts
went through.

The service role key is read from the dashboard (Project Settings, API keys) and put in
the shell only when running `scripts/inbox.mjs`. On the maintainer's Mac it is kept in
the Keychain and loaded with `source scripts/inbox-env.sh`; elsewhere:

    export SUPABASE_URL=https://opjipfsyxyxghbjvxtur.supabase.co
    export SUPABASE_SERVICE_ROLE_KEY=…

It is never written to a file in this repository.

## Setting it up again

If the project is ever lost or a second one is wanted:

1. Create a Supabase project. Region: Frankfurt (`eu-central-1`) suits a team based in
   the Netherlands; the free tier is enough for this volume.
2. Run `schema.sql` in the SQL editor.
3. Copy the project URL and the publishable (or legacy anon) key into `config.js`.
4. Open the site: the contribute flow's third step now shows a drop box, the pin dialog
   shows a send button, and the review queue can send decisions. Empty `config.js` and
   all three fall back to copy-and-email.

## What this does not do

It does not make the site read from a database. If that is ever wanted, the safe shape
is a `published` boolean and an anonymous read policy limited to `published = true and
status = 'verified'`. That is a separate decision to record, not a default.

It does not store files. Images and scans still travel by email or shared folder; the
inbox holds their metadata, which is what the review needs first.

## Why this is a scope change

The build plan lists "no backend, no database, no user accounts" as non-goals, and sets
its own threshold for revisiting that: more than four cities, or contributors who are
not engineers. Both are true since August 2026. The inbox meets the first two of the
three non-goals exactly as written, since the site still has no backend and no
database behind it, and keeps the third, no user accounts, on purpose.
