# Roadmap: Fornelli in Gara

## Overview

Tre fasi per costruire l'app completa: la Fase 1 getta le fondamenta tecniche e il flusso di autenticazione, la Fase 2 costruisce il pannello admin con gestione piatti e foto, la Fase 3 completa il cuore del prodotto con il voto anonimo, la schermata partecipante e la condivisione. Il progetto parte da zero e arriva a un'app deployata su GitHub Pages con backend Supabase operativo.

## Phases

- [ ] **Phase 1: Foundation + Auth** - Scaffold, schema Supabase, design system, home screen, flusso autenticazione
- [ ] **Phase 2: Admin + Dishes** - Pannello admin completo, CRUD piatti con foto, gestione fasi gara
- [ ] **Phase 3: Voting + Voter Screen + Sharing** - Voto anonimo, schermata partecipante, condivisione e QR code

## Phase Details

### Phase 1: Foundation + Auth
**Goal**: Chiunque può creare una gara o entrarci — la base tecnica e il flusso identità funzionano end-to-end
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, SHAR-03, UIDN-01, UIDN-02, UIDN-03, UIDN-04
**Success Criteria** (what must be TRUE):
  1. Un admin può creare una gara, ricevere un codice 6 caratteri e accedere al pannello admin
  2. Un partecipante può entrare in una gara con codice + soprannome + PIN e vedere la propria schermata
  3. Un ospite votante può entrare senza aggiungere un piatto
  4. Al ritorno, il modal re-auth riappare se la sessione localStorage (TTL 2h) è scaduta
  5. La home screen mostra le gare recenti salvate in localStorage e i CTA crea/entra
**Plans**: TBD

Plans:
- [ ] 01-01: Scaffold Vite + React + TypeScript, HashRouter, Tailwind v4, GitHub Actions deploy su gh-pages
- [ ] 01-02: Schema Supabase (5 tabelle + dishes_public view + bucket), RLS policies, tipi TypeScript generati
- [ ] 01-03: Design system (palette, tipografia, componenti base: bottoni pill, form inputs, PIN input, toast) + home screen
- [ ] 01-04: Auth flow: Edge Functions competition-create e competition-join, sessionStore Zustand, modal re-auth

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
**Plans**: TBD

Plans:
- [ ] 02-01: AdminScreen shell + Tab Piatti (lista piatti, DishCard, AddDishModal con upload foto + compressione client-side)
- [ ] 02-02: Edge Functions dish-write e dish-delete; useCompetition hook + competitionStore Zustand
- [ ] 02-03: Tab Partecipanti, Tab Classifica (admin view), Tab Impostazioni (cambio fase + reset voti via competition-settings Edge Function)

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
**Plans**: TBD

Plans:
- [ ] 03-01: VoterScreen shell + Tab Vota (banner fase, status bar, lista piatti votabili) + vote-cast Edge Function
- [ ] 03-02: Tab Galleria (griglia 3 colonne + DishDetailSheet bottom sheet) + Tab Il mio piatto (foto extra in voting)
- [ ] 03-03: Tab Classifica con rivelazione cuochi + link condivisione (deep linking HashRouter) + QR code (qrcode.react)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation + Auth | 0/4 | Not started | - |
| 2. Admin + Dishes | 0/3 | Not started | - |
| 3. Voting + Voter Screen + Sharing | 0/3 | Not started | - |
