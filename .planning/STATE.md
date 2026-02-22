# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** Partecipanti votano piatti in modo anonimo e vedono la classifica finale con rivelazione dei cuochi
**Current focus:** Phase 2 — Admin + Dishes (02-03 complete, awaiting human-verify checkpoint)

## Current Position

Phase: 2 of 3 (Admin + Dishes)
Plan: 3 of 3 in phase (02-03 complete, pending human verification)
Status: Checkpoint — awaiting human-verify (all 4 admin tabs)
Last activity: 2026-02-22 — Completed 02-03-PLAN.md (checkpoint pending)

Progress: [███████░░░] 65% (02-01, 02-03 complete; 02-02 parallel; 7/10 approx plans done)

## Performance Metrics

**Velocity:**
- Total plans completed: 7 (including 02-03)
- Average duration: ~10min
- Total execution time: ~41min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-auth | 4/4 | ~24min | ~6min |
| 02-admin-dishes | 2/3 (02-01, 02-03) | ~17min | ~8min |

**Recent Trend:**
- Last 3 plans: 2min, 15min, N/A(02-02 parallel)
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
- [02-03]: QR code via api.qrserver.com external API come <img> — evita dipendenza npm
- [02-03]: Toast API usa solo show(string) — nessun variant type; wrapper inline in SettingsTab
- [02-03]: RankingTab usa ordine alfabetico come placeholder — classifica per voti rimandata a Fase 3
- [02-03]: competition-settings EF: fase advance unidirezionale enforced server-side

### Pending Todos

- [02-02]: usePhotoUpload restituirà 403 finché la migration anon Storage INSERT policy non è aggiunta
- [02-03]: competition-settings Edge Function da deployare con `npx supabase functions deploy competition-settings --no-verify-jwt` dopo `supabase login`

### Blockers/Concerns

- [Phase 2]: RLS testing deve avvenire via SDK client con credenziali anon reali, NON da Supabase Studio (superuser bypassa RLS)
- [Phase 2]: Foto upload bloccato finché 02-02 non aggiunge policy `anon_upload_dish_photos` su storage.objects
- [02-03]: competition-settings EF non ancora deployata — necessita autenticazione CLI

## Session Continuity

Last session: 2026-02-22T00:40:00Z
Stopped at: 02-03 checkpoint:human-verify — all 4 admin tabs built, awaiting visual verification
Resume file: None
