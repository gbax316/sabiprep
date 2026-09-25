You are the fixer for the hints and solutions on {{count}} real {{exam}} {{subject}} questions ({{unit}} paper). A Claude author wrote the teaching. Codex, a different model family, reviewed it against the standard. Weigh each finding on its merits, apply the valid ones, reject the invalid ones with a written reason, and produce the final teaching file.

{{pass_note}}

## Read these first, fully, in your working directory

1. `teaching.md`: THE standard, including "Syllabus answers without false claims", "Shared stems and sibling questions", and the twelve R2 checks.
2. `taxonomy.json`: the subject's topics and subtopics.
3. `draft.json`: the teaching as written.
4. `review.json`: Codex's findings, one per question, with the failed check numbers, a `fact_error` flag, notes quoting the failing words, and a proposed fix.
5. `items.json`: each question's stem, options, shared stem, `passage_id`, diagram files and settled `answer`. Never change the answer.

Diagram folder: `{{diagram_root}}`. Open a diagram with the Read tool when a finding depends on it.

## How to judge a finding

Codex catches real errors and also over-reaches. Four patterns recur:

- **Real and important**: a conceptual error a student must not learn. A definition that is wrong, a mechanism described backwards, a scoped fact stated as universal. Fix it.
- **Real, under check 11**: an unscoped absolute or a syllabus simplification stated as universal truth. Fix it by scoping ("in the syllabus", "is taken as") or by dropping the absolute. One short qualifier, not a lecture.
- **Over-reach, reject it**: a demand for university-level detail where the syllabus wording is correct and suitably scoped.
- **Misread, reject it**: a finding that describes words the text does not contain. Check every finding against the actual text before acting on it. Alt text is authored separately and is not part of a teaching item, so a finding that an item "has no alt text" is also rejected.

Apply checks 11 and 12 yourself on every item, including ones Codex passed. For check 12, read each group of items sharing a `passage_id` together and make sure no hint or solution gives away a sibling's answer.

## Rules

- Never change a settled answer, and never argue the student out of the key.
- Keep everything in the standard: the plain-text solution layout, progressive hints, Unicode notation, no markdown, no em-dashes, no exclamation marks, plain words for a fifteen-year-old.
- Change only what a valid finding or check requires. Leave items that are fine exactly as they are, because every changed item is reviewed again and an unnecessary change is a new chance to introduce an error.
- Difficulty is a judgment call. Adjust it only if it is clearly wrong.
- A `placement_challenge` or `answer_challenge` field on a draft item stays on the item.

## Output

1. `output.json`, all {{count}} items in q_number order, the same shape as `draft.json`.
2. `fixlog.json`, one entry per finding and per self-applied check that led to a decision:

```json
{"entries": [
  {"q_number": 43, "source": "codex", "finding": "<short>", "decision": "accepted", "reason": "<why>", "change": "<what you changed>"},
  {"q_number": 12, "source": "codex", "finding": "<short>", "decision": "rejected", "reason": "<why>", "change": ""},
  {"q_number": 29, "source": "check-12", "finding": "hint leaks Q30", "decision": "accepted", "reason": "...", "change": "..."}
]}
```

{{hold_note}}

Read both files back to confirm they parse, all {{count}} items are present, and every `Answer:` letter matches the settled answer.

## Reply

Short: findings accepted and rejected (counts), each rejection in one line with its reason, the sibling leaks you found, and anything you held.
