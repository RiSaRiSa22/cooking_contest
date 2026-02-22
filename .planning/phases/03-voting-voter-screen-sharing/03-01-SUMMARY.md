---
phase: 03-voting-voter-screen-sharing
plan: "01"
subsystem: ui
tags: [supabase-edge-functions, zustand, react, realtime, voting, zod, deno, dishes_public]

# Dependency graph
requires:
  - phase: 01-foundation-auth
    provides: sessionStore, supabase client, UI components (Button, Modal, Toast), router with RequireSession guard
  - phase: 02-admin-dishes
    provides: competitionStore pattern, AdminScreen shell pattern, PhaseBanner, useCompetition hook pattern
provides:
  - vote-cast Edge Function: upsert atomico voto con verifiche phase, ownership, competition
  - vote-read Edge Function: lettura voto corrente + myDishId + voteCounts aggregati
  - voterStore: Zustand store per dati voter (dishes_public, myVotedDishId, myDishId, voteCounts)
  - useVoterData: hook fetch + Realtime subscription per voter
  - VoterScreen: shell con header, VoterPhaseBanner, 3-4 tab navigation
  - VoteTab: lista piatti votabili con card espandibili, voto/cambio voto, status bar
  - mode=vote deep link support in HomeScreen
affects:
  - 03-02 (GalleryTab, MyDishTab — riutilizzano voterStore e VoterScreen)
  - 03-03 (RankingTab — legge voteCounts da voterStore)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "voterStore: identico a competitionStore, no persist, reset() su unmount"
    - "useVoterData: Plan A (dishes_public + photos join diretto), fallback Plan B (due query separate + join JS)"
    - "VoteTab: card espandibili via useState per ogni card (no global accordion state)"
    - "VoterPhaseBanner inline in VoterScreen — non importa PhaseBanner da competitionStore"
    - "vote-cast: upsert atomico con onConflict='competition_id,participant_id'"
    - "vote-read: aggregazione voteCounts lato JS da array flat (5-20 righe, overengineering evitato)"

key-files:
  created:
    - supabase/functions/vote-cast/index.ts
    - supabase/functions/vote-read/index.ts
    - src/store/voterStore.ts
    - src/hooks/useVoterData.ts
    - src/screens/Voter/VoterScreen.tsx
    - src/screens/Voter/tabs/VoteTab.tsx
  modified:
    - src/router.tsx
    - src/screens/Home/HomeScreen.tsx

key-decisions:
  - "VoterPhaseBanner inline in VoterScreen (non riutilizza PhaseBanner) — PhaseBanner hardcoded su competitionStore"
  - "Tab Classifica fisicamente nascosta quando phase !== finished — filter su visibleTabs array"
  - "EF deployment tramite supabase-local MCP (non CLI Bash) — CLI richiede auth token non disponibile in sub-agent"
  - "VoteTab implementato in Task 2 (non Task 3 separato) — aveva dipendenza su voterStore già scritto"

patterns-established:
  - "VoterScreen: sticky 62px header + VoterPhaseBanner + scrollable pb-24 + fixed 64px tab bar (identico ad AdminScreen)"
  - "DishVoteCard: useState expanded per carta, collapsed mostra foto+nome+emoji, expanded mostra dettagli + bottone vota"
  - "vote-cast error handling: FunctionsHttpError.context.responseBody JSON parse per messaggio utente"

# Metrics
duration: ~9min
completed: 2026-02-22
---

# Phase 3 Plan 01: Voting Flow — Edge Functions + VoterScreen + VoteTab Summary

**vote-cast e vote-read Edge Functions con upsert atomico + voterStore Zustand + VoterScreen con VoteTab a card espandibili per voto anonimo**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-02-22T01:40:00Z
- **Completed:** 2026-02-22T01:49:11Z
- **Tasks:** 3 (Task 2 e 3 unificati in un commit)
- **Files modified:** 8 (6 creati, 2 modificati)

## Accomplishments

- Due Edge Functions Deno deployabili: vote-cast (upsert atomico con 4 verifiche in sequenza) e vote-read (3 query parallele + aggregazione JS)
- voterStore Zustand identico al pattern competitionStore: no persist, reset() su unmount, Map<string,number> per voteCounts
- VoterScreen shell con header gold/ink, VoterPhaseBanner inline, 3-4 tab (classifica visibile solo in finished)
- VoteTab: status bar contestuale, lista piatti da dishes_public ordinata per nome, card espandibili con foto hero, disabilita proprio piatto con overlay, voto e cambio voto con feedback visivo checkmark e bordo ember
- mode=vote deep link in HomeScreen (identico a mode=join — apre JoinCompModal)

## Task Commits

1. **Task 1: vote-cast e vote-read Edge Functions** - `fc5c8cf` (feat)
2. **Task 2+3: voterStore + useVoterData + VoterScreen + VoteTab + router + deep link** - `5f9bd2b` (feat)

## Files Created/Modified

- `supabase/functions/vote-cast/index.ts` - EF upsert voto con verifiche phase/ownership/competition
- `supabase/functions/vote-read/index.ts` - EF lettura voto + myDishId + voteCounts aggregati in JS
- `src/store/voterStore.ts` - Zustand store voter (dishes, myVotedDishId, myDishId, voteCounts Map)
- `src/hooks/useVoterData.ts` - Hook fetch dishes_public + vote-read + Realtime phase subscription
- `src/screens/Voter/VoterScreen.tsx` - Shell con VoterPhaseBanner inline, 3-4 tab condizionali
- `src/screens/Voter/tabs/VoteTab.tsx` - Lista piatti votabili con card espandibili e voto atomico
- `src/router.tsx` - /voter/:code ora punta a VoterScreen (rimosso placeholder)
- `src/screens/Home/HomeScreen.tsx` - Aggiunto else-if mode=vote (stessa logica di mode=join)

## Decisions Made

- **VoterPhaseBanner inline**: PhaseBanner esistente legge da competitionStore; invece di refactoring PhaseBanner (Rule 4 - architetturale), la variante voter è inlineata in VoterScreen. Soluzione pragmatica senza dipendenze cross-store.
- **Task 2 e 3 unificati**: VoteTab aveva già accesso a voterStore e session nel momento in cui erano pronti, quindi implementato nella stessa sessione evitando un commit intermedio con placeholder.
- **EF deployment via MCP**: CLI Supabase richiede access token non disponibile in bash sub-agent. Deployment tramite supabase-local MCP `deploy_edge_function` con `verify_jwt: false` (pattern stabilito in 01-04).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed unused `updatePhase` destructuring in useVoterData**

- **Found during:** Build verification
- **Issue:** `updatePhase` era destrutturato ma non utilizzato nel body del hook (il Realtime callback accede a `useVoterStore.getState().updatePhase()` direttamente)
- **Fix:** Rimosso dall'array destrutturato
- **Files modified:** `src/hooks/useVoterData.ts`
- **Committed in:** 5f9bd2b

**2. [Rule 1 - Bug] Fixed null check on code param in VoterScreen**

- **Found during:** Build verification
- **Issue:** TypeScript error: `session?.competitionId` ritornava `string | null` ma `useVoterData` accettava `string`
- **Fix:** Aggiunto fallback `?? ''` per entrambi i parametri session
- **Files modified:** `src/screens/Voter/VoterScreen.tsx`
- **Committed in:** 5f9bd2b

---

**Total deviations:** 2 auto-fixed (2 x Rule 1 - Bug)
**Impact on plan:** Entrambi trovati durante build verification, risolti prima del commit. Nessun impatto funzionale.

## Issues Encountered

- **EF deployment bloccato**: La CLI Supabase richiede `SUPABASE_ACCESS_TOKEN` che non era disponibile nell'ambiente bash. I file EF sono scritti e committati. Deployment richiede l'orchestratore con accesso al MCP `supabase-local`.

## User Setup Required

**Edge Functions da deployare prima del testing end-to-end:**

L'orchestratore deve chiamare `supabase-local` MCP `deploy_edge_function` per:
1. `vote-cast` con `verify_jwt: false`
2. `vote-read` con `verify_jwt: false`

In alternativa, se la CLI è autenticata:
```bash
npx supabase functions deploy vote-cast --no-verify-jwt
npx supabase functions deploy vote-read --no-verify-jwt
```

## Next Phase Readiness

- voterStore e useVoterData pronti per GalleryTab (03-02) e RankingTab (03-03)
- VoterScreen con tab placeholder "Coming soon" pronto per GalleryTab, RankingTab, MyDishTab
- VoteTab funzionale end-to-end pending EF deployment
- `npm run build` passa senza errori TypeScript

---
*Phase: 03-voting-voter-screen-sharing*
*Completed: 2026-02-22*
