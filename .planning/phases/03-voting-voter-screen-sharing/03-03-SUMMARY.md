---
phase: 03-voting-voter-screen-sharing
plan: "03"
subsystem: ui
tags: [zustand, react, vote-counts, ranking, sharing, qr-code, adaptive-links]

# Dependency graph
requires:
  - phase: 03-voting-voter-screen-sharing
    plan: "01"
    provides: voterStore con voteCounts, vote-read EF
  - phase: 02-admin-dishes
    plan: "03"
    provides: Admin RankingTab placeholder, SettingsTab con QR
provides:
  - Voter RankingTab: classifica finale con voti reali, medaglie, percentuali, chef reveal automatico
  - Admin RankingTab: sort per voti reali (non piu alfabetico), percentuali, barre progresso
  - useCompetition: carica vote counts via vote-read EF (admin)
  - competitionStore: voteCounts Map<string,number>
  - SettingsTab: contatore voti reale + link/QR adattivi per fase
affects:
  - Nessun piano successivo — fase 3 completata

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "competitionStore.voteCounts: Map<string,number> identico al pattern voterStore"
    - "useCompetition: participantId opzionale — vote-read chiamato solo se disponibile"
    - "Link adattivo: phase === 'voting' ? voteUrl : joinUrl — stessa logica per QR e clipboard"
    - "Admin RankingTab: sort voteCounts DESC, tie-break localeCompare ASC"

key-files:
  created:
    - src/screens/Voter/tabs/RankingTab.tsx
  modified:
    - src/store/competitionStore.ts
    - src/hooks/useCompetition.ts
    - src/screens/Admin/AdminScreen.tsx
    - src/screens/Admin/tabs/RankingTab.tsx
    - src/screens/Admin/tabs/SettingsTab.tsx
    - src/screens/Voter/VoterScreen.tsx
    - src/screens/Voter/tabs/MyDishTab.tsx

key-decisions:
  - "participantId passato come secondo param opzionale a useCompetition — non richiede refactoring del caller contract"
  - "vote-read usato anche dall'admin (con il suo participantId) — restituisce voteCounts per tutta la competition"
  - "MyDishTab null-check fix incluso in Task 1 — pre-esistente da 03-02, bloccava la build"

patterns-established:
  - "Link condivisione adattivo: 3 fasi, 2 URL (joinUrl/voteUrl), 1 shareUrl derivato"
  - "QR code adattivo: stessa img src ma data= usa shareUrl — aggiorna automaticamente al cambio fase"

# Metrics
duration: ~3min
completed: 2026-02-22
---

# Phase 3 Plan 03: Classifica con voti reali + Condivisione adattiva Summary

**Classifica voter e admin con voteCount reali da vote-read EF + link/QR adattivi per fase (join↔vote)**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-22T01:55:00Z
- **Completed:** 2026-02-22T01:58:00Z
- **Tasks:** 2
- **Files modified:** 8 (1 creato, 7 modificati)

## Accomplishments

- Voter RankingTab completa: medaglie top 3, conteggio voti, percentuale, barra progresso ember, chef reveal automatico da dishes_public in finished
- Admin RankingTab aggiornata: sort per voteCount DESC (non piu alfabetico), percentuali e barre progress identiche al voter
- competitionStore esteso con `voteCounts: Map<string,number>` e `setVoteCounts`
- useCompetition ora carica vote counts via vote-read EF quando participantId disponibile (admin sempre ha participantId)
- SettingsTab: contatore voti reale (0 in preparation, incrementa in voting), link/QR adattivi per fase, link testuale visibile per debug

## Task Commits

1. **Task 1: Ranking con voti reali (voter + admin) + useCompetition vote counts** - `b947958` (feat)
2. **Task 2: SettingsTab contatore voti + link/QR adattivi** - `e0178b3` (feat)

## Files Created/Modified

- `src/store/competitionStore.ts` - Aggiunto voteCounts Map + setVoteCounts setter
- `src/hooks/useCompetition.ts` - Carica vote counts via vote-read EF dopo load iniziale
- `src/screens/Admin/AdminScreen.tsx` - Passa participantId a useCompetition
- `src/screens/Admin/tabs/RankingTab.tsx` - Sort per voti reali, percentuali, barre progresso
- `src/screens/Admin/tabs/SettingsTab.tsx` - Voti reali, link adattivo, QR adattivo
- `src/screens/Voter/tabs/RankingTab.tsx` - Classifica finale con chef reveal automatico
- `src/screens/Voter/VoterScreen.tsx` - Usa RankingTab reale (rimosso placeholder)
- `src/screens/Voter/tabs/MyDishTab.tsx` - Fix null check pre-esistente

## Decisions Made

- **vote-read per admin**: L'admin ha sempre un participantId (creato da competition-create). useCompetition riceve participantId come secondo parametro opzionale — non richiede cambio del tipo di sessione.
- **RankingTab voter guard**: Tab fisicamente rimossa da visibleTabs in VoterScreen (filtro su fase). Guard interno aggiunto per sicurezza (mostra messaggio invece di classifica vuota se raggiunta in modo imprevisto).
- **QR adattivo**: Stessa img src di prima, ma `data=` usa `shareUrl` derivato dalla fase. Nessuna dipendenza aggiuntiva.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed null check su myDish in MyDishTab async closure**

- **Found during:** Task 1 — build verification
- **Issue:** TypeScript `TS18047: 'myDish' is possibly 'null'` nella closure async `handleAddExtraPhoto`. Il guard a line 43 (`if (!myDish) return`) non viene tracciato da TypeScript dentro la closure async.
- **Fix:** Aggiunto `!myDish` al guard iniziale della funzione + cattura `const currentDish = myDish` prima dell'`await` per preservare il riferimento tipizzato.
- **Files modified:** `src/screens/Voter/tabs/MyDishTab.tsx`
- **Committed in:** b947958

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Bug pre-esistente da 03-02 che bloccava la build. Risolto inline durante Task 1.

## Next Phase Readiness

- Fase 3 completa: VoteTab + GalleryTab + RankingTab + MyDishTab tutti implementati
- Classifica voter e admin usano voti reali — core value completato
- Link/QR adattivi completano l'onboarding flow
- `npm run build` passa senza errori TypeScript
- EF vote-cast e vote-read da deployare (pendente da 03-01)

---
*Phase: 03-voting-voter-screen-sharing*
*Completed: 2026-02-22*
