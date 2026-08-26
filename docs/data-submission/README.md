# How to send us your data

This page walks you through it once, from start to finish. It should take about ten
minutes to read. You do not need any software beyond a spreadsheet program and email.


## Before anything else

There is no upload button on the website, and that is on purpose.

The rule this project works to is that nothing appears in the tool unless the file says
where it came from and a named person has checked it. A form that wrote straight into
the live site would remove the person, so instead you send us a file and we load it.

The practical effect for you is good: you are never blocked waiting for a login, and
nothing you send can be quietly altered without it showing up in the record.


## Step 1. Work out which kind of contribution you have

There are three, and they are separate. Most people have one; some have all three.

Counts of how people travelled, at a place, in a year. Use
`modal-split-template.csv`, and read `MODAL-SPLIT.md`.

Historic photographs, prints or scans. Use `image-template.csv`, and read
`IMAGES.md`.

Written narrative about a period in your city. Use `story-template.csv`, and read
`STORIES.md`.

If you have two kinds, send two files. Do not try to combine them.


## Step 2. Open the template

Each template is a `.csv` file: a plain spreadsheet with a header row and nothing else.
Open it in Excel, Numbers, LibreOffice or Google Sheets. Do not rename the columns and
do not reorder them.

One row is one thing. For counts, that is one place in one year, so the same junction
counted in 1934 and 1938 is two rows. For images, one row is one image. For narrative,
one row is one period.


## Step 3. Fill it in, and leave gaps where there are gaps

This is the part that matters most, so it is worth saying plainly.

If you do not know what goes in a field, leave it empty. Do not put a zero, a guess, a
dash or the word "unknown". An empty field is read as "not yet established", which is a
true statement and causes no harm. A guess looks exactly like a fact once it is in the
file, and nobody downstream can tell the difference.

The one exception is a real zero. If your source states that nobody arrived by bicycle,
write 0, and say so in the notes.

Every template has a notes column. It is read. If something does not fit, write what you
know there rather than forcing it into a column where it does not belong.


## Step 4. Send it back

Email the file to the maintainer, with any image files attached or linked.

If your files are large, a link to a shared folder is easier than an attachment.

Tell us in the email if anything in the batch is provisional, or if you are still
waiting on an archive to answer you. That saves a round of questions.


## Step 5. What happens next, and how long it takes

Loading your file into the tool takes minutes, and the site rebuilds itself about a
minute after that. A batch sent on Monday morning is usually visible on Monday.

When it first appears, your data is marked as unconfirmed. On the map it is a hollow
marker with a dashed edge. The citation button refuses to copy it. The chart shows it
behind a hatched pattern.

That is not a criticism of your work. It means one thing only: nobody has yet sat down
with your row and the original source side by side.

Later, a reviewer does exactly that, and signs the record. The marker becomes solid and
the record can be cited.

The two steps are deliberately separate so that your work is visible and usable
immediately, without the tool claiming more for it than is true yet.


## A note for people sending images

Images have one more gate, and it catches almost everybody, so please read this even if
you are sure.

Having the file is not the same as being allowed to publish it. An archive may let you
photograph a print in its reading room, catalogue it, and reproduce it in a thesis, and
still not permit it on a public website. Those are different permissions, granted
separately.

So the tool will not display an image until its rights are settled. Until then the
record shows a link to the archive and the credit, which is the correct state for an
image whose rights are unresolved, and it can stay that way for as long as it needs to.

Writing "unresolved" in the rights column is a perfectly good answer. It tells us the
image exists and where it is, which is genuinely useful on its own.


## A note for people writing narrative

The text goes in a narrow column beside a moving map, so it has to be short. The
existing entries are four to seven words for a title and twenty-two to thirty words for
the paragraph. Those are the real numbers, not a rough guide.

If your argument needs three hundred words, this is not the place for it. Put the short
version in the template and link the long version in the sources column.


## Questions people ask

*My source counts trams and buses separately, and also counts horse carts. The tool
shows four modes. What do I do?*

Write the categories exactly as your source words them in the `original_categories`
column, then explain in `mapping_notes` how you folded them into four. Do not squash
them silently. If several people report the same problem, that is a good argument for
changing the interface, and we can only see that if you write it down.

*My photograph is from 1938 but the period is the 1920s to 1940s. Is that a problem?*

No, but say so in the caveat column. The tool has a field for exactly this and shows it
beside the picture. One record already carries a note that its image shows Amsterdam
rather than Rotterdam.

*I only have three rows. Is that worth sending?*

Yes. Three verified rows are worth more than thirty unverified ones.

*Can I see my data in the tool before it is checked?*

Yes, that is what step 5 describes. It appears marked as unconfirmed.

*What if I get something wrong and it is already published?*

Tell us. It is corrected in the file, the correction is recorded, and the site updates.
Nothing is hidden.


## The templates

    modal-split-template.csv    counts        see MODAL-SPLIT.md
    image-template.csv          photographs   see IMAGES.md
    story-template.csv          narrative     see STORIES.md
