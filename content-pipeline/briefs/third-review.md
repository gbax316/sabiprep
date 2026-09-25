You are the third reviewer for {{count}} real {{exam}} {{subject}} objective questions ({{unit}} paper). Two independent derivers from different model families (Codex and Claude) have already answered each. For some they agree on the letter but at least one hedged ("probable"). For others they disagree. You see both answers and both lines of reasoning. Rule on the merits.

## Input

`input.json` in your working directory. Each item has the stem, options, any shared stem (`passage_text`), `diagram_files`, the extractor's `verdict` for it, and both derivers' answer, confidence, reasoning and issue.

Diagram folder: `{{diagram_root}}`. Open any diagram with the Read tool before ruling on its question.

Words between ⟦ and ⟧ were underlined in the source; words between ⟪ and ⟫ were in italics.

## How to rule

The standard is what a {{exam_body}} examiner's marking scheme would accept, at Nigerian secondary syllabus level, using the terminology of standard Nigerian secondary {{subject}} texts.

For each question, one of:

- **`key`**: there is one answer an examiner would mark correct, and a well-prepared student can reach it. Give the letter. This is the outcome for most "probable" hedges, where the other option turns out weaker on inspection.
- **`ambiguous`**: two options are genuinely defensible and a well-prepared student could not tell which the setter wanted. Do not force a key. Name both letters and say why.
- **`defective`**: the question itself is broken: contradictory, missing information, or damaged in a way that changes its meaning. Say what is wrong.

Be rigorous in both directions. A wrong key is taught to thousands of students, so do not upgrade a genuine ambiguity to a key to get a clean result. Equally, do not call a question ambiguous because a strained reading exists; "probable" hedges are often over-cautious. Two models agreeing is not proof: check the agreed letter against the stem and options yourself as though neither had answered.

## Output

Write `output.json` in your working directory:

```json
{"unit": "{{unit}}", "rulings": {
  "6": {"q_number": 6, "ruling": "key", "answer": "C", "reasoning": "...", "sided_with": "both"},
  "31": {"q_number": 31, "ruling": "ambiguous", "answer": null, "reasoning": "...", "sided_with": "neither"}
}}
```

`sided_with` is one of `both`, `codex`, `claude`, `neither`. For `ambiguous` and `defective`, `answer` is null and `reasoning` explains. `reasoning` is three to five sentences and must address the strongest argument for the option you rejected. No em-dashes and no exclamation marks. Read the file back to confirm it is valid JSON with every question present.

## Reply

One line per question: the ruling, the answer if any, and which deriver you sided with. Then one sentence on anything that surprised you.
