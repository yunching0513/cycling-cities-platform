# Existing map services, city by city

What was found on 2026-09-06 when looking for historical maps that can be drawn in the
tool as they are, without georeferencing or baking. Every service listed as **in use**
was called from this machine and returned tiles; every licence quoted was read on the
publisher's own page. Leads are marked as leads. Nothing here has been assumed.

The question asked of each source was the same: is there a dated city map at roughly
1:5,000 to 1:25,000 for the decades from the 1890s on, is publication on a public
research website allowed, and is it served as tiles or an image service already?

## Rotterdam: in use, every step

**Kadaster, Topotijdreis.** Every year from 1815 to today, CC BY 4.0, served as tiles by
Esri Nederland on the Dutch RD grid and reprojected in the browser. See PIPELINE.md.

## Minneapolis: in use, six dated sheets

**USGS Historical Topographic Map Collection, image service hosted by Esri**
(`historical1.arcgis.com/…/USA_Historical_Topo_Maps/ImageServer`). Every USGS sheet is
a separate raster with its own catalogue record, so a tile request locked to named
rasters draws exactly those sheets. The service's own copyright line reads "Source:
Historical Topographic Map Collection courtesy of the U.S. Geological Survey, Esri";
USGS maps are public domain.

Sheets chosen for the city, by the USGS "date current" of the edition:

| Year | Sheets | Scale | Raster ids | Note |
|---|---|---|---|---|
| 1896 | Minneapolis, with Anoka 1902 for the northern edge | 1:62,500 | 85338, 85140 | surveyed 1894 |
| 1901 | Minneapolis 1901 edition, with Anoka 1902 | 1:62,500 | 85337, 85140 | reprinted with the same content to 1949 |
| 1952 | Minneapolis South and North | 1:24,000 | 83988, 83981 | printed 1954 |
| 1967 | Minneapolis South and North | 1:24,000 | 83987, 83980 | printed 1969 |
| 1972 | Minneapolis South and North | 1:24,000 | 83986, 83979 | printed 1973 |
| 1993 | Minneapolis South and North | 1:24,000 | 83983, 83976 | |

Nothing dated exists between 1901 and 1952 at city scale, so the 1930s and 1940s show
the 1952 sheets with the gap stated; the 2020s fall back to the undated Esri composite.
This closes plan task T5 without a single file being baked. The catalogue query that
found the sheets is reproducible: `…/ImageServer/query?geometry=-93.272,44.96&
geometryType=esriGeometryPoint&inSR=4326&outFields=*&f=json`.

Also checked and set aside: the Minnesota Geospatial Commons image service (aerial
photography only, mostly 1990s and later, plus one 1938 Lyon County flight); the
Metropolitan Council's ArcGIS server (no historical imagery in its public folders);
MHAPO at the University of Minnesota (scanned aerials, not georeferenced, no tile
service).

## Lisbon: in use, two dated maps and one undated series

**Câmara Municipal de Lisboa, Cartografia Histórica**, published as tile services on
ArcGIS Online by the city's `geodados_CML` account. Every item carries the licence
"Sem restrições de uso" (no use restrictions) and the access line "CM Lisboa 2017". The
catalogue holds fifteen georeferenced maps from 1650 to 1948; the three that matter for
the timeline are in the tool:

| Year | Map | Service |
|---|---|---|
| 1878 | Planta de Lisboa, César and Francisco Goullard | `Cartografia1878_FranciscoCesarGoullard` |
| 1911 | Levantamento da Planta de Lisboa, Silva Pinto (surveyed 1904 to 1911) | `CartografiaHistoricaSilvaPinto1911` |
| 1899 to 1948 | a series the catalogue dates only as a range, held as an undated composite | `CartografiaHistorica1899_1948` |

Tiles are `https://tiles.arcgis.com/tiles/1dSrzEWVQn5kHHyK/arcgis/rest/services/<service>/MapServer/tile/{z}/{y}/{x}`,
Web Mercator, levels 0 to 19. From the 1940s on the undated series is shown and the
1911 map is offered on request. A map dated after 1911 that the city has not
georeferenced would fill that gap; the Arquivo Municipal is the place to ask.

## Tehran: one lead, no service yet

**David Rumsey Map Collection: "Tehran. 1956 - 1334", by Abbas Sahab**, a pocket map
published February 1956 (List No. 11541.002). The collection licence is CC BY-NC-SA 4.0
with the credit "David Rumsey Map Collection, David Rumsey Map Center, Stanford
Libraries", which a non-commercial research site can meet. The scan is served through
a public IIIF image endpoint, and the map has been georeferenced on the collection's
own viewer, but that viewer's tiles are not exposed for reuse. The route is to
georeference the IIIF image again in Allmaps Editor and serve it through the Allmaps
tile server (`https://allmaps.xyz/{z}/{x}/{y}.png?url=<annotation>`), which needs no
file and no hosting. Recorded in `data/maps.json` as a lead, so the interface counts it.

Not found: any open tile service for pre-1956 Tehran. The National Library and
Archives of Iran and the Library of Congress remain the holders to ask; Kazem's own
material should be asked about first.

## Riga: nothing consumable found

Checked and set aside: the National Library of Latvia's historical map portal
(`kartes.lndb.lv`, with a map browser for georeferenced items), whose sample record
for Riga carried "protected by copyright, available only inside the library network",
so rights have to be checked map by map; the Latvian Geospatial Information Agency's
map browser (`kartes.lgia.gov.lv`), which shows no historical layer; the old LĢIA WMS
host, which no longer resolves; the city's GEO RĪGA portal, which could not be reached
from here. Interwar Riga plans exist in several editions; a Riga researcher will know
which, and the library portal is where a georeferenced one would appear. A scan can
still be georeferenced in Allmaps as for Tehran.

## Budapest: leads only, permission needed

**Budapest Időgép (Hungaricana, Budapest Főváros Levéltára and partners).** Five
georeferenced time slices from 1837 to 1946, five vectorised, and 29 further
georeferenced maps, in a Mapbox-based viewer. Hungaricana's terms allow free use of its
digital content for educational purposes with attribution, but say high-resolution
content must be requested from the holding institution, and the viewer's tile
endpoints are not published. Embedding would need the archive's agreement; worth
asking, because the georeferencing is done.

**Arcanum Maps.** Georeferenced Budapest plans from the 18th century to the mid 20th,
served by WMTS "upon signature of a contract": 50 EUR a month for an individual,
150 EUR a month for an institution, at the tile volumes published on their site.

## What to send back

One row per map in `docs/data-submission/map-template.csv`, even when the answer to
"georeferenced" is no. A lead with a year, a holder and a rights statement is worth
having; it is what the interface counts when it says how many map leads a city has.
