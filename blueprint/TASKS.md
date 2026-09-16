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
