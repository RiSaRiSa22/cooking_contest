---
phase: 02-admin-dishes
verified: 2026-02-22T01:09:33Z
status: passed
score: 13/13 must-haves verified
re_verification: false
---

# Phase 2: Admin Dishes Verification Report

**Phase Goal:** L'admin ha pieno controllo sulla gara — può gestire piatti, partecipanti, fase e impostazioni
**Verified:** 2026-02-22T01:09:33Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | AdminScreen renders at /admin/:code with 4 tab buttons and tab content switching | VERIFIED | AdminScreen.tsx: 4 real tab components wired, active tab switches via useState, router.tsx wires /admin/:code |
| 2 | competitionStore holds competition, dishes, participants state and resets on unmount | VERIFIED | competitionStore.ts: full interface + reset() to initialState; useCompetition calls reset() on unmount |
| 3 | useCompetition fetches competition + dishes + participants on mount and subscribes to Realtime phase changes | VERIFIED | useCompetition.ts: Promise.all 3 parallel queries + channel subscription on competitions table UPDATE |
| 4 | PhaseBanner shows current phase name with appropriate styling | VERIFIED | PhaseBanner.tsx: reads competitionStore, renders phase-colored banner with emoji and label |
| 5 | compress.ts resizes images to max 800px and outputs JPEG at 0.72 quality | VERIFIED | compress.ts: MAX_PX=800, QUALITY=0.72, canvas.toBlob with correct params |
| 6 | usePhotoUpload compresses and uploads to Supabase Storage returning public URLs | VERIFIED | usePhotoUpload.ts: calls compressImage, uploads to dish-photos bucket, returns getPublicUrl (synchronous) |
| 7 | Admin can create a dish with name, chef name, optional fields, and photo uploads | VERIFIED | AddDishModal.tsx: full form + usePhotoUpload + invoke('dish-write'); dish-write EF: admin bypass, INSERT dish + photos |
| 8 | Admin can edit any existing dish (name, chef, ingredients, recipe, story, photos) | VERIFIED | AddDishModal.tsx: pre-fills form from editDish prop, sends dishId for edit path; dish-write EF: UPDATE + photo delete+reinsert |
| 9 | Admin can delete any dish with confirmation — DB record and Storage blobs both removed | VERIFIED | DishesTab.tsx: ConfirmModal + invoke('dish-delete'); dish-delete EF: Storage paths extracted + removed, then DB CASCADE delete |
| 10 | DishesTab shows all dishes with photos, chef name, and edit/delete action buttons | VERIFIED | DishesTab.tsx: reads dishes from store, renders DishCard with showActions=true, FAB opens AddDishModal |
| 11 | Admin can advance phase preparation -> voting -> finished with confirmation | VERIFIED | SettingsTab.tsx: ConfirmModal + invoke('competition-settings', {action:'advance_phase'}); EF: PHASE_ORDER map, unidirectional, 400 on finished |
| 12 | Admin can reset all votes with confirmation | VERIFIED | SettingsTab.tsx: ConfirmModal + invoke('competition-settings', {action:'reset_votes'}); EF: DELETE FROM votes WHERE competition_id |
| 13 | All 4 admin tabs show real content (Piatti, Partecipanti, Classifica, Impostazioni) | VERIFIED | AdminScreen.tsx imports and renders DishesTab, ParticipantsTab, RankingTab, SettingsTab — no placeholders remaining |

**Score:** 13/13 truths verified

---

### Required Artifacts

| Artifact | Lines | Exports | Status | Notes |
|----------|-------|---------|--------|-------|
| `src/store/competitionStore.ts` | 69 | `useCompetitionStore`, `DishWithPhotos` | VERIFIED | All actions + reset() present |
| `src/hooks/useCompetition.ts` | 69 | `useCompetition` | VERIFIED | Parallel fetch + Realtime + reset on unmount |
| `src/hooks/usePhotoUpload.ts` | 57 | `usePhotoUpload` | VERIFIED | compressImage + upload + getPublicUrl |
| `src/lib/compress.ts` | 41 | `compressImage` | VERIFIED | MAX_PX=800, QUALITY=0.72, canvas API |
| `src/components/competition/PhaseBanner.tsx` | 51 | `PhaseBanner` | VERIFIED | Phase-aware colors + text + null guard |
| `src/screens/Admin/AdminScreen.tsx` | 109 | `AdminScreen` | VERIFIED | All 4 real tabs, sticky header, tab bar |
| `src/screens/Admin/modals/ConfirmModal.tsx` | 81 | `ConfirmModal` | VERIFIED | title/message/confirmLabel/isLoading spinner |
| `supabase/functions/dish-write/index.ts` | 291 | Deno.serve | VERIFIED | Zod schema, role+phase auth, CREATE+EDIT paths, photo UPSERT |
| `supabase/functions/dish-delete/index.ts` | 148 | Deno.serve | VERIFIED | Admin-only, Storage path extraction + remove, CASCADE DB delete |
| `src/components/dishes/PhotoGrid.tsx` | 71 | `PhotoGrid` | VERIFIED | 1/2/3+ layouts, +N overlay |
| `src/components/dishes/DishCard.tsx` | 77 | `DishCard` | VERIFIED | PhotoGrid + chef + ingredients preview + actions |
| `src/screens/Admin/modals/AddDishModal.tsx` | 322 | `AddDishModal` | VERIFIED | Full form, photo upload pipeline, create+edit modes |
| `src/screens/Admin/tabs/DishesTab.tsx` | 125 | `DishesTab` | VERIFIED | CRUD wired, FAB, ConfirmModal for delete, store updates |
| `supabase/functions/competition-settings/index.ts` | 162 | Deno.serve | VERIFIED | discriminatedUnion, admin-only, advance_phase + reset_votes |
| `src/screens/Admin/tabs/SettingsTab.tsx` | 290 | `SettingsTab` | VERIFIED | Code+QR, stats, phase control, danger zone |
| `src/components/competition/ParticipantCard.tsx` | 97 | `ParticipantCard` | VERIFIED | Avatar hash-color, role badge, dish/vote status |
| `src/screens/Admin/tabs/ParticipantsTab.tsx` | 51 | `ParticipantsTab` | VERIFIED | Sorted list with ParticipantCard, dish status |
| `src/screens/Admin/tabs/RankingTab.tsx` | 111 | `RankingTab` | VERIFIED | Chef reveal toggle, phase-gated display |
| `supabase/migrations/20260222000000_storage_upload_policy.sql` | 8 | — | VERIFIED | anon_upload_dish_photos policy present |

---

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `src/router.tsx` | `AdminScreen.tsx` | `/admin/:code` route + RequireSession guard | WIRED |
| `AdminScreen.tsx` | `useCompetition.ts` | `useCompetition(session!.competitionId)` call | WIRED |
| `useCompetition.ts` | `competitionStore.ts` | `setCompetition`, `setDishes`, `setParticipants`, `updatePhase`, `reset` calls | WIRED |
| `DishesTab.tsx` | `dish-write` EF | `supabase.functions.invoke('dish-write', ...)` in AddDishModal.tsx | WIRED |
| `DishesTab.tsx` | `dish-delete` EF | `supabase.functions.invoke('dish-delete', ...)` | WIRED |
| `AddDishModal.tsx` | `usePhotoUpload.ts` | `usePhotoUpload()` + `uploadPhotos(newFiles, dishId)` | WIRED |
| `usePhotoUpload.ts` | `compress.ts` | `compressImage(file)` before each upload | WIRED |
| `DishesTab.tsx` | `competitionStore.ts` | `useCompetitionStore` reads dishes; `addDish`/`updateDish`/`removeDish` after mutations | WIRED |
| `SettingsTab.tsx` | `competition-settings` EF | `invoke('competition-settings', {action:'advance_phase'})` and `{action:'reset_votes'}` | WIRED |
| `ParticipantsTab.tsx` | `competitionStore.ts` | `useCompetitionStore` reads participants + dishes | WIRED |
| `RankingTab.tsx` | `competitionStore.ts` | `useCompetitionStore` reads dishes + competition.phase | WIRED |

---

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| COMP-01 (admin advance phase preparation→voting) | SATISFIED | competition-settings EF + SettingsTab with ConfirmModal |
| COMP-02 (admin advance phase voting→finished) | SATISFIED | Same EF path, PHASE_ORDER map, unidirectional enforced server-side |
| COMP-03 (admin reset votes with confirmation) | SATISFIED | reset_votes action in EF, DELETE FROM votes, ConfirmModal |
| DISH-01 (admin can create dish for any participant) | SATISFIED | dish-write EF: isAdmin bypasses all restrictions |
| DISH-02 (participant max 1 dish, preparation only) | SATISFIED | dish-write EF: phase gate + existing-dish check for non-admin |
| DISH-03 (participant can only edit own dish) | SATISFIED | dish-write EF: participant_id check on edit path |
| DISH-04 (admin can edit/delete any dish) | SATISFIED | dish-write admin bypass; dish-delete admin-only gate |
| DISH-05 (photos compressed before upload) | SATISFIED | usePhotoUpload → compressImage (800px/0.72 JPEG) |
| DISH-06 (participant can add extra photos during voting) | SATISFIED | dish-write EF: isExtra carve-out with voting phase + ownership check |
| ADMN-01 (admin panel with 4 tabs) | SATISFIED | AdminScreen with Piatti/Partecipanti/Classifica/Impostazioni all operational |
| ADMN-02 (admin can manage participants) | SATISFIED | ParticipantsTab shows all participants with dish status |
| ADMN-03 (admin ranking with chef reveal) | SATISFIED | RankingTab: phase-gated, chef reveal toggle (vote counts deferred by design to Phase 3) |
| ADMN-04 (admin settings: code, QR, stats, phase) | SATISFIED | SettingsTab: all 4 sections implemented |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `AddDishModal.tsx` | 177, 186, 199, 213, 227 | `placeholder=` HTML attributes | INFO | UX helpers on input fields, not code stubs — not a concern |

No blockers or warnings found. The only matches for "placeholder" are HTML input placeholder attributes, which are correct UX practice.

---

### Human Verification Required

The following items need human testing since they cannot be verified programmatically:

#### 1. Full CRUD flow in browser

**Test:** Navigate to /admin/CODE, open DishesTab, create a dish with photos, edit it, delete it.
**Expected:** Dish appears immediately in list after create; edit pre-fills form; delete removes card with ConfirmModal guard.
**Why human:** Photo compression and Storage upload require browser Canvas API and live Supabase connection.

#### 2. Phase transition end-to-end

**Test:** In SettingsTab, click "Avvia votazione", confirm, then click "Concludi gara", confirm.
**Expected:** PhaseBanner updates live at each step. "Avanza fase" button becomes disabled at "finished". Phase is unidirectional (no way back).
**Why human:** Realtime update propagation from Supabase to PhaseBanner requires live connection.

#### 3. Competition-settings EF deployment

**Test:** Phase transitions and vote reset must succeed with a 200 response (not 502/404).
**Expected:** EF responds correctly, no "Function not found" errors in console.
**Why human:** SUMMARY noted the EF may need `supabase login` + redeploy. Deployment state is not verifiable from filesystem alone.

#### 4. QR code rendering

**Test:** SettingsTab Impostazioni tab shows a scannable QR image below the competition code.
**Expected:** QR code renders as img element pointing to qrserver.com URL; scanning it leads to the join URL.
**Why human:** External API call, visual rendering.

---

### Gaps Summary

None. All 13 observable truths are verified. All 19 required artifacts exist, are substantive, and are wired correctly. All 13 requirements covered. No blockers.

**Known deferred items by design (not gaps):**
- Vote counts in RankingTab and SettingsTab stats show "—": deferred to Phase 3 when vote-cast EF provides data.
- Participant vote status badge in ParticipantCard shows "—": deferred to Phase 3.
- Voter-facing "Il mio piatto" UI: deferred to Phase 3 / VoterScreen (backend enforcement already in place via dish-write EF).
- Vote-based ranking sort: deferred to Phase 3. Current alphabetical sort is explicitly documented as placeholder.

These deferrals are planned and documented in PLAN and SUMMARY files. They do not affect Phase 2 goal achievement.

---

_Verified: 2026-02-22T01:09:33Z_
_Verifier: Claude (gsd-verifier)_
