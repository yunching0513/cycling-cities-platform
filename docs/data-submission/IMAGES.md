# Historic image submission

For researchers contributing scanned or photographed historic images.

Fill in `image-template.csv`, one row per image. Send it with the files, or with links
to them.

## Read this first

**Having a file is not the same as being allowed to publish it.** This is the single
thing that holds up images more than any other. An archive may let you photograph a
print in its reading room, catalogue it, and use it in a thesis, and still not allow it
on a public website.

So the platform will not embed any image until `may_embed` says yes and someone has
signed `cleared_by`. Until then the record shows a link out to the archive instead,
with the credit. That is not a placeholder to be filled in later by guessing: it is the
correct state for an image whose rights are unresolved, and it can stay that way
indefinitely without harming the record.

Copyright terms differ by country and are counted from different starting points, often
from the creator's death. That is why `creator` and `creator_death_year` are here even
though they feel like archival trivia. Without them nobody downstream can work out
whether a term has expired.

## Columns

### What it is

| Column | What it holds |
|---|---|
| `city_slug` | `mpls`, `rdam`, `riga`, `buda`, `lisb`, `tehr` |
| `image_id` | your own id, e.g. `TEHR-IMG-001` |
| `site_id` | the site record this belongs to, if there is one. Leave empty otherwise |
| `caption_en` | one sentence in English, as a reader would want it under the picture |
| `shows_place` | the street, junction or building, as a reader would recognise it |
| `year` | the year the image was made. Not the year of the thing it shows, if they differ |
| `date_exact` | `YYYY-MM-DD` if the source gives one |
| `lat`, `lon` | decimal degrees, if the image is tied to a place |

If the image is later or earlier than the decade it will sit under, put that in
`caveat`. The interface has a field for exactly this and will show it beside the
picture.

### Who made it

| Column | What it holds |
|---|---|
| `creator` | photographer, studio, publisher or agency |
| `creator_death_year` | if known. This often decides whether the term has expired |

### Where it is held

| Column | What it holds |
|---|---|
| `archive` | the holding institution |
| `reference` | inventory or call number, box, folder |
| `source_url` | permanent link, if the archive has one |

### Whether it may be published

| Column | What it holds |
|---|---|
| `rights_statement` | the exact label, e.g. `Public Domain Mark 1.0`, `CC BY 4.0`, `In Copyright`, `No known restrictions on publication` |
| `rights_uri` | the URI for that statement, usually creativecommons.org or rightsstatements.org |
| `rights_basis` | how it was established: `archive statement`, `licence on the file`, `written permission`, `term expired`, `unresolved` |
| `permission_contact` | the person or office who granted it, if permission was given |
| `permission_date` | `YYYY-MM-DD` |
| `may_embed` | `yes`, `no`, or `unresolved` |
| `attribution_text` | the exact wording the archive requires, if any |
| `cleared_by` | your name, once you have checked all of the above |
| `cleared_on` | `YYYY-MM-DD` |

`may_embed` is `unresolved` until proven otherwise. Leaving it empty has the same
effect as `no`, which is the safe default.

`rights_basis` of `unresolved` is a perfectly good answer. It tells the team the image
exists and where it is, and it lets the record be built now and the picture added later.

### Anything a reader needs to know

| Column | What it holds |
|---|---|
| `caveat` | e.g. the image is a decade later than the slice, or shows a neighbouring city |
| `notes` | your doubts, alternative readings, anything a later reader would want |

There is already a record in the tool whose image shows Amsterdam rather than
Rotterdam, and the interface says so beside the picture. Being explicit about a mismatch
is better than quietly using an image that nearly fits.

## How a record appears

A record is a card first and a picture second. The card carries the caption, what the
image shows, when it was made, who made it, which archive holds it and under what
reference, the rights statement and its basis, and whether embedding has been cleared
and by whom. That card is complete on its own, and it is what a reader sees in the
tool's record panel for your city, and on the map where a record has coordinates.

The picture itself is added to the card only when `may_embed` is `yes` and `cleared_by`
is filled. Until then the card links to the archive. So your catalogue work is visible
as soon as it is loaded, and nothing waits on a rights question except the picture.

## What happens next

1. Rows load with `cleared: false`. The record shows a link to the archive and the
   credit, not the picture.
2. When `may_embed` is `yes` and `cleared_by` is filled, the flag flips and the picture
   is shown, with the credit and any required attribution.
3. If the rights are never resolved, the record keeps the link. Nothing is lost.
