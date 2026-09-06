# Reviewing a submission

For the people who verify what contributors send.

A submission becomes citable when a reviewer signs it. This page says what signing
means, so that the signature is worth something.


## What verification is

Sitting with the row and the original source, side by side, and confirming that the row
says what the source says.

It is not a plausibility check. A figure can be entirely plausible and still be wrong,
and the whole point of the signature is that somebody looked.


## What to check, by kind

For a count: that the numbers match the source, that the year is the year of the count
and not the year of publication, that the unit is right, and that the four modes were
folded from the source's own categories in the way `mapping_notes` describes.

For an image: that the credit is correct, that the rights statement matches what the
archive actually says, and that the caveat mentions any mismatch between the image and
the period it sits under.

For narrative: that the claim is supported by the sources listed, and that
`contested_note` says so if other historians would argue with it.


## What signing does

Filling `verified_by` and `verified_on` flips the record from unconfirmed to verified.
In the tool this changes four things at once: the map marker becomes solid, the hatched
pattern comes off the chart, the citation button starts working, and the record joins
the verified count shown beside the city name.

That is a real claim made in public, under a name. Treat it accordingly.


## What not to sign

Do not sign a row because it looks right, because you trust the contributor, or because
the deadline is close. An unsigned row is not a problem: it sits in the tool, visible
and usable, marked honestly as unchecked. It can sit there for a year.

If a row is nearly right, correct it and note the correction rather than signing it as
it stands.

If you cannot get at the source, say so in the notes and leave it unsigned. That is a
useful record in itself: it tells the next person where the difficulty is.


## Where the signature lives

In the data file, next to the row, and therefore in the version history. Every change
carries its date and its author, and nothing is overwritten silently.

When a row arrived through the inbox, the maintainer signs it there first:

    node scripts/inbox.mjs verify <id> --by "Your Name"

The database refuses the signature if the row names no source, which is the same rule
as above written where habit cannot bend it. The export then carries the signature into
the data file, and git carries it from there.

Decisions made in the tool's review queue can be sent to the inbox too. They arrive as
a proposal in `docs/inbox/`, and the maintainer applies them by hand. Reviewing produces
a proposal, not a change.


## Who may sign

The reviewer roster is kept with the project's other contact records, not in this
repository. A reviewer signs with their own name, never on behalf of somebody else.
