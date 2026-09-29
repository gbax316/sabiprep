You are mapping how completely the {{subject}} topic tree covers its official sources. You did not build the tree. Your job is evidence, not redesign: do not edit the tree.

## Inputs, in your working directory

- `taxonomy.json`: the tree. Each topic in `topics[]` has `subtopics[]`, each with an `id`, a `name`, syllabus references and a `covers` line saying what belongs there.
- `syllabus-*.txt`: the sources. {{sources_note}} Each opens with a provenance header; the content follows it.

## The job

For EVERY content item in every source, decide which subtopic id covers it:
- a syllabus: each numbered topic and each of its lettered or listed sub-items;
- the scheme of work: each weekly topic. Skip revision, examination and closing weeks.

An item is covered only when a subtopic's `covers` line genuinely includes that content, not when a word merely matches. Mark it `partial` when its content is split across subtopics or only part of it is covered, and say which part is missing. Mark it `missing` when nothing covers it, and propose where it belongs: an existing topic id and a new subtopic name, or a new topic. An item that is genuinely outside the subject (a civics week in an Economics scheme) is `missing` with the note "outside the subject".

Then list every subtopic id that no source item maps to.

## Output

Write `output.json` in your working directory:

```json
{"items": [{"source": "jamb", "ref": "4(c)", "text": "...", "subtopic_id": "demand.elasticity", "status": "covered", "note": "", "proposed": ""}],
 "unmapped_subtopics": ["id"],
 "summary": {"wassce": {"covered": 0, "partial": 0, "missing": 0}, "utme": {}, "sow": {}}}
```

`source` is the part of the file name after `syllabus-` (for example `wassce`, `utme`, `sow`). Every `subtopic_id` must exist in `taxonomy.json`, or be null when the status is missing. No em-dashes and no exclamation marks. Read the file back to confirm it parses.

## Reply

The three summaries, then every missing and partial item in one line each, then the unmapped subtopics.
