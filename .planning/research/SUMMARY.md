# Project Research Summary

**Project:** Fornelli in Gara
**Domain:** Mobile-first social cooking contest webapp (SPA + Supabase backend)
**Researched:** 2026-02-21
**Confidence:** HIGH (stack, architecture, pitfalls verified against official docs; features MEDIUM due to no identical direct competitor)

## Executive Summary

Fornelli in Gara is a private event voting app in the genre of Slido/Crowdpurr, specialized for friend-group cooking contests. The product category is well-understood: frictionless join (no account required), admin-controlled phase state machine, anonymous voting, and a reveal moment at the end. Experts in this domain consistently land on the same patterns: short code join, role-based session via localStorage, server-enforced vote integrity. The spec is largely aligned with these patterns — research confirms the approach rather than redirecting it.

The recommended implementation is a React 19 + Vite 6 + TypeScript 5 SPA deployed on GitHub Pages, with Supabase handling database, storage, and serverless functions. The critical architectural decision is the split between client SDK reads (anon role, non-sensitive data) and Edge Functions for all writes and business-logic enforcement. This boundary is not optional: vote integrity, chef anonymity, and phase transition rules cannot be reliably enforced client-side. HashRouter is mandatory for GitHub Pages — BrowserRouter will silently break share links and QR join flows, which are core to the UX.

The top risk is security theater in the data layer: RLS policies that look correct in Supabase Studio (which runs as superuser and bypasses RLS) but fail in production, combined with chef identity leaking through `participant_id` on the dishes table during voting. Both are silent failures with high user-visible impact. Mitigations are known and well-documented — the key is building them in from Phase 1 (schema and RLS setup) rather than retrofitting after voting is implemented.

---

## Key Findings

### Recommended Stack

The stack is React 19 + Vite 6 + TypeScript 5 + Supabase (supabase-js v2.97.0), with react-router-dom v7 (HashRouter), Zustand v5 for global state, react-hook-form v7 + Zod v4 for forms, browser-image-compression v2 for client-side photo processing, and qrcode.react v4 for QR generation. All versions are current as of Feb 2026 and verified via GitHub releases.

Tailwind CSS v4 is already decided. Testing is Vitest v4 + Testing Library. Deployment is GitHub Actions + gh-pages package to the `gh-pages` branch. The only version area requiring care at implementation time is Zod v4 (major version — breaking changes vs v3) and Tailwind v4 (Vite plugin setup changed from v3).

**Core technologies:**
- React 19 + Vite 6: UI framework + build tool — fastest DX, first-class TypeScript template
- @supabase/supabase-js v2.97.0: all backend services (DB, Storage, Edge Functions, Auth) — official client, stable v2, weekly releases
- react-router-dom v7 (HashRouter): client-side routing — HashRouter is mandatory for GitHub Pages; BrowserRouter breaks deep links
- Zustand v5: global state management — avoids Context re-render cascades for frequently-updated state (votes, dishes, participants)
- react-hook-form v7 + Zod v4: forms + validation — performant, type-safe, minimal re-renders
- browser-image-compression v2: client-side photo compression — Web Worker support prevents main thread blocking on mobile
- qrcode.react v4: QR code generation — SVG output, React 19 peer dep confirmed, highest ecosystem weight

### Expected Features

The spec is well-aligned with industry patterns. Research surfaces two additions worth including in MVP (QR code sharing and Guest voter role) and confirms everything else in the spec's backlog should stay deferred.

**Must have (table stakes):**
- Frictionless join: nickname + PIN, no email/OAuth — confirmed standard across all event voting apps
- Mobile-first layout — participants join from phones at the dinner table; must be explicit in design decisions
- 3-phase state machine (preparation → voting → finished) — admin-only transitions, unidirectional
- Dish CRUD with compressed photo upload — multi-photo per dish, 3-col grid display
- Anonymous voting: 1 vote per participant, not own dish, vote change allowed
- Chef identity hidden during voting, revealed only in finished phase
- Leaderboard with podium/medal visual hierarchy

**Should have (differentiators worth including in MVP):**
- QR code in admin Settings tab — low complexity, eliminates "text me the link" friction; confirmed pattern across all event apps studied
- Guest voter role (is_guest flag on Participant) — enables non-cooking participants; simple data model addition with minimal flow branching

**Defer to post-MVP (v2+):**
- Real-time sync / WebSocket (polling every 5-10s is sufficient for friend-group scale)
- Multi-criteria voting (data model overhaul, scoring algorithm — FoodFu uses this; complexity vs value tradeoff is bad for v1)
- Countdown timer with auto-close voting
- Push notifications
- Export / PDF leaderboard
- Competition deletion, participant limits
- Offline/connectivity handling (optimistic UI with retry)

**Anti-features (explicitly do not build):**
- Email/password auth — overkill, adds friction
- Public competition discovery — wrong for private friend groups
- Rating sliders (1-10 per category) — decision fatigue, slows voting
- Comments/chat on dishes — moderation surface, pre-vote bias risk

### Architecture Approach

The architecture is a clean client/server split: the React SPA handles rendering and local state, Supabase handles all persistence, and Edge Functions are the enforcement layer for every write operation that involves a business rule. The client reads non-sensitive data directly via the anon SDK (no auth token required). All writes — joining, creating dishes, voting, advancing phase — go through named Edge Functions that verify credentials and enforce invariants before touching the DB. Chef identity is masked at the database layer via a `dishes_public` view (joins competition phase, nullifies `chef_name` when phase != `finished`) rather than client-side filtering, which would be bypassable.

**Major components:**
1. **HomeScreen** — entry point; reads localStorage for recent competitions; opens Create or Join modals which call Edge Functions
2. **AdminScreen** — 4 tabs (Dishes, Participants, Ranking, Settings); reads from Zustand store populated by `useCompetition` hook; writes via Edge Functions
3. **VoterScreen** — 4 tabs (Vote, Gallery, Ranking, MyDish); reads from same store; vote submission via `vote-cast` Edge Function
4. **Edge Functions** (6 total): `competition-create`, `competition-join`, `dish-write`, `dish-delete`, `vote-cast`, `competition-settings` — all credential-verified, service-role Supabase client
5. **Supabase schema** — 5 tables (competitions, participants, dishes, photos, votes) + `dishes_public` view + `dish-photos` storage bucket
6. **Session layer** — custom localStorage session (nickname + PIN hash + TTL), not Supabase Auth; `credentialHash` passed to Edge Functions for verification

**Build order (phase dependencies):**
Phase 1 (Foundation: scaffold, types, Supabase setup) → Phase 2 (Home + Auth flow) → Phase 3 (Admin Dishes tab — unlocks all data) → Phase 4 (Admin remaining tabs) → Phase 5 (Voter Screen) → Phase 6 (Polish). Phases 4 and 5 can run in parallel once Phase 3 is stable.

### Critical Pitfalls

1. **RLS `WITH CHECK` missing on INSERT/UPDATE** — any participant can write dishes/votes attributed to other users. Fix: always pair `USING` + `WITH CHECK` on every INSERT/UPDATE policy. Test by attempting a write with the wrong `participant_id` via the SDK client, not the Studio SQL editor. Address in Phase 1 schema setup.

2. **Chef identity leak via `participant_id` in dishes query** — during voting, a `SELECT * FROM dishes` returns `participant_id`, crossreferenceable with the participants table to reveal chefs. Fix: clients always query `dishes_public` view (which nullifies `participant_id` and `chef_name` in non-finished phases). Admins query via Edge Function with service role. Never expose raw `dishes` table to anon. Address before voting goes live.

3. **RLS testing in Supabase Studio gives false confidence** — Studio runs as superuser, bypasses all RLS. Policies that look correct in Studio may be completely broken in production. Fix: test RLS exclusively via SDK client with real anon credentials, or use `SET ROLE anon` in SQL editor. Establish this discipline in Phase 1.

4. **GitHub Pages 404 on direct URL / refresh (BrowserRouter)** — share links and QR join URLs are core to the product UX; BrowserRouter breaks both on any refresh or direct navigation. Fix: HashRouter from day one, `vite.config.ts` base set to `/cooking_contest/`. Non-negotiable, set in Phase 1.

5. **Voting integrity bypassed by direct API calls** — "cannot vote own dish" and "1 vote per participant" can be circumvented if enforced only client-side. Fix: all vote submissions via `vote-cast` Edge Function which verifies participant identity, dish ownership, and upserts with `ON CONFLICT DO UPDATE` on the DB unique constraint. Address in Phase 5 (Voter Screen).

---

## Implications for Roadmap

The research confirms a 6-phase build order with a clear critical path through authentication and data infrastructure before any user-facing features.

### Phase 1: Foundation — Scaffold, Schema, RLS
**Rationale:** Everything downstream depends on correct Supabase schema, RLS policies, and project configuration. Mistakes here (wrong router, missing `WITH CHECK`, wrong base path) require rewrites if discovered late.
**Delivers:** Working Vite + React + TypeScript project; Supabase tables, RLS, storage bucket; types generated from schema; HashRouter confirmed working; GitHub Actions pipeline with env vars injected.
**Addresses:** Table stakes infrastructure (no user-facing feature yet).
**Avoids:** Pitfalls 1 (RLS WITH CHECK), 3 (Studio false confidence), 4 (GitHub Pages routing), 11 (missing VITE_ env vars in CI), 14 (Vite base path mismatch).

### Phase 2: Home Screen + Auth Flow
**Rationale:** Auth is the prerequisite for every other screen. Session management (localStorage TTL, credentialHash, role routing) must be solid before building on top of it.
**Delivers:** HomeScreen with recent competitions list; CreateCompetitionModal and JoinCompetitionModal (calling Edge Functions); AuthModal for re-auth; sessionStore (Zustand); URL param bootstrap (`?code=ABC123&mode=join`).
**Uses:** `competition-create` and `competition-join` Edge Functions; `lib/hash.ts`, `lib/storage.ts`.
**Avoids:** Pitfall 9 (PIN hashing — hash server-side, rate-limit in Edge Function), Pitfall 12 (localStorage session flash — gate render on initialization).

### Phase 3: Admin Screen — Dish Management
**Rationale:** Dish CRUD with photo upload is the most complex single feature and the data foundation for voting and gallery. Build it before the Voter Screen to have real data to work with.
**Delivers:** AdminScreen shell; DishesTab with DishCard; AddDishModal with multi-photo upload and client-side compression; `dish-write` and `dish-delete` Edge Functions; `competitionStore` populated via `useCompetition` hook.
**Uses:** `browser-image-compression`, Supabase Storage SDK upload, `dishes_public` view.
**Avoids:** Pitfall 6 (dual storage limit system — set bucket limit explicitly before writing upload code), Pitfall 7 (concurrent uploads — UUID in filename, `upsert: true`), Pitfall 2 (chef identity leak — client always queries `dishes_public`).

### Phase 4: Admin Screen — Remaining Tabs + QR
**Rationale:** Completes the admin experience. Can partially parallelize with Phase 5 once Phase 3 is stable. QR code (low complexity) should land here as a confirmed MVP differentiator.
**Delivers:** ParticipantsTab; SettingsTab with phase management (`competition-settings` Edge Function); share links with copy-to-clipboard; QR code generation (qrcode.react) in fullscreen mode; RankingTab admin view.
**Avoids:** Phase transition direction enforcement (preparation → voting → finished, unidirectional only).

### Phase 5: Voter Screen + Voting Logic
**Rationale:** Most security-sensitive phase. Vote integrity must be airtight before release. Build on top of stable dish data from Phase 3.
**Delivers:** VoterScreen shell; VoteTab with phase-aware display; `vote-cast` Edge Function (credential verify + self-vote check + ON CONFLICT upsert); GalleryTab with 3-col PhotoGrid + DishDetailSheet (bottom sheet pattern); RankingTab (finished phase only) with chef reveal; MyDishTab with extra photo upload.
**Avoids:** Pitfall 5 (voting integrity — all votes via Edge Function, DB unique constraint), Pitfall 2 (chef identity — `dishes_public` view used, `participant_id` nullified during voting), Pitfall 8 (vote tallying in JS → CPU limit; use SQL COUNT/RANK instead).
**Research flag:** This phase warrants a `/gsd:research-phase` pass focused on the reveal animation UX and the admin "X of N have voted" live status implementation (polling vs WebSocket decision).

### Phase 6: Polish + PWA
**Rationale:** Non-blocking improvements that meaningfully affect perceived quality: animations, empty states, error handling, mobile viewport, responsive centering. Build last to avoid churning UI while data model is still changing.
**Delivers:** PhaseBanner and StatusBar components; Toast notification system; screen transition animations (screenIn, sheetUp keyframes); empty states for gallery/leaderboard; loading skeletons; responsive max-width centering on desktop; PWA meta tags and viewport.
**Avoids:** Lazy loading colocated with loaders (Pitfall 13 — separate loader files from component files).

### Phase Ordering Rationale

- **Schema before code:** RLS mistakes require schema migrations that cascade through Edge Functions and frontend queries. Fix once at Phase 1, not six times across all phases.
- **Auth before features:** Every Edge Function verifies credentials. Without a working auth flow, no other feature can be end-to-end tested.
- **Dishes before voting:** Voting requires dishes to exist. Building the Voter Screen without real data means mocking everything; Phase 3 first gives real test data.
- **Admin completes before voter:** Admin creates the competition context that voters live in. Phase 4 (Settings, phase transitions) is needed to actually advance the state machine during testing of Phase 5.
- **Polish last:** Animations and toasts are the last thing to touch because components must be stable first.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 5 (Voter/Reveal UX):** The reveal animation and admin "live vote status" patterns are LOW/MEDIUM confidence. Specific UX decisions (animation library vs CSS, polling interval, progress bar design) benefit from a `/gsd:research-phase` pass.
- **Phase 2 (PIN rate limiting in Edge Functions):** The specific Supabase Edge Function rate-limiting approach (no built-in rate limiter — requires external KV store or DB-based counter) is not fully resolved in research. Needs a concrete implementation decision before coding auth.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Stack, routing, Vite config, GitHub Actions — all high-confidence, fully documented patterns. Build directly.
- **Phase 3 (Photo Upload):** browser-image-compression + Supabase Storage SDK upload is a well-trodden pattern. No research needed.
- **Phase 4 (QR Code):** qrcode.react is a drop-in. The UX pattern (QR in Settings tab, fullscreen mode) is confirmed from multiple sources.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All library versions verified via GitHub releases as of Feb 2026; routing decision (HashRouter) confirmed by multiple official sources |
| Features | MEDIUM | Table stakes and QR pattern are HIGH confidence; Guest voter flow and reveal animation UX are MEDIUM/LOW — interpolated from adjacent domain apps, no identical competitor found |
| Architecture | HIGH | SDK vs Edge Function split, `dishes_public` view for chef masking, localStorage session pattern — all verified against Supabase official docs and GitHub discussions |
| Pitfalls | HIGH | RLS, Storage, GitHub Pages, and Edge Function limits pitfalls are all verified against official Supabase docs; PIN security is MEDIUM (OWASP-aligned but app explicitly accepts the tradeoff) |

**Overall confidence:** HIGH

### Gaps to Address

- **PIN rate limiting implementation:** Supabase Edge Functions have no built-in rate limiting. A DB-based counter (attempts table with TTL) or an external KV store (e.g., Upstash Redis) is needed. Decision should be made during Phase 2 planning. For a friends-group app, a DB-based simple counter is probably sufficient.
- **Guest voter flow specifics:** The is_guest flag and join flow branch are defined at a high level. The exact UI (separate button vs checkbox on join form) and the admin display treatment (badge styling) need UX decisions during Phase 2/4 planning.
- **Reveal animation library:** CSS keyframes vs Framer Motion is not decided. For the "chef reveal" staggered animation, Framer Motion adds ~30KB gzipped but is significantly easier to implement correctly. Decide during Phase 5 planning.
- **Zod v4 breaking changes:** Research confirms Zod v4 is current but notes it is a major version. If the project was scaffolded with Zod v3, a migration is needed. Verify at project setup time.

---

## Sources

### Primary (HIGH confidence)
- [Supabase React Quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs)
- [Supabase RLS Official Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Storage File Limits](https://supabase.com/docs/guides/storage/uploads/file-limits)
- [Supabase Edge Functions Architecture](https://supabase.com/docs/guides/functions/architecture)
- [Supabase Edge Functions Limits](https://supabase.com/docs/guides/functions/limits)
- [React Router HashRouter API](https://reactrouter.com/api/declarative-routers/HashRouter)
- [GitHub Pages SPA Routing — community discussion](https://github.com/orgs/community/discussions/64096)
- [supabase-js GitHub Releases](https://github.com/supabase/supabase-js/releases) — v2.97.0 Feb 18, 2026
- [react-router-dom GitHub Releases](https://github.com/remix-run/react-router/releases) — v7.13.0 Jan 23, 2026
- [zustand GitHub Releases](https://github.com/pmndrs/zustand/releases) — v5.0.11 Feb 1, 2026
- [vitest GitHub Releases](https://github.com/vitest-dev/vitest/releases) — v4.0.18 Jan 22, 2026

### Secondary (MEDIUM confidence)
- [FoodFu Cooking Competition App](http://www.foodfuapp.com/) — closest direct competitor; multi-criteria voting reference
- [Slido](https://www.slido.com/), [Crowdpurr](https://www.crowdpurr.com/poll), [Vevox](https://www.vevox.com/) — no-account guest voting patterns, anonymous voting UX
- [Gallery UI Design — Mobbin](https://mobbin.com/glossary/gallery) — 3-col grid confirmed as dominant food photo pattern
- [Supabase Security — 170+ Apps Exposed by Missing RLS (2025)](https://byteiota.com/supabase-security-flaw-170-apps-exposed-by-missing-rls/) — real-world RLS failure evidence
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) — PIN hashing guidance

### Tertiary (LOW confidence)
- Reveal animation UX (chef name reveal, staggered card flip) — synthesized from general UX principles and game show patterns; no direct source
- Countdown timer auto-close — synthesized; verify with users before building

---
*Research completed: 2026-02-21*
*Ready for roadmap: yes*
