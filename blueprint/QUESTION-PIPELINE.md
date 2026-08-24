---
name: SabiPrep question pipeline
description: Agentware design brief for turning raw WAEC and JAMB past papers into a product-grade teaching bank
created: 2026-08-24
status: design brief, not yet scaffolded
---

# Question pipeline: agentware design brief

Design only. Nothing is built from this until it is approved. Keeping design separate from construction is what makes a bad design cheap to throw away.

## Job and standard

**Job.** Turn one raw past-paper question (stem, options, any diagram) into a publishable teaching item.

**Standard.** A Nigerian student aged 14 to 16, alone on a tablet, can attempt the question fairly from what is shown, and after answering understands why the right answer is right and how to recognise the same pattern in a different question. The stated answer is correct.

The second sentence of that standard is what every reviewer judges against. Note what it is not: it is not "the item matches the source paper". An item can be a perfect transcription and still fail a student who cannot see the diagram it refers to.

## Scope

Only the work that does not already exist. What the current admin already does well is reused as-is:

| Already built, reused | Not built, in scope |
|---|---|
| CSV import and staged import reports | Source-to-structured extraction |
| Deterministic validation with auto topic creation | **Answer derivation** |
| Generation of three hints, solution, explanation | Answer adjudication |
| Pending / approve / reject gate with approver recorded | Teaching-quality review |
| `model_used`, `tokens_used` provenance per proposal | Convention state across 30 years |

The single most important line above is that generation currently takes `correct_answer` as an **input**. Everything in scope exists to produce that input safely.

### Two corrections from the codebase audit

An earlier draft of this brief overstated what the existing pipeline guarantees. Both corrections change what has to be built.

**The approval gate is optional, not structural** (SABI-REV-029). The review-to-approve path itself is sound: status transitions are checked, nothing outside the approve route writes `proposed_*` into `questions`, and rejected proposals cannot be resurrected. But `quick-update` and the ordinary question edit form both permit direct, unreviewed writes to `hint1`, `hint2`, `hint3`, `solution` and `explanation`. Review is a workflow someone may choose, not a gate the content must pass. For a bank whose correctness is the product, v2 must decide whether those fields are writable outside review at all.

**The AI client is not an adapter** (SABI-REV-034). Anthropic specifics run through the module: SDK instantiation, the `response.content[0].type` response shape, token accounting keyed to `usage.input_tokens`, and retry logic keyed to `error.status` and `error.headers['retry-after']`. Three route files import the concrete implementation directly. The function signatures form a clean seam, which is the good news, but extraction is a real refactor plus error normalization, not a configuration change.

**And a third finding that validates a design choice here** (SABI-REV-025): the current "validate" step auto-creates topics with `status: 'active'`, writing to the live taxonomy during what the UI calls a dry run. A typo creates a junk topic visible to students immediately, and re-validating after fixing the CSV never cleans it up. This is exactly why W1 below must never infer or create taxonomy.

## Failure modes

From the existing bank and from what the source material is. Marked where a mode is observed rather than anticipated.

| # | Failure | Why it is distinct | Caught by |
|---|---|---|---|
| F1 | **The derived answer is wrong** | Catastrophic and self-concealing: hints, solution and explanation are all generated *from* the answer, so one wrong answer produces five fluent artifacts that agree with each other | R1 Answer adjudicator |
| F2 | **The item cannot be answered from what is shown** | Missing or wrong diagram, missing passage, truncated stem, garbled options. The student blames themselves | R1, via unsolvability (see below) |
| F3 | **Teaching that does not teach** *(observed)* | Hint 1 gives the answer away, or the "solution" restates the task instead of showing method. Live example in the current bank: solution reads `"Practice: Convert 156₁₀ and 512₁₀ to base 8"`, which is a restatement, not a worked solution | R2 Teaching-quality reviewer |
| F4 | **Convention drift across eras** | Notation, terminology and syllabus legitimately changed between 1995 and 2025. Treating a 1998 item as wrong because it uses 1998 notation is the reviewer flagging the archive working correctly | State keeper record |

F2 folds into R1 deliberately. If an independent solver cannot solve the item, that *is* the answerability signal, and it costs nothing extra. A separate answerability reviewer was designed and then cut for this reason.

## Roles

Seven. Each named with what it must never do, because the never is what stops roles collapsing into each other.

**Orchestrator.** Owns the sequence over a batch. Dispatches, reads reports, routes items forward or to escalation.
*Never* produces or judges content itself.

**W1 Extractor.** Raw source document to structured item: stem, options, passage reference, diagram reference, exam body, subject, year, position in paper.
*Never* infers missing content. A truncated stem stays truncated and gets flagged, it does not get completed.

**W2 Answer deriver.** Solves the question. Run **independently more than once**, in fresh contexts that cannot see each other.
*Never* sees the other derivations. *Never* authors teaching content.

**W3 Teaching author.** Given a **verified** answer, produces the worked solution, three progressive hints, the principle, and the technique note. This is largely the existing `anthropic-client.ts`.
*Never* runs before the answer is verified. Authoring teaching from an unverified answer is how one wrong answer becomes five.

**R1 Answer adjudicator.** Compares the independent derivations and reports: agreed, disagreed, or unsolvable.
*Never* picks a winner. *Never* resolves disagreement by majority vote. Two solvers can share the same wrong reasoning on a hard question, and a majority rule converts that into false confidence. Disagreement escalates to a human.

**R2 Teaching-quality reviewer.** Checks the authored content against the standard: does hint 1 narrow the field without revealing? does hint 3 still require the student to do something? does the solution show method rather than restating the task? is the principle transferable to a different question?
*Never* edits. It writes a report; the report goes back to W3.

**State keeper.** Holds the conventions that must stay true across the whole bank, and updates after each approved batch.
*Never* runs during production, *never* invents.

## The verification design

This is the part worth arguing about, because it is where the product's credibility lives.

1. **Solve open-form before looking at the options.** The deriver works the question out and states its answer, then matches it to the supplied options. Multiple-choice distractors are written by exam boards specifically to attract a plausible wrong method, so a solver that sees the options first is being led. If the open-form answer matches no option, that is a strong signal that either the solve is wrong or the item is corrupt, and it is free.

2. **Independent derivation, agreement required.** Two or more solvers in fresh contexts. Agreement proposes; disagreement escalates.

3. **No majority vote.** Stated again because it is the rule that will be under pressure when a backlog builds.

4. **Unsolvable is a first-class outcome**, not an error. It routes to human resolution and is the main detector of F2.

5. **Teaching is authored only after verification.** Strict ordering.

## State

One file, `question-bank-conventions.md`, held by the state keeper.

Contents: option labelling, notation per subject and per era, unit conventions, how a diagram is referenced from a stem, subject-specific terminology, and decisions already made about edge cases.

**It records intended change as well as fixed fact.** Syllabus notation moved between 1995 and 2025. A record that stores only "current notation" turns the reviewer into a machine for flagging correct archival items. The record therefore holds the convention *and the era it applies to*.

## Sequence

1. Extract a batch of raw items into structured form. (W1)
2. Run deterministic validation: option count, distinct options, diagram present when the stem refers to one, plausible year. Rules only, no model. (existing validator, extended)
3. Derive the answer independently, more than once, open-form before options. (W2)
4. Adjudicate: agreed / disagreed / unsolvable. (R1)
5. Agreed items proceed. Disagreed and unsolvable items queue for human resolution. **Checkpoint 3.**
6. Author teaching content for verified items only. (W3)
7. Review teaching quality; failures return to step 6 with a report. (R2)
8. Present the batch for human approval. **Checkpoint 2.** This is the existing admin review screen.
9. Publish approved items; state keeper records conventions and provenance.

Flat and boring by design. The sophistication belongs in the workers, not the sequence.

## Checkpoints

| # | When | What you are deciding |
|---|---|---|
| **CP1** | After the first ~50 items complete the full sequence, before any scaling | Is the standard right? Read the output as a student would. This is the cheapest moment to discover the bar is wrong |
| **CP2** | Every batch, at step 8 | Approve or reject items for publication. Already built |
| **CP3** | Continuously, from step 5 | Resolve items the adjudicator could not settle. This queue is the honest measure of source quality, and its size tells you whether the source material is usable |

CP3 is the one to watch. If it grows faster than you can clear it, the constraint is the source documents, not the pipeline.

## What was cut, and why

Recorded because these are what you will be tempted to add back.

- **Diagram redraw worker and fidelity reviewer.** Fidelity is a hard gate and you were explicit that a deviating diagram makes a question unanswerable. But redraw needs human visual verification regardless, and your own priority is static images done properly first. This is a **separate track**, not part of the core loop. Adding it here would have made the core loop wait on the slowest, most manual step.
- **Answerability reviewer.** Folded into R1. An unsolvable item already reports itself.
- **Classification reviewer.** Topic mapping is deliberately deferred until the real bank is analysed, so there is nothing stable to review against yet.
- **Fixer.** The taxonomy says add one only after seeing a drafter make repairs worse. That has not happened yet. Defect reports route back to the authoring worker. If repairs start degrading surrounding content, this is the first role to add.

That is four roles removed, leaving seven.

## Placement

**Project-scoped**, in this repo, not global. The global skill surface is already large and every added skill competes for the router's attention.

## Open questions

1. **Source format.** Extraction cannot be designed further until the actual files are seen. ODT, clean PDF, and scanned images imply three different W1 implementations, and scans imply an OCR error class that changes the whole validation story.
2. **How many independent derivations.** Two is the minimum for the agreement rule. Three costs more and mainly changes what happens on disagreement. Worth deciding against a real batch rather than in advance.
3. **Where the technique layer comes from.** The principle and elimination-technique content is the most differentiating part of the product and the least amenable to generation. It may be authored by a human once per pattern and reused, rather than generated per item.
