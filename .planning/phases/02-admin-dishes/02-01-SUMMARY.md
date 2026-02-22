---
phase: 02-admin-dishes
plan: "01"
subsystem: ui
tags: [zustand, supabase-realtime, supabase-storage, canvas-api, react, tailwind]

# Dependency graph
requires:
  - phase: 01-foundation-auth
    provides: sessionStore, supabase client, UI components (Button, Modal, Toast), router with RequireSession guard
provides:
  - competitionStore: Zustand store for all competition runtime state (competition, dishes, participants)
  - useCompetition: data fetching + Realtime subscription hook
  - compressImage: Canvas-based JPEG compression at 800px / 0.72 quality
  - usePhotoUpload: compress + upload pipeline returning public Storage URLs
  - PhaseBanner: phase-aware banner component (preparation/voting/finished)
  - ConfirmModal: reusable center confirmation modal
  - AdminScreen: shell with sticky header, PhaseBanner, 4-tab navigation, loading/error states
  - router: /admin/:code wired to AdminScreen
affects:
  - 02-02 (DishesTab, ParticipantsTab, AddDishModal — all consume competitionStore and use ConfirmModal)
  - 02-03 (RankingTab, SettingsTab — read from competitionStore, use ConfirmModal)
  - 03-voter (uses same competitionStore pattern for voter view)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "competitionStore: no persist middleware — server-authoritative, always fetched fresh on mount with reset() on unmount"
    - "useCompetition: parallel Promise.all fetch + Realtime channel on competitions table, cleanup on unmount"
    - "compressImage: Canvas API toBlob pattern (MAX_PX=800, QUALITY=0.72), URL.createObjectURL + revokeObjectURL"
    - "usePhotoUpload: Promise.all upload parallelism, getPublicUrl is synchronous (no await)"
    - "Tab navigation via useState — not URL sub-routes (tabs are ephemeral, no back-button requirement)"
    - "Admin reads from dishes table directly (not dishes_public view) — anon_read_dishes policy allows chef_name visibility"

key-files:
  created:
    - src/store/competitionStore.ts
    - src/hooks/useCompetition.ts
    - src/hooks/usePhotoUpload.ts
    - src/lib/compress.ts
    - src/components/competition/PhaseBanner.tsx
    - src/screens/Admin/AdminScreen.tsx
    - src/screens/Admin/modals/ConfirmModal.tsx
  modified:
    - src/router.tsx

key-decisions:
  - "competitionStore has no persist middleware — Zustand singleton risk managed by reset() call in useCompetition unmount"
  - "Admin reads dishes table directly (not dishes_public) to see chef_name in all phases"
  - "Tab state via useState not URL sub-routes — no deep-linking requirement for admin tabs"
  - "usePhotoUpload uses Promise.all for concurrent uploads — Storage handles concurrent requests fine"

patterns-established:
  - "PhaseBanner: reads from competitionStore, returns null if no competition loaded"
  - "ConfirmModal: wraps existing Modal variant=center, shared across DishesTab and SettingsTab"
  - "AdminScreen: sticky 62px header + PhaseBanner + scrollable pb-24 content + fixed 64px tab bar"

# Metrics
duration: 2min
completed: 2026-02-22
---

# Phase 2 Plan 01: Data Layer + AdminScreen Shell Summary

**Zustand competitionStore + Supabase Realtime hook + Canvas compression pipeline + AdminScreen with 4-tab navigation at /admin/:code**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-22T00:23:31Z
- **Completed:** 2026-02-22T00:25:32Z
- **Tasks:** 2
- **Files modified:** 8 (7 created, 1 modified)

## Accomplishments

- Full data layer: competitionStore with all CRUD actions + reset(), useCompetition with parallel fetch + Realtime subscription, compressImage Canvas utility, usePhotoUpload with concurrent upload pipeline
- AdminScreen shell at /admin/:code with sticky header (competition name + gold code badge), PhaseBanner, 4-tab navigation (Piatti/Partecipanti/Classifica/Impostazioni), loading/error states
- ConfirmModal reusable center modal ready for Plans 02-02 and 02-03
- Router updated: /admin/:code renders AdminScreen within existing RequireSession guard

## Task Commits

Each task was committed atomically:

1. **Task 1: Data layer** - `ecf5e40` (feat)
2. **Task 2: AdminScreen shell + PhaseBanner + ConfirmModal + router** - `ba0e2e4` (feat)

## Files Created/Modified

- `src/store/competitionStore.ts` - Zustand store with competition/dishes/participants state and reset()
- `src/hooks/useCompetition.ts` - Parallel fetch (competitions + dishes + participants) + Realtime phase subscription
- `src/lib/compress.ts` - Canvas-based JPEG compression at MAX_PX=800, QUALITY=0.72
- `src/hooks/usePhotoUpload.ts` - Compress + upload to dish-photos Storage bucket, returns public URLs
- `src/components/competition/PhaseBanner.tsx` - Phase-aware banner reading from competitionStore
- `src/screens/Admin/AdminScreen.tsx` - Shell with header, PhaseBanner, 4 tab placeholders, loading/error
- `src/screens/Admin/modals/ConfirmModal.tsx` - Reusable confirmation modal (shared by 02-02 and 02-03)
- `src/router.tsx` - /admin/:code now renders AdminScreen instead of placeholder div

## Decisions Made

- No new npm packages needed — all libraries already installed from Phase 01
- Tab state via `useState` (not URL sub-routes): tabs are ephemeral, no back-button or deep-link requirement
- Admin reads from `dishes` table directly (not `dishes_public` view) to see chef_name in all phases
- `getPublicUrl` called without await — it is synchronous (derives URL from path, no network call)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All consumers of competitionStore (DishesTab, ParticipantsTab, RankingTab, SettingsTab) have their data source ready
- ConfirmModal is ready for DishesTab delete and SettingsTab phase advance
- usePhotoUpload is ready but will fail with 403 until Plan 02-02 adds the anon Storage INSERT policy migration
- Plan 02-02 can import AdminScreen tabs directly — the placeholder divs are the replacement targets

---
*Phase: 02-admin-dishes*
*Completed: 2026-02-22*
