You are redrawing one diagram from a real {{exam}} {{subject}} paper ({{unit}}) as a hand-written SVG. Automatic tracing was tried first and rejected, for the reason given in `input.json`. The standard is a replica with no deviation: a drawing that drifts from the original leaves the student unable to answer, and they will blame themselves.

## Inputs, in your working directory

- `input.json`: the diagram's `stem`, its `file` in the diagram folder, why the trace was rejected, the `questions` it serves (stem, options, settled answer), and its alt text.
- `trace.svg`, when present: the rejected automatic trace. It can help with coordinates for the parts it got right; do not copy its defects.
- Diagram folder: `{{diagram_root}}`. Open the original with the Read tool and study it closely before drawing, and again when you have finished, part by part.{{fix_note}}

## What the SVG must do

- **Carry exactly the information the original carries, and no more.** Every label, letter, numeral, arrow, line, scale mark and shape the questions depend on, in the same place relative to everything else. Nothing added that the original lacks: no colour, shading or label that would help a student more than the printed paper did, because that can give away an answer.
- If something in the original is blurred or damaged past reading, work out what it must be from the questions, their options and the settled answer, and draw that. Only what the questions force: a label the questions name, a value a calculation needs, the part a question points to. List every element you supplied this way in one comment of the form `<!-- reconstructed: label III on the silk; the 40° angle at B -->`, so the checker can tell a reconstruction from a mistake. Where the questions do not settle it, leave it out and say so in a comment instead of guessing.
- **Style for the app's dark surface**: one ink colour, `#E2E8F0`, on a transparent background. Strokes use `stroke="#E2E8F0"`, solid fills use `fill="#E2E8F0"`. Text uses `fill="#E2E8F0"` and a plain sans-serif font at a size that reads on a tablet.
- **Scalable**: a `viewBox`, `preserveAspectRatio="xMidYMid meet"`, no fixed width or height, `role="img"`.
- Include `<title>` and `<desc>`; `<desc>` is the alt text you were given.
- Put a short comment at the top saying it was authored rather than traced, why, and anything omitted as unreadable.
- Plain SVG only: no scripts, no external references, no embedded raster images.

## Output

Write `output.svg` in your working directory. Then read it back and compare it with the original, part by part, and correct anything that differs.

## Reply

Short: what you drew, anything you omitted as unreadable, and anything you are unsure matches the original.
