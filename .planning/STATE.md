# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** Partecipanti votano piatti in modo anonimo e vedono la classifica finale con rivelazione dei cuochi
**Current focus:** Phase 1 — Foundation + Auth

## Current Position

Phase: 1 of 3 (Foundation + Auth)
Plan: 2 of 4 in current phase
Status: In progress
Last activity: 2026-02-21 — Completed 01-02-PLAN.md (Supabase schema + TypeScript types)

Progress: [██░░░░░░░░] 20%

## Performance Metrics

**Velocity:**
- Total plans completed: 2
- Average duration: ~4.5min
- Total execution time: ~9min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-auth | 2/4 | ~9min | ~4.5min |

**Recent Trend:**
- Last 5 plans: 4min, 5min
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

### Pending Todos

None.

### Blockers/Concerns

- [Phase 1]: RLS testing deve avvenire via SDK client con credenziali anon reali, NON da Supabase Studio (superuser bypassa RLS)
- [Phase 1]: Zod v4 — major version con breaking changes rispetto v3, verificare al setup
- [Phase 2]: PIN rate limiting: login_attempts table esiste (creata in 01-02), Edge Functions devono usarla correttamente

## Session Continuity

Last session: 2026-02-21T23:04:48Z
Stopped at: Completed 01-02-PLAN.md
Resume file: None
