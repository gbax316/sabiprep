# Retrofit plan: the live app, 2026-08-24

The decision is to build a new application and migrate the data. That changes what this document should contain.

**Do not refactor a codebase you are replacing.** The 3,305-line data layer, the 19 oversized files, the duplicated session pages and the missing tests are all real findings, and all of them are wasted effort to fix here. They are fixed by not carrying them across.

This plan therefore covers only what protects live users and live data while the new build proceeds. Everything else is deliberately left alone, and that is recorded below so it does not read as an oversight.

## Revised after the full-codebase campaign

This document originally listed two P0 items. The eight-slice campaign found **14 P0 findings**, and the live-risk picture is materially worse than the first pass suggested. The P0 list below is rewritten. Full detail for every item is in `LEDGER.md`.

The pattern worth naming: **five separate features report success while doing nothing.** The daily-reminder cron (SABI-REV-015), guest question tracking (SABI-REV-040), per-topic progress (SABI-REV-041), the achievements system (SABI-REV-073), and goal resets (SABI-REV-074). None of them errors. Each returns a clean result and writes nothing, or reads a table nothing writes. That is the failure mode block 34 exists to prevent, and it has happened five times.

## P0: this week

### R0. Close the write-side authorization holes

Five independent ways a signed-in student can forge the numbers a parent would be paying to see. These are all live now, all reachable from the browser console, and they should be fixed as **one pattern**, not five patches.

| Finding | Hole |
|---|---|
| SABI-REV-069 | `award_xp`, `check_and_award_mastery_badges` and `update_goal_progress` accept any `user_uuid` and any value. No `auth.uid()` check, no `GRANT`/`REVOKE` anywhere in 16 migrations |
| SABI-REV-002 | `mastery_badges` and `user_mastery_badges` have no RLS at all; anonymous read and write both confirmed |
| SABI-REV-070 | `user_achievements` INSERT checks ownership, not eligibility. Any student inserts any achievement |
| SABI-REV-018 | `notifications` INSERT is `WITH CHECK (true)`. Any user writes into any other user's feed |
| SABI-REV-019 | `daily_challenges` UPDATE and DELETE are open to any authenticated user, and DELETE cascades away every student's completion record |

**Why this is one job:** the v2 "record first-attempt accuracy" RPC, written in the same house style, inherits the identical hole. Establishing the pattern now (every RPC asserts `auth.uid()`, every table has an owner-scoped policy, explicit `REVOKE` from `anon` and `authenticated` where appropriate) is what stops the rebuild reproducing it.

Effort: **M**. Verify by repeating the probes recorded in the ledger; an anonymous read of `user_mastery_badges` should return `[]` and the zero-match PATCH should return 401 rather than 200.

### R1. Enable RLS on `mastery_badges` and `user_mastery_badges`

Folded into R0 above, kept here because it is the smallest and most urgent single change.

One migration. Enable row level security on both, add owner-scoped select and update policies on `user_mastery_badges`, and public-read-only on `mastery_badges` (it is reference data: badge names and XP thresholds).

Closes block 29 and audit finding U2. Effort: **S**. Apply through the Dashboard SQL Editor as usual.

Verify afterwards by repeating the probe: an anonymous `GET /rest/v1/user_mastery_badges` should return `[]`, and the zero-match PATCH should return 401 rather than 200.

### R2. Confirm no other table is missing a policy

The audit found the gap by comparing `CREATE TABLE` against `ENABLE ROW LEVEL SECURITY` across the migration files. That method misses any table created directly in the Dashboard and never written into a migration, which is plausible given migrations are applied by hand.

Run once in the SQL Editor:

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public' and rowsecurity = false;
```

Anything returned is exposed exactly as U2 was. Effort: **S**.

### R3. Decide the answer-exposure posture before new content lands

Today the whole bank including `correct_answer` is anonymously readable. For 1,023 past-paper questions that is a commercial annoyance rather than a breach, because the same content is in bookshops.

It stops being acceptable the moment generated variants, authored principle explanations or technique content enter the same table, because none of that exists anywhere else and it is the actual moat.

No code change is required this week. What is required is that the new build never reproduces this shape, which is covered in `PLAN.md`. Recorded here so the decision is not lost between the two codebases. Effort: **none now**, design constraint later.

## P1: worth doing while the old app is live

### R4. Add the three missing environment variables

`ANTHROPIC_API_KEY` and `NEXT_PUBLIC_APP_URL` are unset on Vercel, so AI review is dead and password-reset redirects degrade to a bare path. `SUPABASE_SERVICE_ROLE_KEY` exists but is scoped to Production only, so admin user creation and password reset fail in local development and on preview deployments while working in production. That asymmetry will be mistaken for a code bug.

Effort: **S**. Needs the key values, which only you can supply.

### R5. Put a spend ceiling on the AI review endpoints

`/api/admin/questions/review` and its batch sibling call a paid API with no rate limit and no daily cap. They sit behind admin auth, so this is not an open door, but a runaway loop or a stuck retry has no ceiling. Block 38 treats rate limiting as spend control, not only abuse control.

A hard daily call cap that fails closed, plus a billing alert on the Anthropic account. Effort: **S**.

## Deliberately not doing

Recorded so these read as decisions rather than misses.

| Finding | Why it is being left |
|---|---|
| `lib/api.ts` at 3,305 lines | Replaced, not refactored |
| 19 files over 600 lines | Same |
| 2,500 lines of duplicated session logic | Same; the new player is one component |
| Zero tests, no CI | Test the new build; retrofitting a suite onto code being deleted is pure cost |
| No error tracking, 501 console sites | Wire into the new build from Phase 1 |
| No pagination | The old app never reaches the scale where it matters |
| Biased shuffle in 11 places | Selection moves server-side and is rewritten |
| Dead `mode-select` stub and its light-theme flash | Gone with the rewrite |
| `select('*')` in 38 places | Same |

## Ordering note

R1 and R2 are the only items that protect data that exists right now. Do those before anything else, and before any new question content is imported into the current database. R4 unblocks the admin AI review workflow, which matters only if you intend to keep processing questions in the old admin while the new build proceeds; if question processing moves to the new pipeline immediately, R4 drops to optional.
