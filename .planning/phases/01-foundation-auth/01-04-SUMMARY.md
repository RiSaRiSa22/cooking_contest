---
phase: 01-foundation-auth
plan: "04"
subsystem: auth-flow
tags: [edge-functions, supabase, react, modal, deep-link, session, zod, cors]

dependency-graph:
  requires: ["01-02", "01-03"]
  provides: ["competition-create edge function", "competition-join edge function", "auth modals", "session management UI", "route guards", "deep link handling"]
  affects: ["02-admin", "02-voter", "any feature needing auth context"]

tech-stack:
  added: []
  patterns:
    - "Supabase Edge Functions with Deno + npm: imports for Zod and supabase-js"
    - "Custom PIN auth via simpleHash client-side before Edge Function call"
    - "useAuth hook centralizes all auth logic with per-operation loading/error state"
    - "HashRouter deep link pattern via useSearchParams"
    - "RequireSession route guard pattern with redirect-to-reauth"

key-files:
  created:
    - supabase/functions/competition-create/index.ts
    - supabase/functions/competition-join/index.ts
    - src/hooks/useAuth.ts
    - src/screens/Home/CreateCompModal.tsx
    - src/screens/Home/JoinCompModal.tsx
    - src/screens/Home/CompCreatedScreen.tsx
    - src/screens/Home/ReAuthModal.tsx
  modified:
    - src/screens/Home/HomeScreen.tsx
    - src/router.tsx

decisions:
  - id: "01-04-a"
    decision: "extractErrorMessage helper for Supabase FunctionsHttpError body parsing"
    rationale: "supabase.functions.invoke error object wraps body in context.responseBody — must parse to get user-facing error string"
  - id: "01-04-b"
    decision: "ReAuthModal opens on session pill click (not direct navigate)"
    rationale: "Sessions stored in Zustand with TTL; clicking a session always shows ReAuthModal to confirm identity before navigating"
  - id: "01-04-c"
    decision: "competition-join handles both new participant and re-auth in one endpoint"
    rationale: "Simplifies frontend; nickname-based lookup determines path automatically; admin fallback via admin_pwd_hash (AUTH-06)"
  - id: "01-04-d"
    decision: "Edge Functions NOT deployed in this task — supabase-local MCP deploy_edge_function must be called from orchestrator"
    rationale: "Sub-agent execution context lacks MCP tool access and Supabase CLI auth"

metrics:
  duration: "~7 min"
  completed: "2026-02-22"
  tasks-completed: 2
  tasks-total: 3
  stopped-at: "Task 3 (checkpoint:human-verify)"
---

# Phase 1 Plan 4: Auth Flow — Edge Functions + Frontend Modals Summary

**One-liner:** Supabase Edge Functions for competition-create/join with Zod validation + React modal auth flow with deep link support and route guards.

## What Was Built

### Task 1: Edge Functions

**`supabase/functions/competition-create/index.ts`**
- POST endpoint accepting `{ name, nickname, pinHash, allowGuests?, maxParticipants? }`
- Validates with Zod (`npm:zod`, `z.string().min(1)`)
- Generates unique 6-char uppercase alphanumeric code (max 5 retry attempts)
- Inserts into `competitions` (phase = 'preparation') and `participants` (role = 'admin')
- Returns `{ code, competitionId, participantId, nickname, role: 'admin' }`
- CORS headers with OPTIONS preflight

**`supabase/functions/competition-join/index.ts`**
- POST endpoint accepting `{ code, nickname, pinHash }`
- Rate limiting: 5 attempts per code+nickname in 15 minutes via `login_attempts` table
- Case A (new participant): checks max_participants, inserts participant, returns 201
- Case B (re-auth): compares pinHash → participant hash → admin_pwd_hash (AUTH-06 fallback)
- Error codes: 400 validation, 401 wrong PIN, 403 full, 404 not found, 429 rate limited
- CORS headers with OPTIONS preflight

### Task 2: Frontend Auth UI

**`src/hooks/useAuth.ts`**
- `createCompetition()`: calls competition-create, stores session, returns result
- `joinCompetition()`: calls competition-join, stores session, navigates to admin/voter
- `reAuthenticate()`: calls competition-join with stored nickname, refreshes authenticatedAt
- Per-operation loading + error state; `extractErrorMessage` helper for Supabase error body

**Modals:**
- `CreateCompModal`: bottom-sheet, name + nickname + PIN fields
- `JoinCompModal`: bottom-sheet, code (uppercase, read-only if deep link) + nickname + PIN
- `CompCreatedScreen`: full-screen dark success view with gold code display + copy-to-clipboard
- `ReAuthModal`: center variant, read-only session info, PIN input only

**`HomeScreen.tsx` wiring:**
- "Crea nuova gara" → CreateCompModal
- "Entra con codice" → JoinCompModal
- Session pill click → ReAuthModal
- Deep link `?code=CODE&mode=join` → auto-opens JoinCompModal with pre-filled code

**`router.tsx` route guards:**
- `RequireSession` component checks session validity for `/admin/:code` and `/voter/:code`
- If missing/expired: redirects to `/?code=:code&mode=join` for re-auth

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused `navigate` import in HomeScreen**

- **Found during:** Build verification
- **Issue:** `useNavigate()` imported and called but not used (navigation handled by child components)
- **Fix:** Removed import and variable declaration
- **Files modified:** `src/screens/Home/HomeScreen.tsx`
- **Commit:** 089c0bc

## Authentication Gates

None during this plan execution.

## Pending (Requires Orchestrator)

**Edge Function Deployment:**
The two Edge Functions are written and committed but NOT yet deployed to Supabase. Deployment requires the `supabase-local` MCP `deploy_edge_function` tool with `verify_jwt: false`, which is only accessible from the orchestrator context (not sub-agent Bash).

Run from orchestrator before proceeding to Task 3 verification:
1. Deploy `competition-create` with `verify_jwt: false`
2. Deploy `competition-join` with `verify_jwt: false`

## TypeScript Status

`npx tsc --noEmit` and `npm run build` both pass with zero errors.

## Next Phase Readiness

- Auth flow is complete end-to-end (pending Edge Function deployment)
- Session store integration working
- Route guards in place
- Phase 2 (Admin + Voter screens) can proceed once Task 3 is verified
