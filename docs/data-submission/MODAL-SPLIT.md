# Modal split data submission

For researchers contributing junction-level or city-level modal split figures to
Cycling Cities Tool 2.

Fill in `modal-split-template.csv`, one row per **point per year**. Send it back with
any scans or references you want linked. Nothing is published until someone on the
research team has checked the row and signed the `verified_by` field.

## Why the template is strict

The prototype currently carries 28 modal split rows and every one of them is a
placeholder inherited from an early design mock. The interface marks them as
unconfirmed and refuses to let anyone cite them. Your rows will be the first real
figures in the tool, so they are held to the standard the placeholders are not.

The rule the project works to: no number appears in the interface unless the file
says where it came from. If a field is unknown, leave it empty rather than guessing.
Empty is safe; a guess is not.

## Columns

### Where

| Column | What it holds |
|---|---|
| `city_name` | Riga, Budapest, Lisbon, … as you would write it in English |
| `city_slug` | the id the platform already uses: `riga`, `buda`, `lisb`, `tehr`. Same slug on every row |
| `point_id` | your own id for the point, e.g. `RIGA-INT-001`. Reused across years |
| `point_name` | the junction or street, as a reader would recognise it |
| `lat`, `lon` | decimal degrees, WGS84. Five decimal places is plenty |
| `location_basis` | how you fixed the coordinates: `historical map`, `street address`, `modern equivalent`, `approximate` |

`location_basis` matters more than precision. A point placed on a modern junction that
replaced a 1930s one is useful, but it must say so.

### When

| Column | What it holds |
|---|---|
| `year` | the actual year of the observation, e.g. `1937`. Not the decade |
| `observed_date` | full date if the source gives one, `YYYY-MM-DD` |
| `observed_hours` | e.g. `07:00-09:00`, or `full day` |

The tool groups by decade, but store the year. A decade can be derived from a year;
a year cannot be recovered from a decade.

### What was counted

| Column | What it holds |
|---|---|
| `mode_bicycle`, `mode_walking`, `mode_transit`, `mode_car` | the four modes the interface shows |
| `unit` | `count` or `percent` |
| `total_observed` | total vehicles or people observed, if `unit` is `count` |
| `original_categories` | the categories **exactly as the source names them** |
| `mapping_notes` | how those categories were folded into the four above |

`original_categories` and `mapping_notes` are the two columns not to skip. Interwar
counts rarely use four tidy modes: they separate tram from bus, count horse-drawn
vehicles, or put motorcycles with cars. Squashing that into four buckets silently
destroys the evidence. Record what the source said, then record your decision.

If a mode genuinely was not counted, leave it empty. Do not enter `0` unless the
source states the count was zero.

### How it was derived

| Column | What it holds |
|---|---|
| `derivation` | `measured`, `estimated`, or `interpolated` |
| `method` | e.g. `manual cordon count`, `police traffic register`, `household survey` |

`measured` means the source counted it. `estimated` means someone, then or now,
inferred it. `interpolated` means it was filled between two other years. The interface
shows this on the record, so a reader can tell a count from an inference.

### Where it came from

| Column | What it holds |
|---|---|
| `source_citation` | full citation as you would print it |
| `source_archive` | holding institution |
| `source_reference` | call number, shelfmark, file or box number |
| `source_url` | permanent link if one exists |
| `verified_by` | your name, once you have checked the row against the source |
| `verified_on` | `YYYY-MM-DD` |
| `notes` | anything a later reader needs, including your doubts |

Leave `verified_by` and `verified_on` empty until you have actually seen the source
yourself. A row without them is loaded as unconfirmed and shown with a dashed marker.

## Example row

```
city_name       Riga
city_slug       riga
point_id        RIGA-INT-001
point_name      <the junction, as a reader would recognise it>
lat             <decimal degrees>
lon             <decimal degrees>
location_basis  historical map
year            <the year of the count>
mode_bicycle    <as recorded>
mode_walking    <as recorded>
mode_transit    <as recorded>
mode_car        <as recorded>
unit            count
total_observed  <sum actually observed>
original_categories  "bicycles; pedestrians; tram; omnibus; motor cars; horse-drawn"
mapping_notes   "tram + omnibus -> transit; horse-drawn kept out of all four, see notes"
derivation      measured
method          manual cordon count
observed_date   <YYYY-MM-DD>
observed_hours  07:00-09:00
source_citation <full citation>
source_archive  <holding institution>
source_reference <call number>
source_url      <permanent link, if any>
verified_by     <your name>
verified_on     <YYYY-MM-DD>
notes           "horse-drawn traffic was 11 per cent of the total and has no bucket in the interface"
```

The angle brackets are gaps for you to fill. The two quoted fields show the shape of a
real answer.

## Your city is already in the tool

Riga, Budapest and Lisbon are selectable now, with no records of their own. Open the
tool, pick your city, and section 05 will say that no modal split figures have been
supplied yet. That empty state is what your rows fill.

The historical overlay is switched off for the three new cities: no dated, rights-cleared
map has been found for them yet. If you have one, say so.

## What happens to a submitted row

1. It is loaded into `data/modalsplit.json` or `data/intersections.json` with
   `placeholder: true`.
2. It appears on the map as a hollow, dashed marker and cannot be cited.
3. When `verified_by` and `verified_on` are filled and a second reader confirms them,
   the flag flips and the marker becomes solid.

## Open questions for contributors

- If your source counts a mode the four buckets cannot hold, say so in `notes`
  rather than forcing it. Several such notes will be a good argument for adding a
  fifth mode to the interface.
- If you have a georeferenced historical map of the city for the same period, say so.
  The tool can carry a dated map layer per decade, and currently has one, for
  Rotterdam in 1900.
