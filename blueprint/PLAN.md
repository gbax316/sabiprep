# SabiPrep v2: Plan

## What we are building

An exam mastery platform for Nigerian secondary students preparing for WASSCE and JAMB. The spine is the real past papers, 1995 to 2025, WAEC and JAMB, served intact. On top of that sits the part that does not exist in a bookshop: an explanation of why each answer is what it is, exam technique for multiple-choice elimination and recall, generated variants of the same question with different values, and a per-topic proficiency picture that a parent or a school can see.

Parents pay. Children study. The product is the child's progress, made trustworthy enough that an adult will pay a monthly subscription to watch it improve.

## Who it is for

**Primary user:** a Nigerian student aged roughly 14 to 16, sitting WASSCE or JAMB, working mostly on a tablet, on mobile data that is intermittent and metered.

**Paying user:** their parent, who does not use the study surface at all and whose entire experience is: pay, add child, see whether it is working.

**Later:** schools, who buy a cohort, onboard their own students, and pass a discount to those students' parents.

**Market and device consequences, which change defaults rather than being demographics:**
- Mobile-first layout is the design target, not a breakpoint checked at the end. Verify at 320px and 375px with 44px minimum touch targets.
- Nigerian mobile carriers NAT heavily, so rate limits are scoped to session and account, never tightly to IP.
- Currency is NGN. Payment provider is a Nigerian one (Paystack or Flutterwave), behind an adapter.
- Offline capability is a requirement, not a nicety. See "Offline and subscription" below.

## MVP slice

The smallest version that is truly useful and proves the business:

1. A parent signs up, subscribes, and adds one child profile with a username and PIN. No email required for the child.
2. The child signs in on a tablet, picks a real past paper (for example WAEC Mathematics 2024), and works through it.
3. Every answer is graded **on the server**. First-attempt accuracy is recorded.
4. The parent sees that child's first-attempt accuracy, per topic, and whether the session was clean or assisted.

Everything else is Later. Notably not in the MVP: variants, school accounts, animated solutions, the technique layer, badges.

The MVP exists to prove one thing: that a number a parent pays to see is a number the system can actually vouch for. The current app cannot, and that is the whole reason for the rebuild.

## Later, in sequence

1. Generated variants for Mathematics, Physics, Chemistry; patterned questions for English.
2. The principle layer: why this answer, not just what it is.
3. The technique layer: elimination strategies and cross-exam recall patterns.
4. Proficiency-driven drill sessions that target weak topics, as a mode alongside the fixed papers.
5. School accounts: cohorts, onboarding, discounts flowing to parents, teacher dashboards.
6. Animated step-through solutions for high-value diagrams.

## Stack

| Choice | Why |
|---|---|
| Next.js (App Router, TypeScript) | Already the team's stack; the existing UI work ports across |
| Postgres via Supabase | The data is already there; migration cost is near zero; RLS is genuinely useful as a second layer |
| Server-side grading through the app's own API | The single non-negotiable architectural change; see below |
| Supabase Auth for parents, app-managed credentials for child profiles | Children have no email; parents do. Two different identity problems, handled differently |
| Paystack or Flutterwave behind a payment adapter | NGN, local payment methods, and the adapter keeps the choice reversible |
| PWA with a service worker | Tablets, intermittent data, installable |
| AI as a build-time batch pipeline, never at runtime | Explicit product constraint. Also makes the model-agnostic goal nearly free |

### The one architectural rule

**Routes never touch the database. Services hold the rules. Only the data layer queries.**

The current app has no server at all: the browser talks to Postgres directly. That is what makes every score unverifiable. The new app puts an API between them, and the rule above is what keeps that API from decaying back into a pass-through.

Concretely, the child's device never receives `correct_answer` for a question it has not yet answered.

## Data

Entities and how they link. Each fact stored once.

**Identity and billing**
- `households`: the paying unit. Owned by one parent account.
- `users`: parents and staff. Supabase Auth.
- `student_profiles`: a child. Belongs to a household. Has a username and PIN, no email required. Carries a nullable `claimed_by_user_id` so the child can attach their own email later and keep their history.
- `subscriptions`: household, plan, status, `current_period_end`. Seats derived from plan.
- `seats`: links a `student_profile` to a subscription. A child without an active seat can sign in and see history but cannot start a session.

**Content**
- `exam_bodies`: WAEC, JAMB.
- `papers`: exam body, subject, year, official time allowance, official question count. **This is the fixed set.** A paper is served intact.
- `questions`: belongs to a paper, carries position within it. Options, correct answer, explanation, hints, diagram reference.
- `question_variants`: derives from a question, holds substituted parameters, has a review status. Nothing unreviewed is ever served.
- `topics` and the proficiency taxonomy: **deferred by decision.** To be derived from analysis of the real question bank, then reconciled against the existing 416 topics into a hybrid map. See Open Questions.
- `legacy_questions`: the existing 1,023. Kept as a separate practice pool, graded and prequalified; individually promoted into `questions` only after review.

**Learning**
- `sessions`: student profile, paper or drill config, mode, started/completed, whether assisted.
- `attempts`: one row per answer submitted. Records the submitted option, server-computed correctness, attempt ordinal, hints used at time of answer, whether the solution had been viewed. **First attempt is the one that counts.**
- `proficiency`: per student profile, per topic. Derived from clean first attempts only. Named `proficiency` deliberately, because `mastery` already means XP badges in the legacy schema and reusing it would make every future conversation ambiguous.

**Reporting**
- Parent and school views read from `proficiency` and `attempts`. They never read anything the client wrote.

## Grading model

This is the heart of the product and the thing the current app gets wrong.

**The score is first-attempt accuracy.** Whether the student, unaided, on their first attempt at a question, chose correctly. Nothing else counts toward the score.

**Assistance is recorded but never scored.** Hints used, solutions viewed, and second and third attempts are all stored, because they are useful signals about effort and about which topics are hard. They do not move the accuracy number in either direction. A struggling child who works hard should not look lazy to their parent, and should not look proficient either.

**A report with no clean first attempts says so.** If a student completed a session having viewed answers or used hints throughout, the report is explicitly labelled as assisted and states that the figure shown is not a measure of unaided ability. This label is not optional and not a footnote.

**Parents can disable assistance.** A household setting turns hints and answer-reveal off for a given child, forcing unaided attempts. Children do not control household settings, so this is enforceable. Sessions run under this setting are marked as such and carry more weight in reporting.

**Grading happens on the server, always.** The device submits a choice. The server decides. This is what makes every number above mean something.

### What the audit campaign changed here

Four findings from the eight-slice review directly constrain this model. Detail in `LEDGER.md`.

**1. Wrong answers must be persisted. Today they are not** (SABI-REV-071). Practice mode returns early on an incorrect answer without writing anything, and the Next button stays disabled until a correct answer is stored. So a question the student got wrong and never got right leaves **no row at all**, rather than a row marked incorrect. Any retrospective first-attempt accuracy is therefore biased toward students who eventually succeeded, and no smarter query can undo it because the bias is in the write path. In v2 the first submission is always recorded, whatever it is, before any retry is offered.

**2. Historical practice data cannot seed the metric.** Test and timed history carry reliable `first_attempt_correct`. Practice history does not. Anything before 2025-01-20 has the column as NULL. Combined with the double-counting in SABI-REV-001 and SABI-REV-039, which inflated XP and stats by an unknown amount, the honest options are to backfill from test and timed sessions only, or to start proficiency from zero. **Open decision, listed below.**

**3. The signal already exists and nothing reads it** (SABI-REV-076). `solution_viewed_before_attempt` is written on every answer and has zero readers anywhere in the repo. It is exactly what distinguishes a student who thought before looking from one who looked first, which is the distinction the assisted-versus-clean labelling depends on. v2 reads it.

**4. Derive, do not accumulate** (SABI-REV-075, SABI-REV-041, SABI-REV-042). Today `user_goals.current_value` and the counters on `users` are separate blind accumulators fed client-supplied deltas, reconcilable against nothing, and `user_progress` is never written at all so per-topic accuracy has been permanently empty. In v2 every reported number is computed from `attempts` rows on demand or in a materialized rollup that can be rebuilt from them. A number that cannot be recomputed from its source rows cannot be audited, and a parent-facing metric has to be auditable.

**And one rule for the RPCs themselves** (SABI-REV-069): every scoring function in the current schema accepts an arbitrary `user_uuid` with no `auth.uid()` check, and no migration contains a single `GRANT` or `REVOKE`. The v2 proficiency RPC written in the same house style would inherit that hole exactly. Every function asserts the caller's identity against the row it touches.

## Study modes

Three ways in, differing by **how questions are chosen and how time is allowed**, not by pedagogical intensity.

| Mode | Selection | Timing | Purpose |
|---|---|---|---|
| **Practice** | Student picks subject and topics | None | Keep the juices flowing, acquire knowledge, explore |
| **Self-paced** | Random from the pool, to a daily quota the student sets (for example 30 Maths questions a day) | None | Habit and volume |
| **Timed** | A real paper, intact | **Derived from that paper's official allowance**, not arbitrary per-question seconds | Speed and exam conditions |

All three are the **same session player** driven by a config object. The current app implements three near-identical pages totalling 3,638 lines, which is why a fourth variation was impossible to add. Modes become presets. A future preset costs a config entry, not a page.

Timing detail: JAMB and WAEC papers have published time allowances. Timed mode uses the real allowance for the real paper, scaled proportionally when a student takes a subset. Arbitrary 15/30/45/60 second timers do not teach exam pacing.

## Question selection

**Papers are fixed sets, served intact.** The 50 questions of WAEC English 2025 are those 50 questions. Only the order may rotate.

This is a deliberate simplification with real consequences: there is no adaptive per-question selection engine in the MVP, no runtime AI, and no client-side shuffling of a large candidate pool. Selection happens on the server and returns a paper.

Where randomisation is needed (self-paced mode, order rotation), use a seeded Fisher-Yates shuffle server-side. The existing `sort(() => Math.random() - 0.5)` is not a uniform shuffle and appears 11 times in the current code; it does not come across.

## Offline and subscription

The app is a PWA. A student picks a paper, it caches, and the session completes whether or not the connection survives. Answers and timings queue locally and sync when the device is next online. Proficiency updates land late but correctly.

**Cached content cannot be revoked.** Once a paper is on the tablet, no server can delete it. Enforcement is a lease: the app refuses to open a session from content whose lease has expired until it checks in.

**Recommended lease model:** `min(subscription_current_period_end, last_checkin + grace_window)`.

A short fixed lease is not needed to enforce a monthly subscription. If the last check-in said the subscription runs to 30 March, the device can trust that date offline, because it is true. A short lease only catches mid-cycle cancellation, which is rare. This model gives tight enforcement at the renewal boundary and real offline tolerance in between.

**Clock tampering must be handled from day one.** Store the highest server timestamp the device has ever seen; if the device clock reads earlier, treat it as tampered and require an online check-in. Retrofitting this means re-issuing every lease.

**What the subscription actually protects.** A determined technical user can read cached content on their own device; this is true of every offline-capable app. What they would extract is past papers sold in bookshops. Variants, the principle layer, the technique layer, proficiency tracking and parent reporting all require the server. The moat is on the right side of the line.

## Diagrams and images

**Fidelity is a hard gate, not a quality target.** A diagram that deviates from the original, in any direction, guarantees the student cannot answer the question. An incomplete or subtly wrong figure is worse than no figure, because the student blames themselves.

Approach, in order:
1. **Static images, done properly.** Correct attachment, alt text, explicit dimensions, fast on a tablet. The `image_alt_text`, `image_width` and `image_height` columns already exist and are unused.
2. **SVG redraws for high-value and complex diagrams.** Repeated geometry, physics force diagrams, chemistry apparatus. Scales sharply, can be labelled and highlighted step by step in the solution.
3. **Animated step-through solutions.** Later. The most expensive item and the most differentiating.

**Every redraw requires verification against the original before publication.** This is a review step in the ingestion pipeline with a named human approver, not a drawing task that ends when it looks right.

## Content pipeline

**Most of this already exists in the current admin and should be carried forward, not rebuilt.** It is the strongest asset in the codebase and the part of the rebuild with the least new work.

### What is already built

| Capability | Where |
|---|---|
| CSV import with a 29-column template | `api/admin/import/template`, `import/validate`, `import/process` |
| Validation that auto-creates missing topics and **refuses an image without alt text** | `import/validate/route.ts:264` |
| Staged import reports with per-question review and bulk actions | `import/reports/[reportId]`, `.../bulk-action` |
| AI generation of three progressive hints, worked solution, and explanation | `lib/ai/anthropic-client.ts`: `generateHints`, `generateSolution`, `generateExplanation` |
| Proposals held **pending** with approve and reject, approver recorded, rejection reason captured | `question_reviews` table, `questions/review/[reviewId]/approve` |
| Batch review and review history | `questions/review/batch`, `questions/review/history` |
| Provenance: `model_used`, `tokens_used`, `review_duration_ms` per proposal | `question_reviews` |
| Image upload, and passage support for English comprehension | `questions/upload-image`, `questions/by-passage`, `questions/passages` |

The generate, hold as proposed, human approves, then publish shape is already correct. The approval gate exists. Provenance is already recorded per proposal, including which model produced it.

### The gap that blocks the 1995 to 2025 import

**The pipeline consumes `correct_answer`; it never produces one.**

Every prompt in `lib/ai/anthropic-client.ts` interpolates the answer as an input (lines 104, 132, 215, 237, 292). Hints, solution and explanation are all generated *given* the correct answer.

The incoming papers have no answers. So the existing pipeline cannot run on them at all. This is the single most important piece of new work in the content workstream, and it needs a materially higher verification bar than the existing steps, because a wrong generated answer does not merely produce a weak hint, it teaches a student something false and then confidently explains why.

### What to add

1. **Answer derivation**, as a new first step, with independent verification. At minimum: solve the question more than once independently and require agreement before a proposal is even offered for review; surface disagreement to the human rather than hiding it behind a majority vote. Answers that cannot be independently agreed are queued for manual resolution, not published with a guess.
2. **Automatic validation before human review**: exactly one correct option, no duplicate options, numeric answers within a sane range, a diagram present when the stem refers to one.
3. **Move the pipeline off the request path.** It currently runs inline with 60 second and 120 second timeouts. Thirty years of papers is queue work (block 36).
4. **A provider adapter.** Corrected after audit (SABI-REV-034): this is a real refactor, not a small change. Anthropic specifics run through `anthropic-client.ts` (SDK instantiation, response shape, token accounting, retry keyed to Anthropic error fields) and three route files import the concrete module directly. The function signatures are a clean seam and `model_used` is already recorded per proposal, so the shape is right, but extraction plus error normalization is real work.

7. **Close the validator gaps and fix the import defects** listed in `LEDGER.md` before any corpus work: the dry run that writes live topics (SABI-REV-025), the import that cannot resume (SABI-REV-026), the ignored `validRowsOnly` flag (SABI-REV-027), and duplicate detection that is broken three ways including a case-sensitivity bug that makes the database check never fire (SABI-REV-028). Re-importing after a timeout currently creates silent duplicates.

8. **Normalize passages.** Passage text is duplicated on every question row sharing a `passage_id`, with no canonical table and no consistency check, so a passage disappears when its last question is deleted. The admin page for managing them has never worked (SABI-REV-032). English comprehension is a large share of both exams.
5. **Diagram redraw with fidelity verification** as a review step with a named approver, per the Diagrams section.
6. **Variant generation**, later, as an additional step producing `question_variants` through the same approval gate.

### Source ingestion

Ingestion from the actual source documents into the CSV shape is genuinely new; the pipeline currently starts at a well-formed CSV. Design is blocked until the source files are seen. See Open Questions.

## Building blocks applied

| Block | How it shows up here |
|---|---|
| 06 Env vars | One validated config module, failing at boot rather than in a route. The current app reads 8 variables from 6 scattered files |
| 11 Modularity | 600-line ceiling enforced. The predecessor's `lib/api.ts` reached 3,305 |
| 12 Separation | Route, service, data. The load-bearing wall; without it there is no trustworthy grade |
| 14 SQL | No `select('*')`. Answers are excluded from student-facing selects by construction |
| 16 Migrations | Versioned and applied by tooling, not by hand in the Dashboard |
| 17 Transactions | Seat assignment, subscription changes and session completion are atomic |
| 22 Input validation | Zod at every boundary. The predecessor had zod installed and imported by zero files |
| 29 Authorization | Every action checks role and ownership. A parent reads only their household's children |
| 35 Race conditions | Seat claiming and attempt submission are atomic; no client read-modify-write |
| 36 Background jobs | The whole content pipeline. Nothing AI-shaped happens in a request |
| 38 Rate limiting | Scoped to session and account, loose on IP because of carrier NAT. Hard daily caps on anything that costs money |
| 39 Pagination | Every list. The predecessor had zero uses of `.range()` |
| 40, 41 Observability | Error tracker and structured logs with request and profile id, from Phase 1 |
| 42, 46 Testing | The grading rules get unit tests. Signup to pay to child-session gets a Playwright flow |
| 45 Adapters | Payment provider and AI provider both behind adapters |
| 21, 24, 27, 28 | TLS, CSRF posture, hashing and sessions: Supabase Auth for parents; child PIN hashed with the same rigour |

Not applicable: 05 (venv, JS stack), 20 (relational is right), 26 (no user-supplied URL fetching), 33 (no heavy runtime dependency once AI is batch).

## Ratified decisions

Three settled on 2026-08-24. Full rationale and accepted risks in the Decisions register in `LEDGER.md`.

**Progress starts from zero.** `sessions` and `session_answers` migrate as an archive only. No proficiency, XP or badge state is computed from existing data, because it is both inflated by the double-counting bugs and structurally biased by the missing wrong-answer rows. The archive still earns its place: it records which questions each student has already seen, which feeds non-repetition from day one. Students lose visible progress at cutover, which needs a communication rather than just a script.

**Teaching fields: humans edit directly, generated content passes the gate.** A named admin may correct a hint inline. Anything a model produced must be approved first. This makes provenance load-bearing: each teaching field must record whether it was generated or human-authored, because that flag now decides which path a change takes. `question_reviews` already records `model_used`, so the shape exists, but the `questions` row needs the same distinction, and a human edit converting a generated field to human-authored must be recorded or a later regeneration silently overwrites the correction.

**The live app gets the authorization fixes only.** Everything else there is accepted risk until v2 replaces it.

## Open questions

Deliberately deferred, with the reason.

1. **Topic taxonomy.** Decision held. The real question bank gets analysed first, then mapped against the existing 416 topics into a hybrid. Proficiency reporting cannot be finalised before this, because it reports per topic.
2. **Lease window.** 24 hours was chosen, then the subscription-aware model above was proposed in response. Needs confirmation before Phase 5.
3. **Source format of the incoming papers.** Ingestion cannot be designed until the actual files are seen. ODT, PDF and image-only scans imply very different pipelines.
4. **School model shape.** Parent-first is decided. Whether households and schools eventually share one "organisation with seats" abstraction, or stay separate, is worth deciding before the school phase starts rather than during it.
5. **Fate of the legacy 1,023.** Kept as a separate pool and graded. The grading criteria for promotion are not yet defined.
6. **Badge rename.** `mastery_badges` and the new `proficiency` layer cannot both own the word. Which one changes is open.
