# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** Partecipanti votano piatti in modo anonimo e vedono la classifica finale con rivelazione dei cuochi
**Current focus:** Phase 3 completa — Voting + Voter Screen + Sharing

## Current Position

Phase: 3 of 3 (Voting + Voter Screen + Sharing)
Plan: 3 of 3 in phase
Status: Phase COMPLETE
Last activity: 2026-02-22 — Completed 03-03-PLAN.md (Ranking + Sharing)

Progress: [██████████] 100% (10/10 plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 10
- Average duration: ~6min
- Total execution time: ~62min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-auth | 4/4 | ~24min | ~6min |
| 02-admin-dishes | 3/3 | ~26min | ~9min |
| 03-voting-voter-screen-sharing | 3/3 | ~20min | ~7min |

**Recent Trend:**
- Last 5 plans: 9min, 8min, 8min, 8min, 3min
- Trend: stable, ultimo piano molto veloce (aggiornamenti UI)

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Pre-Phase 1]: HashRouter obbligatorio per GitHub Pages — BrowserRouter rompe deep link e QR join URL
- [Pre-Phase 1]: Split SDK (letture anon) + Edge Functions (scritture + business logic) — RLS non sufficiente per integrità voti
- [Pre-Phase 1]: dishes_public view nasconde participant_id e chef_name in fasi non-finished — protezione identità chef a livello DB
- [01-01]: createHashRouter scelto su HashRouter component — data-router API, compatibilità loaders/actions future
- [01-01]: Tailwind v4 @theme confermato — no tailwind.config.js, tutti i token in CSS
- [01-02]: anon_read_dishes policy su dishes table è permissiva — protezione identità delegata alla view dishes_public + Edge Functions
- [01-02]: votes e login_attempts senza policy anon = default deny — solo service_role via Edge Functions
- [01-02]: persistSession: false nel client Supabase — custom PIN auth, mai Supabase Auth
- [01-02]: Supabase project ref = rfwnqcztshenpezhnusd (progetto "MVP_Cisco", eu-west-1)
- [01-04]: Edge Functions deployate con verify_jwt: false via supabase-local MCP
- [01-04]: competition-join gestisce sia nuovo partecipante che re-auth in un solo endpoint
- [02-01]: competitionStore senza persist middleware — server-authoritative, reset() obbligatorio sull'unmount
- [02-01]: Admin legge da dishes table direttamente (non dishes_public) — chef_name visibile in tutte le fasi
- [02-01]: Tab navigation via useState — niente sub-routes per tab admin, stato ephemero
- [02-01]: getPublicUrl è sincrono (no await) — deriva URL dal path senza network call
- [02-02]: dishId pre-generato client-side (crypto.randomUUID) — EF verifica esistenza in DB per distinguere create/edit
- [02-02]: Photo UPSERT = delete+reinsert — semplifica gestione ordine, evita conflitti
- [02-02]: dish-delete Storage cleanup non-fatal — log errore ma prosegue con DB delete
- [02-03]: QR code via api.qrserver.com external API come <img> — evita dipendenza npm
- [02-03]: competition-settings EF: fase advance unidirezionale enforced server-side
- [03-01]: VoterPhaseBanner inline in VoterScreen — PhaseBanner hardcoded su competitionStore, no refactoring cross-store
- [03-01]: voterStore senza persist (identico a competitionStore) — server-authoritative con reset() su unmount
- [03-01]: vote-cast usa onConflict='competition_id,participant_id' per upsert atomico 1 voto per partecipante
- [03-01]: voteCounts aggregati lato JS da array flat (Map dish_id → count) — 5-20 righe, no rpc() overengineering
- [03-02]: DishDetailSheet usa createPortal diretto (non Modal component) per foto hero full-width senza padding
- [03-02]: MyDishTab mostra 'Il tuo piatto' come label (non chef_name) — dishes_public nasconde chef_name in voting
- [03-02]: Foto extra voting: array completo (esistenti + nuove) passato a dish-write EF (pattern delete+reinsert)
- [03-03]: useCompetition riceve participantId opzionale — vote-read chiamato solo se disponibile (admin sempre ha participantId)
- [03-03]: Link condivisione adattivo: phase==='voting' ? voteUrl : joinUrl — stessa logica per QR e clipboard
- [03-03]: QR adattivo: img src stessa di prima, data= usa shareUrl derivato dalla fase

### Pending Todos

- [03-01]: Deployare vote-cast e vote-read EF via supabase-local MCP con verify_jwt: false

### Blockers/Concerns

- [03-01]: vote-cast e vote-read EF scritte ma non deployate — CLI richiede SUPABASE_ACCESS_TOKEN non disponibile in bash. Orchestratore deve deployare via MCP prima del testing end-to-end.
- [Phase 3]: Non-admin possono accedere a /admin/:code se hanno sessione valida — considerare guardia ruolo (non urgente)

## Session Continuity

Last session: 2026-02-22
Stopped at: 03-03-PLAN.md complete — Fase 3 completata, build OK
Resume file: N/A
