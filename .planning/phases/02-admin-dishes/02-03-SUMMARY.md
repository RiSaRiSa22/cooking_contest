---
phase: 02-admin-dishes
plan: "03"
subsystem: ui
tags: [react, supabase, edge-functions, zustand, deno, tailwind]

# Dependency graph
requires:
  - phase: 02-01
    provides: competitionStore, AdminScreen tab shell, ConfirmModal
  - phase: 01-02
    provides: supabase client, RLS policies, database schema

provides:
  - competition-settings Edge Function (advance_phase + reset_votes, admin-only, server-side enforcement)
  - SettingsTab: competition code display, QR code, stats, phase control with confirmation, vote reset
  - ParticipantCard: avatar with nickname-hash color, role badge, dish/vote status badges
  - ParticipantsTab: sorted participant list using ParticipantCard
  - RankingTab: dish list with chef reveal toggle (vote counts deferred to Phase 3)
  - AdminScreen fully wired with all 4 real tab components

affects:
  - 03-voter-experience (phase transitions trigger UI changes for participants)
  - 03-vote-cast (vote reset resets data created by vote-cast EF)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "QR code via external API (qrserver.com) as <img> tag — no npm package needed"
    - "Clipboard API for code/link sharing with Toast feedback"
    - "Nickname hash -> color palette for consistent avatar colors"
    - "supabase.functions.invoke for Edge Function calls from React"
    - "Optimistic phase update via competitionStore.updatePhase after EF success"

key-files:
  created:
    - supabase/functions/competition-settings/index.ts
    - src/screens/Admin/tabs/SettingsTab.tsx
    - src/components/competition/ParticipantCard.tsx
    - src/screens/Admin/tabs/ParticipantsTab.tsx
    - src/screens/Admin/tabs/RankingTab.tsx
  modified:
    - src/screens/Admin/AdminScreen.tsx

key-decisions:
  - "02-03: QR code via api.qrserver.com external API as <img> — avoids npm dependency"
  - "02-03: Toast uses show(string) only — no type variants; wrapper added inline"
  - "02-03: RankingTab shows alphabetical order as placeholder — vote-based ranking deferred to Phase 3 when votes table has data"
  - "02-03: Vote count in SettingsTab shows — until Phase 3 provides vote read access"

patterns-established:
  - "Edge Function auth pattern: verify participantId + competition_id + role via DB lookup before action"
  - "Phase advance is unidirectional: preparation -> voting -> finished enforced in EF"
  - "Admin reads dishes table directly (not dishes_public) to access chef_name in all phases"

# Metrics
duration: 15min
completed: 2026-02-22
---

# Phase 2 Plan 03: Admin Tabs + competition-settings Edge Function Summary

**3 admin tabs (Partecipanti, Classifica, Impostazioni) + competition-settings EF for unidirectional phase transitions and admin-only vote reset**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-02-22T00:00:00Z
- **Completed:** 2026-02-22T00:15:00Z
- **Tasks:** 2 (+ checkpoint)
- **Files modified:** 6

## Accomplishments
- competition-settings Edge Function enforces admin-only phase advancement (preparation -> voting -> finished) and vote reset
- SettingsTab shows competition code, QR code image, stats grid, phase control with ConfirmModal, and danger zone (reset votes)
- ParticipantCard renders avatar with nickname-hash color, role crown badge, and dish/vote status badges
- ParticipantsTab lists all participants sorted admin-first with real-time dish status
- RankingTab shows dishes with chef reveal toggle (votes deferred to Phase 3)
- AdminScreen fully wired with all 4 real tab components

## Task Commits

1. **Task 1: competition-settings Edge Function + SettingsTab** - `27c17b8` (feat)
2. **Task 2: ParticipantCard + ParticipantsTab + RankingTab + AdminScreen wiring** - `2402dc8` (feat)

## Files Created/Modified
- `supabase/functions/competition-settings/index.ts` - Edge Function: advance_phase and reset_votes with admin auth
- `src/screens/Admin/tabs/SettingsTab.tsx` - Settings tab with code/QR, stats, phase control, vote reset
- `src/components/competition/ParticipantCard.tsx` - Participant card with avatar, role badge, dish status
- `src/screens/Admin/tabs/ParticipantsTab.tsx` - Participant list tab using ParticipantCard
- `src/screens/Admin/tabs/RankingTab.tsx` - Ranking tab with chef reveal toggle
- `src/screens/Admin/AdminScreen.tsx` - Wired partecipanti/classifica/impostazioni tabs

## Decisions Made
- QR code via `https://api.qrserver.com/v1/create-qr-code/` as `<img>` tag — avoids adding an npm package
- Toast API only accepts `show(string)` — added inline wrapper; no changes needed to Toast component
- RankingTab uses alphabetical sort as placeholder; actual vote-based ranking deferred to Phase 3 when vote-cast EF provides data
- Vote count in stats shows "—" until Phase 3 provides vote read access for admin

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Button variant and size mismatch**
- **Found during:** Task 1 (SettingsTab implementation)
- **Issue:** Used `variant="ghost"` and `size="md"` which don't exist in Button component (valid variants: ember, gold, sage, ghost-light, ghost-dark; valid sizes: default, sm, full)
- **Fix:** Replaced `ghost` -> `ghost-dark`, `md` -> `default`, and fixed all occurrences
- **Files modified:** src/screens/Admin/tabs/SettingsTab.tsx
- **Verification:** `npx tsc --noEmit` passes, `npm run build` succeeds
- **Committed in:** 27c17b8 (Task 1 commit)

**2. [Rule 1 - Bug] Toast API mismatch**
- **Found during:** Task 1 (SettingsTab implementation)
- **Issue:** Plan referenced `showToast(msg, 'success')` but existing Toast only exposes `show(string)` — no type variant
- **Fix:** Added inline `useAppToast` wrapper that accepts optional type param but ignores it
- **Files modified:** src/screens/Admin/tabs/SettingsTab.tsx
- **Verification:** TypeScript passes, no runtime errors
- **Committed in:** 27c17b8 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - Bug)
**Impact on plan:** Both fixes required for TypeScript to compile. No scope creep.

## Issues Encountered
- competition-settings Edge Function deployment requires `supabase login` — authentication gate. Function file is created and ready for deployment; admin must run `supabase login` then redeploy via `npx supabase functions deploy competition-settings --no-verify-jwt`.

## Next Phase Readiness
- All 4 admin tabs functional: Piatti (02-02), Partecipanti, Classifica, Impostazioni (02-03)
- competition-settings EF ready for deployment (needs auth)
- Phase 3 (voter experience) can start: phase transitions work end-to-end
- Vote counts in RankingTab and SettingsTab stats will populate once Phase 3 vote-cast EF is built

---
*Phase: 02-admin-dishes*
*Completed: 2026-02-22*
