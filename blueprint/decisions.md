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
