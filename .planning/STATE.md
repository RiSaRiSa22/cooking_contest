# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** Partecipanti votano piatti in modo anonimo e vedono la classifica finale con rivelazione dei cuochi
**Current focus:** Phase 2 — Admin + Dishes

## Current Position

Phase: 2 of 3 (Admin + Dishes)
Plan: 1 of 3 in phase (02-01 complete)
Status: In progress
Last activity: 2026-02-22 — Completed 02-01-PLAN.md

Progress: [█████░░░░░] 40% (02-01 complete: 5/7 total plans done — counting 01-04 as ~4 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 5
- Average duration: ~5min
- Total execution time: ~26min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-auth | 4/4 | ~24min | ~6min |
| 02-admin-dishes | 1/3 | ~2min | ~2min |

**Recent Trend:**
- Last 5 plans: 4min, 5min, 3min, 7min, 2min
- Trend: stable/improving

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
- [01-03]: Layout responsive con breakpoints (sm, lg) — l'utente ha richiesto esplicitamente responsive invece di mobile-only 480px
- [01-04]: extractErrorMessage helper necessario per parsare Supabase FunctionsHttpError body
- [01-04]: ReAuthModal aperta su click della pill sessione — sempre re-auth prima di navigare
- [01-04]: competition-join gestisce sia nuovo partecipante che re-auth in un solo endpoint
- [01-04]: Edge Functions deployate con verify_jwt: false via supabase-local MCP
- [01-04-fix]: getAllSessions() ritorna TUTTE le sessioni con flag `expired` — non filtra quelle scadute
- [01-04-fix]: AUTH-06 admin fallback: competition-join restituisce il record partecipante admin, non quello del richiedente
- [02-01]: competitionStore senza persist middleware — server-authoritative, reset() obbligatorio sull'unmount di AdminScreen
- [02-01]: Admin legge da dishes table direttamente (non dishes_public) — chef_name visibile in tutte le fasi
- [02-01]: Tab navigation via useState — niente sub-routes per tab admin, stato ephemero
- [02-01]: getPublicUrl è sincrono (no await) — deriva URL dal path senza network call

### Pending Todos

- [02-02]: usePhotoUpload restituirà 403 finché la migration anon Storage INSERT policy non è aggiunta

### Blockers/Concerns

- [Phase 2]: RLS testing deve avvenire via SDK client con credenziali anon reali, NON da Supabase Studio (superuser bypassa RLS)
- [Phase 2]: Foto upload bloccato finché 02-02 non aggiunge policy `anon_upload_dish_photos` su storage.objects

## Session Continuity

Last session: 2026-02-22T00:25:32Z
Stopped at: Completed 02-01-PLAN.md
Resume file: None
