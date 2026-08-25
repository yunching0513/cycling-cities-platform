# A safe way to let authorised people upload data

## The decision that comes first

This project's rule is that no figure appears in the interface unless the file says
where it came from and a named person checked it. A database that lets contributors
write straight into the published site removes that check.

So the goal is not the most capable database. It is: **keep the review gate, make
submitting easy.** Everything below follows from that.

## Three options, honestly compared

### A. What exists now: a template, sent by email

Contributors fill `docs/data-submission/modal-split-template.csv` and send it back. A
maintainer commits it.

Good for: a handful of rows from three people. Zero infrastructure, zero attack
surface, and git already gives a perfect audit trail.

Bad for: more than a few rounds. It is manual, and contributors cannot see their own
data in the tool until someone commits it.

**If the three cities together produce under about fifty rows, stop here.** Building a
database for fifty rows costs more than it saves, and adds a system to keep secure for
years.

### B. A shared spreadsheet with the template's columns

Same as A, but everyone types into one sheet.

Good for: familiar to researchers, no accounts to manage, easy to see progress.

Bad for: no validation, columns drift, and one careless paste can overwrite someone
else's rows. Version history exists but is awkward to audit.

### C. A submission inbox, with real accounts

`schema.sql` in this folder. Contributors sign in, enter rows, and see only their own.
A maintainer reviews and promotes rows into the JSON the site reads.

Good for: real per-person authorisation, validation enforced by the database, room to
grow, and the review gate stays intact.

Bad for: it is a system. Someone has to own it.

## How option C is kept safe

### Only invited people can get in

Signup is switched off in the Auth settings. Accounts are created by invitation only.
Sign-in is by emailed magic link, so there are no passwords to leak or reset.

### Being signed in is not the same as being allowed

Authorisation lives in one table, `contributor_city`. One row means "this person may
write for this city". Adding a row is how you authorise someone; deleting it is how you
stop them. There is no other path.

### The database refuses rows that break the rules

Row Level Security is on for every table, and there is no anonymous policy at all, so
an unauthenticated request sees nothing.

The policies say:

| Action | Who |
|---|---|
| Read a submission | only the person who submitted it |
| Insert | only as yourself, only for a city you were granted |
| Edit | only your own rows, only while still `draft` or `submitted` |
| Delete | only your own drafts |
| Mark as `verified` | nobody, through any policy |

That last line is the important one. Verification is done by a maintainer with the
service role, from a script, never from the browser. A contributor cannot promote their
own work, by any request they can construct.

On top of that, a check constraint refuses to store a `verified` row unless it has a
named checker, a date, a derivation method, and a citation that is not
`[TO BE CONFIRMED]`. The project's honesty rule stops being a convention and becomes
something the database enforces.

### Keys

The anon key that ships in the page is public by design; Row Level Security is what
protects the data, not the key. The `service_role` key bypasses every policy and must
never appear in the browser, in this repository, or in a deployed page. Keep it in a
local environment variable used only by the promotion script.

### Scans and photographs

A private storage bucket, with each contributor restricted to a folder named after
their own user id. Nothing public. Rights still have to be cleared before any image is
shown in the interface.

## The flow, end to end

1. A maintainer invites the contributor and grants them a city.
2. The contributor signs in and enters rows, or uploads a filled template.
3. Rows sit as `submitted`. The published site does not read them.
4. A maintainer checks each row against the source, fills `verified_by` and
   `verified_on`, and sets `verified`.
5. A script exports verified rows into `data/modalsplit.json` or
   `data/intersections.json` and commits them. Git remains the record of what changed
   and when.
6. The site shows them. Until then the interface says the city is awaiting data, which
   is true.

## What this does not do

It does not make the site read from a database. That is a separate, later decision. If
it is ever taken, the safe shape is a `published` boolean and an anonymous read policy
limited to `published = true` and `status = 'verified'`.

## Before any of this is built

The build plan lists "no backend, no database, no user accounts" as non-goals, and sets
its own threshold for revisiting that: more than four cities, or contributors who are
not engineers. Both are now true. That makes this a scope change to agree with Ruth and
record, not something to slip in quietly.
