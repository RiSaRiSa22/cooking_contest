# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** Partecipanti votano piatti in modo anonimo e vedono la classifica finale con rivelazione dei cuochi
**Current focus:** Phase 1 — Foundation + Auth

## Current Position

Phase: 1 of 3 (Foundation + Auth)
Plan: 4 of 4 in current phase (paused at Task 3 checkpoint)
Status: Awaiting checkpoint verification
Last activity: 2026-02-22 — Completed 01-04 Tasks 1+2, waiting for Task 3 human-verify

Progress: [███░░░░░░░] 30% (3.5/4 of phase 1)

## Performance Metrics

**Velocity:**
- Total plans completed: 3.5 (01-01, 01-02, 01-03, 01-04 partial)
- Average duration: ~6min
- Total execution time: ~21min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-auth | 3.5/4 | ~21min | ~6min |

**Recent Trend:**
- Last 5 plans: 4min, 5min, 3min, 7min
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
- [01-01]: lib/ rimosso da .gitignore — il gitignore Python generato avrebbe ignorato silenziosamente src/lib/
- [01-02]: anon_read_dishes policy su dishes table è permissiva — protezione identità delegata alla view dishes_public + Edge Functions
- [01-02]: votes e login_attempts senza policy anon = default deny — solo service_role via Edge Functions
- [01-02]: persistSession: false nel client Supabase — custom PIN auth, mai Supabase Auth
- [01-02]: Supabase project ref = rfwnqcztshenpezhnusd (progetto "MVP_Cisco", eu-west-1)
- [01-04]: extractErrorMessage helper necessario per parsare Supabase FunctionsHttpError body
- [01-04]: ReAuthModal aperta su click della pill sessione — sempre re-auth prima di navigare
- [01-04]: competition-join gestisce sia nuovo partecipante che re-auth in un solo endpoint
- [01-04]: Edge Functions scritte ma NON deployate — richiede supabase-local MCP dal context orchestratore

### Pending Todos

- [01-04 BLOCKER]: Deploy Edge Functions via supabase-local MCP `deploy_edge_function`:
  - `competition-create` with `verify_jwt: false`
  - `competition-join` with `verify_jwt: false`
  - MUST be done before Task 3 verification

### Blockers/Concerns

- [Phase 1]: RLS testing deve avvenire via SDK client con credenziali anon reali, NON da Supabase Studio (superuser bypassa RLS)
- [Phase 1]: Zod importato come `npm:zod` nelle Edge Functions — verificare che Deno lo risolva correttamente al deploy
- [Phase 2]: PIN rate limiting: login_attempts table esiste (creata in 01-02), Edge Functions lo usano correttamente

## Session Continuity

Last session: 2026-02-22T23:35:00Z
Stopped at: 01-04 Task 3 checkpoint — awaiting human-verify
Resume file: .planning/phases/01-foundation-auth/01-04-SUMMARY.md
