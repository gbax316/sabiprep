# SabiPrep tasks

Opened 2026-09-16 out of `RETROFIT.md`, which had a correct P0 plan and no owner for 23 days.
Lives in `blueprint/` rather than the repo root because `CLAUDE.md` bans new root markdown and
this folder is already where the project keeps process material.

**The code is the truth.** This file says what to do next. It never certifies what is done:
read the migration, the app and the diff for that.

Findings are `SABI-REV-NNN` in `LEDGER.md`. Rulings are in `decisions.md`.

## How this repo works

- Migrations are written here and run by Orezi in the Supabase Dashboard SQL Editor. Every
  migration ships with the query that proves it landed. Nothing is applied from a session.
- `npm run build` plus `npm run lint` is the entire CI gate. There is no test suite.
- Production merges land after 18:00 Lagos.
- `main` is currently ahead of `origin/main` by one unpushed commit (`f340ad4`, the blueprint).

---

## 2026-09-16: live-app protection

The only slice the old app gets before v2 replaces it. Scope set by D4 in `decisions.md`.
Order matters top to bottom: AUTH-01 protects data that exists right now, and it establishes
the pattern v2 copies.

### Frame

**Ask, verbatim from `RETROFIT.md`:** "Close the write-side authorization holes. Five
independent ways a signed-in student can forge the numbers a parent would be paying to see.
These are all live now, all reachable from the browser console, and they should be fixed as
one pattern, not five patches."

**Done looks like:** the probes in `LEDGER.md` re-run and come back changed. An anonymous
`GET /rest/v1/user_mastery_badges` returns `[]`. A zero-match `PATCH` returns 401, not 200.
Every scoring RPC rejects a `user_uuid` that is not `auth.uid()`.

**Budget:** one migration file, one visual pass, one import-path branch. If AUTH-01 grows a
second migration, that is the signal to stop and check in, not to keep going.

**Undo:** each migration ships with its own DOWN block in a comment. The dark-theme change is
one config line plus one component and is revertable by reverting the commit. Nothing here
deletes data.

### Authorization, one pattern

- [ ] **AUTH-01** One migration closing all five forgery holes as a single pattern, not five
      patches. **Written 2026-09-16 at `supabase/migrations/20260916_lock_down_scoring_writes.sql`,
      not yet applied.** Orezi runs it in the SQL Editor and pastes the 8-row verification result
      back, then re-runs the anonymous curl probe. Unchecked until that result exists.
      **Incomplete as written, found by the 2026-09-16 re-audit.** Its header claims to establish
      the pattern that every RPC writing for a user asserts `auth.uid()`, and it applies that to
      three functions. A sweep of all 26 function definitions across the 17 migrations found six
      with the same shape; this migration leaves five of them open, including
      `reset_user_attempted_questions`, which lets any caller delete the attempted-question
      archive that decision D2 exists to preserve. Widen AUTH-01 to the full sweep before
      applying, or narrow the header. See BLOCKS-AUDIT.md, re-audit N1. **Operator decision.**
  - `award_xp`, `check_and_award_mastery_badges` and `update_goal_progress` accept any
    `user_uuid` and any value. No `auth.uid()` assertion, and no GRANT or REVOKE anywhere in
    16 migrations (SABI-REV-069)
  - `mastery_badges` and `user_mastery_badges` have no RLS at all. **Re-confirmed live on
    2026-09-16:** anonymous read returns real rows carrying `user_id` values (SABI-REV-002)
  - `user_achievements` INSERT checks ownership, not eligibility (SABI-REV-070)
  - `notifications` INSERT is `WITH CHECK (true)` (SABI-REV-018)
  - `daily_challenges` UPDATE and DELETE are open to any authenticated user, and DELETE
    cascades away every student's completion record (SABI-REV-019)
- [ ] **AUTH-02** Run the exposure sweep in the SQL Editor and act on anything it returns. The
      audit compared CREATE TABLE against ENABLE ROW LEVEL SECURITY across migration files,
      which cannot see a table created directly in the Dashboard.

      ```sql
      select tablename, rowsecurity
      from pg_tables
      where schemaname = 'public' and rowsecurity = false;
      ```

### Guest conversion surface

- [ ] **UX-01** Set `darkMode: 'class'` in `tailwind.config.ts`, and in the same change give
      `components/common/Modal.tsx:77` a dark shell. Doing the config line alone makes things
      worse: `Modal.tsx` hardcodes `bg-white` while `SignupPromptModal` layers `dark:text-white`
      on top, so switching to `'class'` gives white-on-white to every user instead of only
      dark-OS ones. Check `components/common/BottomNav.tsx:41` in the same pass, then walk the
      dashboard and the signup modal at 375px. (SABI-REV-061)

### Import path, before any corpus lands

Carried forward into v2 per `PLAN.md`, which is why these sit outside D1's "it is being
deleted" reasoning. See `PLAN.md`, Content pipeline, item 7.

- [ ] **IMP-01** Make the dry run a dry run. `import/validate` writes to the live topic
      taxonomy while calling itself validation (SABI-REV-025)
- [ ] **IMP-02** Give the import a checkpoint so it can resume. Re-importing after a timeout
      currently creates silent duplicates (SABI-REV-026)
- [ ] **IMP-03** Honour `validRowsOnly`. The flag is dead and invalid rows import anyway
      (SABI-REV-027)
- [ ] **IMP-04** Fix duplicate detection, broken three independent ways, including a
      case-sensitivity bug that stops the database check ever firing (SABI-REV-028)

### Operations

- [ ] **OPS-01** Set the missing Vercel environment variables. `ANTHROPIC_API_KEY` and
      `NEXT_PUBLIC_APP_URL` are unset, so AI review is dead and password-reset redirects
      degrade to a bare path. `SUPABASE_SERVICE_ROLE_KEY` exists but is Production-scoped only,
      so admin user creation fails in local and preview while working in production, which will
      read as a code bug. **Needs key values from Orezi.** (R4)
- [ ] **OPS-02** Put a hard daily call cap that fails closed on
      `/api/admin/questions/review` and its batch sibling, plus a billing alert on the
      Anthropic account. Admin-gated, so this is spend control rather than an open door. (R5)
- [ ] **OPS-03** Push `f340ad4`. The entire blueprint exists only on this machine.

---

## 2026-09-24: content pipeline

Real WAEC and JAMB papers, 2015 to 2025, into reviewed, import-ready rows. Code and
standards in `content-pipeline/`, design in `QUESTION-PIPELINE.md`, rulings in D6.
Biology WAEC is the reference subject, proved on the 2025 paper first.

**Ask, verbatim:** process and format the questions for all subjects 2015 to 2025,
redraw diagrams with code, keep English comprehension passages attached to their
questions, preserve maths and physics notation, provide the correct answer with 100%
certainty, three hints and a structured solution, match redrawn images to their
questions, review answers and review the teaching, return all of it importable, deduce
topics per subject. Build it so the resent subjects follow the same pattern.

**Where 2025 stood when this section was written:** 50 extracted, 46 keyed, 4 held for a
ruling, 6 diagrams redrawn. Read `out/biology-waec.final.2025.json` for the current key,
not this line.

- [x] **CON-01** Biology 2025 slice: teaching reviewed across families, fixed, re-checked
      where changed, exported and pre-flighted. Preview sent 2026-09-25. Now under the
      orchestrator and **waiting at its gate** (D7): `out/biology-waec.2025.preview.html`
      opens with the topic tree, the held list and one alt-text dispute (Q4-5, label II).
- [ ] **CON-02** Rule on the four held 2025 questions. Each has a reason on file in
      `out/biology-waec.final.2025.json`. **Orezi.**
      Q7 two keys (III and IV both hypertonic) · Q17 ambiguous (biconvex is also convex) ·
      Q26 contradictory stem · Q47 two keys.
- [x] **CON-03** Topic structure. Superseded by `taxonomies/biology.json` 2.1: 29 topics and
      100 subtopics on the WAEC syllabus, all 106 legacy topics folded in, proven on the 46
      settled 2025 questions. The open part is CON-11.
- [ ] **CON-04** Upload the diagrams to storage and supply the public base URL the export
      needs. Writes to live storage. **Orezi's call.** Strip SVG comments on upload: an
      authored file's maintainer notes can name what a question tests (the Secchi file says
      which question identifies it). The URL goes in `SABIPREP_IMAGE_BASE`, never in a file.
- [ ] **CON-05** Run Biology 2015 to 2024 through the pipeline. Waits on Biology's gate:
      `python run.py approve biology-waec`, then `python run.py run biology-waec`.
- [ ] **CON-06** The corrupted WAEC question files. UTME arrived as real files on
      2026-09-25; the WAEC subjects other than Biology, Literature and Geography are still
      the sign-in pages.
- [ ] **CON-07** The Ijamo District map for WAEC Geography Q1 to 10 is not in any folder.
- [ ] **CON-08** Confirm three year labels the extractor proposes but does not apply.
      **Orezi.** Government's second "2016" is probably 2015 (the file has no 2015).
      English's second "2015" is probably 2014. Mathematics' second "2020" looks like a
      second sitting, since every neighbouring year is present.
- [ ] **CON-09** Decide how the app draws underlined and italic words. English questions
      depend on them ("one underlined word and one gap"); they are carried as ⟦ ⟧ and ⟪ ⟫
      markers and the app renders neither today. **Orezi.**
- [ ] **CON-10** UTME Biology is missing from the UTME folder; the other eight arrived.
- [ ] **CON-11** Write the topic migration: add a parent link to `topics`, create the 2.1
      tree, move each legacy question to its new node, retire old topics as `inactive`.
      **Never delete a topic:** `questions.topic_id` is `ON DELETE CASCADE`, so deleting one
      deletes its questions. Written for Orezi to run, with a count that proves nothing moved
      out of existence.
- [x] **CON-12** The pipeline as a system (D7), `bd9be20`: `run.py`, eight frozen briefs,
      state per subject, a Codex diagram check, the gate page. See `content-pipeline/README.md`.
- [x] **CON-15** Proved cold on Economics UTME 2024: taxonomy from both syllabi (28 topics,
      103 subtopics, all 25 live topics folded), then every stage to the gate unattended.
      36 of 39 keyed, 3 held as real paper defects. **$6.02 per paper** on the Claude side
      plus $1.72 per subject for the taxonomy; about 40 minutes a paper. Found and fixed on
      the way: Word equations were dropped (`3ec8276`), naira typed as "#" now reads ₦, and
      the diagram check caught a traced label "x" that had become "r". **Waiting at its gate.**
- [ ] **CON-13** Prove Mathematics and Physics notation on one paper before either scales.
      **Mostly done in `3ec8276`:** Word equations and raised or lowered text now come out
      as Unicode (x², H₂SO₄, ¼, √3/2, ²⁴₁₁N, 121₃), and U+2500 reads as a minus, across all
      subjects; Chemistry needed it as much as Maths. Still open: spaces the typist dropped
      (`sin2x`, `Evaluate4610₈`), and whether a determinant written `|−x 12; −1 4|` reads well
      enough or needs an image. Look at one Maths paper's gate page before Maths scales.
- [ ] **CON-14** Ask Chidera whether UTME English comprehension passages were left out when
      the file was typed. None runs past 400 characters.

The import itself carries four P0 defects (IMP-01 to IMP-04 above). A clean CSV passes
validation in full so `validRowsOnly` never matters, but importing the same file twice
would still duplicate, so import each year once.

---

## 2026-09-29: every subject, to the standard

**Ask, verbatim:** "the UTME biology here [...] and here is that of WAEC [...] remember it
is still supposed to match with the diagrams. for the gates - it was supposed to match
with the syllabus and scheme of work for both exams, use /os-fresh-eyes, do a review and
ensure all topics are gotten, and the designed system for matching questions to their
topics work. Lets batch Topics with subs, designed to get the student mastery, a birds eye
view all the entire body of knowledge they need, but every one break into subs for wider
and deeper knowledge. /dev-pm run all these design your plan for these questions, get a
reviewer, get a quality agent, ensure the diagrams are done to precision, for subjects like
english where a passage spans over more than one question, or physics, maths where a
diagram spans more than one questions, design how the system manages such." Then: "where
codex usage is out use claude to finish", and "for questions where you cannot confirm with
certainty [...] design the need review batch so we can work through those".

**Done looks like:** every subject's tree passes `content-pipeline/standards/taxonomy.md`
(both syllabi and the scheme of work mapped, placement test at 90 and 95 percent), every
subject's first paper at its gate, every question the system cannot confirm in the review
batch rather than the import.

**Budget:** measured $6 a paper. Trees cost more than estimated: $131 for all twelve, about
$11 a subject (coverage mapped twice and four placement tests each), against the $4 first
guessed. About 210 papers: roughly $1,300 more on the Claude side at full run, less where
Codex carries the reviews.

**Sources in hand:** twelve new files extracted (UTME Biology, eleven WAEC subjects). The
WAEC Mathematics file needed a heading fix and now yields all 547 questions.

### Trees

- [x] **TAX-01** The standard: `content-pipeline/standards/taxonomy.md`. Topics give the
      bird's-eye view, stamped with where the scheme of work teaches them, so the tree reads
      SS1 to SS3; subtopics give the depth.
- [x] **TAX-02 to TAX-04** All twelve trees meet the standard (`da762b2`); fresh-test
      scores are in that commit. Coverage gaps left are WAEC content set only for Ghana,
      Sierra Leone, The Gambia or Liberia, excluded by stated scope rules.
- [x] **GATE-01** (lifted by D9) Every subject-exam file's first paper is at its gate (all 21). Orezi reviews
      `out/gates.html` and approves per subject; approval runs that subject's other years.
      Claude-side spend to here: $307 (trees $131, papers about $7 each).
- [ ] **REV-04** Codex was out for every paper run on 2026-09-29 (limit resets 20:46), so 617
      keys rest on two Claude models. Re-derive and re-review those on Codex when it is back.

### Sources still needed from Chidera

- [ ] **SRC-01** Diagrams the questions refer to but no folder holds. Agricultural Science
      about 50, Geography about 48 plus the Ijamo map (CON-07), UTME Biology about 30, Maths
      about 25, Chemistry about 15, Physics about 12, a few elsewhere. Question-level list in
      `content-pipeline/work/missing-diagrams.json`. Subjects with heavy gaps wait for them.

### Diagrams to precision

- [x] **DIA-01** Schematic subjects draw every diagram by hand, the trace only a guide;
      Biology and Agricultural Science trace. Check compares labels character by character.
- [ ] **DIA-02** Prove the hand-drawn route on one Maths and one Physics paper at their gates.

### Shared passages and diagrams

- [x] **GRP-01** The export gives every group a key, including questions that share only a
      diagram. Teaching keeps a group in one chunk; check 12 stops sibling leaks.
- [ ] **GRP-02** v2 app, recorded for PLAN.md: select and order whole groups (the old app
      shuffles question by question, `lib/api.ts`, and can serve question 5 without 4); store
      a passage once, not per row; render the underline and italic markers (CON-09).

### Reviewer, quality, and what cannot be confirmed

- [x] **REV-01** Codex out: `lanes.py` runs the review on Claude, a different model, and tags
      it. Keys resting on two Claude models are labelled same-family.
- [x] **REV-02** The review batch: `review_queue.py` gathers every question that cannot be
      confirmed; `review_page.py` shows each as a student sees it, with its reason and the
      diagram beside the redraw, and saves Orezi's decisions to a file.
- [ ] **REV-03** Apply saved decisions back into the pipeline, each logged.

## 2026-10-15: sort every question end to end

**Ask, verbatim:** "contained here [...] New_Diagrams are the missing diagrams for questions,
where diagrams are not clear can you use the question and draw the possible diagram to solve
the question. Also contained in the folder is a word dcoument that provides answers to the
question you asked. /dev-pm handle this, I want to process all the questions we do not have
issues with and have the one with one issue or the other seperated. We would then redesign
the entire sabi prep app and make it useable with the questions we have passed while we fix
the remaining questions. First set step is to sort out the questions end to end."

**Done looks like:** every paper of all 21 files processed; each question either in its
subject's import file (passed) or in the separated batch with its reason. The app redesign
starts after, on the passed set.

**Budget:** about 200 papers at roughly $6 each on the Claude side now Codex carries the
second lane: about $1,200, and about a day of run time. Spend is in `run.py status`.

### Sources in

- [x] **SRC-02** Chidera's returned document: 199 of 387 rows answered, read into
      `corrections/` (keys 36, full text 144, options as drawings 19). Typing problems fell
      from 239 to 72.
- [x] **SRC-03** 96 diagrams from `New_Diagrams`, six subjects given a diagram folder; 183
      questions gained a drawing. `2021_Q28-20.png` (Civic) renamed `2021_Q28-30.png`.
- [x] **DIA-03** Unclear originals: the drawer reconstructs only what the questions force and
      lists it; the checker accepts a listed reconstruction (D9).

### The run

- [ ] **RUN-01** Re-run all 21 first papers from derive with Codex back (closes REV-04 and
      takes in the corrections), then every other paper, newest year first across subjects.
- [ ] **RUN-02** The sort: passed import files per subject, the separated batch with reasons,
      and a count per subject of each.
- [x] **SRC-05** `repair_typing.py`: a model restores lost option labels only, and a word-for-word
      check rejects any other change. 17 of 44 unreadable questions repaired; the 27 it declined
      (an option missing, two run together, options drawn) stay separated with the reason.
- [ ] **RUN-03** After the first pass: resume Agricultural Science 2025 (a Windows file lock
      failed it; saves now retry) and Economics WASSCE 2025 (a reviewer's JSON carried a raw
      line break; now accepted), and re-run Biology UTME 2025 once more for Q25's repair.
- [ ] **CON-08a** The four repeated year headers, read 2026-10-15. Each repeat restarts at
      question 1 and none shares questions with a neighbouring year, except Maths UTME: its
      second "2020" is the 2019 paper typed a second time (same order, 24 of 39 identical,
      the rest the 2019 copy's typing damage). File titles name ranges that exclude the year
      the extractor guessed for the other three (English UTME "2024-2015", English WAEC
      "2024-2016", Government UTME "2025-2016"), so a second sitting of the labelled year is
      likelier than a mislabelled earlier year. Chidera to confirm from the printed copies.
- [ ] **SRC-04** 40 questions still name a diagram nobody has; second papers (239 questions)
      wait on their true year (CON-08).
- [x] **SRC-06** (2026-10-20) Source files re-headed by Orezi with the year as Heading 1. Only
      Government UTME's text changed: its second "2016" is now 2015, so it runs as 2015. English
      UTME 2015, English WAEC 2016 and Maths UTME 2020 still repeat. CRS UTME has no 2018.
- [x] **SRC-07** (2026-10-20) Test of Orals kept: it was dropped as duplicate numbers in every
      WAEC English year (594 questions). It runs as paper 3 of its year. Audit of English
      passages and maths notation fixed the extraction faults listed in commit b56ceb8; about
      30 questions recovered across subjects, 10,456 in all.
- [ ] **RUN-04** Re-run the 19 finished papers those fixes changed (Literature UTME 2023-2025
      most), and re-export English WAEC 2023 (passage ids renumbered, content the same). The
      run stopped 2026-10-16 02:50 with 60 papers done, 7 cut off mid-run, 3 failed.

---

## Needs an answer a console holds

Not repository-visible, so they are findings rather than blanks. Each names where the answer
actually lives.

- [ ] Which migrations are actually applied. Applied by hand with no record, so drift is
      invisible (block 16). **Supabase Dashboard, SQL Editor history.**
- [ ] Whether the indexes in the migrations match the real query plans (block 18).
      **Supabase Dashboard, Query Performance.**
- [ ] Current Vercel environment variable state per environment, which OPS-01 depends on.
      **Vercel project settings.** Installing the Vercel CLI would make this answerable from a
      session rather than by hand.
- [ ] Nothing gates a bad commit. Vercel auto-deploys on push and there is no `.github/`
      (block 43). Deferred below rather than opened, but the deploy posture is a call only
      Orezi can confirm.

---

## Deferred

Parked deliberately. D1 in `decisions.md` accepts the whole of the old app's remaining risk
until v2 replaces it, and `RETROFIT.md` carries the full "deliberately not doing" table. Only
the P0s are restated here, because those are the ones a later session would otherwise re-raise.

- **SABI-REV-062**, the entire learning flow built light-themed across 13 files. Real, and not
  fixed by UX-01's config line, because those files are built light rather than missing `dark:`
  variants. Being replaced.
- **SABI-REV-015**, the daily-reminder cron has never sent a notification. Fixing it only
  partially would spam every student (SABI-REV-051), so it stays inert.
- **SABI-REV-040**, guest question-repeat prevention is dead code. Guests keep seeing repeats.
- **SABI-REV-041 / 073 / 074**, per-topic progress, achievements and goal resets all report
  success and write nothing. Inert until v2.
- **SABI-REV-001 / 039**, session completion is not idempotent and daily challenges
  double-award XP. Tolerable only because D2 discards these numbers at cutover.
- **SABI-REV-071**, first-attempt accuracy is not recoverable from existing data. This is the
  finding that forces D2.
- Tests, CI, error tracking, pagination, the 3,305-line `lib/api.ts`, and the 2,500 lines of
  duplicated session pages. All replaced rather than refactored.
