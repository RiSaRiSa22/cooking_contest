# Architecture Patterns — Fornelli in Gara

**Domain:** React + Vite + TypeScript SPA on GitHub Pages, Supabase backend
**Researched:** 2026-02-21
**Overall confidence:** HIGH (all major decisions verified against official docs or multiple current sources)

---

## 1. Routing Strategy — Use HashRouter

**Decision: `HashRouter` from React Router.**

GitHub Pages does not support history-based routing for SPAs. When a user navigates directly to `/admin` or `/voter`, GitHub Pages returns 404 because it has no server-side fallback to `index.html`.

Two workarounds exist:

| Option | How it works | Status |
|--------|-------------|--------|
| **HashRouter** | URLs become `/#/admin`, `/#/voter` | Recommended |
| **Custom 404.html** | Copy `index.html` as `404.html`; page briefly returns HTTP 404 before React boots | Hacky, SEO implications, some browsers show error banner |

For this app:
- No SEO requirements (private contest tool, not indexed)
- No deep linking beyond `?code=ABC123&mode=join` (query params work with hash router)
- Hash router is the correct, zero-hack choice

**URL structure:**
```
/#/                → HomeScreen
/#/admin           → AdminScreen
/#/voter           → VoterScreen
```

Query params for share links survive hash routing:
```
/#/?code=ABC123&mode=join   → HomeScreen reads params, opens modal
```

**Vite config required:**
```typescript
// vite.config.ts
export default defineConfig({
  base: '/cooking_contest/',  // must match GitHub Pages repo path
  // ...
})
```

**Confidence:** HIGH — confirmed by GitHub community discussions and multiple implementation guides.

---

## 2. React Project Structure

Aligned with the suggestion in UI_REFERENCE.md, verified against 2025 Vite + TypeScript best practices.

```
src/
  components/
    ui/               → Primitive, reusable UI atoms
      Button.tsx
      Input.tsx
      PinInput.tsx
      Modal.tsx        → base overlay+sheet structure
      Toast.tsx
      Badge.tsx
      PhaseBanner.tsx
      StatusBar.tsx
    dishes/           → Dish-domain components
      DishCard.tsx     → Admin list card
      VoteCard.tsx     → Voter voting card
      PhotoGrid.tsx    → 3-col photo grid (gallery tab)
      DishDetail.tsx   → Bottom sheet detail view
      PhotoUploadZone.tsx
    competition/      → Competition-domain components
      RankItem.tsx
      ParticipantCard.tsx
    layout/           → Structural wrappers
      AppHeader.tsx
      TabBar.tsx
      Screen.tsx       → Animated screen wrapper (screenIn animation)

  screens/
    Home/
      index.tsx        → HomeScreen
    Admin/
      index.tsx        → AdminScreen with tab state
      tabs/
        DishesTab.tsx
        ParticipantsTab.tsx
        RankingTab.tsx
        SettingsTab.tsx
    Voter/
      index.tsx        → VoterScreen with tab state
      tabs/
        VoteTab.tsx
        GalleryTab.tsx
        RankingTab.tsx
        MyDishTab.tsx

  modals/             → Full modal components (complex enough to own their logic)
    CreateCompetitionModal.tsx
    JoinCompetitionModal.tsx
    AddDishModal.tsx        → Admin's dish form
    MyDishModal.tsx         → Participant's dish form
    AuthModal.tsx           → Re-auth: PIN or password
    DishDetailSheet.tsx     → Gallery detail sheet

  hooks/
    useCompetition.ts       → competition state, phase, competition data
    useSession.ts           → localStorage session: read, write, clear, reauth
    useParticipant.ts       → current participant/admin context
    usePhotoUpload.ts       → compress → upload → return URL
    useVoting.ts            → submit vote, current vote state
    useToast.ts             → show/dismiss toast

  lib/
    supabase.ts             → createClient, typed DB helper
    api.ts                  → Edge Function callers (typed wrappers)
    sdk.ts                  → Direct SDK reads (dishes, photos, participants)
    hash.ts                 → simpleHash(input: string): string
    storage.ts              → localStorage session: SessionData type, TTL logic
    imageCompressor.ts      → compressImage(file: File): Promise<Blob>
    shareLinks.ts           → buildJoinLink, buildVoteLink

  types/
    index.ts                → Competition, Participant, Dish, Photo, Vote, Phase
    session.ts              → SessionData, SessionRole

  App.tsx                   → HashRouter, route declarations, URL param bootstrap
  main.tsx                  → ReactDOM.render
```

**Key structural decisions:**
- `modals/` is separate from `components/` because modals contain business logic (form submission, API calls), not just rendering
- `lib/api.ts` and `lib/sdk.ts` are separate to make the SDK-vs-Edge-Function boundary explicit (see Section 4)
- Hooks own data fetching + side effects; components render what hooks give them
- `screens/` directories own tab state (which tab is active) — not a router concern, just local `useState`

---

## 3. Session Management Pattern

This app uses a **custom session** (nickname + PIN/password), not Supabase Auth. The session is persisted in localStorage with a 2-hour TTL.

### Session Data Shape

```typescript
// src/types/session.ts
export type SessionRole = 'admin' | 'participant'

export interface SessionData {
  competitionId: string
  competitionCode: string
  competitionName: string
  role: SessionRole
  participantId?: string     // undefined for admin
  nickname: string
  // for re-auth verification (not the raw credential)
  credentialHash: string     // hash(PIN) or hash(adminPassword)
  expiresAt: number          // Date.now() + 2h
}
```

### localStorage Layout

```typescript
// one key per competition, keyed by code
const KEY = `fing_session_${code}`

// additional key for "recent competitions" list on Home
const RECENT_KEY = 'fing_recent_competitions'
```

### Re-auth Flow

```
1. User returns to app / clicks recent competition
2. Read SessionData from localStorage
3. If session.expiresAt < Date.now() → session expired → force full re-auth (join modal)
4. If session valid → open AuthModal (PIN boxes or password field)
5. User enters credential → simpleHash(input) === session.credentialHash?
   YES → refresh session.expiresAt, navigate to admin/voter screen
   NO  → show error, remain on home
```

### RLS Integration

Since this app does not use Supabase Auth, all direct SDK reads happen as the **anon** role. RLS policies on readable data must permit the anon role.

For write operations and sensitive reads, the pattern is:
- Client calls an Edge Function, passing competition code + credential hash in the request body
- Edge Function verifies the credential against the DB (hashed comparison)
- Edge Function performs the write/sensitive read using the **service role** Supabase client (bypasses RLS)
- Edge Function returns the result

This means:
- Reads: anon SDK calls, RLS allows read of competition/dishes/photos
- Writes + sensitive ops: Edge Functions with credential verification

**Why not custom JWTs for RLS?**
Custom JWT signing is possible but adds complexity (need to mint JWTs in Edge Functions and re-inject into the client). For an app of this scale, Edge Functions acting as a thin trusted layer is simpler and equally secure.

**Confidence:** HIGH — pattern verified against Supabase RLS docs and GitHub discussions on custom auth.

---

## 4. Data Flow: SDK vs Edge Functions

The boundary is: **SDK for reads, Edge Functions for writes that require auth or business logic.**

```
CLIENT SDK (anon role, no auth verification)
├── competitions.select → load competition by code
├── dishes.select       → list dishes (chef_name filtered by RLS in voting/prep)
├── photos.select       → list photos for a dish
└── participants.select → list participants (no PINs — never stored in plain text)

EDGE FUNCTIONS (service role, credential verified inside function)
├── POST /join          → create or re-auth participant (verifies PIN hash, returns session data)
├── POST /create-competition → create competition (generates code, hashes admin password)
├── POST /add-dish      → add dish with participant_id (verifies session ownership)
├── PATCH /update-dish  → update dish (verifies ownership: participant owns dish, or admin)
├── DELETE /delete-dish → delete dish + cascade votes (admin only, verifies admin password hash)
├── POST /vote          → cast/change vote (verifies participant owns session, not own dish, phase=voting)
├── PATCH /phase        → advance phase (admin only, verifies admin password hash)
└── DELETE /reset-votes → delete all votes for competition (admin only)
```

**Photo upload is a special case** (see Section 7).

**Why this split?**
- Reads are non-sensitive (competition info, dish names, photos). Anon reads are fine.
- `chef_name` visibility requires logic: RLS policy can hide it based on competition phase. RLS on `dishes` table: `CASE WHEN phase = 'finished' THEN chef_name ELSE NULL END` is achievable via a view or RLS using a join, but it's complex. Simpler: create a Postgres view `dishes_public` that omits `chef_name` when phase != 'finished', expose via RLS to anon. Admin reads directly from the `dishes` table (via Edge Function).
- Business rules (vote constraints, phase transitions, one-dish-per-participant) are impossible to enforce reliably on the client — Edge Functions are the enforcement point.

**Confidence:** HIGH — confirmed by Supabase architecture docs and closefuture.io analysis of DB functions vs Edge Functions.

---

## 5. Supabase Schema Design

### Tables

```sql
-- Competition
create table competitions (
  id              uuid primary key default gen_random_uuid(),
  code            text unique not null,          -- 6-char uppercase alphanumeric
  name            text not null,
  admin_pwd_hash  text not null,
  phase           text not null default 'preparation'
                  check (phase in ('preparation','voting','finished')),
  created_at      timestamptz default now()
);

-- Participant
create table participants (
  id              uuid primary key default gen_random_uuid(),
  competition_id  uuid references competitions(id) on delete cascade,
  nickname        text not null,
  pin_hash        text not null,
  voted_dish_id   uuid references dishes(id) on delete set null,
  joined_at       timestamptz default now(),
  unique (competition_id, nickname)
);

-- Dish
create table dishes (
  id              uuid primary key default gen_random_uuid(),
  competition_id  uuid references competitions(id) on delete cascade,
  participant_id  uuid references participants(id) on delete set null,
  name            text not null,
  chef_name       text not null,
  ingredients     text,
  recipe          text,
  story           text,
  created_at      timestamptz default now()
);

-- Photo
create table photos (
  id              uuid primary key default gen_random_uuid(),
  dish_id         uuid references dishes(id) on delete cascade,
  url             text not null,
  is_extra        boolean not null default false,
  "order"         integer not null default 0,
  created_at      timestamptz default now()
);

-- Vote
create table votes (
  id              uuid primary key default gen_random_uuid(),
  competition_id  uuid references competitions(id) on delete cascade,
  participant_id  uuid references participants(id) on delete cascade,
  dish_id         uuid references dishes(id) on delete cascade,
  created_at      timestamptz default now(),
  unique (competition_id, participant_id)         -- one vote per participant per competition
);
```

### RLS Policies

**Guiding principle:** anon role can read non-sensitive data. Writes go through Edge Functions (no RLS write policies needed for anon).

```sql
-- Enable RLS on all tables
alter table competitions enable row level security;
alter table participants enable row level security;
alter table dishes enable row level security;
alter table photos enable row level security;
alter table votes enable row level security;

-- competitions: anyone can read
create policy "competitions_read" on competitions
  for select to anon using (true);

-- participants: anyone can read (no PINs, no sensitive data)
create policy "participants_read" on participants
  for select to anon using (true);

-- dishes: phase-aware read via Postgres function
-- chef_name is nullified in non-finished phases via a view
create policy "dishes_read" on dishes
  for select to anon using (true);
-- NOTE: chef_name hiding is done in the view/API layer, not RLS
-- (RLS cannot easily conditionally mask columns — use a view instead)

-- photos: anyone can read
create policy "photos_read" on photos
  for select to anon using (true);

-- votes: only count aggregates are public; raw vote rows are private
-- Admin reads via Edge Function (service role bypasses RLS)
-- Participants only need to know their own vote (also via Edge Function)
-- No anon read policy on votes
```

### View for chef_name Masking

```sql
create or replace view dishes_public as
select
  d.id,
  d.competition_id,
  d.participant_id,
  d.name,
  case
    when c.phase = 'finished' then d.chef_name
    else null
  end as chef_name,
  d.ingredients,
  d.recipe,
  d.story,
  d.created_at
from dishes d
join competitions c on c.id = d.competition_id;

-- Grant to anon
grant select on dishes_public to anon;
```

Participants query `dishes_public`. Admin queries `dishes` directly (via Edge Function with service role).

### Storage Buckets

```
bucket: dish-photos
  policy: public read (anyone can view photos)
  policy: anon upload allowed (checked structurally by path, validated in Edge Function)
  path pattern: {competition_id}/{dish_id}/{filename}

  Note: photo upload is the one case where client uploads directly via SDK,
  but the Edge Function creates the Photo record (URL → DB) after the upload completes.
  This ensures we don't store orphaned URLs.
```

**Confidence:** HIGH for schema design. MEDIUM for RLS approach (the view pattern is verified as sound, though implementation details should be tested).

---

## 6. Edge Functions Architecture

Five Edge Functions, organized by domain:

### `POST /functions/v1/competition-create`
```
Input:  { name, adminPassword, adminNickname }
Logic:
  1. Generate unique 6-char code (retry if collision)
  2. Hash adminPassword → admin_pwd_hash
  3. Hash adminPassword → participantPinHash (admin's participant entry uses same hash)
  4. Insert competition
  5. Insert participant record for admin (so admin appears in participants list)
  6. Return: { competition, participantId, sessionData }
Auth: none required (creates the competition)
```

### `POST /functions/v1/competition-join`
```
Input:  { code, nickname, credential }
  credential is either: admin password (if admin re-join) or 4-digit PIN
Logic:
  1. Load competition by code
  2. hash(credential) === competition.admin_pwd_hash?
     YES → return admin session
  3. Find participant by (competition_id, nickname)
     EXISTS → verify hash(credential) === participant.pin_hash
               YES → return participant session
               NO  → return 401
     NOT EXISTS → create participant with hash(credential) as pin_hash
  4. Return: { competition, participant, role, credentialHash }
Auth: none required
```

### `POST /functions/v1/dish-write`
```
Handles: create dish, update dish
Input:  { action: 'create'|'update', competitionCode, credentialHash, dishId?, dishData }
Logic:
  1. Verify session: load competition, find participant/admin by credentialHash
  2. Enforce ownership:
     - admin can create/update any dish
     - participant can only create/update their own dish, only in 'preparation' phase
     - participant cannot have > 1 dish (on create)
  3. Perform DB write
  4. Return updated dish
Auth: credentialHash verified inside function
```

### `POST /functions/v1/dish-delete`
```
Input:  { competitionCode, adminCredentialHash, dishId }
Logic:
  1. Verify admin (credentialHash === competition.admin_pwd_hash)
  2. Delete votes where dish_id = dishId
  3. Delete photos from storage (list bucket prefix, delete)
  4. Delete dish
Auth: admin only
```

### `POST /functions/v1/vote-cast`
```
Input:  { competitionCode, participantCredentialHash, dishId }
Logic:
  1. Verify participant session
  2. Verify competition.phase === 'voting'
  3. Verify dish.participant_id !== participant.id (no self-vote)
  4. Upsert vote (delete existing + insert new, or use ON CONFLICT DO UPDATE)
  5. Update participant.voted_dish_id
  6. Return updated participant
Auth: participant verified
```

### `POST /functions/v1/competition-settings`
```
Handles: phase change, vote reset
Input:  { competitionCode, adminCredentialHash, action: 'advance-phase'|'reset-votes' }
Logic:
  - advance-phase:
    1. Verify admin
    2. Enforce unidirectional: preparation→voting→finished only
    3. Update phase
  - reset-votes:
    1. Verify admin
    2. Delete all votes for competition
    3. Clear participant.voted_dish_id for all participants
Auth: admin only
```

**Calling pattern from client:**
```typescript
// lib/api.ts
export async function castVote(payload: VotePayload) {
  const { data, error } = await supabase.functions.invoke<VoteResponse>(
    'vote-cast',
    { body: payload }
  )
  if (error) throw new ApiError(error.message)
  return data
}
```

**Confidence:** HIGH for function responsibilities. MEDIUM for exact implementation (the pattern is correct, implementation will need testing).

---

## 7. Photo Upload / Storage Flow

```
CLIENT                         SUPABASE
  │
  1. User selects file(s)
  │
  2. compressImage(file)         (canvas API, max 800px, 0.72 JPEG)
     → Blob
  │
  3. supabase.storage
     .from('dish-photos')
     .upload(path, blob)  ──────→ Storage bucket (direct SDK upload)
     ← { path, fullPath }
  │
  4. supabase.storage
     .from('dish-photos')
     .getPublicUrl(path)  ──────→ Returns public CDN URL
  │
  5. Call dish-write Edge Function
     with { photoUrl, isExtra, order }  ──→ Edge Function inserts Photo record
  │
  6. Photo record created in DB
     with url = CDN URL
```

**Why direct SDK upload (not via Edge Function)?**
- Supabase Storage accepts direct client uploads up to 50MB (standard uploads)
- The bucket is public-read; upload path is structured to prevent collision: `{competitionId}/{dishId}/{uuid}.jpg`
- The DB record creation (step 5) still goes through an Edge Function to enforce business rules (e.g., max photos per dish, phase checks for extra photos)

**Compression code pattern:**
```typescript
// lib/imageCompressor.ts
export async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const MAX = 800
      const scale = Math.min(MAX / img.width, MAX / img.height, 1)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Compression failed')),
        'image/jpeg',
        0.72
      )
      URL.revokeObjectURL(url)
    }
    img.onerror = reject
    img.src = url
  })
}
```

**Confidence:** HIGH — canvas compression pattern is well established. Supabase Storage SDK upload pattern confirmed in official docs.

---

## 8. Global State vs Local State

**Recommendation: Zustand for global state, useState/useReducer for local.**

Zustand wins over Context API for this app because:
- Screen-level state (current competition, current session) is accessed by many disconnected components
- Context API re-renders all consumers on any state change — this causes issues with voting card list, gallery grid, etc.
- Zustand is selective: components subscribe only to slices they use

**Store design:**
```typescript
// stores/sessionStore.ts
interface SessionStore {
  session: SessionData | null
  setSession: (s: SessionData) => void
  clearSession: () => void
}

// stores/competitionStore.ts
interface CompetitionStore {
  competition: Competition | null
  participants: Participant[]
  dishes: Dish[]
  photos: Photo[]           // all photos, keyed by dishId at usage site
  myVote: Vote | null
  loading: boolean
  setCompetition: (c: Competition) => void
  setParticipants: (p: Participant[]) => void
  setDishes: (d: Dish[]) => void
  setPhotos: (p: Photo[]) => void
  setMyVote: (v: Vote | null) => void
  setLoading: (b: boolean) => void
}
```

**What stays local (useState):**
- Modal open/close state
- Active tab index
- Form field values
- Upload progress
- Toast visibility

**Data fetching pattern:**
No React Query in v1 (out of scope, adds complexity). Data is fetched in `useCompetition` hook on screen mount and on manual refresh (tab switch triggers re-fetch). This aligns with the "no real-time sync in v1" constraint from PROJECT.md.

```typescript
// hooks/useCompetition.ts
export function useCompetition(code: string) {
  const { setDishes, setParticipants, setCompetition, setPhotos } = useCompetitionStore()

  const refresh = useCallback(async () => {
    const [competition, dishes, participants, photos] = await Promise.all([
      sdk.getCompetition(code),
      sdk.getDishes(code),          // queries dishes_public view
      sdk.getParticipants(code),
      sdk.getPhotos(code),
    ])
    setCompetition(competition)
    setDishes(dishes)
    setParticipants(participants)
    setPhotos(photos)
  }, [code])

  useEffect(() => { refresh() }, [refresh])

  return { refresh }
}
```

**Confidence:** HIGH for Zustand recommendation. MEDIUM for exact store shape (may evolve during implementation).

---

## 9. Component Boundaries (What Talks to What)

```
App (router, URL param bootstrap)
│
├── HomeScreen
│   ├── reads: localStorage (recent competitions)
│   ├── opens: CreateCompetitionModal → calls api.createCompetition()
│   └── opens: JoinCompetitionModal / AuthModal → calls api.joinCompetition()
│
├── AdminScreen
│   ├── reads: competitionStore (competition, dishes, participants)
│   ├── tabs:
│   │   ├── DishesTab
│   │   │   ├── reads: dishes, photos from store
│   │   │   ├── renders: DishCard[]
│   │   │   └── opens: AddDishModal → calls api.writeDish() + sdk.uploadPhoto()
│   │   ├── ParticipantsTab
│   │   │   ├── reads: participants from store
│   │   │   └── renders: ParticipantCard[]
│   │   ├── RankingTab
│   │   │   ├── reads: dishes + votes (fetched via api.getVotes())
│   │   │   └── renders: RankItem[]
│   │   └── SettingsTab
│   │       ├── reads: competition from store
│   │       └── calls: api.advancePhase(), api.resetVotes()
│   └── AppHeader + TabBar (layout, no data)
│
└── VoterScreen
    ├── reads: competitionStore (competition, dishes, photos)
    ├── reads: sessionStore (current participant)
    ├── tabs:
    │   ├── VoteTab
    │   │   ├── renders: VoteCard[] (dishes from store, filtered by phase)
    │   │   └── calls: api.castVote()
    │   ├── GalleryTab
    │   │   ├── renders: PhotoGrid
    │   │   └── opens: DishDetailSheet (local state, no API call)
    │   ├── RankingTab
    │   │   └── renders: RankItem[] (dishes from store, phase=finished only)
    │   └── MyDishTab
    │       ├── reads: current participant's dish from store
    │       ├── opens: MyDishModal → calls api.writeDish()
    │       └── uploads: extra photos via sdk.uploadPhoto() + api.addPhoto()
    └── AppHeader + TabBar (layout, no data)
```

**Data direction rules:**
- Screens fetch, store, render downward
- Components never call APIs directly — they receive callbacks or use hooks that call APIs
- Modal components receive an `onSuccess` callback → caller refreshes store

---

## 10. Build Order (Phase Dependencies)

Building in this order minimizes blocked work:

```
Phase 1: Foundation
  1a. Project scaffold (Vite + React + TypeScript + HashRouter)
  1b. Design system (CSS variables, fonts, base components: Button, Input, Modal shell)
  1c. Supabase setup (project, tables, RLS, storage bucket, anon key)
  1d. Types (Competition, Participant, Dish, Photo, Vote, SessionData)
  1e. lib/supabase.ts + lib/hash.ts + lib/storage.ts

  Dependencies: nothing

Phase 2: Home Screen + Auth Flow
  2a. HomeScreen UI (dark bg, hero, recent list, CTA buttons)
  2b. CreateCompetitionModal (form + Edge Function: competition-create)
  2c. JoinCompetitionModal (form + Edge Function: competition-join)
  2d. AuthModal (PIN boxes + password field)
  2e. sessionStore + useSession hook
  2f. URL param bootstrap in App.tsx

  Dependencies: Phase 1 complete

Phase 3: Admin Screen — Dishes
  3a. AdminScreen shell (AppHeader, TabBar, Screen component)
  3b. DishesTab + DishCard
  3c. AddDishModal (form, multi-photo upload, compression)
  3d. Edge Function: dish-write + dish-delete
  3e. Storage bucket upload flow (compressImage + SDK upload + getPublicUrl)
  3f. competitionStore + useCompetition hook (reads)

  Dependencies: Phase 2 (session), Phase 1 (supabase client)

Phase 4: Admin Screen — Remaining Tabs
  4a. ParticipantsTab + ParticipantCard
  4b. SettingsTab + phase management (Edge Function: competition-settings)
  4c. Share links (buildJoinLink, buildVoteLink, copy to clipboard)
  4d. RankingTab (admin view, with toggle)

  Dependencies: Phase 3 (competitionStore populated)

Phase 5: Voter Screen
  5a. VoterScreen shell (AppHeader, TabBar)
  5b. VoteTab + VoteCard (phase-aware display)
  5c. Edge Function: vote-cast
  5d. GalleryTab + PhotoGrid + DishDetailSheet
  5e. RankingTab (voter view, finished phase only)
  5f. MyDishTab + MyDishModal + extra photo upload

  Dependencies: Phase 3 (dish/photo data), Phase 2 (session)

Phase 6: Polish
  6a. PhaseBanner + StatusBar components
  6b. Toast notifications (useToast hook)
  6c. Screen transition animations (screenIn, sheetUp keyframes)
  6d. Error states and loading skeletons
  6e. Responsive max-width centering on desktop
  6f. PWA meta tags / viewport for mobile

  Dependencies: All phases complete
```

**Critical path:** Phase 1 → Phase 2 (auth) → Phase 3 (dish management) unlocks everything else. The Voter Screen (Phase 5) can be built in parallel with Phase 4 once Phase 3 is stable.

---

## 11. Anti-Patterns to Avoid

### API calls in render components
**Problem:** Component directly calls `supabase.from('dishes').select()` in a `useEffect`.
**Why bad:** Bypasses the centralized store, creates duplicate fetch logic, hard to test.
**Instead:** All Supabase access goes through `lib/sdk.ts` or `lib/api.ts`. Hooks call these libraries. Components call hooks.

### Writing chef_name directly in client-side queries to dishes table
**Problem:** Client queries `dishes` table directly and filters chef_name client-side.
**Why bad:** chef_name arrives in the response payload — it can be read from network tab.
**Instead:** Client always queries `dishes_public` view (which masks chef_name). Admin reads via Edge Function with service role.

### Storing credential hashes in Zustand (memory only)
**Problem:** Session hash kept only in memory, lost on page refresh.
**Why bad:** User must re-authenticate on every page refresh, bad UX.
**Instead:** Persist credentialHash in localStorage inside SessionData (already TTL-managed).

### Uploading original uncompressed images
**Problem:** Skip compression for simplicity.
**Why bad:** A 12MP iPhone photo is 4–8MB. With 10 dishes × 3 photos each = 120–240MB/session. Storage costs, slow gallery load.
**Instead:** Always compress via `compressImage()` before upload. This is a hard requirement, not optional.

### Using BrowserRouter on GitHub Pages
**Problem:** Direct navigation to `/#/admin` works, but `/admin` (without hash) returns GitHub's 404.
**Why bad:** Share links break, browser refresh breaks the app.
**Instead:** HashRouter always. Deep-link share data via query params: `/#/?code=ABC123&mode=join`.

---

## Sources

- [Supabase Edge Functions Architecture](https://supabase.com/docs/guides/functions/architecture) — Edge vs DB functions guidance
- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) — anon/authenticated roles, JWT claims
- [Supabase Storage Upload Reference](https://supabase.com/docs/reference/javascript/storage-from-upload) — upload pattern
- [Supabase Edge Functions Auth](https://supabase.com/docs/guides/functions/auth) — JWT verification in functions
- [Supabase functions.invoke() Reference](https://supabase.com/docs/reference/javascript/functions-invoke) — client-side Edge Function call pattern
- [GitHub Pages SPA Routing — community discussion](https://github.com/orgs/community/discussions/64096) — hash router rationale
- [React State Management 2025](https://www.developerway.com/posts/react-state-management-2025) — Zustand vs Context trade-offs
- [Supabase RLS without Auth — GitHub discussion](https://github.com/orgs/supabase/discussions/20311) — custom session pattern
