# SabiPrep review ledger

Campaign: full-codebase audit ahead of the v2 rebuild. Opened 2026-08-24.

**Framing.** The application is being replaced, not refactored. So a finding is triaged on two axes: does it harm **live users or live data now**, and does it describe **semantics the rebuild must preserve or deliberately change**. A structural complaint about code being deleted is neither, and is not recorded.

**Baseline (Phase 0).** No test suites exist, so there is no pre-existing failure list to bank. Lint: 90 errors, 251 warnings. Build: green. Branch `main` at `3a4da66`, clean.

**Decisions:** three ratified 2026-08-24, recorded in the Decisions register at the end of this file (D1 live-app scope, D2 progress migration, D3 review gate).

**Status vocabulary:** `open` · `needs-decision` · `accepted-risk` · `deferred` · `fixed` · `duplicate-of`

---

## SABI-REV-001: Session completion is not idempotent; XP and stats double-count on replay

Status: **needs-decision**
Severity: P0
Slice: Loop trace
Category: Failure-window hygiene / concurrency

Files:
- `lib/api.ts:1024-1178` (`completeSession`, `completeSessionWithGoals`)
- `lib/api.ts:1515-1561` (`incrementUserStats`)
- `app/(learning)/practice/[sessionId]/page.tsx:99-392, 564`
- `app/(learning)/test/[sessionId]/page.tsx:388-447, 681`

Problem:
Neither completion function checks whether the session is already `completed`. Both unconditionally UPDATE and then call `incrementUserStats`, which is purely additive and invokes the `award_xp` RPC. The practice page loads a completed session normally, and because every question is already in `answeredQuestions`, the completion button is enabled immediately. Practice and test also lack the in-flight guard that timed mode has (`sessionComplete`), so a double-click alone can fire completion twice.

Failure scenario: complete a practice session, press browser back, page to the end, complete again. `total_questions_answered`, `total_correct_answers`, `total_study_time_minutes` and XP all double. Repeatable without limit.

Consequence for v2: **the existing progress data is already polluted.** This directly affects whether historical progress can be migrated into the parent-facing product, because the numbers a parent would see are inflated by an unknown amount.

Recommended fix: short-circuit both completion functions when status is already `completed`; redirect a completed session to its results page; add an in-flight guard on the completion buttons.

---

## SABI-REV-002: Practice completion writes the configured question count, not the answered count

Status: **open**
Severity: P1
Slice: Loop trace
Category: Correctness & contract fidelity

Files:
- `app/(learning)/practice/[sessionId]/page.tsx:564-601` (`handleNext`)
- `app/(learning)/practice/[sessionId]/page.tsx:670-723` (`handleEndSession`, the correct version)
- `lib/api.ts:1047-1050`
- `components/common/QuestionNavigator.tsx:121-143`

Problem:
`handleNext` passes `questions.length` as the total, while the sibling `handleEndSession` correctly passes `answeredQuestions.size`. The two paths disagree about what "total" means. The Question Navigator permits jumping straight to the last question without answering the ones between.

Failure scenario: in a 20-question session, jump to question 20, answer only it, complete. `questions_answered` records 20 and stats credit 20, while `user_attempted_questions` records only the one actually answered. The two tables become mutually inconsistent for that user.

Also seen in: SABI-REV-003 shares the denominator confusion.

Recommended fix: use `answeredQuestions.size`, matching `handleEndSession`.

---

## SABI-REV-003: Results page shows two different denominators for the same session on one screen

Status: **open**
Severity: P1
Slice: Loop trace
Category: Correctness & contract fidelity

Files:
- `app/(learning)/results/[sessionId]/page.tsx:493-499` (correct)
- `app/(learning)/results/[sessionId]/page.tsx:719` (wrong)

Problem:
Line 719 sits inside a practice-mode-only branch yet reads `isTimedMode ? totalAnswered : session.total_questions`. Inside that branch `isTimedMode` is always false, so it always renders the originally configured count.

Failure scenario: end a practice session early after answering 5 of 20. The stats grid correctly shows "Incorrect: 2" against 5 answered, while the Final Score card immediately below shows "3 out of 20 correct".

Recommended fix: use `totalAnswered` for all non-test modes.

---

## SABI-REV-004: Session counters are absolute writes from client state; concurrent writers lose updates

Status: **open**
Severity: P1
Slice: Loop trace
Category: Concurrency & state ordering

Files:
- `lib/api.ts:984-1019` (`updateSession`)
- `app/(learning)/practice/[sessionId]/page.tsx:539-551`, and the 30s autosave at `72-97`

Problem:
`updateSession` writes whole columns with no optimistic-concurrency guard. Callers compute `correct_answers` from React state captured at load time and write it as an absolute value rather than a delta. The 30s autosave builds its payload from an independently captured closure.

Failure scenario: two tabs on one session. Tab A answers question 6 and writes `correct_answers=4`. Tab B, whose state predates that, answers question 4 and writes `correct_answers=3`, silently reverting A. No error surfaces. The same race can fire inside one tab when the autosave overlaps an in-flight answer submit.

**Semantics the rebuild must change:** counters move to server-side atomic increments. This is block 35 and it is not a refactor, it is a correctness requirement.

---

## SABI-REV-005: Auto-cleanup silently abandons valid multi-topic sessions

Status: **open**
Severity: P1
Slice: Loop trace
Category: Correctness & contract fidelity / data loss

Files:
- `lib/api.ts:1272-1307` (`canResumeSession`)
- `app/(dashboard)/home/page.tsx:417-469` (`validateIncompleteSessions`)

Problem:
`canResumeSession` checks only `topic_ids[0]` for available questions, despite multi-topic sessions being a supported feature. The home page runs this check automatically on every load and, on failure, immediately sets the session to `abandoned` with no confirmation.

Failure scenario: a three-topic session whose first topic is exhausted or whose questions were unpublished by an admin. The student opens the home page and their in-progress session is destroyed, though topics two and three still had questions.

Recommended fix: check all topics; abandon only when none has questions. Separately, silent destruction without confirmation is the wrong default regardless.

---

## SABI-REV-006: Refreshing an in-progress session returns the student to question one

Status: **open**
Severity: P2
Slice: Loop trace
Category: Correctness & contract fidelity

Files:
- `app/(learning)/practice/[sessionId]/page.tsx:197` (restores index only for `paused`)
- `app/(learning)/practice/[sessionId]/page.tsx:372-378` (fallback path, correctly checks both statuses)

Problem: the restore branch checks only `paused`, while the fallback branch in the same file checks `paused || in_progress`. A student who never pressed Pause and simply reloaded lands on question one.

Recommended fix: match the fallback branch's condition.

---

## SABI-REV-007: `cleanupInvalidSessions` is dead, and its logic is duplicated inline with the same flaw

Status: **open**
Severity: P3
Slice: Loop trace
Category: Dead code & least surprise

Files: `lib/api.ts:1088-1104`; duplicated intent at `app/(dashboard)/home/page.tsx:417-469`

Problem: zero call sites. The home page reimplements the same intent inline, carrying the same first-topic-only defect from SABI-REV-005, so that fix would need making twice.

---

## Noted, not raised as findings

- `createSession` has a create-then-link window, but `topic_ids` persists on the session row and the page's fallback regenerates a question set. Degraded (loses the non-repetition guarantee) rather than broken. Worth knowing if the fallback is ever removed.
- `createSessionAnswer` correctly upserts on `(session_id, question_id)`, so answer retries converge instead of accumulating duplicates.

---

## SABI-REV-008: A tutor can suspend an admin

Status: **open**
Severity: P1
Slice: Auth and authorization
Category: Security-adjacent contract check

Files: `app/api/admin/users/[userId]/route.ts:114-225`

Problem:
`PUT` is wrapped with `withAdminAuth(request, handler)` with **no** `allowedRoles` argument, so the default `['admin','tutor']` applies. Compare `DELETE` at line 299 and the reset-password route, which both pass `['admin']`. Inside the handler only `role` is gated behind `isAdminOnly`; `status`, `full_name`, `grade`, `phone`, `institution` and `avatar_url` are not gated at all.

Failure scenario: a tutor calls `PUT /api/admin/users/{anAdminId}` with `{ status: 'suspended' }`. It succeeds. Because `middleware.ts` re-reads `users.status` on every request, the targeted admin is locked out immediately.

This contradicts `CLAUDE.md`, which states that only admins may manage users. The `DELETE` route already implements admin-on-admin protection, so the team modelled this concern and missed one route.

Recommended fix: restrict `PUT` to `['admin']`, or gate `status` the way `role` is gated.

---

## SABI-REV-009: Open redirect in the OAuth callback

Status: **open**
Severity: P1
Slice: Auth and authorization
Category: Security-adjacent contract check

Files: `app/auth/callback/route.ts:16, 30, 60`

Problem:
`const next = requestUrl.searchParams.get('next') || '/home'` is passed unvalidated to `new URL(next, request.url)`. An absolute or protocol-relative value (`https://evil.com`, `//evil.com`) causes `new URL` to ignore the base and resolve to the external host.

Exploitability depends on how Supabase's redirect allowlist is configured, but the code provides no defence of its own either way.

Recommended fix: accept only a same-origin relative path (single leading slash, not `//`), else fall back to `/home`.

---

## SABI-REV-010: Middleware discards cookie mutations on every rejection branch, trapping suspended admins in a redirect loop

Status: **open**
Severity: P1
Slice: Auth and authorization
Category: Seam & boundary behavior

Files: `middleware.ts:19-40, 55-69, 102-113`

Problem:
The Supabase SSR client's `setAll` reassigns the closure variable `response`, but only the authorized pass-through at line 128 returns that object. Every rejection branch constructs a fresh `NextResponse`, discarding accumulated cookie mutations, including a token refresh triggered by `getSession()` and the cookie clearing from `signOut()`.

Failure scenario: a suspended admin holding an unexpired cookie hits `/admin/*`. Middleware calls `signOut()` then returns a new redirect, so the clearing headers are lost and the browser keeps the cookie. The `/admin/login` branch checks session and **role only, never status**, sees a valid admin, and redirects to `/admin/dashboard`. That bounces back. The user loops between the two, never sees the suspension message, and cannot sign in as anyone else until the JWT expires naturally.

Recommended fix: carry the same `response` object through every branch. Separately, add a `status` check to the `/admin/login` early return.

---

## SABI-REV-011: Admin role cache never revalidates; `CACHE_DURATION` is dead config

Status: **open**
Severity: P2
Slice: Auth and authorization
Category: Dead code & least surprise

Files: `lib/admin-auth-context.tsx:48, 114-119, 224-231, 346`

Problem:
`refreshAdminUser` is defined and exposed on the context but has zero callers. The `TOKEN_REFRESHED` branch returns early without re-fetching `adminUser`. So the role is fetched once per tab and never re-checked, rather than every five minutes as `CACHE_DURATION` implies. A demoted admin keeps the admin UI for the life of the tab.

Mitigated by server-side checks on real mutations, except via SABI-REV-008.

Corrects an earlier claim in `BLOCKS-AUDIT.md` that the cache window is five minutes. The effective window is "until reload".

---

## SABI-REV-012: Any admin can trigger a password reset against any other admin

Status: **needs-decision**
Severity: P2
Slice: Auth and authorization
Category: Security-adjacent contract check

Files: `app/api/admin/users/[userId]/reset-password/route.ts` versus `app/api/admin/users/[userId]/route.ts:258-261`

Problem:
`DELETE` explicitly blocks admin-on-admin action. `reset-password`, which uses the service-role key, has no equivalent guard. Reset is the stronger capability of the two for account takeover, and it is the unguarded one.

May be intentional support tooling. Needs a decision rather than a silent fix.

---

## SABI-REV-013: `verifyAdminRole` is dead code and `CLAUDE.md` documents it as load-bearing

Status: **open**
Severity: P3
Slice: Auth and authorization
Category: Docs & operational truth

Files: `lib/api/admin-auth.ts:33-77` (dead) versus `:83-158` (`withAdminAuth`, actually used)

Problem: zero callers. `withAdminAuth` reimplements the same session and role lookup inline. `CLAUDE.md` tells future contributors and AI agents that admin routes call `verifyAdminRole`, which is false.

---

## SABI-REV-014: One auth identity equals one learner profile, with no account/profile split

Status: **needs-decision**
Severity: P1 for the rebuild
Slice: Auth and authorization
Category: Schema evolution safety

Files: `lib/auth-context.tsx:174`; `lib/api/admin-auth.ts:9`; `app/api/admin/users/route.ts:38-40`; every `userId`-keyed call in `lib/api.ts`

Problem:
The Supabase auth `user.id` is simultaneously the authentication principal and the sole learner-profile key. `sessions.user_id`, `user_progress`, `user_attempted_questions`, `user_stats` and guest tracking all assume one auth identity equals one learner.

Consequence for v2: parent-owns-many-children requires a profile id distinct from the authenticating account, which re-points every learning table and every `userId` call site, plus an "active profile" concept in the auth context. Additionally `AdminRole = 'admin' | 'tutor'` is a hardcoded union with no room for `parent` or `school_admin`, and `GET /api/admin/users` has no tenant scoping, so every admin currently sees every user globally. School accounts cannot ship without that scoping.

**This is the single largest structural reason the rebuild is a rebuild rather than a refactor.**

---

## Confirmed sound (Auth slice)

- The middleware matcher covers all admin pages and API routes with no gaps.
- Guest state never reaches the database, so guest ids cannot collide with or impersonate real user ids.
- Every other destructive admin action correctly narrows from the broad gate down to admin-only. SABI-REV-008 is the sole exception.

---

## SABI-REV-015: The daily-reminders cron has never sent a notification and cannot

Status: **open**
Severity: P0
Slice: Release & generated artifacts
Category: Seam & boundary behavior

Files: `vercel.json:1-8`; `app/api/cron/daily-reminders/route.ts:23, 31-40`; `lib/supabaseServer.ts:22-29`

Problem:
The route builds its client with `createServerClient()`, which uses the **anon key** and reads the session from `next/headers` cookies. A Vercel Cron invocation is server-to-server and carries no cookies, so `auth.getSession()` is null and every query runs as the anonymous role. The `users` table has exactly two SELECT policies, both scoped to `auth.uid()`. With `auth.uid()` null neither matches, and RLS filters rows **silently rather than erroring**. The handler short-circuits on `users.length === 0` and returns `{ message: 'No users to notify', count: 0 }`.

Failure scenario: the feature has never notified anyone in production and never will in this form. It reports success every day.

The correct pattern already exists in the codebase: `app/api/admin/users/route.ts:131-139` builds a service-role client for exactly this kind of server-only work, and several migrations use `SECURITY DEFINER` RPCs for privileged system operations.

**Sequencing note:** the `CRON_SECRET` guard on this route was fixed and deployed earlier today (commit `3a4da66`). That fix was correct on its own terms, the endpoint really was publicly callable, but it secured an endpoint whose feature is inert. A good illustration of block 34: a control that fails open must also expose whether it is working.

---

## SABI-REV-016: `types/database.ts` is missing `questions.import_report_id`

Status: **open**
Severity: P1
Slice: Release & generated artifacts
Category: Contract drift

Files: `types/database.ts:100-131` versus `supabase/migrations/20250123_add_import_report_id_to_questions.sql:5-6`

Problem: an exhaustive field-by-field diff of the `Question` interface against every `CREATE TABLE` and `ALTER TABLE` across all 16 migrations found exactly one drift. The column is read and written throughout the import feature (`import/process/route.ts:209`, `reports/[reportId]/route.ts:196,225,241-242`, `bulk-action/route.ts:49`, `questions/route.ts:65`, `check-migration/route.ts:14,34`).

**Worth recording as good news:** every other field maps to a real column and no other column is missing. For a hand-maintained type file tracking 16 hand-applied migrations, that is a far better result than expected.

---

## SABI-REV-017: Tutors cannot use AI review; RLS and app authorization contradict each other

Status: **open**
Severity: P1
Slice: Release & generated artifacts
Category: Seam & boundary behavior

Files: `supabase/migrations/20250124_question_reviews.sql:66-77, 79-96` (gate on `role = 'admin'`); `app/api/admin/questions/review/route.ts:19`, `.../[reviewId]/approve/route.ts:22`, and the batch route (all default to `['admin','tutor']`)

Problem: the app admits a tutor and the API accepts the request. The routes use the anon-key-plus-cookie client, so RLS is enforced against the real user, the insert is rejected, and the route returns a generic 500.

Failure scenario: a tutor clicks "Review with AI". The Anthropic call is made and paid for, then the insert fails and the tutor sees a 500. Unusable for every tutor account, and it costs money on each attempt.

Needs a direction decision: either tutors may review, or they may not. Today the two layers disagree.

---

## SABI-REV-018: Any signed-in user can forge notifications for any other user

Status: **open**
Severity: P1
Slice: Release & generated artifacts
Category: Security-adjacent contract check

Files: `supabase/migrations/20250121_notifications_schema.sql:53-57`

Problem: the INSERT policy is `WITH CHECK (true)` with no `auth.uid() = user_id` and no role check. `lib/api.ts` inserts notifications through the **browser** singleton, so the path is reachable from the console.

Failure scenario: a student inserts a row with another user's `user_id`, `type: 'system_alert'` and arbitrary title, message and payload. It succeeds. The policy's name states an intent it does not enforce.

---

## SABI-REV-019: Any student can delete a daily challenge, cascading away every other student's completion record

Status: **open**
Severity: P1
Slice: Release & generated artifacts
Category: Security-adjacent contract check

Files: `supabase/migrations/20250128_daily_challenge_20q.sql:273-280`; cascade at `20250125_fix_streak_and_add_xp.sql:89`; browser write path proven at `lib/api.ts:2350-2425`

Problem: UPDATE and DELETE gate on `auth.role() = 'authenticated'`, which every signed-in student satisfies. `user_daily_challenges.daily_challenge_id` is `ON DELETE CASCADE`, and cascades are enforced by Postgres itself rather than by the child table's policies.

Failure scenario: a student deletes today's challenge from the browser console. It disappears for everyone, and every other student's completion and XP row for it is cascaded away. Or they edit `question_ids` and `time_limit_seconds` on a live challenge to change it for everyone attempting it that day.

---

## SABI-REV-020: `scripts/setup-first-admin.sql` targets a table that has never existed

Status: **open**
Severity: P1
Slice: Release & generated artifacts
Category: Docs & operational truth

Files: `scripts/setup-first-admin.sql:52-62, 117-118`

Problem: the script inserts into `profiles`. No migration creates that table; the real one is `public.users`. Its own troubleshooting section names the resulting error as a known issue. It duplicates the working `setup_first_admin(admin_email)` function in `20241216_admin_schema.sql:236-261`, which takes an email rather than a hand-copied UUID.

This is the break-glass path for creating the first admin, and it does not work.

---

## SABI-REV-021: The only non-idempotent migration, in a hand-applied pipeline

Status: **open**
Severity: P2
Slice: Release & generated artifacts
Category: DB ownership & migration hygiene

Files: `supabase/migrations/20251217_add_time_limit_to_sessions.sql:2-3`

Problem: every other `ADD COLUMN` across all 16 files uses `IF NOT EXISTS`. This one does not. With migrations applied by hand and no tracking table, a re-paste or a re-run after partial failure aborts here where every sibling would no-op.

---

## SABI-REV-022: The accessibility CHECK constraint does not enforce its own comment

Status: **open**
Severity: P2
Slice: Release & generated artifacts
Category: Correctness & contract fidelity

Files: `supabase/migrations/20250117_questions_enhancement.sql:68-75`

Problem: the constraint reads `(url IS NULL AND alt IS NULL) OR (url IS NOT NULL)`. The second disjunct is true whenever an image exists regardless of alt text, so an image with null alt text passes. The only thing actually blocked is alt text without an image, which is not what the comment describes.

**Refines an earlier claim.** `BLOCKS-AUDIT.md` praised accessibility enforcement. The *import validator* does enforce it (`import/validate/route.ts:259-268`) and that praise stands. The *database constraint* does not, so any non-import path (manual admin entry, direct SQL) can create an image question with no alt text. With a diagram-heavy bank incoming, this gap matters more than it did.

---

## SABI-REV-023: Operator precedence bug in the badge-icon backfill

Status: **open**
Severity: P3
Slice: Release & generated artifacts
Category: DB ownership & migration hygiene

Files: `supabase/migrations/20250128_daily_challenge_20q.sql:186-188`

Problem: `WHERE level = 1 AND icon IS NULL OR icon = ...` parses as `(level = 1 AND icon IS NULL) OR (icon = ...)`, so the level scoping is not applied. Inert today only because no other level carries that icon.

---

## SABI-REV-024: Documentation names a table that does not exist

Status: **open**
Severity: P3
Slice: Release & generated artifacts
Category: Docs & operational truth

Files: `CLAUDE.md` (Sessions and learning modes), `TESTING_CHECKLIST.md`

Problem: both refer to `learning_sessions`. Every migration creates and alters `public.sessions`. `LearningSession` exists only as a TypeScript alias to avoid clashing with Supabase's auth `Session` type (`types/database.ts:137`). No code queries `learning_sessions`. This misleads anyone working from `CLAUDE.md`, which is the file most likely to be trusted by a new developer or an AI agent.

---

## SABI-REV-025: "Validate" writes to the live topic taxonomy; the dry run is not a dry run

Status: **open**
Severity: P0
Slice: Admin content pipeline
Category: Failure-window hygiene

Files: `app/api/admin/import/validate/route.ts:133-176`

Problem:
The validate step auto-creates missing topics with `status: 'active'` and writes them immediately. The UI and `CSV_IMPORT_GUIDE.md` both describe validation as saving nothing. Active topics are exactly what the student app queries (`lib/api.ts:53,140,193,1969,2251,2357` all filter on `status = 'active'`), so a topic created from a mistyped CSV cell is live to students at once, whether or not the import is ever processed.

Failure scenario: a typo in one row of a WAEC batch creates a junk topic. The admin sees the error in the validation report, fixes the CSV and re-validates. The junk topic is never cleaned up and appears in the student topic picker permanently. Across tens of thousands of hand-transcribed rows this happens repeatedly.

**Direct consequence for v2:** this is why the extractor worker in `QUESTION-PIPELINE.md` must never infer or create taxonomy. New topics are proposals for human confirmation, created during publish, not during validation.

---

## SABI-REV-026: The import has no checkpoint and cannot resume

Status: **open**
Severity: P0
Slice: Admin content pipeline
Category: Workload realism

Files: `app/api/admin/import/process/route.ts:101-259`

Problem: `import_reports` is set to `processing` at the start and only flipped to `completed` after every row is attempted. No `maxDuration` is set on the route anywhere in the repo, so it runs under the platform default. There is no per-row watermark.

Failure scenario: a multi-thousand-row batch exceeds the execution window. The report is stuck at `processing` forever, an unknown prefix of rows is already in `questions`, and the only recovery is diffing `import_report_id` against the CSV by hand and re-running the file, which then triggers SABI-REV-028.

This is the single most important scale finding for the 1995 to 2025 corpus.

---

## SABI-REV-027: `validRowsOnly` is dead; invalid rows are imported anyway

Status: **open**
Severity: P0
Slice: Admin content pipeline
Category: Correctness & contract fidelity

Files: `app/api/admin/import/process/route.ts:49` (destructured, never read again); `app/(admin)/admin/import/page.tsx:130-139` (always sends the entire unfiltered file)

Problem: the flag is parsed and ignored, and the client sends everything regardless.

Failure scenario: the admin validates a file, sees "120 valid / 8 invalid", clicks "Import 120 Valid Rows", and the backend attempts all 128. Rows failing required-field checks throw inside a per-row try/catch and are silently absorbed into `failedRows`. Rows flagged as duplicates are not skipped at all and get inserted.

The button lies about what it does.

---

## SABI-REV-028: Duplicate detection is broken three independent ways

Status: **open**
Severity: P0
Slice: Admin content pipeline
Category: Correctness & contract fidelity

Files: `app/api/admin/import/validate/route.ts:313-359`; `app/api/admin/import/process/route.ts:179-215`; migrations (no unique constraint on `questions.question_text`)

Problem:
1. No database uniqueness constraint of any kind on question text.
2. `process` never re-checks for duplicates; it resolves subject and topic ids and inserts.
3. The one existing check is defeated by a case bug: `questionTexts` stores `row.question_text.trim().toLowerCase()`, and that lowercased set is queried directly against the original-case column with `.in('question_text', ...)`. Postgres `IN` on `TEXT` is case-sensitive, so unless a stored question happens to be entirely lowercase the query returns nothing and "already exists in database" never fires for realistically-cased exam text.

Failure scenario: the same CSV imported twice, whether after a timeout (SABI-REV-026) or by mistake, creates full duplicate rows with no error and no warning, detectable afterwards only by comparing `import_report_id` batches by hand.

Recommended fix: a normalized-text unique index or a content-hash column, fix the case comparison, and make `process` itself duplicate-safe rather than relying on `validate`.

---

## SABI-REV-029: The approval gate is optional, not structural

Status: **needs-decision**
Severity: P1
Slice: Admin content pipeline
Category: Seam & boundary behavior

Files: `app/api/admin/questions/[questionId]/quick-update/route.ts:30-40`; the standard question edit form; versus `app/api/admin/questions/review/[reviewId]/approve/route.ts`

Problem:
The `question_reviews` to `approve` path is itself sound. Status transitions are checked, no code path writes `proposed_*` into `questions` outside the approve route, and rejected proposals cannot be resurrected.

But `quick-update` and the ordinary edit form both allow direct, unreviewed writes to `hint1`, `hint2`, `hint3`, `solution` and `explanation`. The review system is therefore a parallel optional workflow rather than a gate on those fields.

**Corrects an earlier claim.** `BLOCKS-AUDIT.md` and `QUESTION-PIPELINE.md` both described the approval gate as structural. It is not. For a bank whose correctness is the product, the difference matters: v2 must decide whether teaching fields are writable outside review at all.

---

## SABI-REV-030: Batch AI review silently truncates to ten and reports success

Status: **open**
Severity: P1
Slice: Admin content pipeline
Category: Correctness & contract fidelity

Files: `app/api/admin/questions/review/batch/route.ts:28-29`; `app/(admin)/admin/review/page.tsx:390-397`

Problem: the route slices `questionIds` to `batchSize || 10`. Selection in the UI accumulates across paginated pages, but the handler always sends a hardcoded `batchSize: 10`. The response carries no `truncated` or `skipped` field, and the UI alert reports only `successful`.

Failure scenario: an admin selects 50 questions, clicks review, and 40 are dropped silently while the alert reads as success.

---

## SABI-REV-031: Review dashboard counts are computed from a single page of results

Status: **open**
Severity: P1
Slice: Admin content pipeline
Category: Workload realism

Files: `app/(admin)/admin/review/page.tsx:172-216`; accurate counts available and unused at `app/api/admin/questions/review/history/route.ts:68-76`

Problem: `loadReviews` fetches 50 rows and derives the pending, approved, rejected and failed cards by filtering that page, ignoring the API's real `pagination.total`.

Failure scenario: once history exceeds 50 rows, which is certain as soon as the corpus flows through review, the dashboard understates the backlog. An admin can believe review is caught up while hundreds of items sit pending beyond page one.

---

## SABI-REV-032: The Passage Management page is non-functional end to end

Status: **open**
Severity: P1
Slice: Admin content pipeline
Category: Correctness & contract fidelity

Files: `app/(admin)/admin/questions/passages/page.tsx:46-49, 64-67`; `app/api/admin/questions/by-passage/route.ts:14-25`

Problem: three independent defects stacked.
1. Initial load calls the endpoint with no query params expecting a list of passage groups. The API requires `passage_id` and returns 400. No list-all handler exists.
2. The drill-down sends `?passageId=` while the API reads `passage_id`, so it is always null.
3. The response is `{success, data:{passage_id, total, questions}}` but the page reads `data.data.passages`, a key that never exists.

The page always renders "No passages found."

Underneath it, passages are denormalized: `passage` text is duplicated on every question row sharing a `passage_id`, there is no canonical `passages` table, and nothing checks that rows sharing an id carry the same text. A passage exists only inside its question rows and disappears when the last one is deleted.

**Consequence for v2:** English comprehension is a large part of WASSCE and JAMB. A normalized passage entity is not optional.

---

## SABI-REV-033: Nothing verifies that a diagram exists or is an image

Status: **open**
Severity: P1
Slice: Admin content pipeline
Category: Correctness & contract fidelity

Files: `app/api/admin/import/validate/route.ts:245-269`; `app/api/admin/import/process/route.ts:170-173`

Problem: image handling checks URL syntax and alt-text presence only. Nothing fetches the URL, confirms it resolves, confirms the content type is an image, or checks that declared `image_width` and `image_height` match reality.

Failure scenario: a dead or wrong URL passes validation and processing cleanly and surfaces as a broken image to a live student, who then cannot answer the question and assumes the fault is theirs.

This is the automated half of the fidelity gate that `QUESTION-PIPELINE.md` treats as a hard requirement.

---

## SABI-REV-034: The AI client is not an adapter; provider migration is a refactor

Status: **open**
Severity: P2
Slice: Admin content pipeline
Category: Dead code & least surprise

Files: `lib/ai/anthropic-client.ts:4, 53, 66-70, 162-164, 168, 261, 264, 316, 319`; three route files importing it directly

Problem: Anthropic-specific details are spread through the module rather than isolated. SDK instantiation, the `response.content[0].type !== 'text'` response shape, token accounting keyed to `usage.input_tokens` and `usage.output_tokens`, and retry logic keyed to `error.status` and `error.headers['retry-after']`. No interface exists, and route files import the concrete implementation directly.

**Refines an earlier claim.** `BLOCKS-AUDIT.md` and `PLAN.md` described this module as close to an adapter and the model-agnostic goal as nearly free. That was too optimistic. The seam is clean at the function-signature level, which is the good news, but extracting it is a real refactor across three call sites plus error normalization, not a configuration change.

---

## SABI-REV-035: Each question costs three AI completions instead of one

Status: **open**
Severity: P2
Slice: Admin content pipeline
Category: Workload realism

Files: `lib/ai/anthropic-client.ts:339-343`

Problem: `reviewQuestion` runs `generateHints`, `generateSolution` and `generateExplanation` as three separate full completions. The three outputs are sub-fields of one logical result.

At corpus scale this triples both token spend and latency exposure. Worth confirming whether the split is deliberate for partial-failure isolation before merging, but as written it looks incidental.

---

## SABI-REV-036: `CSV_IMPORT_GUIDE.md` documents a pipeline that does not exist

Status: **open**
Severity: P1
Slice: Admin content pipeline
Category: Docs & operational truth

Files: `CSV_IMPORT_GUIDE.md:51-52, 396, 419-421, 772-796, 812-813`

Problem: the guide instructs users to supply `subject_id` and `topic_id` as UUIDs; the code takes names and auto-creates topics. It documents a 1000-row and 10MB limit that nothing enforces. It describes a `question_type` field and a `beginner/intermediate/advanced` difficulty enum that do not exist; the schema enforces `easy/medium/hard`. It shows a multipart `FormData` API while the real endpoints take JSON `{ csvContent }`.

Failure scenario: anyone briefed from this document while preparing the 30-year corpus produces CSVs in the wrong shape. That is a large amount of manual work aimed at the wrong target, and it is the most expensive documentation defect in the repo.

The CSV template's own inline comments are accurate. The guide is not.

---

## SABI-REV-037: Unused review components duplicate the live review UI

Status: **open**
Severity: P3
Slice: Admin content pipeline
Category: Dead code & least surprise

Files: `components/admin/index.ts:139-152`; `ReviewModal.tsx`, `ReviewCard.tsx`, `ReviewProgress.tsx`; live UI at `app/(admin)/admin/review/[questionId]/page.tsx`

Problem: exported but imported nowhere. The live page reimplements the same current-versus-proposed comparison inline. Two copies invite a future change landing in only one.

---

## SABI-REV-038: Server-side image dimension detection is a permanent stub

Status: **open**
Severity: P3
Slice: Admin content pipeline
Category: Dead code & least surprise

Files: `app/api/admin/questions/upload-image/route.ts:120-129`

Problem: `getImageDimensions()` always throws, is caught, and width and height are always returned as null. Harmless today only because `components/admin/ImageUpload.tsx:52-69` computes dimensions in the browser and ignores the server response. Any future caller trusting the documented `{url, width, height}` shape, such as a bulk image import, silently gets nulls.

---

## Validator specification for v2

The single most reusable artifact from this campaign. What `import/validate` enforces today, and what it does not. The second list is the spec for the new validator.

**Enforced (14):** required fields non-empty; subject exists by name or slug, case-insensitively; topic belongs to subject (but auto-creates, see SABI-REV-025); `exam_type` in WAEC/JAMB/NECO/GCE; `year` four digits within 1900-2100; `difficulty` in easy/medium/hard; `correct_answer` in A-E; `correct_answer` maps to a non-empty option; image URL is syntactically valid; alt text required when an image URL is present; image dimensions are positive integers when present; `passage_id` matches a safe character pattern; duplicate question text within the file; duplicate against the database (**broken**, SABI-REV-028).

**Not enforced (9), in rough order of importance for the incoming corpus:**
1. Options are mutually distinct. Two identical options make a question unanswerable.
2. A question whose text says "the diagram below", "figure", "graph" or "shown below" actually has an image.
3. Image URL reachability, content type, and that declared dimensions match reality.
4. Minimum option count. A two-option item passes today.
5. Passage text present and consistent across all rows sharing a `passage_id`.
6. `exam_year` plausibility. The 1900-2100 band admits obvious nonsense.
7. Question and option length bounds.
8. Topic auto-creation against a controlled vocabulary.
9. Row and file size limits, which `CSV_IMPORT_GUIDE.md` claims exist.

---

## SABI-REV-039: Daily challenges award XP twice, on every completion

Status: **open**
Severity: P0
Slice: Data layer
Category: Correctness & contract fidelity

Files:
- `app/(learning)/timed/[sessionId]/page.tsx:748-777` (`handleAutoSubmit`), `:807-836` (`finishSession`)
- `lib/api.ts:1109-1178` (`completeSessionWithGoals`) then `:1515-1561` (`incrementUserStats`) then `:1529` (`award_xp`)
- `lib/api.ts:2716-2747` (`completeDailyChallenge`) then `:2291-2304` (`awardXP`) then `:2296` (`award_xp` again)
- `supabase/migrations/20250125_fix_streak_and_add_xp.sql:225-276`

Problem:
Both completion paths call `completeSessionWithGoals` and then `completeDailyChallenge`. Each independently reaches the `award_xp` RPC with the same `correctAnswers`. `award_xp` sets `xp_earned := correct_answers_count` unconditionally and adds it, with no session key or idempotency guard. Only the daily bonus and streak bonus are deduped, via `daily_xp_claimed_at` and `daily_xp_streak_bonus_claimed`.

Failure scenario: this fires on 100% of daily challenge completions, because it is the only path into `completeDailyChallenge`. A 20 out of 20 challenge yields roughly 42 XP instead of 22.

Related to SABI-REV-001, but distinct: that one needs a replay to trigger, this one happens every single time.

---

## SABI-REV-040: Guest question-repeat prevention is entirely dead code

Status: **open**
Severity: P0
Slice: Data layer
Category: Dead code & least surprise

Files: `lib/api.ts:29-34` (imports), `:3163` (the only read), `:3186` (`resetGuestAttemptedQuestions`); `lib/guest-question-tracking.ts`

Problem:
`recordGuestAttemptedQuestions` and `isGuestPoolExhausted` are imported and never called anywhere in the repo. Only the read, `getGuestAttemptedQuestions`, is invoked. Nothing ever writes the `localStorage` key, so the read always returns an empty array, the exclusion list passed to question selection for guests is always empty, and the reset function deletes a key that was never set.

Failure scenario: guests see the same questions again and again, in every session, forever. The non-repetition system that works correctly for signed-in users via `user_attempted_questions` simply does not run for them.

Guest mode is the top of the funnel for a product sold to parents. A guest whose trial keeps repeating the same questions concludes the bank is tiny.

---

## SABI-REV-041: Per-topic progress has never been written; the table is permanently empty

Status: **open**
Severity: P0
Slice: Data layer
Category: Dead code & least surprise

Files:
- `lib/api.ts:1400-1425` (`updateUserProgress`, the only writer, never called)
- `lib/api.ts:1372-1378, 1387-1395` (readers), called from `app/(dashboard)/home/page.tsx:186`
- `supabase/migrations/20250125_fix_streak_and_add_xp.sql:319-323`

Problem:
`updateUserProgress` is the only function in the repo that writes `user_progress`, and it has zero call sites. The readers run on the dashboard and always return an empty array. Worse, `check_and_award_mastery_badges` computes its per-subject branch from `SUM(questions_correct) FROM user_progress`, which is always zero, so **no per-subject mastery badge can ever be earned**.

**This is the most consequential finding for the pivot.** Per-topic progress is the foundation of the proficiency map that parents and schools are meant to pay for. That table has been empty the entire time, and the dashboard has been rendering a feature that does not exist.

Rebuild decision needed: derive proficiency from `session_answers` and `user_attempted_questions`, which is cheaper and always fresh, or actually wire incremental writes. Either way this must not be carried across silently.

---

## SABI-REV-042: Read-modify-write race on the user stats counters

Status: **open**
Severity: P1
Slice: Data layer
Category: Concurrency & state ordering

Files: `lib/api.ts:1515-1561` (`incrementUserStats`), reading at `:1522` and writing at `:1543-1547`

Problem:
Reads the profile, computes new absolute totals in JavaScript, writes them back. Two tabs completing sessions inside one round trip both read the same base and the second write clobbers the first, so a session's questions, correct answers and study time silently vanish from the aggregate.

Note the contrast that makes this a clear defect rather than a design choice: `xp_points` is safe, because `award_xp` does an atomic `xp_points = xp_points + xp_earned` in SQL. The correct pattern already exists in this codebase and was simply not applied to the sibling counters.

Distinct from SABI-REV-004, which is the same class of bug on the `sessions` table.

---

## SABI-REV-043: Streak milestone notifications are re-sent on every dashboard visit

Status: **open**
Severity: P1
Slice: Data layer
Category: Failure-window hygiene

Files: `lib/api.ts:1491-1509` (`updateUserStreak`); `lib/notifications.ts:30-44`; called from `app/(dashboard)/home/page.tsx:167-170` on every mount; `lib/api.ts:1930-1952` (bare INSERT, no dedup)

Problem:
`notifyStreakMilestone` fires on every successful call, gated only on `streak_count > 0` rather than on whether the streak actually changed. The SQL no-ops once the streak is already active for the day, so the count stays pinned at, say, 7 for the rest of that day.

Failure scenario: every reload of the dashboard while the streak sits on a milestone value inserts another "7-Day Streak" notification. A student who refreshes ten times gets ten notifications.

---

## SABI-REV-044: The streak measures dashboard visits, not learning

Status: **needs-decision**
Severity: P1
Slice: Data layer
Category: Correctness & contract fidelity

Files: `lib/api.ts:1491-1509`, whose sole call site is `app/(dashboard)/home/page.tsx:167-170`

Problem:
`updateUserStreak` is never called from any session-completion path. A student extends their streak by opening the home page without answering a single question. Conversely, a student who completes sessions via a deep link without visiting the home page that day does not advance it.

This is a product-semantics decision, not an obvious bug, and it needs deciding rather than inheriting. It matters more under the pivot: a parent reading a streak as evidence of study is reading a number that counts page loads.

---

## SABI-REV-045: The attempted-questions pool reset discards the entire history, far too early

Status: **open**
Severity: P1
Slice: Data layer
Category: Correctness & contract fidelity

Files: `lib/api.ts:3177-3191` (`selectQuestionsForSession`); `reset_user_attempted_questions` RPC

Problem:
The reset triggers on `remainingBefore === 0 || remainingBefore < count`, and the RPC unconditionally deletes every attempted row for that subject.

Failure scenario: a student has legitimately seen 960 of 1000 questions in a subject and starts a 50-question session. Because 40 is less than 50, their **entire 960-question history is discarded** rather than the 40-question shortfall being recycled. The next sessions immediately re-serve questions they saw minutes ago.

This gets worse as the bank grows, which is the opposite of what you want from the 30-year corpus.

---

## SABI-REV-046: `award_xp` has no per-session idempotency

Status: **open**
Severity: P1
Slice: Data layer
Category: Failure-window hygiene

Files: `supabase/migrations/20250125_fix_streak_and_add_xp.sql:246-247`; `lib/api.ts:1024-1060`

Problem: `xp_earned := correct_answers_count` carries no session-scoped guard, unlike the daily and streak bonuses which are correctly deduped. `completeSession` has no status guard either.

Underpins both SABI-REV-001 and SABI-REV-039. Fixing the call sites without fixing this leaves the door open.

Rebuild must preserve XP-per-correct-answer semantics while making the award idempotent per session, for example by passing a session id checked against a ledger.

---

## SABI-REV-047: duplicate-of SABI-REV-018

Status: **duplicate-of** SABI-REV-018
Slice: Data layer

The `notifications` INSERT policy `WITH CHECK (true)` was found independently by both the artifacts slice and the data-layer slice. Recorded here as confirmation from a second reviewer rather than as a new finding. The data-layer reviewer adds that the policy has no `TO` role restriction either, so the anon role may also reach it, and that `notifyStreakMilestone` runs client-side, which is a live browser-reachable write path.

---

## SABI-REV-048: The cron route writes through the browser Supabase client

Status: **open**
Severity: P2
Slice: Data layer
Category: Seam & boundary behavior

Files: `app/api/cron/daily-reminders/route.ts:6, 77-83`; `lib/api.ts` `createNotification` using the browser singleton from `lib/supabaseClient.ts`

Problem:
The route reads with `createServerClient()` but writes through `createNotification`, which internally uses the browser client that `CLAUDE.md` explicitly reserves for client components.

This currently appears to work only because of the unrestricted policy in SABI-REV-018. The moment that policy is tightened, notification writes start failing, and the failures are swallowed per-user into an `errors[]` array returned in the JSON of an unmonitored endpoint.

Compounds SABI-REV-015: the read side already returns nothing, so the write side has never been exercised.

---

## SABI-REV-049: Content caches are stale for up to 30 minutes with no invalidation path

Status: **open**
Severity: P2
Slice: Data layer
Category: Schema evolution safety

Files: `lib/api.ts:311-336`

Problem:
`subjectsCache` and `topicsCache` use a 30-minute TTL, `questionCache` five minutes. All are plain module-level Maps with no exposed invalidation function, and admin writes go through a separate server path that never touches them. After an admin renames or deactivates a subject or topic, an already-loaded student tab serves the stale version until the TTL expires or a hard navigation resets the module.

**Verified not a cross-user leak.** All three caches hold only public content (`Subject[]`, `Topic[]`, `Question[]`), never user-scoped rows, and `lib/api.ts` is imported into exactly one server route, which does not touch these caches. This closes a question the audit raised and could not answer.

---

## SABI-REV-050: `session.total_questions` can disagree with the questions actually delivered

Status: **open**
Severity: P2
Slice: Data layer
Category: Correctness & contract fidelity

Files: `app/(learning)/learn/configure/[subjectId]/page.tsx:204-213, 229-235`; `lib/api.ts:507-606, 614-723`

Problem:
The session row is created with the *requested* count before selection runs. Selection silently returns fewer questions when a pool is short, warning to the console rather than raising. So the persisted `total_questions` is the pre-selection request, while the delivered array can be shorter.

Scoring itself is safe because the UI divides by the actual array length, but any surface reading `session.total_questions`, including progress labels and admin analytics, disagrees with reality.

---

## Timezone finding, recorded precisely

The audit asked whether a Nigerian student studying late at night loses their streak. The answer is more specific than expected and worth keeping.

`update_user_streak` uses Postgres `CURRENT_DATE`, which is UTC, and no migration sets a timezone. WAT is UTC+1. So a student active at 23:30 WAT is at 22:30 UTC, the same UTC day, and the streak is **not** broken. The real mismatch window is **00:00 to 00:59 WAT**, when the server still considers it the previous day, so activity in that hour merges into yesterday's credit instead of starting a new day.

Narrow and low-frequency given Nigeria's small offset. Worth a deliberate decision to use `AT TIME ZONE 'Africa/Lagos'` rather than treating it as urgent.

---

## Semantics the rebuild must preserve or deliberately change

Consolidated from the data-layer review. This list is the most directly reusable output of the campaign.

- **Keep** `award_xp`'s atomic SQL increment as the pattern for every counter. It is the one place in the codebase that avoids the read-modify-write race correctly, and it should be generalized rather than discarded.
- **Keep** the once-per-day gating on the daily and streak XP bonuses. Correct in isolation; the bugs are in the calls around it.
- **Keep** `user_attempted_questions` with its `record_attempted_questions` and `reset_user_attempted_questions` RPCs. Unique constraint, upsert-with-increment, `SECURITY DEFINER`. This is the reference implementation the guest path should match, or the guest path should be dropped outright.
- **Decide** whether the streak tracks activity or app visits (SABI-REV-044).
- **Decide** the pool-reset threshold (SABI-REV-045).
- **Decide** whether proficiency is derived from `session_answers` or incrementally written (SABI-REV-041).
- **Decide** whether teaching fields may be written outside review (SABI-REV-029).

---

## Contradiction resolved: the cron's actual behaviour

Two reviewers disagreed. The artifacts slice said the cron short-circuits and sends nothing. The remainder-sweep slice said it spams every active student because the activity and dedupe checks are RLS-blocked.

**Re-derived against production** by reproducing the route's first query with the anon role:

```
GET /rest/v1/users?select=id,full_name,email&status=eq.active&role=eq.student
-> 200, content-range */0, body []
```

Zero rows. Execution never reaches the loop, so no notification is sent and no spam occurs. **The artifacts slice is correct**, and SABI-REV-015 is accurate as written.

The remainder-sweep analysis is not wrong, it is **forward-looking**, and it matters: it describes what happens the moment SABI-REV-015 is fixed. Recorded below as SABI-REV-051 so the fix is done completely rather than partially.

---

## SABI-REV-051: Fixing the cron client only partially will spam every student

Status: **open**
Severity: P1 (latent; becomes P0 the moment SABI-REV-015 is fixed)
Slice: Remainder sweep
Category: Seam & boundary behavior

Files: `app/api/cron/daily-reminders/route.ts:49-55, 63-69, 77-83`; `lib/api.ts:1937-1951`

Problem:
All three of the route's queries run under the anon role, not just the first.
- The "already practiced today" check on `sessions` is gated by `USING (auth.uid() = user_id)` and always returns zero rows, so the skip-if-already-practised logic is a no-op.
- The "already reminded today" dedupe check on `notifications` is gated identically and also always returns zero rows.
- The insert goes through `createNotification`, which uses the **browser** singleton, a third client. The insert itself succeeds because of the permissive policy in SABI-REV-018, but `createNotification` then does `.select().single()` to read the row back, that read is RLS-blocked, `.single()` throws PGRST116, and the cron's per-user catch logs it as an error even though the row was committed.

Failure scenario, once the users query is fixed but the rest is not: every active student is reminded daily regardless of whether they studied, any retry double-notifies because the dedupe is inert, and the JSON response reports errors on days when notifications actually went out.

Fix the whole route to one service-role client, and stop routing a server-only insert through the browser-client-backed helper.

---

## SABI-REV-052: The cron cannot finish at scale

Status: **open**
Severity: P1
Slice: Remainder sweep
Category: Workload realism

Files: `app/api/cron/daily-reminders/route.ts:46-89`; `vercel.json` (no `functions` config)

Problem: up to three sequential round trips per user inside a `for...of` loop, with no batching, no pagination and no `maxDuration`. At 10,000 students that is 20,000 to 30,000 sequential database calls. There is no cursor, so a run killed by the timeout leaves the remainder of the list unprocessed with no record of how far it got.

---

## SABI-REV-053: Admin components import the student design system, against an explicit project rule

Status: **open**
Severity: P1
Slice: Remainder sweep
Category: Correctness & contract fidelity

Files: `components/admin/BulkActionBar.tsx:5`, `BatchDeleteModal.tsx:4`, `BatchEditModal.tsx:4`, `DeleteConfirmModal.tsx:4`, `QuestionEditModal.tsx:4`, `QuickEditModal.tsx:4`, `ReviewCard.tsx:5,74`, `ReviewModal.tsx:4`, `ReviewProgress.tsx:4`, `SubjectFormModal.tsx:4`, `TopicFormModal.tsx:4`

Problem: `CLAUDE.md` states that `components/admin/ui/` is a parallel mini-system used to keep admin and student UIs visually distinct. Eleven admin components import `Modal` and `Card` from `components/common` instead of the `AdminDialog` and `AdminCard` that already exist for exactly this purpose.

A checkable violation of a written rule, not a stylistic preference.

---

## SABI-REV-054: The OAuth callback hand-rolls its own server client instead of the mandated helper

Status: **open**
Severity: P1
Slice: Remainder sweep
Category: Dead code & least surprise

Files: `app/auth/callback/route.ts:32-48` versus `lib/supabaseServer.ts`

Problem: `CLAUDE.md` requires server-side Supabase access to go through `createServerClient` from `lib/supabaseServer.ts`. The callback route builds its own client against `@supabase/ssr` with an inline cookie adapter. Two independently maintained implementations of the same thing, and they have already drifted: the callback route also mutates `request.cookies`, the shared helper does not.

Notable because this is recent code, not legacy debt.

---

## SABI-REV-055: Date formatting is inconsistent, and three files risk a hydration mismatch

Status: **open**
Severity: P2
Slice: Remainder sweep
Category: Correctness & contract fidelity

Files:
- Helpers, correctly using `en-NG`: `lib/utils.ts:88, 102, 108, 270`
- Hardcoded `en-US` at 11 call sites across dashboard, admin and learning pages
- **No locale argument at all**: `app/(dashboard)/home/page.tsx:1918`, `app/(admin)/admin/questions/page.tsx:516`, `app/(admin)/admin/questions/[questionId]/page.tsx:455, 461`

Problem: the project has centralized formatters set to `en-NG`, and almost nothing uses them. The concrete bug is the third group: `toLocaleDateString()` with no argument resolves the runtime's default locale, which can differ between the Node server render and the browser, producing a text mismatch and a React hydration error on first render.

For a Nigerian product, dates rendering as `en-US` throughout is also simply wrong.

---

## SABI-REV-056: `/server-example` ships to production, is unauthenticated, and always errors

Status: **open**
Severity: P2
Slice: Remainder sweep
Category: Dead code & least surprise

Files: `app/server-example/page.tsx:14, 21`

Problem: middleware gates only `/admin` and `/api/admin`, so this route is public. It queries a `todos` table that no migration creates, and renders the raw Supabase `error.message` to any visitor. Leftover scaffolding shipping as a live route, linked from no navigation.

---

## SABI-REV-057: Most of the notification API is dead, and the cron duplicates the one helper it needs

Status: **open**
Severity: P2
Slice: Remainder sweep
Category: Dead code & least surprise

Files: `lib/notifications.ts` (11 exports, 3 used); `notifyDailyReminder` at `:209-217`; duplicated inline at `app/api/cron/daily-reminders/route.ts:77-83`

Problem: only `notifyStreakMilestone`, `notifyAchievementUnlocked` and `notifyGoalAchieved` are called. The other eight are never invoked, though `NOTIFICATIONS_SYSTEM.md:81-96` documents them all as live. `notifyDailyReminder` is precisely what the cron needs, and the cron reimplements the same user-facing title and message inline instead. Two copies of the same student-facing text, free to drift.

---

## SABI-REV-058: Dead components and unused dependencies

Status: **open**
Severity: P3
Slice: Remainder sweep
Category: Dead code & least surprise

- `components/common/MultiSelectDropdown.tsx`: imported nowhere.
- `components/ui/switch.tsx`, `components/ui/textarea.tsx`: zero import sites.
- `@radix-ui/react-switch`: referenced only by the dead switch component.
- `@hookform/resolvers`: declared, no resolver import anywhere. Installed as a pair with the already-known unused `zod`, for schema-validated forms that were never wired up.
- `hooks/useLocalStorage.ts`: exported, never called. `lib/guest-session.ts:26-38` reimplements raw storage access instead of using the hook written for it.

---

## SABI-REV-059: `CLAUDE.md` is wrong in three ways, and it is the file most likely to be trusted

Status: **open**
Severity: P1
Slice: Remainder sweep, plus artifacts slice
Category: Docs & operational truth

Problems, consolidated:
1. **Wrong table name.** States a session is a row in `learning_sessions`. The real table is `sessions` (`20231216_initial_schema.sql:83`), used consistently in `lib/api.ts:822,879,931,946,989,1053` and elsewhere. `learning_sessions` appears nowhere except `CLAUDE.md` and `TESTING_CHECKLIST.md`. An agent trusting this writes `.from('learning_sessions')` and gets a runtime error. Also recorded as SABI-REV-024.
2. **Incomplete environment variables.** Omits `SUPABASE_SERVICE_ROLE_KEY` (needed by admin user creation and password reset) and `CRON_SECRET` (required by the cron route to authorize at all). Following the list as written leaves both features silently broken.
3. **Names a dead function as load-bearing.** States that admin routes call `verifyAdminRole`. They call `withAdminAuth`; `verifyAdminRole` has zero callers. Also recorded as SABI-REV-013.

This is the file the project explicitly tells AI agents overrides their defaults, which makes each error unusually expensive.

---

## SABI-REV-060: Root documentation contradicts the code in ways that will misdirect corpus work

Status: **open**
Severity: P2
Slice: Remainder sweep
Category: Docs & operational truth

- `API_REFERENCE.md:38` shows `createClientComponentClient` from `@supabase/auth-helpers-nextjs`, a package not in `package.json`. The project uses `@supabase/ssr`. Following the example gives a missing-module error.
- `README.md:311` names a migration file `admin_portal_schema.sql` that does not exist; the real one is `20241216_admin_schema.sql`.
- `ARCHITECTURE.md:27-31` documents `useAuth`, `useQuestions` and `useProgress` hooks. None exist; auth is a React context.
- `NOTIFICATIONS_SYSTEM.md:81-96` documents eight notification helpers as live that are never called.

Combined with SABI-REV-036 (`CSV_IMPORT_GUIDE.md` describing a different import pipeline than the one that exists), the pattern is consistent: the root markdown is a record of intentions, not of behaviour.

---

## Confirmed sound (Remainder sweep)

- **`pages/.gitkeep` is inert.** Verified against `next.config.ts`: no `pageExtensions` override, and the App Router only registers real page files. A directory holding one dotfile creates no Pages/App Router conflict. It can be deleted, but it is harmless.
- **Caches hold no user-scoped data**, confirmed independently by the data-layer slice (SABI-REV-049).

---

## SABI-REV-061: The dark theme is not wired up; every `dark:` class in the codebase is controlled by the device, not the app

Status: **open**
Severity: P0
Slice: Student UX
Category: Correctness & contract fidelity

Files: `tailwind.config.ts` (no `darkMode` key); `app/layout.tsx:29` (`<html lang="en" className="dark">`); `components/common/Modal.tsx:77`; `components/common/SignupPromptModal.tsx:97,101,106-107,116,121,131`; `components/common/BottomNav.tsx:41`

**Verified directly:**
```
darkMode key in tailwind.config.ts : ABSENT
tailwindcss version                : ^3   (default darkMode = 'media')
app/layout.tsx:29                  : <html lang="en" className="dark">
```

Problem:
Tailwind v3 defaults `darkMode` to `'media'`, which gates every `dark:` variant behind the **operating system's** `prefers-color-scheme`. The hardcoded `className="dark"` on `<html>` therefore does nothing. The dark-first architecture that `CLAUDE.md` documents, and that the design system assumes, is not actually switched on.

Two concrete consequences, both on high-traffic surfaces:

1. **`BottomNav.tsx:41`** is `bg-white/95 dark:bg-black/95`. On any tablet whose OS theme is light, which is a common default, the persistent bottom navigation renders as a white bar fixed over every `bg-slate-950` dashboard page.

2. **The guest signup modal is illegible on dark-themed devices.** `Modal.tsx:77` hardcodes `bg-white` with no dark variant, while `SignupPromptModal` layers `dark:text-white` and `dark:text-slate-300` on top. On a device with OS dark mode the text classes activate while the shell stays white, giving white text on a white modal. This modal is the primary guest-to-signup conversion point, firing after five questions.

A one-line config change (`darkMode: 'class'`) makes every `dark:` variant in the codebase start behaving as written, which is both the fix and the risk: it will change the appearance of many screens at once and needs a visual pass afterwards.

---

## SABI-REV-062: The entire learning flow is light-themed inside a dark app

Status: **open**
Severity: P0
Slice: Student UX
Category: Correctness & contract fidelity

Files: all 13 files under `app/(learning)/` contain light-theme classes. Notably `practice/[sessionId]/page.tsx:727,738,756,783,809,811`; `test/[sessionId]/page.tsx:451,462,484,511,552,737,739`; `timed/[sessionId]/page.tsx:870,881,903,987,989`; `results/[sessionId]/page.tsx:445,456,591` plus roughly 150 `text-gray-*` occurrences through line 1763; `learn/configure/[subjectId]/page.tsx:320,335,350`

Problem:
These files are not missing `dark:` variants, they are built light: `bg-gray-50`, `bg-white`, `from-slate-50 to-white`, `text-gray-900`.

`results/[sessionId]/review/page.tsx:296` is correctly `bg-slate-950`, which proves the inconsistency is accidental rather than a deliberate light focus mode.

User impact: a student browses a dark dashboard, taps Start Practice, and the entire session, hints, solutions and results render as a white app. The most-used surface in the product looks like a different, unfinished product.

**Corrects an earlier claim.** `BLOCKS-AUDIT.md` reported one light-theme leftover, the `mode-select` stub. The real number is the whole learning flow. My original sweep looked at the file I had already opened rather than sweeping the directory, which is exactly the failure mode this campaign's slicing exists to catch.

---

## SABI-REV-063: A wrong first answer produces no feedback at all

Status: **open**
Severity: P1
Slice: Student UX
Category: Correctness & contract fidelity

Files: `app/(learning)/practice/[sessionId]/page.tsx:493-497`; `components/common/QuestionDisplay.tsx:130-139`

Problem:
On a wrong first attempt the handler returns early to allow a retry, leaving `isAnswered` false, so `showCorrectAnswer` stays false and `QuestionDisplay` never enters its result state. The clicked option receives the ordinary selected highlight, identical to an in-progress selection.

The student sees no red, no icon, no message. Nothing distinguishes "you got that wrong, try again" from "you have not answered yet."

This is the core interaction of practice mode, on the exact mechanic that makes first-attempt accuracy meaningful, and it gives the learner no signal.

---

## SABI-REV-064: Four screens show confidently wrong data when a fetch fails

Status: **open**
Severity: P1
Slice: Student UX
Category: Failure-window hygiene

Files: `app/(dashboard)/achievements/page.tsx:274-278`; `analytics/page.tsx:124-128`; `history/page.tsx:85-89`; `profile/page.tsx:88-92`. None contains any `setError` or error UI.

Problem, per screen, on a dropped request, which is routine on metered mobile data:
- `profile/page.tsx:136-143` renders **"User not found"** to a signed-in student, with no retry.
- `history/page.tsx:373-378` renders *"You haven't completed any sessions yet"* to a student who has completed sessions.
- `achievements` renders zero badges earned as though that were the truth.

The correct pattern already exists in this codebase, in `subjects`, `topics/[subjectId]`, `learn`, `profile/edit` and `profile/settings`. These four simply do not use it.

Telling a paying customer's child that their account does not exist is the worst of these.

---

## SABI-REV-065: Question navigator touch targets are roughly half the minimum size

Status: **open**
Severity: P1
Slice: Student UX
Category: Workload realism

Files: `components/common/QuestionNavigator.tsx:125` (bottom variant, `w-7 h-7 sm:w-8 sm:h-8`, so 28 to 32px); `:260` (floating variant, `w-5 h-5 sm:w-6 sm:h-6`, so 20 to 24px)

Problem: both are well under the 44px guideline, and students tap these repeatedly to move between 20 to 40 questions on a tablet.

---

## SABI-REV-066: `getRandomQuestions` downloads an entire topic's question bank to pick twenty

Status: **open**
Severity: P1
Slice: Student UX
Category: Workload realism

Files: `lib/api.ts:364-371`

Problem:
```ts
.from('questions').select('*').eq('status','published').eq('topic_id', topicId)
```
No `.limit()`. Every published question for the topic is downloaded in full, including `question_text`, `passage`, all three hints, `explanation`, `solution` and image URLs, then sampled client-side down to twenty. The five-minute in-memory cache is lost on every fresh load, which is normal tablet usage.

On metered Nigerian mobile data this is the single most expensive thing the app does, and it scales linearly with the 30-year corpus. It is the concrete cost behind the architectural point that selection must move server-side.

---

## SABI-REV-067: Six more dead redirect stubs, each adding a round trip and a white flash

Status: **open**
Severity: P2
Slice: Student UX
Category: Dead code & least surprise

Files: `practice/topic-select/[subjectId]/page.tsx:16`; `practice/exam-style/[subjectId]/page.tsx:16`; `practice/confirm/page.tsx:19`; `test/topic-mix/[subjectId]/page.tsx:16`; `test/exam-style/[subjectId]/page.tsx:16`; `test/instructions/[subjectId]/page.tsx:16`

Problem: a repo-wide search found no inbound links to any of them. Each performs an extra `getTopic` or `getSubject` call and shows a light-theme loader before redirecting to `learn/configure/[subjectId]`, which is confirmed as the real entry point.

Extends the known `mode-select` stub to seven dead redirect pages in total.

---

## SABI-REV-068: `/settings` is light-themed, reachable, and its Dark Mode toggle does nothing

Status: **open**
Severity: P2
Slice: Student UX
Category: Dead code & least surprise

Files: `app/(dashboard)/settings/page.tsx:108` (light root), `:93, 169-174` (the toggle); linked from `lib/navigation-config.ts:74` via `NavigationDrawer`

Problem: students reach this page from the navigation drawer. It is fully light-themed, and its Dark Mode switch is local `useState(false)` with no theme provider, no persistence and no effect anywhere in the codebase. Flipping it does nothing at all.

A settings toggle that visibly does nothing is worse than no toggle, and it sits next to SABI-REV-061, where the actual theme mechanism is unwired.

---

## Confirmed sound (Student UX)

Checked and found genuinely well done, which is worth recording because it calibrates the rest.

- **Alt text is rendered.** `QuestionDisplay.tsx:100` outputs `question.image_alt_text` with a sensible fallback. The schema field is actually used.
- **Correct and incorrect are not signalled by colour alone.** `QuestionDisplay.tsx:152-158` pairs colour with a check or cross icon, so colourblind students are fine.
- **Wide results tables scroll rather than break.** Both tables at `results/[sessionId]/page.tsx:304-306, 1105-1107` are wrapped in `overflow-x-auto` with a `min-w`.
- **The first-session empty state is good.** `home/page.tsx:1999-2038` is a proper dark-themed "Ready to Begin?" call to action for a brand-new student, which is the most important moment in the product.
- The `bg-white` occurrences at `home/page.tsx:863,869,876,1205,1789` are deliberate white buttons inside dark gradient cards, not theme leaks.

---

## SABI-REV-069: Every scoring RPC is callable by any client with arbitrary parameters

Status: **open**
Severity: P0
Slice: Scoring and progress
Category: Security-adjacent contract check

Files: `supabase/migrations/20250125_fix_streak_and_add_xp.sql:225-276` (`award_xp`), `:282-348` (`check_and_award_mastery_badges`); `supabase/migrations/20250121_user_goals_schema.sql:55-96` (`update_goal_progress`)

Problem:
None of the three functions checks `auth.uid() = user_uuid`, and no migration anywhere contains a `GRANT` or `REVOKE` statement, verified by grep across all 16 files.

Failure scenario: any signed-in student runs
```js
supabase.rpc('award_xp', { user_uuid: '<any user>', correct_answers_count: 999999 })
```
from the browser console and inflates XP for themselves or anybody else, without answering a question.

This is the same hole as SABI-REV-018 and the achievements one below, at the function layer rather than the table layer. Worth fixing as one pattern rather than three patches, because **a v2 "record first-attempt accuracy" RPC written in the same style inherits the identical hole**, and that RPC is the one a parent pays to trust.

---

## SABI-REV-070: Achievements can be self-awarded; the policy checks ownership, not eligibility

Status: **open**
Severity: P0
Slice: Scoring and progress
Category: Security-adjacent contract check

Files: `supabase/migrations/20231216_initial_schema.sql:257-258`; eligibility logic at `lib/api.ts:1640-1674`

Problem: the INSERT policy is `WITH CHECK (auth.uid() = user_id)`, which verifies only that you are inserting for yourself. The "did they earn it" logic runs entirely in the browser and is advisory. RLS never revalidates `requirement_type` or `requirement_value`.

Failure scenario: a student inserts any `achievement_id` for themselves from dev tools and it succeeds, regardless of activity.

---

## SABI-REV-071: First-attempt accuracy is not recoverable from practice-mode history, by construction

Status: **needs-decision**
Severity: P0
Slice: Scoring and progress
Category: Correctness & contract fidelity

Files: `app/(learning)/practice/[sessionId]/page.tsx:494-497, 500-533, 1102, 117-171`

**This is the most important finding of the campaign for the pivot.**

Problem:
Practice mode returns early on a wrong answer **without ever calling `createSessionAnswer`**. The Next button stays disabled until `isAnswered`, which only becomes true once a *correct* answer has been persisted. Three consequences:

1. **No row is ever written for a question the student got wrong and never got right.** Not recorded as incorrect. Genuinely absent from `session_answers`.
2. Any retrospective `SUM(first_attempt_correct)/COUNT(*)` is therefore biased toward students who eventually succeeded. **Survivorship bias is baked into the write path, not the query**, so no smarter SQL can recover it.
3. Practice-mode session accuracy is tautological: retry-until-correct forces `correct_answers` toward `questions_answered` for anyone who finishes, independent of ability.

**Recoverability by mode, for migration planning:**

| Mode | First-attempt data | Usable? |
|---|---|---|
| Test | `attempt_count: 1, first_attempt_correct: isCorrect` written at submit (`test/[sessionId]/page.tsx:404-415`) | Yes, reliable |
| Timed | Written on first answer, preserved by the upsert on later changes (`timed/[sessionId]/page.tsx:658-678`) | Yes, modulo SABI-REV-072 |
| Practice | Wrong answers never persisted | **No** |
| Anything before 2025-01-20 | `first_attempt_correct`, `attempt_count`, `solution_viewed_before_attempt` are all NULL | No signal at all |

Decision needed: seed the v2 backfill from test and timed history only and exclude practice, or start proficiency from zero. Either is defensible. Silently averaging practice history into a parent-facing number is not.

---

## SABI-REV-072: A page reload falsifies first-attempt correctness in the student's favour

Status: **open**
Severity: P1
Slice: Scoring and progress
Category: Concurrency & state ordering

Files: `app/(learning)/practice/[sessionId]/page.tsx:59-60, 117-171`

Problem: `attemptCounts` and `firstAttemptCorrect` are plain `useState` maps, rehydrated only from already-persisted rows. Because a wrong first attempt is never persisted (SABI-REV-071), there is nothing to rehydrate for the question currently open. A reload between a wrong attempt and the eventual correct one resets the counter, and the next answer is written as attempt 1 with `first_attempt_correct = true`.

Narrow window, only the actively-open question, but it falsifies the headline metric in precisely the direction that flatters the student.

---

## SABI-REV-073: The achievements system has never awarded anything to anyone

Status: **open**
Severity: P1
Slice: Scoring and progress
Category: Dead code & least surprise

Files: `lib/api.ts:1640-1674` (`checkAndAwardAchievements`), `:1597-1635` (`awardAchievement`), both with zero callers; `app/(dashboard)/achievements/page.tsx:298-299`

Problem: neither function is invoked anywhere in application code. The achievements page renders a hardcoded local list and checks earned status against `getUserAchievements`, which returns an empty array for every account, permanently.

A fully built, fully wired-looking feature that has never fired once.

---

## SABI-REV-074: Goals never reset; an achieved goal is frozen forever

Status: **open**
Severity: P1
Slice: Scoring and progress
Category: Dead code & least surprise

Files: `supabase/migrations/20250121_user_goals_schema.sql:99-124` (`reset_periodic_goals`, zero callers), `:76-78` (early return once achieved); `vercel.json` schedules only the daily-reminders route

Problem: nothing ever calls the reset function, and `update_goal_progress` returns early once `achieved = TRUE` with no way to un-achieve or roll the period. A daily or weekly questions goal that is hit once stays achieved with `current_value` frozen, and never becomes trackable again.

A student who sets "30 questions a day" and hits it once sees that goal permanently complete from then on.

---

## SABI-REV-075: Goals are a second, independent accumulator that cannot be reconciled

Status: **open**
Severity: P1
Slice: Scoring and progress
Category: Correctness & contract fidelity

Files: `supabase/migrations/20250121_user_goals_schema.sql:55-96`

Problem: `user_goals.current_value` is a blind accumulator fed the same client-supplied deltas as the user counters, but never derived from `session_answers`, `sessions` or `user_progress`. It drifts from the dashboard whenever completion runs more than once (SABI-REV-039, SABI-REV-001) or races across tabs, and **neither counter can be reconciled against the underlying rows, because neither is computed from them.**

The rebuild's fix is structural: derive reported numbers from the answer rows rather than accumulating them alongside.

---

## SABI-REV-076: `solution_viewed_before_attempt` is written and never read

Status: **open**
Severity: P2
Slice: Scoring and progress
Category: Dead code & least surprise

Files: `lib/api.ts:1219` (the only write); the column definition; the TypeScript type

Problem: verified by grep across the repo, there are no readers. This is the single most pedagogically valuable column in the schema, distinguishing a student who thought before looking from one who looked first, and nothing consumes it.

For the stated policy that assisted sessions must be labelled rather than scored, this column is exactly the signal needed. It already exists and is already populated.

---

## SABI-REV-077: Analytics silently truncates "All time" to the most recent 1000 sessions

Status: **open**
Severity: P2
Slice: Scoring and progress
Category: Workload realism

Files: `lib/api.ts:1683-1716`; `app/(dashboard)/analytics/page.tsx:90-118`

Problem: `getAnalytics` fetches at most 1000 sessions, then filters client-side by date. Selecting "All" shows the most recent 1000 with no indication anything was dropped. `user_progress` would have been the schema-appropriate bounded source for true all-time aggregates, but it is never written (SABI-REV-041).

At the stated 30-year scale the payload never actually grows to match the history. It quietly stops representing it.

---

## What consumes the pedagogical signals today

The audit's central question, answered precisely. All four columns are written on every answer.

| Column | Readers |
|---|---|
| `hint_used`, `solution_viewed` | Same-session summary counts on the results page (`results/[sessionId]/page.tsx:141-143, 514-515`) and gating hint text in review (`.../review/page.tsx:584`). Never scored, never aggregated across sessions |
| `hint_level`, `attempt_count` | Rehydrating in-session UI state on resume (`practice/[sessionId]/page.tsx:143-162`). Never shown to the student, never read by analytics, goals, XP or badges |
| `solution_viewed_before_attempt` | **None. Written, never read** |
| `first_attempt_correct` | The one real reader: the single-session results screen, prominently ("X out of Y correct on first try"). Never rolled into analytics, goals, XP or mastery |

The instinct that built this schema was right. Nothing downstream uses it.

---

## What each number actually measures

| Metric | Computed from | Actually measures | Verdict |
|---|---|---|---|
| XP | 1 per client-supplied correct answer, +2 daily, +1 streak | Correct-answer volume plus logging in | Not ability. Forgeable via SABI-REV-069 |
| Streak | Last-active date arithmetic | Login cadence | Honest, and correctly never claimed as ability. But see SABI-REV-044: it counts dashboard visits, not study |
| Mastery badge, global | XP threshold | Cumulative XP tier | Gamification. Forgeable, and the table has no RLS |
| Mastery badge, per subject | `SUM(user_progress.questions_correct)` | Intended per-subject volume | **Dead.** `user_progress` is never written, so the sum is always zero and no one can ever earn one |
| Topic progress % | `user_progress.accuracy_percentage` | Intended per-topic accuracy | **Dead.** Permanently null for every user |
| Session accuracy, practice | `correct_answers / questions_answered` | Nothing useful, retry-until-correct forces it toward 100% | **Not a valid measure** |
| Session accuracy, test and timed | Same ratio, no forced retry | Real correctness | Meaningfully valid |
| First-attempt correct | Client-tracked boolean | The metric the pivot wants | Right idea, never aggregated, and absent for practice-mode failures |

Note: `user_stats` is not a table. `UserStats` is a TypeScript shape computed from columns on `users`.

---

# Decisions register

Ratified by Orezi, 2026-08-24. These resolve the `needs-decision` entries above and set the scope of work.

## D1: Live-app scope, only the forgery holes

**Resolves:** the triage of 14 P0 findings on a codebase being replaced.

**Decision:** fix the five write-side authorization gaps as one pattern (R0 in `RETROFIT.md`). Everything else on the live app is deliberately left.

**Covers:** SABI-REV-069, SABI-REV-002, SABI-REV-070, SABI-REV-018, SABI-REV-019.

**Accepted risk**, explicitly and with eyes open. These stay live until v2 replaces them:
- The daily-reminder cron continues to do nothing (SABI-REV-015).
- Guests continue to see repeated questions (SABI-REV-040).
- Per-topic progress, achievements and goal resets stay inert (SABI-REV-041, 073, 074).
- Session completion stays non-idempotent and daily challenges keep double-awarding XP (SABI-REV-001, 039). Tolerable because D2 discards the resulting numbers anyway.
- The learning flow stays light-themed and the signup modal stays illegible on dark devices (SABI-REV-061, 062). **This one is worth revisiting** if guest conversion matters before v2 ships, because it is a one-line config change plus a visual pass.

**Rationale:** the authorization pattern is the one thing that must be right before v2 copies it. Everything else is being deleted.

## D2: Start proficiency from zero, keep the raw history

**Resolves:** SABI-REV-071, and the pollution from SABI-REV-001 and SABI-REV-039.

**Decision:** migrate `sessions` and `session_answers` as an archive. Compute no proficiency, no XP and no badge state from them. Every parent-facing number in v2 starts clean.

**Consequences to plan for:**
- Students lose visible progress at cutover. This needs a communication, not just a migration script.
- The archive is still worth keeping: it is the only record of which questions a student has seen, which feeds non-repetition on day one of v2.
- No backfill code to write, which removes a whole class of subtle bias from the launch.

**Rationale:** a number a parent pays to trust cannot be seeded from data known to be inflated and structurally biased.

## D3: Direct edits for humans, review only for generated content

**Resolves:** SABI-REV-029.

**Decision:** a named admin may edit teaching fields inline. Anything a model produced must pass the approval gate.

**Implications for the pipeline design:**
- The gate in `QUESTION-PIPELINE.md` applies to W3 output, not to human authorship.
- Provenance becomes load-bearing: every teaching field needs to record whether it was generated or human-authored, because that flag is now what decides which path it must take. `question_reviews` already records `model_used`, so the shape exists; the `questions` row needs the same distinction.
- A human edit to a generated field converts it to human-authored. That transition must be recorded, or a later regeneration silently overwrites someone's correction.

**Rationale:** puts the gate where the actual risk is, and keeps a one-word typo fix from costing a review cycle.
