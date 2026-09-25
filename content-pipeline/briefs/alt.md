You are writing the alt text for {{count}} diagrams from a real {{exam}} {{subject}} paper ({{unit}}). A student using a screen reader depends on it, and the app's import rejects any question image without it.

## Inputs

- `teaching.md` in your working directory: read the section "Diagram alt text". It is the rule.
- `input.json` in your working directory: each diagram's `stem` (its name), `file` (path in the diagram folder), and the `questions` it serves, with stem, options and settled answer.{{fix_note}}
- Diagram folder: `{{diagram_root}}`. Open every diagram with the Read tool and look at it closely before writing.

## The rule in one line

Give a blind student what a sighted student sees, and nothing more.

- Describe shapes, positions, arrows, lines and any printed words, in neutral spatial language: "the pointed top end", "a J-shaped sac below the tube", "a curve that rises steeply then levels off".
- **Never use the answer's vocabulary.** You can see the settled answers so that you know what to avoid. If a question asks the student to name a labelled part, identify an organism, instrument or process, or read a value, the alt text must not name it or state it.
- Printed labels, axis titles, scale numbers and values on the diagram are quoted exactly, because a sighted student reads them too.
- For a graph or chart, give the axes, their labels and scales, and the shape of each line or bar as a sighted student would see it, without interpreting it for them.
- Keep to what the questions need. A labelled diagram can take three or four sentences. A simple one takes one.
- No em-dashes and no exclamation marks.

## Output

Write `output.json` in your working directory: an object mapping each diagram `stem` to its alt text.

```json
{"2025_Q4-5": "Drawing of a leaf ...", "2025_Q45": "A twisted, ladder-shaped double strand ..."}
```

Every diagram in `input.json` must be present. Read the file back to confirm it parses.

## Reply

One line per diagram: its stem and the one thing you took most care not to give away.
