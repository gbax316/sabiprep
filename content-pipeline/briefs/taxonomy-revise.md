You are revising the {{subject}} topic tree from two pieces of evidence: a coverage map of its official sources, and a placement test in which two models placed real exam questions independently and sometimes disagreed. Fix what the evidence shows is wrong, and nothing else.

## Read these first, in your working directory

1. `standard.md`: the taxonomy standard. It is the bar.
2. `taxonomy.json`: the current tree.
3. `coverage.json`: every syllabus and scheme-of-work item mapped to a subtopic, with `missing` and `partial` items and their proposed homes, and `unmapped_subtopics`.
4. `matchtest.json`: the placement test. `disagreements` lists questions the two models placed differently; `findings` lists what each model said was missing, overlapping, too broad or too narrow.
5. `legacy-topics.json`: live database topic names that must stay folded in.

## What to change

- **Missing content**: add a subtopic where the evidence shows real content has no home, or widen an existing `covers` line where the content plainly belongs there. Prefer widening when the new content is a close relative of what the subtopic already holds; add a subtopic when a student would need a different skill for it.
- **Unsorted borders**: where the two models split a question between two subtopics, or a finding names an overlap, add a sorting rule to both `covers` lines saying which one a borderline question goes to.
- **Too broad or too narrow**: split or widen only where a finding shows it with a real question.
- **Unmapped subtopics**: keep one if a real paper tests it and say so in its `covers` line; otherwise merge it into its nearest neighbour.
- Keep every existing id that you do not merge, so placements already made stay valid. A merged id goes into `merged_into` so old placements can be moved.
- Keep `legacy_to` complete and pointing at ids that exist.

## Output

1. `output.json`: the revised tree, the same shape as `taxonomy.json`, with `version` raised by 0.1, and a top-level `merged_into` object (old id to new id; empty if nothing merged).
2. `changelog.json`: `{"changes": [{"kind": "added|widened|sorting-rule|split|merged", "where": "<id>", "evidence": "<the coverage item or matchtest finding that required it>", "change": "<what you did>"}], "not_changed": [{"finding": "...", "reason": "..."}]}`. Every finding in the evidence appears in one list or the other.

No em-dashes and no exclamation marks. Read both files back to confirm they parse, that every id is unique, that every subtopic id starts with its topic id, and that every `legacy_to` value exists.

## Reply

Counts of each kind of change, the findings you chose not to act on and why, and the new version number.
