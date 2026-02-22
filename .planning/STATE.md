# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** Partecipanti votano piatti in modo anonimo e vedono la classifica finale con rivelazione dei cuochi
**Current focus:** Phase 3 — Voting + Voter Screen + Sharing

## Current Position

Phase: 3 of 3 (Voting + Voter Screen + Sharing)
Plan: Not started
Status: Ready for planning
Last activity: 2026-02-22 — Phase 2 complete and verified

Progress: [███████░░░] 67% (2/3 phases complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 7
- Average duration: ~7min
- Total execution time: ~50min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-auth | 4/4 | ~24min | ~6min |
| 02-admin-dishes | 3/3 | ~26min | ~9min |

**Recent Trend:**
- Last 5 plans: 3min, 7min, 2min, 15min, 8min
- Trend: stable

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
- [02-03]: RankingTab usa ordine alfabetico come placeholder — classifica per voti rimandata a Fase 3
- [02-03]: competition-settings EF: fase advance unidirezionale enforced server-side

### Pending Todos

None for Phase 2.

### Blockers/Concerns

- [Phase 3]: VoterScreen deve leggere da dishes_public (non dishes) — chef_name nascosto in preparation e voting
- [Phase 3]: vote-cast EF deve verificare: phase===voting, 1 voto max, non il proprio piatto
- [Phase 3]: Router /voter/:code ha placeholder — VoterScreen lo sostituirà
- [Phase 3]: Non-admin possono accedere a /admin/:code se hanno sessione valida — considerare guardia ruolo

## Session Continuity

Last session: 2026-02-22
Stopped at: Phase 2 complete — ready for Phase 3 planning
Resume file: N/A
