# Building-blocks audit: SabiPrep, 2026-08-24

Audit of the live application at `sabiprep.ng` against the 47 Vibe Engineering blocks, web-app profile. No code was changed to produce this document. Every verdict cites evidence.

## Urgent

### U1. The question bank and its answers are readable by anyone, with no account

Verified against production using only `NEXT_PUBLIC_SUPABASE_ANON_KEY`, the key that ships inside the browser bundle:

```
GET /rest/v1/questions?select=id,correct_answer,solution  ->  200
total rows readable anonymously: 1023
```

No session, no login, no referer check. The `questions` table has an RLS policy that permits anonymous read of every column including `correct_answer`, `solution`, `hint1`, `hint2` and `hint3`.

**Judgement:** for the current product this is a moderate commercial concern rather than a security breach, because WAEC and JAMB past papers with answers are sold openly in Nigeria. It becomes serious at the point where the bank contains generated variants, authored principle explanations, and technique content, none of which exist elsewhere. Fix before that content lands, not after.

### U2. `mastery_badges` and `user_mastery_badges` have no RLS at all

Of 20 tables created across the 16 migration files, 18 have `ENABLE ROW LEVEL SECURITY`. These two do not.

```
GET   /rest/v1/user_mastery_badges   -> 200, 13 rows, 5 distinct user_id values leaked
PATCH /rest/v1/user_mastery_badges?id=eq.<nonexistent>  -> 200   (not 401/403)
```

The PATCH probe used a filter matching zero rows, so nothing was modified, but the response proves anonymous writes are permitted. Any visitor can read other users' badge records and forge their own.

**Fix:** enable RLS on both tables with owner-scoped policies. Small migration, high value.

### U3. Grading is performed in the browser and the verdict is written straight to the database

```
app/(learning)/practice/[sessionId]/page.tsx:472
  const isCorrect = answer === currentQuestion.correct_answer;

lib/api.ts:1214
  is_correct: params.isCorrect,
```

`app/api/` contains only `admin/` and `cron/`. There is no student-facing API surface whatsoever; every student action goes browser to Supabase directly. Correctness, XP, streaks and progress are all client-asserted.

**Judgement:** this is the finding that blocks the parent and school product. A score computed on the child's device is a claim, not a measurement, and the entire commercial proposition of the pivot is selling that measurement to an adult.

## Snapshot

Profile: web app / SaaS · Stack: Next.js 16, React 19, Supabase (Postgres + Auth), Tailwind, deployed on Vercel
Scale: 200 TypeScript files, 55,355 lines, 16 migrations, 20 tables, 1,023 questions live

Blocks (as of the 2026-09-16 re-audit, 76 in the matrix): 10 ok · 19 partial · 35 missing · 12 n/a
Prior line, 2026-08-24, covering the 47 blocks that existed then: 11 ok · 9 partial · 19 missing · 8 n/a
House rules: 1 ok · 3 partial · 2 missing · 2 n/a

## Findings

| # | Block | Status | Evidence | Risk if left |
|---|---|---|---|---|
| 01 | Plan first | 🟡 partial | 40+ root markdown files, most stale; `CLAUDE.md` accurate | Plans exist but are not trusted, so they get ignored |
| 03 | Git | ✅ ok | Clean history, accurate `.gitignore` covering `.env*` and `.vercel` | |
| 04 | Lockfiles | ✅ ok | `package-lock.json` committed, exact versions | |
| 06 | Env vars | ❌ missing | 8 distinct `process.env.*` reads scattered across `lib/`, `app/api/`, `middleware.ts`; no config module | A missing variable fails at runtime in one route rather than at boot |
| 07 | Secrets | ✅ ok | No hardcoded credentials found in source or history | |
| 08 | CLAUDE.md | ✅ ok | Present and accurate about the current stack | |
| 11 | Modularity | ❌ missing | `lib/api.ts` is **3,305 lines**; 19 files exceed 600; `home/page.tsx` is 2,159 | Every change risks unrelated breakage; no one can review a diff in context |
| 12 | Separation | 🟡 partial | Business logic sits inside page components; `lib/api.ts` mixes data access and rules | Logic cannot be tested or reused server-side |
| 13 | JSON validation | ❌ missing | No response shape validation on any external call | Malformed upstream data propagates silently |
| 14 | SQL | 🟡 partial | 38 occurrences of `select('*')` | Over-fetching; schema changes leak into every caller |
| 15 | Data modeling | ✅ ok | Normalised, id-linked, no obvious duplication | |
| 16 | Migrations | 🟡 partial | 16 versioned files, but applied by hand via the Dashboard SQL Editor | No record of what is actually applied; drift is invisible |
| 17 | Transactions | 🟡 partial | 13 `.rpc()` calls suggest some server-side functions; multi-step writes from the client are not atomic | Partial writes on a dropped connection |
| 18 | Indexing | 🟡 partial | Indexes present in migrations; not verified against real query plans | Slow at 30-year bank size |
| 19 | N+1 | 🟡 partial | Client-side loops over questions in selection code | Multiplies with bank size |
| 21 | TLS | ✅ ok | Vercel enforces HTTPS on `sabiprep.ng` | |
| 22 | Input validation | ❌ missing | `zod` is in `package.json` and imported by **0 files** | Every API boundary trusts its input |
| 23 | XSS | ✅ ok | No `dangerouslySetInnerHTML` anywhere | |
| 24 | CSRF | 🟡 partial | Supabase cookie sessions; no explicit CSRF posture documented | |
| 25 | CORS | ✅ ok | No custom CORS headers; no wildcard | |
| 27 | Hashing | ✅ ok | Supabase Auth owns password storage | |
| 28 | Authentication | ✅ ok | Supabase Auth, httpOnly cookies via `@supabase/ssr` | |
| 29 | Authorization | 🟡 partial | 29 of 30 admin routes are guarded by `withAdminAuth`; `middleware.ts` gates `/admin` and `/api/admin`; RLS on 18 of 20 tables. **But** `PUT /api/admin/users/[userId]` omits `allowedRoles`, so it defaults to admin **and tutor**, and the `status` field is ungated (see SABI-REV-008) | A tutor can suspend an admin |
| 30 | Brute force | ❌ missing | No lockout or cooldown beyond Supabase defaults | |
| 31 | Timeouts | 🟡 partial | `fetchWithRetry` covers admin calls with AbortController; student-side Supabase calls have none | A hung request hangs the session |
| 32 | Retry | ✅ ok | `fetchWithRetry` and the Anthropic client both back off | |
| 34 | Error handling | 🟡 partial | Errors caught, but 501 raw `console.*` sites and no user-facing strategy | |
| 35 | Race conditions | ❌ missing | Client-side read-modify-write on `user_progress` and session counters | Two tabs produce wrong totals |
| 36 | Background jobs | ❌ missing | AI review runs inline in the request (60s and 120s timeouts) | Request-bound slow work |
| 37 | Caching | 🟡 partial | `STATIC_CACHE_TTL` in `lib/api.ts` for subjects | |
| 38 | Rate limiting | ❌ missing | No implementation found anywhere | Paid AI endpoints have no spend ceiling |
| 39 | Pagination | ❌ missing | **0** uses of `.range()` in a 3,305-line data layer | Breaks at 30-year bank size |
| 40 | Error tracking | ❌ missing | No Sentry or equivalent | Production failures are invisible |
| 41 | Structured logs | ❌ missing | 501 `console.*` call sites, no request or user id | Nothing is correlatable |
| 42 | Testing | ❌ missing | Zero test files in the repo | |
| 43 | CI/CD | 🟡 partial | Vercel auto-deploys on push; no `.github/`, nothing gates a bad commit | A broken push reaches production |
| 44 | Domain & DNS | ✅ ok | `sabiprep.ng` live with HTTPS | |
| 45 | Unified interface | 🟡 partial | `lib/ai/anthropic-client.ts` is close to an adapter but Anthropic-specific | Blocks the stated model-agnostic goal |
| 46 | Playwright | ❌ missing | No e2e tests | |

N/A for this project: 05 (venv, JS stack), 20 (relational is correct), 26 (no user-URL fetching), 33 (no heavy external deps at runtime), 47 (situational), 02 and 09 and 10 (process blocks, assessed in the plan instead).

## Product-logic findings

These are not security blocks, but they determine whether the rebuild succeeds.

**P1. Scoring discards every signal it collects.** `session_answers` records `hint_level`, `solution_viewed`, `solution_viewed_before_attempt`, attempt counts and first-attempt correctness. `awardXP(userId, correctAnswersCount)` then calls `award_xp` with the correct-answer count alone. Because practice mode allows retry until correct, that count trends toward 100% for every student regardless of ability. The right data is captured and thrown away at the moment of scoring.

**P2. Question selection uses a biased shuffle, 11 times.** `sort(() => Math.random() - 0.5)` is not a uniform shuffle; it measurably favours certain positions. Appears throughout `getRandomQuestions`, `getRandomQuestionsFromTopics` and `getQuestionsWithDistribution`.

**P3. Selection happens in the browser.** Candidate questions are fetched to the client and shuffled there. At 1,023 questions this is survivable. At a 30-year WAEC and JAMB bank it means shipping megabytes to a tablet on mobile data to choose 20 questions.

**P4. The three learning modes are three near-duplicate pages.** `practice` (1,247 lines), `test` (1,046) and `timed` (1,345) differ in a small number of behavioural switches but share no implementation. Roughly 2,500 lines of duplicated session logic.

**P5. The mode chooser is dead code.** `mode-select/[topicId]/page.tsx` is a 45-line stub marked "Legacy page, deprecated as of the learning flow optimization" that redirects to `learn/configure/[subjectId]`, which offers only question count and time limit. The three modes are reachable only by direct URL. The stub also renders a light-theme loading screen inside a dark-first app.

**P6. "Mastery" is already taken.** `mastery_badges` holds XP-threshold gamification (`{"name":"Novice","level":1,"xp_requirement":0}`), which is not topic diagnostics. The planned mastery map needs a different name, or these badges do.

**P7. Timed mode uses arbitrary per-question seconds.** 15, 30, 45 or 60 seconds per question, unrelated to the real time allowance of a WAEC or JAMB paper.

**P8. `PremiumStatus` is a dead type.** `types/user.ts` declares `'free' | 'trial' | 'premium' | 'expired'`, imported by nothing, backed by no column in any migration. Billing is entirely greenfield.

**P9. No PWA.** No manifest, no service worker, no offline capability of any kind.

## What is already good

Worth stating plainly, because it calibrates trust in everything above.

- **Authorization is well built in structure.** Three layers: `middleware.ts` gating at the edge, `withAdminAuth` inside 29 of 30 admin routes, and RLS policies in the database. The belt-and-braces approach is correct and rare. One correction to an earlier draft of this document: the guard in use is `withAdminAuth`, not `verifyAdminRole`. `verifyAdminRole` is exported from `lib/api/admin-auth.ts:33-77` and has **zero callers**; `withAdminAuth` reimplements the same logic inline. `CLAUDE.md` states that admin routes call `verifyAdminRole`, which is not accurate and should be corrected so no one treats that function as load-bearing.
- **Auth uses a maintained library.** Supabase Auth with `@supabase/ssr` and httpOnly cookies, rather than hand-rolled sessions. Blocks 27 and 28 are satisfied properly.
- **The retry helper is well designed.** `fetchWithRetry` with AbortController timeouts and calibrated windows (10s lists, 60s AI review, 120s batch) shows real operational thinking.
- **The pedagogical data model is ahead of the scoring.** Three-level progressive hints, per-question attempt counts, and `solution_viewed_before_attempt` are the right things to record. The instinct was correct; only the use of the data is missing.
- **The design system is coherent.** `components/magic/` is a real system, dark-first and consistently applied.
- **No XSS surface.** Zero `dangerouslySetInnerHTML` across 200 files.
- **The admin content pipeline is the best-engineered part of the application, by a distance.** Sixteen admin pages, 30 API routes and 31 components implement CSV import with validation, staged import reports with bulk actions, AI generation of hints, solutions and explanations held as *proposals* pending human approval, batch review, review history, image upload, and passage handling for English comprehension. The `question_reviews` table records the approver, the rejection reason, and the model used per proposal. Generate, hold, approve, publish is the correct shape and it is already built. The rebuild should carry this forward rather than replace it.
- **Accessibility is enforced at import.** `import/validate/route.ts:259-268` rejects a question that supplies an image URL without alt text. That is a deliberate, unusual, and correct choice. Note the limit found later in the campaign: the *database* constraint meant to back this up does not actually enforce it (SABI-REV-022), so non-import paths can still create an image question with no alt text.

**Two caveats on the pipeline praise above, both found in the slice review and recorded in `LEDGER.md`.** The approval gate is a parallel workflow rather than a structural gate, because `quick-update` and the edit form write teaching fields directly without review (SABI-REV-029). And four P0 defects sit in the import path itself: validation writes live topics during what it calls a dry run, the import cannot resume, the `validRowsOnly` flag is ignored, and duplicate detection is broken three ways (SABI-REV-025 through 028). The architecture is right. The implementation needs work before the corpus goes through it.

---

# Re-audit, 2026-09-16

Method: six read-only auditors, one per block family plus one for the layers, each in a clean
context. Every verdict below was re-opened against the source by the composing session before it
was written here. No code was changed. Two probes are noted as unrun at the foot.

## Urgent

Three new. None of them appears in the 2026-08-24 audit or in the 77 findings in `LEDGER.md`.

### N1. Six `SECURITY DEFINER` functions accept a target user id with no `auth.uid()` check

The 2026-08-24 pass looked at three scoring RPCs. A full sweep of all 26 function definitions
across the 17 migrations finds the same shape in six, and **the pending migration
`20260916_lock_down_scoring_writes.sql` closes only one of them**.

| Function | Migration | What an arbitrary caller can do |
|---|---|---|
| `reset_user_attempted_questions(p_user_id, p_subject_id)` | `20250127` | `DELETE FROM user_attempted_questions WHERE user_id = p_user_id`. Wipes any student's entire attempted-question history for a subject |
| `record_attempted_questions(p_user_id, p_subject_id, p_question_ids)` | `20250127` | Pollutes any student's history, marking questions attempted that they never saw |
| `get_attempted_question_count(p_user_id, p_subject_id)` | `20250127` | Reads any student's progress volume |
| `get_unattempted_questions(p_user_id, ...)` | `20250127` | Reads any student's remaining pool |
| `mark_all_notifications_read(p_user_id)` | `20250121` | Clears any user's notification feed |
| `update_goal_progress(user_uuid, ...)` | `20250121` | Rewrites any user's goal progress. **This is the only one the pending migration fixes** |

No migration before 2026-09-16 contains a single `GRANT` or `REVOKE`, verified by grep across all
17 files, so `EXECUTE` sits at Postgres's PUBLIC default and Supabase exposes `public`-schema
functions as PostgREST RPC.

**Why this one matters most.** Decision D2 keeps `sessions` and `session_answers` as an archive
precisely because it records which questions each student has already seen, and that feeds
non-repetition from day one of v2. `reset_user_attempted_questions` lets any caller destroy the
one asset D2 exists to preserve.

Also unguarded, found in the same sweep and outside the pattern above because it takes no
arguments: **`reset_periodic_goals()`** is `SECURITY DEFINER` with no auth check and zeroes
`current_value`, `achieved` and `achieved_at` for **every user in the database** in one call.

### N2. A caller-supplied `batchSize` sets the ceiling on paid AI work

`app/api/admin/questions/review/batch/route.ts:28-29`

```ts
const maxBatchSize = batchSize || 10;
const limitedQuestionIds = questionIds.slice(0, maxBatchSize);
```

`batchSize` comes from the request body and has no upper clamp. Each question costs three
Anthropic completions (SABI-REV-035), so one call with a large `batchSize` drives unbounded spend.
The route is behind `withAdminAuth`, which defaults to admin **and tutor**, so this is reachable by
the lower-trust role. Block 55 is explicit that rate limiting is not the spend control, and there
is no per-user cap, no global cap, no ledger and no billing alert referenced anywhere in the repo.

The same missing clamp has a second face already recorded as SABI-REV-030: the default of 10
silently truncates a 50-question selection and reports success.

### N3. The product tells users it deletes their data, and it does not

`app/(dashboard)/help/page.tsx:120` states: "Yes, you can delete your account from Settings >
Account > Delete Account. This action is permanent and will remove all your data including
progress, achievements, and statistics."

`app/(dashboard)/settings/page.tsx:103-105`:

```ts
const handleDeleteAccount = () => {
  alert('Account deletion feature coming soon. Please contact support for assistance.');
};
```

No deletion endpoint exists anywhere in `app/api/`. The users are minors of roughly 14 to 16, so
this is a false statement about honouring a data-deletion request rather than an unfinished
feature. Block 62.

## The hand-off finding

**No application code has changed since the last audit.** `git diff 3a4da66..HEAD` over `app/`,
`lib/`, `components/`, `types/`, `middleware.ts`, `next.config.ts` and `package.json` returns
nothing. The 2,799 lines added since are documentation plus one unapplied migration.

`modes/audit.md` says a re-audit finding the same red blocks after two passes is a finding about
the hand-off rather than about the code. That is the case here, and it is why the retrofit was
re-seeded into `TASKS.md` and `decisions.md` earlier today. Every red below that carries
"unchanged" is unchanged by construction, not by re-examination failing to find movement.

## What had never been checked

The 2026-08-24 pass graded 47 blocks. Blocks 48 to 76 were added to the matrix on 2026-09-16, and
the eight house rules with them. So **29 blocks and 8 house rules had never been run against this
codebase**, alongside four layers that were never run at all. That, not the unchanged reds, is what
this pass was for.

## Blocks 48 to 76, first pass

| # | Block | Status | Evidence | Risk if left |
|---|---|---|---|---|
| 48 | Connection pooling | n/a | No pg driver, no connection string, no ORM. Everything goes through supabase-js over PostgREST | Becomes live if v2 adds a direct Postgres client |
| 49 | Trusted client IP | ❌ missing | `lib/api/admin-auth.ts:198-200,227-229` read `x-forwarded-for` raw, not Vercel's guaranteed header, with no trusted-proxy statement. Used only for `admin_audit_logs.ip_address` | A forged header records a destructive admin action under an attacker-chosen IP, so the audit log stops being evidence |
| 50 | Webhook fulfilment | n/a | No payment provider and no webhook receiver in the tree | Becomes core the moment v2 takes a subscription |
| 51 | Least privilege | 🟡 partial | `SUPABASE_SERVICE_ROLE_KEY` used in exactly 2 places, both already inside `withAdminAuth`. But at the database layer, six `SECURITY DEFINER` functions hold elevated privilege with `EXECUTE` never revoked | Half the rule holds; the RPC half is N1 |
| 52 | Secret scanning | ❌ missing | No `.github/`, no `.husky/`, nothing at pre-commit or in CI. History never scanned | A committed key would reach the remote unchallenged |
| 53 | Responsive design | ✅ ok | Learning pages use mobile-first Tailwind throughout | |
| 54 | Environments | ❌ missing | **`.env.example` does not exist.** Code reads 8 variables, `CLAUDE.md` documents 4. Undocumented: `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`, `NODE_ENV`. No staging environment | The block's own instruction, diff the example against the deployment target, cannot be carried out |
| 55 | Spend caps | ❌ missing | See N2 | Unbounded spend from a tutor account or a leaked credential |
| 56 | Health probes | ❌ missing | Nothing exposes whether a degrading feature still works. The cron reports `{count: 0}` as success daily having never sent anything (SABI-REV-015); `getImageDimensions()` always throws and is swallowed (SABI-REV-038) | A disabled safety control looks exactly like a working one |
| 57 | Unified principal | ❌ missing | `lib/auth-context.tsx:174` merges a real `auth.uid()` UUID and a client-generated `guest_${Date.now()}_...` string under one `userId` field. No shared principal, no permission vocabulary | Any consumer trusting `userId` without also checking `isGuest` mishandles guest data |
| 58 | Owner-only access | ❌ missing | The IDOR surface is the RLS and RPC layer, not `app/api/`, because students talk to Postgres directly. Gaps: no RLS on the two badge tables, plus the six functions in N1 | An authenticated student can destroy another student's progress data today |
| 59 | Optimistic locking | ❌ missing | Read-modify-write on shared counters (SABI-REV-004, SABI-REV-042), untouched by the pending migration, which fixed authorization and not concurrency | A lost update is silent and the second writer believes it succeeded |
| 60 | Account recovery | ❌ missing | `setup_first_admin` requires hand-run SQL, which the block rules out, and its written runbook `scripts/setup-first-admin.sql` targets a `profiles` table that does not exist (SABI-REV-020). Password reset itself is fine via Supabase Auth | The documented break-glass procedure is broken as written |
| 61 | PII minimization | 🟡 partial | Collection is narrow and confirmed against schema: email, full_name, grade, avatar_url. `phone` and `institution` appear in the admin API with no backing column. Anthropic receives question text only, never student data | No classification recorded, so the next field added has no bar to clear |
| 62 | Data retention | ❌ missing | See N3. No retention or deletion policy anywhere in the repo | Data about minors with no stated retention and a false deletion promise |
| 63 | SQL injection | ✅ ok | All access through the Supabase query builder or parameterized `.rpc()`. No string-built SQL, no raw escape hatch | |
| 64 | Content Security Policy | ❌ missing | No CSP anywhere. `next.config.ts` has no `headers()`, `vercel.json` carries only `crons`, `middleware.ts` sets no response header | Block 23 is clean today and has no backstop for the day it is not |
| 65 | Safe user HTML | n/a | No feature renders user-submitted HTML | |
| 66 | Path & upload safety | 🟡 partial | `upload-image/route.ts` allowlists 4 MIME types, caps at 5MB, and names the stored file with `randomUUID()`. But the allowlist checks the client-declared `file.type` with no magic-byte verification, and that declared type is written as the served `contentType` | Content-type spoofing, bounded because the served header still reflects the allowed type |
| 67 | Open redirect | ❌ missing | `app/auth/callback/route.ts:16,30`. `new URL(next, request.url)` returns the absolute URL when `next` is a full URL, so `?next=https://evil.example` leaves the domain. SABI-REV-009 | The app's own domain launches someone else's phishing redirect |
| 68 | Backups & restore drills | ❌ missing | Only aspirational prose in root docs. Nothing confirms backups are configured for this tier, and no restore has been performed or timed | The block's own note: the only gap here that cannot be fixed after the fact |
| 69 | Feature flags | ❌ missing | No operational switches. The only control over AI is the presence of `ANTHROPIC_API_KEY` | A setting that needs a redeploy to turn off stays on during the incident |
| 70 | Staged rollout | ❌ missing | No cohort or canary. Every push reaches 100% | |
| 71 | Kill switch | ❌ missing | No instant off switch for the paid AI calls, the cron, or any public write path. All require a redeploy | Pairs with N2: unbounded spend with no way to stop it quickly |
| 72 | Store times in UTC | 🟡 partial | Storage is clean, `TIMESTAMPTZ` everywhere with zero bare timestamps. But streak, daily-XP and daily-challenge day boundaries run on `CURRENT_DATE` in UTC, not Africa/Lagos | Every day boundary is an hour off local midnight for every user |
| 73 | Money as integers | n/a | No money, price or currency column exists in any migration | Clean slate. The NGN subscription must start here |
| 74 | Image optimization | ❌ missing | Zero `next/image` repo-wide. `components/common/QuestionDisplay.tsx:98-106`, the student-facing diagram renderer, is a raw `<img>` with no lazy loading. `next.config.ts` is the untouched scaffold default, so no image domains are configured either | On metered mobile data this is money out of a student's pocket |
| 75 | Code splitting | ❌ missing | Zero `next/dynamic`, zero `React.lazy`. Largest eager routes: `home/page.tsx` 2,159 lines, `results/[sessionId]/page.tsx` 1,796 | Same cost, same users |
| 76 | Compression | 🟡 partial | Relies entirely on platform defaults; nothing verifies actual `Content-Encoding` | Routinely half-configured, and nothing would notice |

## House rules, first pass

| Rule | Status | Evidence |
|---|---|---|
| HR-01 Mobile layout verified | 🟡 partial | Mobile-first Tailwind is present; no 320px or 375px verification is documented or gated |
| HR-02 Content constraints gated over the database | ❌ missing | The alt-text CHECK constraint does not enforce alt text (SABI-REV-022), so non-import paths bypass it |
| HR-03 Connections budgeted against the pooler cap | n/a | Follows block 48. Forward-looking for v2 |
| HR-04 "At least one X" invariants inside the write transaction | ❌ missing | `app/api/admin/users/[userId]/route.ts:142` blocks self-demotion only. No admin-count check when demoting anyone else, and no lock |
| HR-05 Webhooks verified and idempotent | n/a | No webhooks exist |
| HR-06 Static rendering preserved | ✅ ok | `app/layout.tsx` reads no cookies or headers. Scope is seo-website and ecommerce, so this is a courtesy pass |
| HR-07 Every deployable surface named | 🟡 partial | Three surfaces exist (Next.js app automatic, migrations manual, cron automatic). No document names them or marks which a push carries |
| HR-08 Store canonical, format at display | 🟡 partial | Inherits 72 partial and 73 clean-slate |

### A compound neither auditor saw

HR-04 and block 60 interact. `setup_first_admin` is guarded only by a count check that raises when
any admin exists, so it is not an escalation path today. It becomes one the instant the admin count
reaches zero, and HR-04 is exactly the gap that allows zero: two admins demoting each other
concurrently both read a count of two, both conclude they are safe, and between them leave none.
At that point `setup_first_admin` is callable by anyone with the anon key. Neither half is
individually urgent. Together, a race condition between two admins ends in anonymous admin access.

## Revised verdicts on the original 47

Only where this pass changed the 2026-08-24 call. Everything else stands.

| # | Block | Was | Now | Why |
|---|---|---|---|---|
| 15 | Data modeling | ✅ ok | 🟡 partial | Passage text is duplicated on every question row sharing a `passage_id` with no canonical table (SABI-REV-032). That is a block 15 violation, not only an admin-UX bug |
| 28 | Authentication | ✅ ok | 🟡 partial | Every server-side trust boundary calls `supabase.auth.getSession()` and never `getUser()`: `middleware.ts:45`, `lib/api/admin-auth.ts:42,93,188`. Supabase's own SSR guidance is that `getSession()` must not be trusted server-side for authorization. The entire admin gate rests on the weaker primitive |
| 30 | Brute force | ❌ missing | 🟡 partial | No application-layer lockout, but Supabase Auth's platform rate limiting applies. Dashboard-configured and not visible here, so the grade is partial rather than missing |
| 39 | Pagination | ❌ missing | 🟡 partial | 6 admin routes do use `.range()`. The student-facing `lib/api.ts` still has zero across 3,305 lines |
| 03 | Git | ✅ ok | 🟡 partial | `.cursor/debug.log` is tracked: 51 MB, 36,240 lines, committed in `09e1130`, and `.gitignore` has no `.cursor/` entry so it recurs. Contains 336 distinct internal UUIDs. No credentials: zero hits for `sk-`, JWTs, `service_role` or `password`, and no email addresses |

## Layers, first run

None of these was run on 2026-08-24.

**AI.** Output blast radius is genuinely well built: model output stages into `question_reviews`
and needs a separate human-approved call before it reaches the live `questions` table. Model
pinning is correct, a dated snapshot as the code default (`lib/ai/anthropic-client.ts:8`). Against
that: no spend ceiling (N2), nothing that evaluates output quality, and the human approval step checks
formatting rather than factual or mathematical correctness. That last one is the product risk, not
the cost risk: generated teaching content is shown to children as fact, so an unreviewed wrong
answer teaches something false and then confidently explains why.

One observation outside the blocks: the pinned default is `claude-3-5-sonnet-20241022`, which is
two model generations behind. For a pipeline whose whole job is deriving correct answers to exam
questions, that is worth revisiting on quality grounds before the corpus work starts.

**Inherited tool.** Clean on the risks that matter: one git author throughout, one rules file with
no competing `AGENTS.md`, one lockfile. The single residue item is the `.cursor/debug.log` above.

**PWA.** Zero built: no manifest, no service worker, no relevant dependency. `PLAN.md` states
offline capability as a v2 requirement but settles only the product-level question. The update
strategy, the per-resource caching strategy and the queued-write conflict rule are all undecided,
and the layer is explicit that those are decided before any caching code is written, because a
service worker serving a stale shell masks every other fix.

**Supabase.** SABI-REV-002 re-confirmed open by live probe this morning. The re-run's own yield was
N1, which the 2026-08-24 pass missed because it examined only the three functions it already had
findings about. Two `.sql` files sit outside `supabase/migrations/`: `scripts/setup-first-admin.sql`
and `supabase/storage/question-images-bucket.sql`. In a hand-applied pipeline that is precisely how
a storage policy drifts with nobody noticing.

## Growth triggers, run backwards

| Trigger already met | Blocks it should have turned on | Fired? |
|---|---|---|
| Started calling a paid API | 55 spend caps, 71 kill switch, 38 rate limiting | No, none of the three |
| Gained a second privileged role (tutor) | 29 authorization, HR-04 last-admin invariant, 58 owner-only | No. A tutor can suspend an admin, and no admin-count invariant exists |
| Started storing personal data about minors | 61 PII minimization, 62 retention | No. No classification and no policy |
| Took file uploads | 66 path and upload safety | Partly. Type, size and stored name are handled; content is not verified |
| Gained a second sign-in method (Google OAuth) | 57 unified principal, 67 open redirect | Mixed. Both methods do resolve to one Supabase principal, but the callback is an open redirect, and the guest path is a third identity kind that never unified |

## Corrections

**To this session's own work.** The migration `20260916_lock_down_scoring_writes.sql` committed
earlier today as AUTH-01 carries a header claiming to establish "the pattern" that every RPC
writing on behalf of a user asserts `auth.uid()`. It applies that pattern to three functions. The
sweep in N1 shows six more with the same shape, five of which it leaves untouched. The migration is
correct in what it does and its header overstates what it covers. AUTH-01 should be widened to the
full sweep before it is applied, or the header narrowed. That is a decision for the operator, and
it is recorded in `TASKS.md`.

**To the 2026-08-24 audit.** Block 03 was graded ok on a `.gitignore` read without checking what
was actually tracked. Block 15 and block 28 were graded ok and are not. The prior pass's
`SECURITY DEFINER` examination covered three functions out of 26.

**To one auditor's report.** The structure worker graded git hygiene clean. It is not, per block 03
above. Recorded because two workers disagreed and the source settled it.

## What stayed dark

Not visible from the repository. Each names where the answer lives.

- Whether the six functions in N1 are confirmed reachable over HTTP. The static chain is sound
  (`SECURITY DEFINER`, no `auth.uid()`, no `GRANT`/`REVOKE` in 17 migrations, PostgREST exposes
  `public` functions) but the live probe was not run. **One anonymous RPC call would settle it.**
- Whether `ANTHROPIC_API_KEY` is set on Vercel. If it is unset, as a 22-day-old note suggests, N2
  is not currently exploitable and becomes so the day the key is added. **Vercel project settings.**
- Whether an Anthropic billing alert exists. **Anthropic console.**
- Supabase backup tier, PITR retention, and whether any restore has ever been performed.
  **Supabase Dashboard.**
- Supabase Auth's dashboard-configured login rate limits, which decide whether block 30 is really
  partial. **Supabase Dashboard, Auth settings.**
- The actual HSTS header and real production bundle size. No build was run, per the read-only
  constraint, so the block 75 evidence is line counts as a proxy.
