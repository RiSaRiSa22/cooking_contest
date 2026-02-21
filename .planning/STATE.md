# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** Partecipanti votano piatti in modo anonimo e vedono la classifica finale con rivelazione dei cuochi
**Current focus:** Phase 1 — Foundation + Auth

## Current Position

Phase: 1 of 3 (Foundation + Auth)
Plan: 0 of 4 in current phase
Status: Ready to plan
Last activity: 2026-02-21 — Roadmap e STATE.md creati dopo inizializzazione progetto

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Pre-Phase 1]: HashRouter obbligatorio per GitHub Pages — BrowserRouter rompe deep link e QR join URL
- [Pre-Phase 1]: Split SDK (letture anon) + Edge Functions (scritture + business logic) — RLS non sufficiente per integrità voti
- [Pre-Phase 1]: dishes_public view nasconde participant_id e chef_name in fasi non-finished — protezione identità chef a livello DB

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 1]: RLS testing deve avvenire via SDK client con credenziali anon reali, NON da Supabase Studio (superuser bypassa RLS)
- [Phase 1]: Zod v4 — major version con breaking changes rispetto v3, verificare al setup
- [Phase 2]: PIN rate limiting in Edge Functions: Supabase non ha rate limiter built-in, serve DB-based counter (attempts table con TTL)

## Session Continuity

Last session: 2026-02-21
Stopped at: Roadmap creato, pronto per plan-phase 1
Resume file: None
