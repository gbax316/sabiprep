You are placing {{count}} real {{exam}} {{subject}} questions ({{unit}} paper) into the subject's topic taxonomy. You did not design the taxonomy. That is useful: if it is hard for you to use, it will be hard for everyone after you, so report honestly where it fails.

## Inputs, in your working directory

- `taxonomy.json`: read `topics[]`. Each parent topic has `subtopics[]`; each subtopic has an `id` like `transport.plants`, a `syllabus` reference and a `covers` line saying what belongs there. Read `how_to_use` and any sorting rules for subtopics that border each other.
- `input.json`: each question's stem, options, settled answer and any shared stem.

## The job

For each question, choose the ONE subtopic `id` whose content the question actually tests. Classify by what a student must know to answer it, not by words in the stem. A question that mentions a leaf but tests osmosis belongs under osmosis. A calculation belongs where its principle is taught, not where its numbers come from.

Report a problem rather than forcing a fit when:
- **no subtopic fits**: the question tests something the taxonomy has no place for. Say what the missing subtopic would be and which parent it belongs under.
- **two subtopics fit equally**: name both and say why. That is a boundary the taxonomy needs to sharpen.
- **only a parent fits**: say which parent, and what subtopic is missing under it.

## Output

Write `output.json` in your working directory:

```json
{"unit": "{{unit}}", "items": [
  {"q_number": 1, "subtopic_id": "classification.kingdoms", "confidence": "clear", "note": ""},
  {"q_number": 9, "subtopic_id": "...", "confidence": "overlap", "note": "also fits x.y because ..."}
],
"taxonomy_findings": [
  {"kind": "missing|overlap|misplaced|too-broad|too-narrow", "where": "<id>", "detail": "..."}
]}
```

`confidence` is `clear`, `overlap` (two fit) or `nofit` (none fits; give your best subtopic or parent id and explain in `note`). Every `subtopic_id` must exist in `taxonomy.json`. Every question must be present. No em-dashes and no exclamation marks. Read the file back to confirm it parses and every id exists.

## Reply

Short: how many clear, overlap and nofit, then each taxonomy finding in one line. The findings matter more than the placements.
