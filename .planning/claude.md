# Fornelli in Gara — CLAUDE.md

Project configuration for Claude Code with MCP servers and subagents.

---

## Project Overview

Web app for cooking competitions. Players add dishes, vote anonymously, and a leaderboard reveals the chefs at the end.

**Stack:** React + Vite (frontend) · Node.js/Express or Supabase Edge Functions (backend) · Supabase (DB + Storage + Auth) · GitHub Pages or Vercel (hosting)

**Reference docs:**
- `docs/FEATURES.md` — full feature spec, data model, API endpoints, business rules
- `docs/UI_REFERENCE.md` — design system, components, animations, folder structure

---

## MCP Servers Available

| Server | Status | Purpose | Use for |
|---|---|---|---|
| `context7` | ✅ active | Up-to-date library docs | Fetch Supabase, React, Vite, Tailwind docs before coding |
| `playwright` | ✅ active | Browser automation & testing | E2E tests, UI validation, screenshot comparison |
| `supabase-local` | ✅ active | Direct DB/Storage access | Schema migrations, RLS policies, query data, TypeScript types |
| `frontend-design` | ✅ active | Design quality enforcement | Component generation, design system consistency |
| `ralph-loop` | ✅ active | Iterative refinement loops | Complex multi-step tasks with self-correction |
| `code-simplifier` | ✅ active | Reduce complexity | Refactor after implementation |
| `security-guidance` | ✅ active | Security best practices | Auth flows, RLS policies, input validation |
| `superpowers` | ✅ active | Extended capabilities | Heavy parallel workloads |
| `swift-lsp` | ⏭ skip | Swift LSP | Not used in this project |

> **Note sul nome Supabase MCP:** il server è registrato come `supabase-local` (non `supabase`) per evitare un bug noto di Claude Code che ignora la config stdio quando il nome è esattamente `"supabase"`. Nei prompt ai subagent usa sempre il nome `supabase-local`.

---

## Parallelization Strategy

**Always prefer parallel subagents over sequential execution.**

### Pattern: Parallel Feature Implementation

When implementing a new feature, spawn subagents simultaneously:

```
Main Agent
├── Subagent A: Database schema + RLS policies (uses: supabase-local MCP)
├── Subagent B: API layer / Edge Functions (uses: context7 for Supabase docs)
├── Subagent C: React components (uses: frontend-design MCP)
└── Subagent D: Tests (uses: playwright MCP)
```

Never wait for A to finish before starting B, C, D — they work on independent layers.

### Pattern: Parallel Research

Before coding anything non-trivial, fetch docs in parallel:

```
Research phase (all simultaneous):
├── context7: Supabase JS client latest API
├── context7: React Query / TanStack latest patterns
├── context7: Vite config for SPA routing
└── security-guidance: RLS policy patterns for multi-tenant apps
```

### Pattern: Ralph Loop for Complex Tasks

Use `ralph-loop` for tasks that require iteration (auth flows, complex RLS, image upload pipeline):

```
ralph-loop:
  1. Implement
  2. Test with playwright
  3. If fail → self-correct → repeat
  4. If pass → done
```

---

## Development Commands

```bash
# Frontend
npm run dev          # Vite dev server
npm run build        # Production build
npm run preview      # Preview production build

# Testing
npm run test         # Vitest unit tests
npm run test:e2e     # Playwright E2E tests
npm run test:e2e:ui  # Playwright UI mode

# Supabase
npx supabase start          # Local Supabase instance
npx supabase db push        # Apply migrations
npx supabase gen types      # Generate TypeScript types
npx supabase functions serve # Serve Edge Functions locally
```

---

## Architecture Decisions

### Authentication
- **No Supabase Auth** — custom PIN-based auth to keep UX simple
- Sessions stored in `localStorage` with 2h TTL
- PIN hashed client-side before sending to server (use `bcrypt` or `argon2` on server)
- Admin identified by separate session token (not a Participant record)
- **Security:** always verify session server-side on every mutating request

### Database
- Use Supabase Postgres
- RLS enabled on all tables
- `competition_code` is the public identifier (6 char, uppercase alphanumeric) — never expose internal UUID in URLs
- `chef_name` column NEVER returned by API unless phase = `finished` OR caller is admin

### Photos
- Compress client-side before upload: max 800px, JPEG quality 0.72 (canvas API)
- Upload to Supabase Storage bucket `dish-photos`
- Store URL in `photos` table, not inline in dish record
- Separate `is_extra` boolean for photos added during voting phase

### Real-time
- Use Supabase Realtime for:
  - Phase changes (all participants see phase update instantly)
  - Vote count updates (admin sees live tally)
- Subscribe to `competitions` table on `phase` column
- Subscribe to `votes` table for admin dashboard

---

## Task Instructions for Subagents

### When spawning a DB subagent
```
You are working on the database layer for "Fornelli in Gara".
Read docs/FEATURES.md sections 2 (Data Model) and 12 (Security Rules).
Use the supabase-local MCP to:
1. Create migration files for all tables
2. Add RLS policies: participants can read all dishes but chef_name is hidden unless phase=finished
3. Admin bypass uses service_role key, never anon key for admin operations
Always use context7 to fetch latest Supabase RLS documentation before writing policies.
```

### When spawning a frontend subagent
```
You are working on the React frontend for "Fornelli in Gara".
Read docs/UI_REFERENCE.md for the complete design system.
Key constraints:
- Colors: use CSS variables exactly as defined in UI_REFERENCE.md section 1
- Fonts: Cormorant Garamond (display) + Outfit (body) from Google Fonts
- No icon libraries — use emoji only (see UI_REFERENCE.md section 9)
- Mobile-first, max-width 480px centered on desktop
Use frontend-design MCP to validate component quality.
Use context7 to fetch latest React/Tailwind docs before coding.
```

### When spawning a test subagent
```
You are writing E2E tests for "Fornelli in Gara".
Use playwright MCP.
Cover these critical flows:
1. Create competition → get code
2. Join as participant → add dish → verify PIN auth
3. Admin changes phase to voting
4. Participant votes → cannot vote own dish
5. Admin changes phase to finished → ranking visible with chef names
Test both happy path and error cases (wrong PIN, duplicate nickname, voting own dish).
```

---

## File Structure

```
fornelli-in-gara/
├── docs/
│   ├── FEATURES.md          ← full feature spec (READ FIRST)
│   └── UI_REFERENCE.md      ← design system (READ FOR FRONTEND)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/          ← Button, Input, PinInput, Modal, Toast, Badge
│   │   │   ├── layout/      ← AppHeader, TabBar, Screen
│   │   │   ├── dishes/      ← DishCard, VoteCard, PhotoGrid, DishDetail
│   │   │   └── competition/ ← PhaseBanner, StatusBar, RankItem, ParticipantCard
│   │   ├── screens/
│   │   │   ├── Home/
│   │   │   ├── Admin/       ← tabs: Dishes, Participants, Ranking, Settings
│   │   │   └── Voter/       ← tabs: Vote, Gallery, Ranking, MyDish
│   │   ├── hooks/
│   │   │   ├── useCompetition.ts
│   │   │   ├── useAuth.ts
│   │   │   └── usePhotoUpload.ts
│   │   ├── lib/
│   │   │   ├── api.ts        ← API wrapper
│   │   │   ├── hash.ts       ← PIN hashing
│   │   │   ├── compress.ts   ← client-side image compression
│   │   │   └── session.ts    ← localStorage session management
│   │   └── types/index.ts
│   ├── tests/e2e/           ← Playwright tests
│   └── vite.config.ts
├── supabase/
│   ├── migrations/
│   ├── functions/           ← Edge Functions (if needed)
│   └── seed.sql
└── CLAUDE.md                ← this file
```

---

## Critical Rules

1. **Never expose `chef_name`** in any API response unless `phase = 'finished'` OR the requester is the admin. This is the core mechanic of the game.

2. **Always parallel-first.** If a task can be split into independent parts, use subagents. Never do sequentially what can be done in parallel.

3. **Read docs before coding.** Use `context7` to fetch current library docs. Do not rely on training data for Supabase JS v2+ API — it changes frequently.

4. **Compress images client-side** before upload. Max 800px, JPEG 0.72. Never store raw camera photos.

5. **RLS is the security layer.** Never rely solely on application-level checks. All sensitive column access must be enforced at the DB level via RLS policies.

6. **Use `ralph-loop`** for any task involving auth, RLS, or security-sensitive code — the loop catches edge cases that single-pass implementation misses.

7. **Test with playwright** every flow that involves phase transitions — these are the most bug-prone part of the app.

---

## Recommended Parallel Kickoff Sequence

When initializing the project from scratch, run these subagent groups simultaneously:

### Group 1 — Foundation (parallel)
- Subagent 1A: Supabase schema + all migrations + RLS policies — usa `supabase-local` MCP
- Subagent 1B: Vite + React project scaffold + design tokens + Google Fonts setup
- Subagent 1C: TypeScript types from FEATURES.md data model

### Group 2 — Core (parallel, after Group 1)
- Subagent 2A: All `ui/` components (Button, Input, PinInput, Modal, Toast)
- Subagent 2B: API lib (`api.ts`) — all endpoints from FEATURES.md section 11
- Subagent 2C: Auth flows (create comp, join, re-auth modal)

### Group 3 — Screens (parallel, after Group 2)
- Subagent 3A: Home screen + join/create modals
- Subagent 3B: Admin screen — all 4 tabs
- Subagent 3C: Voter screen — all 4 tabs

### Group 4 — Polish + Tests (parallel, after Group 3)
- Subagent 4A: Playwright E2E tests (all critical flows)
- Subagent 4B: Real-time subscriptions (Supabase Realtime)
- Subagent 4C: Photo upload pipeline + compression
- Subagent 4D: `code-simplifier` pass on all files > 200 lines
