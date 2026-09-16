# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start Next.js dev server (http://localhost:3000)
npm run build    # Production build — also serves as the type-check gate
npm run lint     # ESLint (eslint-config-next)
npm start        # Run built production server

npx tsc --noEmit # Standalone type check (no test runner is configured)
```

There is no test suite in this repo. The CI gate is `npm run build` + `npm run lint`.

## Stack

- **Next.js 16** (App Router) on **React 19** with **TypeScript strict mode**.
- **Supabase** (Postgres + Auth) via `@supabase/ssr` — used both client-side and from API routes/middleware.
- **Tailwind CSS v3** + **shadcn/ui** (`components/ui/`) layered under a custom "Magic UI" design system (`components/magic/`). The app is **dark-first** — `<html className="dark">` is hardcoded in `app/layout.tsx`.
- **Anthropic SDK** (`@anthropic-ai/sdk`) used server-side in `lib/ai/` for AI-generated hints, solutions, and explanations on questions.
- Path alias: `@/*` → repo root. Always import via `@/lib/...`, `@/components/...`, `@/types/...`.

## Required environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=           # only needed for admin AI review features
ANTHROPIC_MODEL=             # optional; defaults to claude-3-5-sonnet-20241022
```

## Architecture

### Route groups (App Router)

The app is partitioned into Next.js route groups under `app/`, each with its own layout:

- `app/(auth)/` — login, signup, onboarding (unauthenticated)
- `app/(dashboard)/` — student-facing home, subjects, topics, analytics, profile, achievements, daily-challenge, quick-practice, etc.
- `app/(learning)/` — the three learning modes:
  - `practice/[sessionId]` — hints + solutions, no timer
  - `test/[sessionId]` — no hints, results at end
  - `timed/[sessionId]` — configurable per-question timer (15/30/45/60s)
  - Plus `mode-select`, `results`, and the shared `learn/configure` entry point
- `app/(admin)/admin/` — admin/tutor portal (dashboard, content, questions, users, import, review, audit)
- `app/api/admin/...` — admin REST endpoints (subjects, topics, questions, users, import, audit, dashboard)
- `app/api/cron/daily-reminders` — invoked by Vercel cron (see `vercel.json`, daily at 08:00 UTC)
- `app/auth/callback/route.ts` — Supabase OAuth (Google) callback handler

### Authentication & authorization

Three layered concerns to understand before changing anything auth-related:

1. **Client-side auth context** — `lib/auth-context.tsx` wraps the whole app in `app/layout.tsx`. It tracks a Supabase user **or** a "guest" session stored in `sessionStorage` (`sabiprep_guest_session`). Guests can use parts of the app without an account; the context auto-clears guest mode on real sign-in.
2. **Admin auth context** — `lib/admin-auth-context.tsx` is a separate provider used only inside `app/(admin)/`. It fetches the user's role/status from the `users` table and caches it for 5 minutes. Roles are `student | tutor | admin`; `tutor` and `admin` may access the portal, only `admin` may manage users.
3. **Server-side gate** — `middleware.ts` runs on `/admin/:path*` and `/api/admin/:path*`. It validates the Supabase session, looks up `users.role` + `users.status`, and either lets the request through, redirects to `/admin/login`, or returns 401/403 JSON for API routes. `/admin/login` is the only admin path excluded from this gate. **Any new admin route is protected by default** — no further code needed.

For server-side Supabase access (API routes, server components), use `createServerClient` from `lib/supabaseServer.ts` — it wires up Next's cookie store correctly so the session is read from cookies. The browser singleton in `lib/supabaseClient.ts` is for client components only.

Admin API routes additionally wrap their handlers in `withAdminAuth` from `lib/api/admin-auth.ts` for audit-logged, role-checked execution even though middleware already gates them. The same file also exports `verifyAdminRole`, which reimplements the same logic and has **zero callers**. Do not treat it as load-bearing (SABI-REV-013).

### Data layer

- `lib/api.ts` is the central client-side API module — subjects, topics, questions, sessions, progress, achievements, notifications, goals, daily challenges, etc. It has an in-memory cache (`STATIC_CACHE_TTL`) for static-ish data like the subjects list. Prefer extending this file over scattering Supabase calls in components.
- `lib/admin-api-helpers.ts` exports `fetchWithRetry(url, options, timeoutMs, retries)` — admin pages use this for all admin API calls (AbortController timeout + retry on `AbortError`). Use it instead of bare `fetch` for any admin-side call; common timeouts are 10s for lists, 60s for AI review, 120s for batch review.
- `lib/ai/anthropic-client.ts` — server-only Anthropic calls for generating hints/solutions on questions (used by `/api/admin/questions/review`). It has its own retry loop with exponential backoff; don't add another wrapper around it.
- `lib/guest-question-tracking.ts` + `lib/guest-session.ts` — local storage based tracking so guest users don't see the same questions twice; mirrors what authenticated users get via `user_attempted_questions`.

### Database

Migrations live in `supabase/migrations/` and are applied via the Supabase Dashboard SQL Editor (no local migration runner is configured). When adding new tables/columns:

- Add an RLS policy in the same migration file. All tables in this project use RLS — students can only read their own rows; admin/tutor write access is policy-gated.
- Update the matching type in `types/database.ts` (this is hand-maintained, not generated).
- Filenames are dated (`YYYYMMDD_description.sql`) and applied in lexicographic order.

### Design system layering

Three layers of UI primitives, **in increasing order of preference for new feature work**:

1. `components/ui/` — raw shadcn/ui (Radix wrappers). Use directly only when neither layer above fits.
2. `components/common/` — older project-specific components (Button, Card, BottomNav, QuestionDisplay, etc.). Many pages still use these.
3. `components/magic/` — the canonical Magic UI design system: `MagicCard`, `MagicButton`, `MagicBadge`, `StatCard`, `BentoGrid`, `ProgressRing`. **Prefer these for new student-facing UI** — they encode the dark-first, gradient-rich style (cyan/violet accents on slate-950).

`components/admin/ui/` is a parallel mini-system (`AdminButton`, `AdminCard`, `AdminTable`, etc.) used inside the admin portal — keep admin and student UIs visually distinct.

The global gradient mesh background is rendered once in `app/layout.tsx` (fixed, `-z-10`); pages should not redefine it.

### Sessions & learning modes

A "session" is a row in `learning_sessions` keyed by `sessionId` in the URL (`practice/[sessionId]`, etc.). Questions answered within a session are written to `session_answers`; user-level aggregates are *intended* to live in `user_progress` and `user_attempted_questions`. Two corrections: `user_stats` is not a table, `UserStats` is a TypeScript shape computed from columns on `users` (SABI-REV-024); and `user_progress` is never written by any code path, so it is permanently empty (SABI-REV-041). The 2025-12 migration `add_time_limit_to_sessions.sql` introduced the configurable timer; the 2025-01 `multi_topic_sessions.sql` enables sessions that span multiple topics.

## Working in this repo

- **The tracker is `blueprint/TASKS.md`; rulings are in `blueprint/decisions.md`.** Read both before starting work. `blueprint/LEDGER.md` holds 77 audited findings as `SABI-REV-NNN`, `blueprint/BLOCKS-AUDIT.md` grades the codebase, and `blueprint/PLAN.md` is the v2 design. These five are current and authoritative, unlike the root markdown below.
- **`*_MD` documentation files in the repo root are extensive but often out of date.** Treat them as historical context, not source of truth. `package.json`, the migrations, and the code itself are authoritative. The README claims "Next.js 14" but the project is actually on Next 16 + React 19 — confirm versions from `package.json` before assuming anything about API surface.
- **No test framework is installed.** Don't add one without asking — verify changes with `npm run build` (catches type errors) and `npm run lint`, plus manual `npm run dev` walkthroughs.
- **Windows + PowerShell** is the primary dev environment (see global instructions). Use forward slashes in code, but be aware shell commands in scripts may need PowerShell-compatible syntax.
- **Don't create new top-level docs.** This repo already has 40+ markdown files at the root; consolidate into existing docs or skip docs entirely unless asked.
