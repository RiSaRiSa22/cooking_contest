# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** Partecipanti votano piatti in modo anonimo e vedono la classifica finale con rivelazione dei cuochi
**Current focus:** Phase 1 — Foundation + Auth

## Current Position

Phase: 1 of 3 (Foundation + Auth)
Plan: 1 of 4 in current phase
Status: In progress
Last activity: 2026-02-21 — Completed 01-01-PLAN.md (Vite scaffold + design system)

Progress: [█░░░░░░░░░] 10%

## Performance Metrics

**Velocity:**
- Total plans completed: 1
- Average duration: 4min
- Total execution time: 4min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-auth | 1/4 | 4min | 4min |

**Recent Trend:**
- Last 5 plans: 4min
- Trend: —

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

### Pending Todos

None.

### Blockers/Concerns

- [Phase 1]: RLS testing deve avvenire via SDK client con credenziali anon reali, NON da Supabase Studio (superuser bypassa RLS)
- [Phase 1]: Zod v4 — major version con breaking changes rispetto v3, verificare al setup
- [Phase 2]: PIN rate limiting in Edge Functions: Supabase non ha rate limiter built-in, serve DB-based counter (attempts table con TTL)

## Session Continuity

Last session: 2026-02-21T23:04:36Z
Stopped at: Completed 01-01-PLAN.md
Resume file: None
