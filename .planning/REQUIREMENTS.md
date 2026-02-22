# Requirements: Fornelli in Gara

**Defined:** 2026-02-21
**Core Value:** I partecipanti devono poter votare piatti in modo anonimo e vedere la classifica finale con la rivelazione dei cuochi

## v1 Requirements

### Authentication

- [x] **AUTH-01**: Admin può creare gara con nome, password (min 4 char), proprio soprannome → genera codice 6 char
- [x] **AUTH-02**: Partecipante può entrare in gara con codice + soprannome + PIN 4 cifre
- [x] **AUTH-03**: Soprannome esistente + PIN corretto → ri-autentica; PIN errato → errore
- [x] **AUTH-04**: Sessione salvata in localStorage con TTL 2h, modal re-auth al ritorno
- [x] **AUTH-05**: Ospite votante può entrare per votare senza aggiungere un piatto
- [x] **AUTH-06**: Fornire password admin nel campo PIN → accesso come admin

### Competition

- [ ] **COMP-01**: Gara ha 3 fasi: preparation → voting → finished (transizioni unidirezionali)
- [ ] **COMP-02**: Solo admin può cambiare fase (con conferma)
- [ ] **COMP-03**: Admin può resettare tutti i voti (con conferma, azione irreversibile)

### Dishes

- [ ] **DISH-01**: Admin può creare piatto con nome*, cuoco*, ingredienti, ricetta, storia, foto
- [ ] **DISH-02**: Partecipante può aggiungere il proprio piatto (max 1) in fase preparation
- [ ] **DISH-03**: Partecipante può modificare il proprio piatto fino a inizio votazioni
- [ ] **DISH-04**: Admin può modificare/eliminare qualsiasi piatto (elimina anche voti associati)
- [ ] **DISH-05**: Upload foto multiple con compressione client-side (800px max, 0.72 JPEG)
- [ ] **DISH-06**: Partecipante può aggiungere foto extra al proprio piatto in fase voting

### Voting

- [ ] **VOTE-01**: Partecipante vota esattamente 1 piatto in fase voting (non il proprio)
- [ ] **VOTE-02**: Voto può essere cambiato (sovrascrive il precedente)
- [ ] **VOTE-03**: Nomi cuochi nascosti a partecipanti durante preparation e voting
- [ ] **VOTE-04**: Classifica con ordinamento voti, medaglie top 3, percentuali, barra progresso
- [ ] **VOTE-05**: In fase finished, nomi cuochi rivelati; admin ha toggle reveal

### Sharing

- [ ] **SHAR-01**: Link condivisione join (?code=X&mode=join) e votazione (?code=X&mode=vote)
- [ ] **SHAR-02**: QR code generato in-app per link di condivisione
- [x] **SHAR-03**: Home screen con lista gare recenti da localStorage

### Admin Panel

- [ ] **ADMN-01**: Tab Piatti — lista piatti con foto, cuoco, ingredienti, azioni modifica/elimina
- [ ] **ADMN-02**: Tab Partecipanti — lista con avatar, soprannome, stato piatto/voto
- [ ] **ADMN-03**: Tab Classifica — classifica con toggle reveal cuochi
- [ ] **ADMN-04**: Tab Impostazioni — codice gara, fase, contatori, cambio fase, reset voti, link/QR

### Voter Screen

- [ ] **VOTR-01**: Tab Vota — banner fase, status bar voto, lista piatti votabili con card espandibili
- [ ] **VOTR-02**: Tab Galleria — griglia 3 colonne, tap → bottom sheet dettaglio piatto
- [ ] **VOTR-03**: Tab Classifica — visibile solo in fase finished
- [ ] **VOTR-04**: Tab Il mio piatto — modifica in preparation, read-only + foto extra in voting

### UI/Design

- [x] **UIDN-01**: Design system completo: palette, tipografia, ombre, radius, texture grain
- [x] **UIDN-02**: Home screen dark con hero animato, gare recenti, CTA crea/entra
- [x] **UIDN-03**: Componenti: bottoni pill, form inputs, PIN input 4 box, upload zone, toast
- [x] **UIDN-04**: Animazioni: screenIn, sheetUp, fadeUp, popIn, flicker fiamma, pulse, spin

## v2 Requirements

### Real-time

- **RTIM-01**: Sync in tempo reale con WebSocket/polling
- **RTIM-02**: Notifiche push quando le votazioni aprono

### Export

- **EXPT-01**: Export classifica come PDF o immagine

### Contest Management

- **MGMT-01**: Timer votazione con countdown
- **MGMT-02**: Limite massimo partecipanti per gara
- **MGMT-03**: Eliminazione gara

## Out of Scope

| Feature | Reason |
|---------|--------|
| OAuth/login social | Nickname + PIN sufficiente per gare tra amici |
| App mobile nativa | Web mobile-first, progressive enhancement |
| Multi-criteria voting | Alta complessità, basso valore per gare informali |
| Masonry/Pinterest layout galleria | Griglia 3 colonne uniforme è il pattern corretto per food apps |
| Crittografia forte (bcrypt) | App non gestisce dati sensibili, hash semplice sufficiente |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| AUTH-05 | Phase 1 | Complete |
| AUTH-06 | Phase 1 | Complete |
| COMP-01 | Phase 2 | Pending |
| COMP-02 | Phase 2 | Pending |
| COMP-03 | Phase 2 | Pending |
| DISH-01 | Phase 2 | Pending |
| DISH-02 | Phase 2 | Pending |
| DISH-03 | Phase 2 | Pending |
| DISH-04 | Phase 2 | Pending |
| DISH-05 | Phase 2 | Pending |
| DISH-06 | Phase 2 | Pending |
| VOTE-01 | Phase 3 | Pending |
| VOTE-02 | Phase 3 | Pending |
| VOTE-03 | Phase 3 | Pending |
| VOTE-04 | Phase 3 | Pending |
| VOTE-05 | Phase 3 | Pending |
| SHAR-01 | Phase 3 | Pending |
| SHAR-02 | Phase 3 | Pending |
| SHAR-03 | Phase 1 | Complete |
| ADMN-01 | Phase 2 | Pending |
| ADMN-02 | Phase 2 | Pending |
| ADMN-03 | Phase 2 | Pending |
| ADMN-04 | Phase 2 | Pending |
| VOTR-01 | Phase 3 | Pending |
| VOTR-02 | Phase 3 | Pending |
| VOTR-03 | Phase 3 | Pending |
| VOTR-04 | Phase 3 | Pending |
| UIDN-01 | Phase 1 | Complete |
| UIDN-02 | Phase 1 | Complete |
| UIDN-03 | Phase 1 | Complete |
| UIDN-04 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 35 total
- Mapped to phases: 35
- Unmapped: 0

---
*Requirements defined: 2026-02-21*
*Last updated: 2026-02-22 after Phase 1 completion*
