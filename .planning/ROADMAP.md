# Roadmap: Fornelli in Gara

## Overview

Tre fasi per costruire l'app completa: la Fase 1 getta le fondamenta tecniche e il flusso di autenticazione, la Fase 2 costruisce il pannello admin con gestione piatti e foto, la Fase 3 completa il cuore del prodotto con il voto anonimo, la schermata partecipante e la condivisione. Il progetto parte da zero e arriva a un'app deployata su GitHub Pages con backend Supabase operativo.

## Phases

- [x] **Phase 1: Foundation + Auth** - Scaffold, schema Supabase, design system, home screen, flusso autenticazione
- [x] **Phase 2: Admin + Dishes** - Pannello admin completo, CRUD piatti con foto, gestione fasi gara
- [ ] **Phase 3: Voting + Voter Screen + Sharing** - Voto anonimo, schermata partecipante, condivisione e QR code

## Phase Details

### Phase 1: Foundation + Auth
**Goal**: Chiunque può creare una gara o entrarci — la base tecnica e il flusso identità funzionano end-to-end
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, SHAR-03, UIDN-01, UIDN-02, UIDN-03, UIDN-04
**Success Criteria** (what must be TRUE):
  1. Un admin può creare una gara, ricevere un codice 6 caratteri e accedere al pannello admin
  2. Un partecipante può entrare in una gara con codice + soprannome + PIN e vedere la propria schermata
  3. Un ospite votante può entrare senza aggiungere un piatto
  4. Al ritorno, il modal re-auth riappare se la sessione localStorage (TTL 2h) è scaduta
  5. La home screen mostra le gare recenti salvate in localStorage e i CTA crea/entra
**Plans**: 4 plans in 3 waves

Plans:
- [x] 01-01-PLAN.md — Scaffold Vite + React + TS + Tailwind v4 + HashRouter + GH Actions deploy (Wave 1)
- [x] 01-02-PLAN.md — Schema Supabase (6 tabelle + dishes_public view + bucket) + RLS + TypeScript types (Wave 1)
- [x] 01-03-PLAN.md — UI components (Button, Input, PinInput, Modal, Toast) + session store + home screen (Wave 2)
- [x] 01-04-PLAN.md — Auth Edge Functions + create/join/re-auth modals + deep links + routing (Wave 3)

### Phase 2: Admin + Dishes
**Goal**: L'admin ha pieno controllo sulla gara — può gestire piatti, partecipanti, fase e impostazioni
**Depends on**: Phase 1
**Requirements**: COMP-01, COMP-02, COMP-03, DISH-01, DISH-02, DISH-03, DISH-04, DISH-05, DISH-06, ADMN-01, ADMN-02, ADMN-03, ADMN-04
**Success Criteria** (what must be TRUE):
  1. L'admin può aggiungere, modificare ed eliminare piatti (inclusi quelli di altri partecipanti) con foto multiple compresse
  2. Un partecipante può aggiungere il proprio piatto in fase preparation e modificarlo fino all'inizio delle votazioni
  3. L'admin può avanzare la gara da preparation a voting a finished (con conferma, unidirezionale)
  4. Il pannello admin mostra le 4 tab (Piatti, Partecipanti, Classifica, Impostazioni) ciascuna operativa
  5. L'admin può resettare tutti i voti con conferma
**Plans**: 3 plans in 2 waves

Plans:
- [x] 02-01-PLAN.md — Data layer (competitionStore, useCompetition, compress, usePhotoUpload) + AdminScreen shell + PhaseBanner (Wave 1)
- [x] 02-02-PLAN.md — Dishes vertical slice: dish-write/dish-delete EFs + Storage migration + DishCard + PhotoGrid + AddDishModal + DishesTab (Wave 2)
- [x] 02-03-PLAN.md — competition-settings EF + ParticipantsTab + RankingTab + SettingsTab + ParticipantCard (Wave 2)

### Phase 3: Voting + Voter Screen + Sharing
**Goal**: I partecipanti possono votare in modo anonimo e vedere la rivelazione finale — il core value dell'app è realizzato
**Depends on**: Phase 2
**Requirements**: VOTE-01, VOTE-02, VOTE-03, VOTE-04, VOTE-05, SHAR-01, SHAR-02, VOTR-01, VOTR-02, VOTR-03, VOTR-04
**Success Criteria** (what must be TRUE):
  1. Un partecipante può votare esattamente 1 piatto (non il proprio), cambiare voto, e non vedere i nomi dei cuochi durante la votazione
  2. In fase finished, la classifica mostra medaglie, percentuali e rivela chi ha cucinato cosa (con toggle admin)
  3. La schermata partecipante ha 4 tab operative: Vota, Galleria, Classifica (solo in finished), Il mio piatto
  4. Un link di condivisione join o votazione apre direttamente la schermata corretta via URL deep link
  5. L'admin può generare e mostrare un QR code per il link di condivisione
**Plans**: 3 plans in 2 waves

Plans:
- [ ] 03-01-PLAN.md — vote-cast/vote-read EFs + voterStore + useVoterData + VoterScreen shell + VoteTab + mode=vote deep link (Wave 1)
- [ ] 03-02-PLAN.md — DishDetailSheet + GalleryTab (griglia 3col + bottom sheet) + MyDishTab (foto extra in voting) (Wave 2)
- [ ] 03-03-PLAN.md — RankingTab voter + admin RankingTab con voti reali + SettingsTab link/QR adattivi (Wave 2)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation + Auth | 4/4 | Complete | 2026-02-22 |
| 2. Admin + Dishes | 3/3 | Complete | 2026-02-22 |
| 3. Voting + Voter Screen + Sharing | 0/3 | Not started | - |
