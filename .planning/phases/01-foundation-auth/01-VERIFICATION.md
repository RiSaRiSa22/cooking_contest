---
phase: 01-foundation-auth
verified: 2026-02-21T23:48:53Z
status: gaps_found
score: 4/5 success criteria verified
gaps:
  - truth: "Re-auth modal appears when clicking a recent competition with expired session; only PIN required (nickname pre-filled)"
    status: partial
    reason: "Expired sessions are filtered out of getAllSessions() so their pills never appear on the home screen. The ReAuthModal is never triggered from home for expired sessions. Route guard does redirect to /?code=:code&mode=join, but this opens the full JoinCompModal (3 fields), not ReAuthModal (PIN only)."
    artifacts:
      - path: "src/store/sessionStore.ts"
        issue: "getAllSessions() filters out expired sessions (line 64-66), so expired competition pills do not appear on home screen"
      - path: "src/screens/Home/HomeScreen.tsx"
        issue: "handleCompetitionClick only fires on visible (non-expired) pills — no code path opens ReAuthModal for expired sessions"
      - path: "src/router.tsx"
        issue: "RequireSession redirects to /?code=:code&mode=join which opens JoinCompModal (full form), not ReAuthModal (PIN only)"
    missing:
      - "getAllSessions() should also return expired sessions (or a separate getRawSessions() for pills to show expired entries differently)"
      - "HomeScreen: clicking an expired-session pill should open ReAuthModal (not JoinCompModal) since nickname is already known"
      - "Alternative: RequireSession redirect could open ReAuthModal instead of full JoinCompModal for known-session users"
  - truth: "Providing admin password in PIN field grants admin access (AUTH-06)"
    status: partial
    reason: "AUTH-06 fallback in competition-join (line 112) returns the EXISTING PARTICIPANT's role and record, not the admin participant record. If a non-admin participant (e.g. Luigi with role=participant) provides the admin_pwd_hash, they get back their own participant session (role=participant), not the admin session. Only works correctly when the admin himself uses his own nickname + admin_pwd_hash (because admin.pin_hash == admin.admin_pwd_hash from competition-create)."
    artifacts:
      - path: "supabase/functions/competition-join/index.ts"
        issue: "Lines 111-122: when admin_pwd_hash matches, returns existingParticipant.role (which may be 'participant'), not the admin participant's id/role. Should look up the admin participant record and return it."
    missing:
      - "When admin_pwd_hash matches and existingParticipant.role != 'admin', query the admin participant (role='admin') for this competition and return that record instead"
      - "Or: define AUTH-06 as only applying when nickname == admin's nickname (narrower scope, clearer semantics)"
human_verification:
  - test: "End-to-end create competition flow"
    expected: "Fill name/nickname/PIN → CompCreatedScreen shows 6-char code → copy works → admin panel loads (placeholder)"
    why_human: "Requires Supabase Edge Functions deployed and .env.local configured with real values"
  - test: "End-to-end join competition flow"
    expected: "Fill code/nickname/PIN → redirects to voter placeholder screen → session appears in home pills on return"
    why_human: "Requires live Supabase connection and deployed Edge Functions"
  - test: "Deep link pre-fill: navigate to /#/?code=CODE&mode=join"
    expected: "JoinCompModal opens with code field pre-filled and read-only"
    why_human: "Browser behavior with HashRouter query params needs visual confirmation"
  - test: "Rate limiting: 5+ failed PIN attempts within 15 minutes"
    expected: "6th attempt returns 429 'Troppi tentativi. Riprova tra 15 minuti.'"
    why_human: "Requires live DB with login_attempts table and deployed Edge Function"
  - test: "Edge Function deployment with verify_jwt: false"
    expected: "Both competition-create and competition-join callable without JWT header"
    why_human: "Deployment not confirmed in SUMMARY (explicitly deferred to orchestrator)"
---

# Phase 1: Foundation Auth — Verification Report

**Phase Goal:** Chiunque può creare una gara o entrarci — la base tecnica e il flusso identità funzionano end-to-end
**Verified:** 2026-02-21T23:48:53Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from must_haves)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Admin creates competition, receives 6-char code, lands on success screen with code | VERIFIED | competition-create Edge Function (144 lines, full DB logic); CompCreatedScreen renders code prominently with copy-to-clipboard; "Vai al pannello admin" navigates to /admin/:code |
| 2 | Participant joins with code + nickname + PIN; session saved; redirected to voter screen | VERIFIED | competition-join handles new participant (Case A); useAuth.joinCompetition saves session and navigates to /voter/:code based on role |
| 3 | Existing nickname + correct PIN re-authenticates; wrong PIN shows error | VERIFIED | competition-join Case B: compares pin_hash; returns 401 "PIN errato" on mismatch; ReAuthModal shows reAuthState.error |
| 4 | Providing admin password in PIN field grants admin access (AUTH-06) | PARTIAL | Works only for admin's own nickname + admin_pwd_hash. For non-admin participants using admin_pwd_hash, returns participant's role (not admin). AUTH-06 fallback returns wrong role. |
| 5 | Re-auth modal appears on clicking recent competition with expired session; PIN only | PARTIAL | Expired sessions filtered from home pills (getAllSessions TTL filter). Pill never appears → ReAuthModal never triggered. Route guard redirects to full JoinCompModal instead. |
| 6 | Deep link /#/?code=ABC123&mode=join opens JoinCompModal with code pre-filled | VERIFIED | HomeScreen useEffect reads searchParams code+mode on mount; sets deepLinkCode; passes as initialCode to JoinCompModal; code field rendered read-only |
| 7 | Guest voter enters without adding a dish (same join flow, no separate role) | VERIFIED | By design: allow_guests stored but not enforced. Any participant who never adds a dish is a guest voter. SC-3 satisfied. |

**Score (truths):** 5 fully verified, 2 partial

### Required Artifacts

| Artifact | Lines | Exists | Substantive | Wired | Status |
|----------|-------|--------|-------------|-------|--------|
| `supabase/functions/competition-create/index.ts` | 144 | YES | YES (Zod validation, unique code generation, two DB inserts, rollback) | YES (invoked by useAuth) | VERIFIED |
| `supabase/functions/competition-join/index.ts` | 185 | YES | YES (rate limiting, Case A/B, admin fallback, full error codes) | YES (invoked by useAuth) | VERIFIED |
| `src/hooks/useAuth.ts` | 203 | YES | YES (createCompetition, joinCompetition, reAuthenticate, per-op state) | YES (used in all 4 modals) | VERIFIED |
| `src/screens/Home/CreateCompModal.tsx` | 108 | YES | YES (form, loading state, PIN hash, calls createCompetition) | YES (imported in HomeScreen) | VERIFIED |
| `src/screens/Home/JoinCompModal.tsx` | 125 | YES | YES (form, uppercase enforcement, deep-link initialCode, calls joinCompetition) | YES (imported in HomeScreen) | VERIFIED |
| `src/screens/Home/CompCreatedScreen.tsx` | 93 | YES | YES (full-screen, gold code display, clipboard copy, two CTAs) | YES (rendered in HomeScreen on success) | VERIFIED |
| `src/screens/Home/ReAuthModal.tsx` | 95 | YES | YES (center modal, session info display, PIN only, calls reAuthenticate) | YES (imported in HomeScreen) | VERIFIED |
| `src/screens/Home/HomeScreen.tsx` | 176 | YES | YES (hero, session pills, CTAs, deep link useEffect, all modal wiring) | YES (root route in router.tsx) | VERIFIED |
| `src/router.tsx` | 59 | YES | YES (createHashRouter, RequireSession guard, admin/voter placeholder routes) | YES (used in App.tsx via AppRouter) | VERIFIED |
| `src/store/sessionStore.ts` | 92 | YES | YES (Zustand persist, TTL 2h, addSession, getSession, getAllSessions, useHasHydrated) | YES (used in HomeScreen, RequireSession, useAuth) | VERIFIED |
| `src/lib/supabase.ts` | 19 | YES | YES (typed supabase client, env var validation, persistSession: false) | YES (imported in useAuth.ts) | VERIFIED |
| `src/lib/hash.ts` | 13 | YES | YES (deterministic simpleHash, 32-bit conversion, hex output) | YES (imported in all 3 auth modals) | VERIFIED |
| `src/components/ui/Button.tsx` | 67 | YES | YES (5 variants, 3 sizes, no stubs) | YES (used across all screens) | VERIFIED |
| `src/components/ui/Input.tsx` | 33 | YES | YES (labeled input, ember focus) | YES (used in modals) | VERIFIED |
| `src/components/ui/PinInput.tsx` | 82 | YES | YES (4-box, auto-focus-next, backspace-prev, paste-spread) | YES (used in 3 modals) | VERIFIED |
| `src/components/ui/Modal.tsx` | 83 | YES | YES (bottom-sheet + center variants, backdrop close, animation) | YES (used in all modals) | VERIFIED |
| `src/components/ui/Toast.tsx` | 72 | YES | YES (useToast hook, ToastProvider, 3.2s auto-dismiss) | YES (ToastProvider in App.tsx) | VERIFIED |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `src/hooks/useAuth.ts` | `competition-create` Edge Function | `supabase.functions.invoke('competition-create', { body: data })` | WIRED |
| `src/hooks/useAuth.ts` | `competition-join` Edge Function | `supabase.functions.invoke('competition-join', { body: ... })` | WIRED |
| `src/hooks/useAuth.ts` | `src/store/sessionStore.ts` | `addSession(session)` after successful auth | WIRED |
| `src/hooks/useAuth.ts` | `src/router.tsx` routes | `navigate('/admin/:code')` or `navigate('/voter/:code')` | WIRED |
| `src/screens/Home/HomeScreen.tsx` | `CreateCompModal` | `isOpen={showCreate}`, `onClick={() => setShowCreate(true)}` | WIRED |
| `src/screens/Home/HomeScreen.tsx` | `JoinCompModal` | `isOpen={showJoin}`, `initialCode={deepLinkCode}` | WIRED |
| `src/screens/Home/HomeScreen.tsx` | `ReAuthModal` | `isOpen={Boolean(reAuthSession)}`, `session={reAuthSession}` | WIRED |
| `src/screens/Home/HomeScreen.tsx` | deep link params | `useSearchParams()` in `useEffect` on mount | WIRED |
| `src/router.tsx` | `RequireSession` guard | wraps `/admin/:code` and `/voter/:code` routes | WIRED |
| `RequireSession` | session store | `getSession(code)` — returns null for missing/expired sessions | WIRED |

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| AUTH-01: Create competition with name, nickname, PIN | SATISFIED | competition-create + CreateCompModal |
| AUTH-02: Receive 6-char unique code | SATISFIED | generateCode() with uniqueness retry loop |
| AUTH-03: Join competition with code + nickname + PIN | SATISFIED | competition-join Case A + JoinCompModal |
| AUTH-04: Re-authenticate with PIN (nickname pre-filled) | PARTIAL | ReAuthModal only shown for non-expired sessions; expired sessions lose their pill |
| AUTH-05: Wrong PIN shows error | SATISFIED | 401 response, error rendered in modal |
| AUTH-06: Admin access via admin password in PIN field | PARTIAL | Works for admin's own nickname; returns wrong role for non-admin nickname + admin_pwd_hash |
| SHAR-03: Deep link with code pre-filled | SATISFIED | useSearchParams deep link handling in HomeScreen |
| UIDN-01: Home screen hero with CTA | SATISFIED | HomeScreen: flame animation, Cormorant Garamond title, buttons |
| UIDN-02: Recent competitions list | SATISFIED | Session pills rendered from getAllSessions() |
| UIDN-03: Create competition modal | SATISFIED | CreateCompModal: name + nickname + PIN fields |
| UIDN-04: Join competition modal | SATISFIED | JoinCompModal: code + nickname + PIN, uppercase enforcement |

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `src/router.tsx` line 33 | `"Admin Panel — coming soon"` | Info | Intentional placeholder per plan — Phase 2 fills this |
| `src/router.tsx` line 47 | `"Voter Panel — coming soon"` | Info | Intentional placeholder per plan — Phase 2 fills this |

No blocker anti-patterns found. Placeholder screens are explicitly accepted in Phase 1 plan.

### Human Verification Required

#### 1. Edge Function Deployment

**Test:** Run `supabase functions deploy competition-create --no-verify-jwt` and `supabase functions deploy competition-join --no-verify-jwt`
**Expected:** Both functions callable without JWT; curl POST returns valid JSON response
**Why human:** SUMMARY explicitly states deployment was deferred to orchestrator (decision 01-04-d). Deployment status cannot be verified statically.

#### 2. Full Create Competition Flow

**Test:** Open app → click "Crea nuova gara" → fill name "Test Gara", nickname "Chef Mario", PIN 1234 → submit
**Expected:** CompCreatedScreen appears with a 6-character uppercase alphanumeric code; "Copia codice" copies to clipboard; "Vai al pannello admin" loads placeholder admin screen
**Why human:** Requires live Supabase instance with deployed Edge Functions

#### 3. Full Join Competition Flow

**Test:** Open new browser tab → click "Entra con codice" → enter code from step 2, nickname "Luigi", PIN 5678 → submit
**Expected:** Redirected to voter placeholder screen; returning to home shows "Test Gara" competition pill
**Why human:** Requires live Supabase connection

#### 4. Deep Link Pre-fill

**Test:** Navigate browser to `/#/?code=XXXXXX&mode=join` (replace XXXXXX with a real code)
**Expected:** JoinCompModal opens automatically with code field pre-filled (read-only) and other fields empty
**Why human:** Browser HashRouter behavior with query params needs visual confirmation

#### 5. Rate Limiting

**Test:** Attempt 6 rapid POST requests to competition-join with wrong PIN for same code+nickname
**Expected:** 6th attempt returns HTTP 429 with "Troppi tentativi. Riprova tra 15 minuti."
**Why human:** Requires live DB with login_attempts table populated

---

## Gaps Summary

Two gaps are blocking full goal achievement.

**Gap 1 — SC-4 / AUTH-04: Expired session re-auth from home screen (Medium severity)**

The session store's `getAllSessions()` filters out expired sessions before rendering pills. When a user returns after 2+ hours, their competition pill is gone — they have no visual prompt to re-enter and are directed to the full join form. The correct behavior per SC-4 is that expired session pills should still appear and clicking them should open `ReAuthModal` (PIN only, nickname pre-filled), not the full `JoinCompModal`.

The route guard does handle the expired case for direct URL navigation, but the experience degrades (full form shown instead of PIN-only re-auth).

**Fix:** Keep expired sessions visible in the home screen pill list (show a distinct "expired" visual). Clicking an expired pill should open `ReAuthModal` passing the cached session data (code, nickname). `getAllSessions()` should return all sessions; callers that need only valid ones should filter themselves, or a separate `getAllSessionsIncludingExpired()` should be exposed.

**Gap 2 — AUTH-06: Non-admin participant using admin password gets wrong role (Low severity)**

When AUTH-06 fallback fires in `competition-join` (existing participant whose own PIN doesn't match, but admin_pwd_hash does), the function returns the existing participant's record including their `role: 'participant'`. Per the spec, AUTH-06 should return the admin participant record (role='admin'). This only matters for the edge case where a non-admin participant tries to authenticate with the admin password — currently they succeed but get participant-level access instead of admin access.

For the primary SC-1 flow (admin authenticates with their own nickname + PIN), this gap does not trigger because `existingParticipant.pin_hash === pinHash` is true at line 98 and the function returns before reaching the AUTH-06 branch.

**Fix in `competition-join`:** When `admin_pwd_hash === pinHash`, look up the admin participant record (`role = 'admin'` for this competition) and return that record's id/nickname/role instead of `existingParticipant`.

---

*Verified: 2026-02-21T23:48:53Z*
*Verifier: Claude (gsd-verifier)*
