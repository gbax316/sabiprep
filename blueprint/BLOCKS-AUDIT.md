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

Blocks: 11 ok · 9 partial · 19 missing · 8 n/a

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
