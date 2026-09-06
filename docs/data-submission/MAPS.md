# Dated map submission

For researchers contributing a historical map of their city.

Fill in `map-template.csv`, one row per map. Send it with the file, or with a link to
where the file or tile service lives.

## Read this first

A map is drawn in the tool only when three things are true: it has a **year**, it has a
**licence that allows publication**, and it exists as a **georeferenced file or tile
service**. Record the map even if you only have the first two. It is then held as a lead:
the interface says how many map leads the city has and that none is georeferenced yet,
which is true and useful. Nothing is drawn from a lead, and nothing is guessed.

## How the tool uses the year

The timeline runs in steps from the 1890s to the present. For the selected step the tool
shows the map whose year is nearest, and it says so in words: "1930 map, within 1930s",
or "1900 map, shown for 1920s: 11 years earlier than the step". Beyond 25 years it stops
showing the map by default and offers it on request instead. The reader always sees both
numbers, the map's year and the step, and is never shown a map as if it belonged to a
decade it does not.

So the year is the most important field, and `year_basis` is the second: say what the
year means. A survey year, an edition year, a print year and the year a national map
series stood at are four different things, and a reader comparing two cities needs to
know which one they are looking at.

Rotterdam already has a map for every step. That is not because Rotterdam is special: the
Dutch cadastre publishes its historical map series year by year under CC BY 4.0
(Topotijdreis), so the tool can draw the 1890, 1900, 1910 and every later edition
directly. If your national mapping agency publishes anything similar, that is the first
thing to look for.

## Columns

### What it is

| Column | What it holds |
|---|---|
| `city_slug` | `mpls`, `rdam`, `riga`, `buda`, `lisb`, `tehr` |
| `map_id` | your own id, e.g. `RIGA-MAP-1930` |
| `title` | as it appears on the sheet, or as the archive catalogues it |
| `year` | one year. If the sheet gives a range, put the later year here and the range in `notes` |
| `year_basis` | `survey`, `edition`, `print`, `series year`, or your own words |
| `publisher` | the surveying or publishing body |
| `scale` | e.g. `1:10000` |
| `series_or_sheet` | series name and sheet number, if part of one |

### Where it is held

| Column | What it holds |
|---|---|
| `archive` | holding institution |
| `reference` | call number or inventory number |
| `source_url` | permanent link to the catalogue record or the scan |

### Whether it is georeferenced

| Column | What it holds |
|---|---|
| `georeferenced` | `yes`, `no`, or `partly` |
| `georef_method` | e.g. `QGIS Georeferencer, 12 control points, thin plate spline`, or `published by the archive` |
| `georef_file_url` | link to a GeoTIFF or PMTiles file, if one exists |
| `tile_url` | a tile service, if one exists, with `{z}/{x}/{y}` or `{z}/{y}/{x}` placeholders |
| `projection` | the file's coordinate system, e.g. `EPSG:3857`, `EPSG:3059` |

"Georeferenced" means the scan has been tied to real-world coordinates so it can lie on a
modern map. A plain scan is not georeferenced, however good it is. If you only have the
scan, say `no`: the team can georeference it, and `docs/historical-maps/PIPELINE.md`
describes how. If the archive publishes a georeferenced version or a tile service, say
so, and the work is already done.

### Whether it may be published

| Column | What it holds |
|---|---|
| `rights_statement` | e.g. `Public Domain Mark 1.0`, `CC BY 4.0`, `In Copyright` |
| `rights_uri` | the URI for that statement |
| `rights_basis` | `archive statement`, `licence on the file`, `written permission`, `term expired`, `unresolved` |
| `may_publish` | `yes`, `no`, or `unresolved` |
| `attribution_text` | the exact wording the publisher requires |
| `cleared_by` | your name, once you have checked all of the above |
| `cleared_on` | `YYYY-MM-DD` |

The same gate as for images: having a scan is not the same as being allowed to put it
on a public website. Municipal and national mapping agencies often hold rights in maps
long after the survey. `unresolved` is a good answer; it keeps the lead and stops the map
from being drawn until somebody knows.

### Anything a reader needs to know

| Column | What it holds |
|---|---|
| `notes` | a range of survey years, a sheet that covers only part of the city, a known distortion |

## What happens next

1. The row loads into `data/maps.json`. Without a georeferenced file and a cleared
   licence it is a lead, and the interface counts it under the city's map specification.
2. When a file or tile service exists and `may_publish` is `yes`, the team bakes it if
   needed and switches the row on. The map appears at the steps nearest its year, with
   its year, source and licence in the status line.
3. The date it was seen working is recorded in the row, so a broken service later is a
   fact with a date rather than a surprise.

## The templates

    map-template.csv            dated maps    this page
    docs/historical-maps/       how a scan becomes an overlay, and where to look per city
