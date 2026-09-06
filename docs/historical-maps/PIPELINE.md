# From a scanned map to a dated overlay

How a historical map gets onto the timeline. For the maintainer and for any researcher
who wants to georeference their own city's sheets.

## The shape of the problem

The tool draws maps as raster tiles in Web Mercator (EPSG:3857), the projection every
web basemap uses. Historical sheets arrive in one of three states:

1. **A tile service already exists.** The publisher serves the map as tiles by year.
   Rotterdam is this case: Kadaster's Topotijdreis serves every year from 1815 to today
   under CC BY 4.0. The service is on the Dutch national grid (RD, EPSG:28992), so the
   tool reprojects each tile in the browser with proj4. No file to keep, nothing to bake.
   A row in `data/maps.json` with `kind: "topotijdreis"`, a `years` list and a `{year}`
   placeholder covers a whole series.
2. **A georeferenced file exists.** A GeoTIFF from an archive, a university GIS lab or a
   previous project. Bake it to PMTiles (below), host it, add a row with `kind: "pmtiles"`.
3. **Only a scan exists.** Georeference it first, then treat it as case 2.

4. **An image service holds the sheets.** Esri's USGS historical topographic service
   keeps every sheet as a raster with a catalogue record; a row with `kind:
   "arcgis-image"`, the service URL and the raster ids draws exactly those sheets, one
   `exportImage` call per tile. Minneapolis is this case; SOURCES.md lists the ids.
5. **A scan is served through IIIF.** Georeference it in Allmaps Editor (a browser
   tool, nothing to install) and the Allmaps tile server draws it live from the
   annotation: `https://allmaps.xyz/{z}/{x}/{y}.png?url=<annotation URL>`. Add a row with
   `kind: "xyz"` and that template. No file, no hosting; the image licence still governs.

## Georeferencing a scan

Use QGIS's Georeferencer, or Allmaps if the scan is served through IIIF by its archive.

- Pick 8 to 15 control points on features that have not moved: church towers, bridge
  abutments, railway junctions, canal corners. Avoid street intersections in areas that
  were rebuilt.
- For city plans older than about 1930 use a thin plate spline transformation; the sheets
  were surveyed on local datums and a linear fit will not close.
- Set the target CRS to EPSG:3857 and export a GeoTIFF with LZW compression.
- Record the method and the point count in the map row's `georef_method`, and keep the
  control point file with the scan. Somebody will want to redo it.
- Note the residual error. On a 1:10,000 sheet, 10 to 20 metres is normal; the tool's
  status line does not show this yet, so put it in `notes`.

## Baking PMTiles

PMTiles is a single file of tiles that a browser reads by HTTP range requests, so it can
sit on GitHub Pages or any static host and needs no tile server.

Tools: GDAL and the `pmtiles` command line, or `rio-pmtiles`. None of these is installed
on the maintainer's machine at the time of writing; install before the first bake:

    brew install gdal pmtiles          # macOS
    pip install rio-pmtiles            # alternative, Python

From a GeoTIFF in EPSG:3857:

    gdal2tiles.py --xyz -z 12-17 -w none city-1930.tif tiles/
    pmtiles convert tiles/ city-1930.pmtiles      # or: rio pmtiles city-1930.tif city-1930.pmtiles

Zoom 12 to 17 for a city centre of roughly 6 by 4 kilometres comes to about 7 MB in WEBP,
which is what the existing `rotterdam-1900.pmtiles` weighs. Do not bake zoom 18: a
1:10,000 scan has no detail there and the file triples.

For Topotijdreis specifically, the author's Netherlands-historical-map project carries
`tools/bake_pmtiles.py`, which reprojects the RD tiles ahead of time and writes the
archive plus a manifest entry. Its README gives the exact command. That is how the
Rotterdam 1900 archive was made.

## Hosting

Put the `.pmtiles` on a static host that answers range requests. GitHub Pages does. The
existing archives live in the Netherlands-historical-map repository's `pmtiles/` folder
and are read from `https://yunching0513.github.io/Netherlands-historical-map/pmtiles/`.
A second repository for the other five cities is fine; keep the URL stable, because the
row in `data/maps.json` points at it.

## Adding the row

Either fill `docs/data-submission/map-template.csv` and send it (or drop it on the site
once the inbox is configured), or write the row into `data/maps.json` directly:

    {
      "id": "RIGA-MAP-1930", "city": "riga", "kind": "pmtiles", "year": 1930,
      "url": "https://…/riga-1930.pmtiles", "bounds": [[56.93, 24.07], [56.97, 24.14]],
      "minZoom": 12, "maxZoom": 17,
      "title": { "en": "…", "zh": "…", "nl": "…" },
      "yearBasis": "edition year printed on the sheet",
      "publisher": "…", "source": { "citation": "…", "archive": "…", "reference": "…", "url": "…" },
      "licence": { "statement": "…", "uri": "…", "basis": "…" },
      "attr": "…", "projection": "EPSG:3857", "checked": null, "placeholder": false
    }

`bounds` is south-west then north-east, in latitude, longitude. Leave `checked` null
until you have seen the layer's status line say `ready` in the tool, then write the date.

## What the interface does with it

- It shows, for the selected step, the map whose year is nearest, and states the distance
  in years. Within 25 years it shows the map by default; beyond that it offers it on
  request. `maxGap` in `data/maps.json` sets the threshold.
- A tie between two maps of the same year goes to a PMTiles archive over a live service,
  because the archive keeps working when the service does not.
- An undated map (Minneapolis's USGS composite) is shown only when no dated map is within
  reach, and is labelled undated.
- A small mark under a step on the scrubber says a dated map exists for it.
- In comparison, each of the two maps shows its own city's nearest map.

## Limits

Web Mercator only; no rotated or oblique sheets. Raster only; nothing is vectorised.
The status line does not yet show georeferencing error. The Topotijdreis year is the year
the national map stood at, not necessarily the survey year of each sheet, and the status
line says so.
