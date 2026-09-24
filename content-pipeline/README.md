# Content pipeline

Turns raw exam papers into reviewed, import-ready question rows.

Built against `blueprint/QUESTION-PIPELINE.md`, which defines the roles. Biology
WAEC is the reference subject: it was the only one whose questions and diagrams
both arrived intact, so the pipeline is proved there and every resent subject
runs through the same stages with only a config file changing.

## Stages

| Stage | Role | What it does | Deterministic |
|---|---|---|---|
| W1 | Extractor | `.docx` to structured items: stem, options, shared stem, diagram binding | yes |
| W2 | Answer deriver | Solves each question. Run independently more than once, in contexts that cannot see each other | no |
| R1 | Answer adjudicator | Compares the independent derivations. Agreed, disagreed, or unsolvable | no |
| W3 | Teaching author | Given a verified answer: worked solution, three progressive hints, the principle | no |
| R2 | Quality reviewer | Does hint 1 narrow without revealing? Does the solution show method? | no |
| W4 | Diagram author | Redraws a source diagram as SVG, verified against the original | no |

Only W1 is running today. The rest are next.

## Running W1

```bash
cd content-pipeline
python extract.py --config configs/biology-waec.json
```

Outputs land in `out/`:

- `<slug>.items.jsonl` one JSON object per question
- `<slug>.report.json` counts, gaps, and everything that needs a human

Adding a subject is a config file, not code:

```json
{
  "slug": "physics-waec",
  "subject": "Physics",
  "source": "../../Exam Questions/2025-2015 WASSCE PHYSICS QUESTIONS.docx",
  "diagram_root": "../../Exam Questions/Physics waec Diagrams"
}
```

## What W1 handles, and why each rule exists

Each of these was found in the real Biology source, and each will recur.

**Two option formats.** Papers write options as `A. opt B. opt` or as
`(a) opt (b) opt`, and which one appears varies by year within a single
document. Biology uses bare letters in 2016 and 2020 to 2025, parenthesised
lowercase in 2015 and 2017 to 2019. Both are parsed, and the letter is
normalised to uppercase.

**Options on the following line.** Some questions run onto a second paragraph
that carries the options. W1 absorbs up to two continuation lines, and only
lines that begin nothing of their own, so a shared stem or the next question is
never swallowed.

**Shared stems.** A stem appears before the questions it serves and names its
own range: "Study it and answer questions 4 and 5". That range becomes the
`passage_id` grouping key. This is not an English-only concern. Biology has 71
such stems covering 152 questions.

**Diagram binding is mechanical, not inferred.** Images are named
`2019_Q24.png` or `2022_Q14-15.png`. A range binds every question it spans. No
guessing, and an image that binds to nothing is reported rather than dropped.

**Nothing is guessed.** An option run must start at A and step forward without
gaps. Anything short of that is reported as needing a human, because a
mis-split option is a wrong question that still looks right to every check
downstream.

## The audit pass

W1 reports what it could not read, which turns out to be as valuable as what it
could. On Biology it found:

- **Three lost question numbers**: 2016 Q3, 2017 Q4, 2018 Q17. Each is a year
  holding 49 questions where the others hold 50.
- **Two of those three recoverable from the document itself**, as lines that
  carry a full question and option set but lost their number.
- **One orphan image**, `2017/2017_Q4.png`, which independently corroborates
  the missing 2017 Q4 from the other direction.
- **Four questions whose options were never transcribed.** The document
  contains no tables and no embedded images, so these were lost when the paper
  was typed up and cannot be recovered from this file.
- **Two questions with a damaged option letter**, such as 2019 Q38 reading
  `(a) air (b) soil (e) water (d) noise`, where `(e)` should be `(c)`.

## Current state: Biology WAEC

| | |
|---|---|
| Items extracted | 547 across 2015 to 2025 |
| Clean, four options | 540 |
| Need a human | 7 |
| Shared stems | 71, covering 152 items |
| Diagrams bound | 146 |
| Lost question numbers | 3, two recoverable |
