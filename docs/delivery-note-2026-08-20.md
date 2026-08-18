# Cycling Cities Tool 2: prototype delivery note

Date: 2026-08-20
Prototype: v2.0
Live: https://cycling-cities-platform.vercel.app
Written in English because the audience is the research team; project documentation is otherwise in Traditional Chinese per the build plan §1.3.

---

## What this is

An interactive research atlas for Tool 2, "The Digital Experience". It demonstrates how a
century of urban cycling history can be read on a real map, decade by decade, across two
cities and the project's five analytical factors.

It is an **interface demonstration**. The interface architecture is the deliverable; most of
the content behind it is placeholder material, and the interface says so on every record.

## What is verified

Four records carry a real, externally checkable source. They are the only records in this
prototype that may be cited.

| Record | Archive | Reference | Rights | Use |
|---|---|---|---|---|
| MPLS-FORM-001 Nicollet Avenue in the bicycle boom | Library of Congress, Prints & Photographs Division | LC-DIG-det-4a12295 | No known restrictions on publication | link only |
| MPLS-ALT-001 Streetcar network at maximum extent | Library of Congress, Prints & Photographs Division | stereo 1s13511 | No known restrictions on publication | link only |
| RDAM-FORM-001 The Coolvest before the fill | Library of Congress, Photochrom Prints Collection | LC-DIG-ppmsc-05850 | Public Domain Mark 1.0 | embedded |
| RDAM-MOVE-001 Stop de Kindermoord | Nationaal Archief, Fotocollectie Anefo | bestanddeelnr. 926-1050 | CC0 1.0 | embedded |

Two caveats we are stating rather than hiding:

- The Stop de Kindermoord photograph records the Albert Cuypstraat junction in **Amsterdam**,
  not Rotterdam. The record says so on its face.
- The Nicollet Avenue photograph dates from **1900 to 1906**, later than the 1890s slice it
  illustrates. The record says so on its face.
- The two Library of Congress links could not be re-checked automatically on 2026-08-19
  because loc.gov blocks automated requests. Please click them once before wider circulation.

## What is placeholder

**27 of 31 site records** and **all 28 modal split figures**.

The citations that previously appeared on those records were generated to demonstrate the
interface. They looked correct but the archive numbers did not exist. They have been removed.
The full list of what was removed is in `docs/purged-citations-2026-08-19.md`.

The narrative text on those records is retained, because it demonstrates what a record should
say. It is not a claim that the underlying history has been confirmed.

How the interface marks it:

- placeholder points are drawn **hollow with a dashed edge**; verified points are solid
- the record card is dashed and carries a warning that it must not be quoted
- the source line reads `[TO BE CONFIRMED]`
- the citation button refuses to copy a placeholder record
- the modal split chart is overlaid with hatching, and reports "Derivation: not established"
- the panel footer keeps a running count: placeholder 27 / 31
- a "Data status" panel, generated from the data itself, lists exactly what is confirmed

## Historical overlays

Both load from live services and were tested on 2026-08-19.

- **Rotterdam**: Bonneblad 1900, Kadaster / Topotijdreis, CC BY 4.0, baked to PMTiles and
  served over HTTP range requests, zoom 12 to 17.
- **Minneapolis**: USGS scanned quadrangles via Esri USA_Topo_Maps, zoom 8 to 15.
  **This service is not split by year**, so Minneapolis cannot yet be compared with Rotterdam
  decade for decade. Replacing it with dated USGS topoView sheets is the next step.

A draggable "then and now" divider compares the historical sheet against the modern street map.

## What we need from the research team

1. **Original archive references for the Minneapolis material**: the raw catalogue numbers and
   file locations, not a summarised conclusion. This is the only way to replace the removed
   citations.
2. **A source for every modal split figure**, plus how each was derived (measured, estimated or
   interpolated). The data model already carries that field; it is currently null.
3. **Priority order for the five factors** in the interface, and how much placeholder content
   is acceptable in a version shown outside the team.
4. **Any existing Tool 2 technical documentation**: if a data schema has already been defined,
   we should adopt it rather than define a second one.

## Reading a specific view

The URL carries the full state, so a view can be shared or cited directly:

```
https://cycling-cities-platform.vercel.app/?lang=nl&city=rdam&d=1970
```

`lang` is `en`, `zh` or `nl`. `city` is `mpls` or `rdam`. `d` is the decade, 1890 to 2020.

The Dutch interface is a working translation and has **not** been proofread by a native
speaker. Please treat its wording as provisional.

## Open questions for 2026-09-19

- Is the Amstel meeting time local to Amsterdam or to Taipei? The two differ by six hours.
- Is the scope of this delivery what was expected? The date and contents were noted as
  unconfirmed on our side.
