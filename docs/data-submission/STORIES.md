# Historical narrative submission

For researchers writing the narrative text for their city.

Fill in `story-template.csv`, one row per period per city.

## How the narrative is organised

The tool has **nine shared periods**, running from the 1890s to the 2020s. They are the
same nine for every city, and that is deliberate: the platform exists to compare cities,
and a comparison needs a shared frame. If Riga had its own period boundaries and
Rotterdam had different ones, nothing could be read side by side.

The periods, by their start year:

| `period_start` | Span | Factor it turns on |
|---|---|---|
| 1890 | 1890s to 1900s | Cultural status |
| 1910 | 1910s | Mobility alternatives |
| 1920 | 1920s to 1940s | Urban form |
| 1950 | 1950s | Mobility alternatives |
| 1960 | 1960s | Traffic policy |
| 1970 | 1970s to 1980s | Social movements |
| 1990 | 1990s to 2000s | Urban form |
| 2010 | 2010s | Cultural status |
| 2020 | 2020s to 2025 | Mobility alternatives |

You write **your city's paragraph inside the shared period.** Not all nine need to be
filled. If a period is uneventful in your city, leave it out rather than padding it.

## Length

This is the part people find hardest, so here are the real numbers from the text
already in the tool:

- `title_en`: **4 to 7 words.** A claim, not a label. "Speed redrew the street", not
  "Traffic policy in the 1960s".
- `body_en`: **22 to 30 words.** That is not a typo. The column beside the map is narrow,
  and the text has to survive being read next to a moving map.

If your argument needs 300 words, the tool is the wrong place for it. Put the short
version here, and link the long version through `sources`.

## Columns

| Column | What it holds |
|---|---|
| `period_start` | one of the nine start years above |
| `city_slug` | `mpls`, `rdam`, `riga`, `buda`, `lisb`, `tehr` |
| `title_en` | 4 to 7 words, making a claim |
| `body_en` | 22 to 30 words |
| `factor` | `form`, `alt`, `policy`, `move` or `cult`, if your city's story turns on a different factor than the shared one |
| `linked_site_ids` | site records that carry this, semicolon separated |
| `linked_image_ids` | image ids from `image-template.csv`, semicolon separated |
| `sources` | full citations, semicolon separated. The long version of the argument goes here |
| `source_archive` | holding institution for the main source |
| `source_reference` | call number for the main source |
| `contested_note` | what in this paragraph other historians would argue with |
| `author` | your name. This is your text and it will be credited |
| `author_affiliation` | institution |
| `written_on` | `YYYY-MM-DD` |

### About `contested_note`

The build plan says the platform presents conclusions rather than the uncertainty behind
them, so this column is **not shown in the interface.** It is for the editor, so that
nobody later mistakes a live argument for a settled one, and so that a reviewer knows
where to look. Write it plainly.

## Write in English

Write your paragraph in English. Traditional Chinese and Dutch are added afterwards by
the team. Do not machine-translate your own text into the other two: a rough translation
is harder to correct than an empty field.

## How your paragraph appears

The narrative column has two views. The **shared frame** is the project's common
argument, read as the nine periods above. A **city chapter** is your city's paragraphs
arranged under the five factors, in the same order for every city, so that two chapters
can be read side by side factor for factor. A reader switches between the two with one
link at the top of the column; with a city selected they see that city's chapter, and in
the comparison view they see both cities' chapters, factor by factor.

Your row's `period_start` decides which period the paragraph belongs to and where the
map goes when a reader selects it. Your row's `factor` decides which section of the
chapter it sits in; leave it empty and the shared period's factor is used.

Where a city has no paragraph for a factor, the column says so and shows what a
paragraph needs, rather than filling the gap. The Rotterdam chapter currently holds
three Lorem Ipsum paragraphs, at the team's request, to show the shape.

Until a reviewer has checked a paragraph against the sources it lists, it is shown with
an "unconfirmed" flag. That is not a judgement on the text; it means nobody has yet sat
with it and the sources side by side.
