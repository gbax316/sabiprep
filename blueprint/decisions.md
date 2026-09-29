# SabiPrep decisions

Rulings: what was decided, why, and what was rejected. Append with dates. Never rewrite a past
entry.

**D1, D2 and D3 are not repeated here.** They were ratified 2026-08-24 and live in the
Decisions register at the foot of `LEDGER.md`, alongside the findings that produced them.
Copying them would create a second place for the same question to get a different answer.

- **D1** Live-app scope: the forgery holes only. Everything else on the old app is accepted
  risk until v2 replaces it.
- **D2** Proficiency starts from zero. `sessions` and `session_answers` migrate as an archive.
- **D3** Humans edit teaching fields directly; anything a model produced passes the gate.

---

## D4: The live-app slice is wider than D1, in two named places

**Date:** 2026-09-16
**Decided by:** Orezi
**Resolves:** what goes into the one slice the old app gets, now that 23 days have passed with
D1 ratified and nothing shipped.

**Decision:** keep D1's authorization work as the spine, and add three things it did not cover.

| Added | Why D1 does not cover it |
|---|---|
| SABI-REV-025 to 028, the import-path defects | D1's reasoning is "everything else is being deleted." That does not hold here. `PLAN.md` says the admin content pipeline is carried forward, not rebuilt, and names closing these as prerequisite to the 1995 to 2025 corpus import. The four findings fell between `RETROFIT.md` and `PLAN.md` and were booked by neither |
| SABI-REV-061, the dark-mode wiring | D1 flagged this itself as worth revisiting if guest conversion matters before v2 ships, then nobody revisited it. The signup modal fires after five questions and is the primary guest-to-signup surface |
| R4 and R5, the environment variables and the AI spend ceiling | P1 in `RETROFIT.md`, never booked. R4 is also the reason admin AI review is dead today |

**Rejected, with the reason:**

- **SABI-REV-062**, the 13 light-built learning-flow files. Considered alongside 061 and
  refused. They are not missing `dark:` variants, they are built light, so UX-01's config line
  does not touch them. Fixing them is a real pass over code that v2 deletes.
- **Everything else D1 accepted.** Restated in the Deferred section of `TASKS.md` rather than
  reopened.

**Correction folded in while deciding:** doing SABI-REV-061's config line on its own makes the
signup modal worse rather than better. `Modal.tsx:77` hardcodes `bg-white` while
`SignupPromptModal` layers `dark:text-white` over it, so today the white-on-white failure hits
only dark-OS devices. Switching `darkMode` to `'class'` while `<html className="dark">` is
hardcoded would extend that failure to every user. The config line and the modal shell are one
change, not two.

---

## D5: The tracker lives in `blueprint/`, and decisions stay split from findings

**Date:** 2026-09-16
**Decided by:** Claude, standing to be overruled.

**Decision:** `TASKS.md` and `decisions.md` go in `blueprint/` rather than the repository root.

**Why:** `CLAUDE.md` bans new root markdown, and with reason, since 37 root markdown files are
already there and most are stale. `blueprint/` is where this project already keeps process
material, which is the convention `dev-pm` says to follow when a repo has one.

**Why decisions are a separate file from `LEDGER.md`:** the ledger is a closed campaign
document, 77 findings and 84KB. Decisions outlive the findings that produced them and get
appended to long after the campaign is cold. D1 through D3 stay where they were ratified;
everything from D4 forward is appended here.

## D6: How the content pipeline decides what is true

2026-09-24. Made in the build, while proving the pipeline on Biology WAEC 2025. Each is a
default Orezi can overrule; the reason is recorded so the overrule is informed.

**An answer is keyed only on cross-family evidence.** Two derivers answer independently, one
Claude and one Codex, neither seeing the other. Keyed outright only when both answer, both
say solvable, both agree, and both say certain. Anything short of that goes to a third
reviewer who sees both arguments and may rule `key`, `ambiguous` or `defective`.
*Rejected:* two runs of the same model. They share blind spots. *Rejected:* accepting
agreement alone. On 2025 both families keyed Q17 as B, and it is ambiguous, because a
biconvex lens is also a convex lens. Agreement alone would have shipped a wrong key.
*Rejected:* online answer keys as a check. One gives 2025 Q31 as D, which is plainly wrong.

**Teaching is reviewed by the other family.** Claude writes hints and solutions, Codex
reviews them against `standards/teaching.md`, with a hard flag for any wrong fact.

**Diagrams are traced where the drawing is organic, authored where it is schematic.**
Tracing converts the original line work to SVG, so an insect's legs or a leaf's veins are
exactly where the setter drew them. Authoring in code is used where tracing fails: a
photographed page, stipple, tonal fill or fine text. The router is the trace's path count.
*Rejected:* generative image models, including kie.ai. They invent plausible detail, which is
the opposite of a replica, and on a question like "identify this nymph" the invented detail
is the answer.

**A redraw carries the original's information and never adds to it.** The authored Secchi
disc shows the medium as the original does, a surface line and suspended particles, with no
colour or label saying water, because that would answer Q30. Rod numbers unreadable in the
source are omitted rather than guessed.

**Alt text describes what a sighted student sees, in neutral words.** Never the answer's
vocabulary. "I points to the pointed top end of the leaf", not "I is the apex".

**Solutions are plain text.** The app renders them with `whitespace-pre-line` and no
markdown, so structure comes from line breaks and plain labels, and notation from Unicode.

**The evidence is committed.** Derivations, rulings, teaching, authored diagrams and alt
text cost real tokens and would not regenerate identically, so they live in git. Only the
deterministic extraction output is ignored.

## D7: The pipeline runs as a system, with one human gate per subject

2026-09-25. Orezi chose the gate. The rest are defaults made in the build, each with its reason.

**One gate per subject, after its first paper.** The orchestrator (`content-pipeline/run.py`)
runs a subject's most recent paper alone, then stops. Orezi reviews that paper's questions as
a student sees them, the topic tree with the paper counted onto it, and the held list, all on
one page. Approval lets the remaining years run unattended. Questions that cannot be settled
are held with a reason and reviewed in one batch, never guessed into the import.
*Rejected:* a gate every year, about 200 reviews across the corpus, most showing the same
thing once a subject is proven. *Rejected:* review only at the end, where a subject-wide
mistake like the lost underline markers would be baked into all eleven years first.

**The unit of work is a paper, not a year.** Some source files hold two papers under one
year header. Every stage names and loads by (year, paper), so a second paper can never
overwrite the first. A second paper waits until its true year is confirmed (CON-08).

**Workers get a brief, a folder and nothing else.** Each Claude stage runs headless with its
brief from `content-pipeline/briefs/`, in its own folder under `work/`, in restricted mode.
Restricted mode confines file access to that folder and the diagram folder; this was tested,
and a read of the other family's answers is refused. Without it, the independence D6 rests on
would be a promise in a prompt.

**Every review is bounded.** Teaching: written, reviewed by Codex, fixed once, changed items
re-reviewed, one final pass that has the last word or holds the item. Diagrams: checked by
Codex against the original, repaired once, re-checked once. A drawing that still fails holds
its questions, because every student sees it. An alt-text dispute that survives a weighed
repair ships and is queued for Orezi, because the two families disagreeing about wording is
not the same as a broken question. *Rejected:* reviewing until the reviewer is satisfied. On
Biology 2025 the second round did not converge, and each extra round rewrites correct text.

**Diagrams get a cross-family visual check.** The trace fidelity number cannot see what the
cleaning step destroyed, and in unattended years nobody looks. Proven on Biology 2025: the
check passed the five good traces and the authored Secchi disc, and failed the rejected Secchi
trace for the reason it was rejected by eye. It also found a real error in the alt text
(Q2's legs), a word that gave away Q29's answer, and one false finding (Q4), so its findings
are weighed, never applied blindly. The answer-word leak is also checked mechanically in the
pre-flight, because the model passed the same text once and failed it once.

**Model assignment follows the routing roster.** Deriving, ruling, teaching, fixing, drawing
and the taxonomy on Opus; classification and alt text on Sonnet; every Claude-written artifact
reviewed by Codex. Set in `content-pipeline/pipeline.json`, not in code.

## D8: The standard a subject's tree must meet, and what happens when a check cannot run

2026-09-29. The first two rulings are Orezi's; the rest are defaults made while building
them, each with its reason.

**A tree answers to three sources: the WAEC syllabus, the JAMB syllabus, and the SS1 to
SS3 scheme of work.** Orezi's direction. Biology's tree had been built from the WAEC
syllabus alone; mapping the other two found real holes (Nigerian biomes, sanitation,
irritability, reproductive health). The standard is `content-pipeline/standards/taxonomy.md`.

**Topics are the bird's-eye view, subtopics the depth.** Orezi's direction. Each topic is
stamped with where the scheme of work teaches it, from the coverage map, so the top of the
tree reads as the path from SS1 to SS3, and shows what the exams test that no scheme week
teaches. *Rejected:* a third level of strands. The teaching order already gives the
overview without another layer to place questions into.

**Matching is measured, not asserted.** Eighty questions from every year are placed twice,
independently, by two models. The bar is 90 percent on the subtopic and 95 on the topic,
and every disagreement is fixed with a sorting rule or accepted as two-sided. Economics
1.0 scored 91 and 95, and both models found the same three missing concepts on their own.

**When Codex is out, Claude finishes, and says so.** Orezi's instruction. The review or
second derivation runs on a Claude model different from the author's, in the same
isolation, and every result carries its lane. *Rejected:* stopping the run until Codex
resets, and presenting a same-family review as independent. Same-family work is re-run on
Codex when it is back (REV-04).

**Anything the system cannot confirm waits for a person.** Orezi's direction. An unsettled
key, an unreadable question, a missing or failed diagram, held teaching: each goes to the
review batch with its reason, never into the import. What ships but deserves a look (an
alt-text dispute, a same-family key) is queued too, marked as shipping.

**Schematic diagrams are drawn, organic ones traced.** Typed labels do not survive tracing:
an "x" became "r", an "M" a broken glyph, and a caption fragment rode along, each passed
by the fidelity score. Maths, Physics, Chemistry, Economics and Geography draw every
diagram by hand from the original, with the trace as a guide to positions. Biology and
Agricultural Science keep tracing, where the drawing itself is the content.
