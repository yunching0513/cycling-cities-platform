# Contributing data

Three kinds of contribution, three templates, one process.

| What you have | Template | Guide |
|---|---|---|
| Modal split counts | `modal-split-template.csv` | [MODAL-SPLIT.md](MODAL-SPLIT.md) |
| Historic images | `image-template.csv` | [IMAGES.md](IMAGES.md) |
| Narrative text | `story-template.csv` | [STORIES.md](STORIES.md) |

## The process, end to end

There is no upload button. That is deliberate, and it is worth a sentence of
explanation: the platform's rule is that no figure, picture or claim appears unless the
file says where it came from and a named person checked it. A form that writes straight
into the live site would remove the person.

So the process is:

**1. You fill in a template.** One row per point per year, per image, or per period.
Leave a field empty rather than guessing. Empty is safe; a guess is not.

**2. You send it back**, with image files or links to them.

**3. The maintainer checks it** against the source where possible, and loads it into the
data files.

**4. It appears in the tool, marked as unconfirmed.** A hollow dashed marker on the map.
The citation button refuses to copy it. Section 05 shows it with a hatched overlay.

**5. A second reader verifies it** against the source and signs `verified_by` and
`verified_on`. The marker becomes solid and the record becomes citable.

Steps 4 and 5 are separate on purpose. Your work is visible and usable from step 4. It
just does not yet claim to be checked.

## How long each step takes

Loading a template into the site takes minutes, and the site redeploys itself within
about a minute of the change. So a batch sent on Monday is visible on Monday.

Verification takes as long as verification takes. That is the honest answer, and it is
why the two steps are separate.

## Images have one extra gate

An image is not embedded until its rights are cleared, and rights are separate from
everything else. You can have the file, the catalogue entry and the credit, and still
not be allowed to publish it on a public website.

Until that is resolved the record shows a link to the archive and the credit, not the
picture. That state is correct and can last indefinitely. It is not a failure.

See [IMAGES.md](IMAGES.md) for what determines it.

## If you are not sure a field applies

Write what you know in `notes` and leave the field empty. Every template has a notes
column, and it is read.

## Questions worth asking before you start

- Does your source use categories that do not fit the four modes the interface shows?
  Almost certainly, if it is interwar. See the mapping columns in
  [MODAL-SPLIT.md](MODAL-SPLIT.md); do not squash them silently.
- Do you have a georeferenced historical map for your city? The tool can carry one dated
  map layer per period and currently has one, for Rotterdam in 1900. The five newer
  cities have none, and the overlay control is switched off for them until they do.
- Is your image later or earlier than the period it will sit under? Say so. The interface
  has a field for exactly that and will show it beside the picture.
