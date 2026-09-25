# Content pipeline

Turns raw WAEC and JAMB past papers into reviewed, import-ready question rows:
the key, three hints, a worked solution, the subtopic, redrawn diagrams and alt
text. Every subject goes through the same stages, driven by one orchestrator,
so a resent subject comes out matching Biology.

Rulings behind the design are D6 (how truth is decided) and D7 (how it runs) in
`blueprint/decisions.md`. The teaching bar is `standards/teaching.md`.

## Running a subject

```bash
cd content-pipeline
python extract.py --config configs/<slug>.json     # W1, deterministic, re-runnable
python run.py taxonomy <slug>                       # once per subject: the topic tree
python run.py run <slug>                            # first paper, then stops at the gate
python run.py approve <slug> --note "..."           # after Orezi reviews the gate page
python run.py run <slug>                            # every remaining year, unattended
python run.py status [<slug>]
```

`run` resumes where it stopped. `--unit 2024 --from teach` re-runs one paper
from a stage. Nothing here writes to the database or to storage: the output is
a CSV and an upload manifest, imported by a person.

## The gate

A subject's most recent paper runs alone and stops. The preview page,
`out/<slug>.<unit>.preview.html`, opens with what the gate needs: the topic tree
with that paper's questions counted onto it, what the classifier found wrong
with the tree, alt-text disputes, and the held list. Below it, every settled
question as a student sees it in practice mode. Approval unlocks the other
years. Held questions from every year are reviewed together at the end.

## Stages, in order

Claude stages run headless (`claude -p --restricted --safe-mode`), each in its
own folder under `work/<slug>/<unit>/<stage>/`, holding only its brief and
inputs, with the diagram folder as the one other place it can read. The brief is
saved beside its output, so every result can be traced to exactly what the
worker was told. Codex stages call `codex exec` with a JSON schema.

| Stage | Who | Brief or script | What it produces |
|---|---|---|---|
| derive | Claude and Codex, blind to each other | `briefs/derive.md`, `derive_codex.py` | two independent answer sets |
| compare | script | `adjudicate.py` | verified, agreed-soft, disagree, unsolvable |
| third | Claude | `briefs/third-review.md` | a ruling on every non-verified question |
| settle | script | `finalise.py` | the answer key: keyed, ambiguous, defective |
| classify | Claude (Sonnet) | `briefs/classify.md` | each question on one subtopic, plus findings about the tree |
| teach | Claude | `briefs/teach.md` | hints and solutions, shared stems kept in one chunk |
| review | Codex | `review_codex.py` | twelve checks per item, failing words quoted |
| fix | Claude | `briefs/fix.md` | findings weighed, applied or rejected with a reason, logged |
| recheck | Codex | `review_codex.py` | changed items only |
| final-fix | Claude | `briefs/fix.md`, final pass | last word on what still fails, or a hold |
| trace | script | `redraw.py` | SVG traced from the scan, fidelity measured |
| alt | Claude (Sonnet) | `briefs/alt.md` | alt text that never names an answer |
| author | Claude | `briefs/author.md` | a hand-written SVG where the trace was rejected |
| diagram-check | Codex | `check_diagrams.py` | original and redraw compared, alt text checked |
| diagram-repair | Claude | `briefs/alt.md`, `briefs/author.md` | findings weighed and repaired once |
| diagram-recheck | Codex | `check_diagrams.py` | repaired diagrams only; a drawing that still fails holds its questions |
| export | script | `export_csv.py`, `validate_csv.py` | the 24-column import CSV, upload manifest, held list, pre-flight |
| preview | script | `preview.py --gate` | the gate page |

Models per stage are in `pipeline.json`. The storage URL for diagrams comes from
the `SABIPREP_IMAGE_BASE` environment variable; without it the export is written
as `PREVIEW` files that cannot be mistaken for importable ones.

## Adding a subject

A config file, not code:

```json
{
  "slug": "physics-waec",
  "subject": "Physics",
  "source": "../../Exam Questions/2025-2015 WASSCE PHYSICS QUESTIONS.docx",
  "diagram_root": "../../Exam Questions/Physics waec Diagrams",
  "syllabi": [{"exam": "WASSCE", "path": "../syllabi/physics-waec.txt"},
              {"exam": "UTME", "path": "../syllabi/physics-jamb.txt"}]
}
```

One taxonomy serves a subject's WAEC and UTME papers, at
`taxonomies/<subject>.json`. `keep_italic` is for subjects where italics carry
meaning (English). `db_subject` names the live subject when it differs from
`subject`. A second paper under one year header is blocked until its true year
is confirmed and listed under `papers_confirmed`.

## Where things live

- `out/`: every result, committed, because derivations, rulings and teaching cost real tokens and would not come back identical. Only deterministic output is ignored.
- `out/diagrams/<slug>/`: SVGs, alt text, check results and `status.json`, one folder per subject because every paper names its images `2025_Q2-3`.
- `state/<slug>.json`: where each subject stands, stage by stage, with spend.
- `work/`: each worker's folder, inputs and session log. Ignored; the result it produced is in `out/`.

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
