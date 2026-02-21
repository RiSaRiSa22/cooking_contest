# Phase 01: Foundation + Auth - Research

**Researched:** 2026-02-21
**Domain:** Vite + React + TypeScript scaffold, Tailwind v4, Supabase (DB + Edge Functions + Storage), React Router HashRouter, Zustand session store
**Confidence:** HIGH (all major claims verified via Context7 or official docs)

---

## Summary

Phase 01 sets up the full technical foundation: scaffold, design system, Supabase schema with RLS, and the custom PIN-based auth flow. The stack is locked (Vite + React + TypeScript + Tailwind v4 + HashRouter + Supabase + Zustand) with no Supabase Auth — sessions live in localStorage with a 2h TTL and are managed by a Zustand store.

The main research findings:
1. **Tailwind v4 is a major rewrite** — no `tailwind.config.js`, CSS-first config via `@theme` directive, import via `@import "tailwindcss"`. The Vite plugin (`@tailwindcss/vite`) is the correct integration path. Design tokens map cleanly to `@theme` CSS variables.
2. **HashRouter is the correct and current approach** for GitHub Pages SPAs with React Router v7. `createHashRouter` is the data-router API; the older `<HashRouter>` component also works. Both are fully supported in v7.
3. **Supabase custom auth (no Supabase Auth)** means Edge Functions handle all auth logic. The anon key is used for all reads; Edge Functions use the service role key internally for writes + auth decisions. No JWT from Supabase Auth is in play.
4. **`dishes_public` view** must use `security_invoker = true` (Postgres 15+, available on Supabase) to respect underlying RLS. The view selects only non-sensitive columns conditionally — hiding `chef_name` and `participant_id` unless phase = 'finished'.
5. **PIN rate limiting** requires a DB-based counter table (no built-in Supabase rate limiter for Edge Functions without Upstash Redis). A simple `login_attempts` table with TTL cleanup is sufficient for this use case.
6. **GitHub Actions deploy** uses the official Vite static deploy pattern: set `base: '/<REPO>/'`, use `actions/configure-pages` + `actions/upload-pages-artifact` + `actions/deploy-pages`.

**Primary recommendation:** Follow the locked decisions exactly. The only open design area is the Tailwind `@theme` token naming convention — use the CSS variable names from `UI_REFERENCE.md` directly as `@theme` tokens.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vite | 7.x (latest) | Build tool + dev server | Fastest HMR, first-class React support, official GH Pages deploy guide |
| React | 19.x | UI framework | Locked decision |
| TypeScript | 5.x | Type safety | Locked decision |
| `@vitejs/plugin-react` | latest | React HMR for Vite | Official plugin, fast refresh |
| Tailwind CSS | 4.x | Utility-first CSS | Locked decision; v4 is current stable |
| `@tailwindcss/vite` | latest | Vite plugin for Tailwind v4 | Required for v4; PostCSS path is secondary option |
| React Router | 7.x | Client-side routing with HashRouter | Locked decision; v7 is current stable |
| Zustand | 5.x | Session store + localStorage persist | Locked decision; small, typed, persist middleware built-in |
| `@supabase/supabase-js` | 2.x | Supabase SDK (reads, storage upload) | Official client; v2 is current stable |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `supabase` CLI | latest | Migrations, type gen, Edge Functions local serve | All DB/function work |
| Zod | 4.x | Input validation in Edge Functions | Validate request bodies before DB writes |

> **Zod v4 warning (from STATE.md):** Zod v4 has breaking changes vs v3. Verify import paths and API at setup time. `z.string()`, `z.object()` core API is stable but some validators changed. Check https://zod.dev for v4 specifics before writing schemas.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@tailwindcss/vite` | PostCSS + `tailwindcss` | Vite plugin is faster; PostCSS is fallback if issues arise |
| `createHashRouter` | `<HashRouter>` component | Both work in v7; `createHashRouter` is the data-router API (supports loaders/actions if needed later); `<HashRouter>` is simpler but declarative-only |
| Zustand persist | Custom localStorage wrapper | Zustand persist handles serialization/deserialization, TTL via custom storage, type safety — don't build custom |
| DB-based rate limiting | Upstash Redis | Upstash is the Supabase-recommended production solution; DB counter is simpler for this scale |

**Installation:**
```bash
npm create vite@latest fornelli-in-gara -- --template react-ts
cd fornelli-in-gara
npm install tailwindcss @tailwindcss/vite
npm install react-router
npm install zustand
npm install @supabase/supabase-js
npm install zod
npm install -D supabase
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── components/
│   ├── ui/             # Button, Input, PinInput, Modal, Toast, Badge
│   ├── layout/         # AppHeader, TabBar, Screen
│   ├── dishes/         # DishCard, VoteCard, PhotoGrid, DishDetail
│   └── competition/    # PhaseBanner, StatusBar, RankItem, ParticipantCard
├── screens/
│   ├── Home/           # HomeScreen + empty state
│   ├── Admin/          # 4 tabs: Dishes, Participants, Ranking, Settings
│   └── Voter/          # 4 tabs: Vote, Gallery, Ranking, MyDish
├── hooks/
│   ├── useCompetition.ts
│   ├── useAuth.ts
│   └── usePhotoUpload.ts
├── lib/
│   ├── supabase.ts     # createClient singleton
│   ├── hash.ts         # simpleHash for PIN (client-side before sending)
│   ├── session.ts      # sessionStore types + TTL logic
│   └── compress.ts     # image compression (canvas API)
├── store/
│   └── sessionStore.ts # Zustand store with persist
├── types/
│   └── database.types.ts  # generated by supabase gen types
└── main.tsx

supabase/
├── migrations/
│   └── 20260221000000_initial_schema.sql
└── functions/
    ├── competition-create/
    │   └── index.ts
    └── competition-join/
        └── index.ts
```

### Pattern 1: Tailwind v4 CSS-First Design Tokens

**What:** No `tailwind.config.js`. All tokens go in `src/index.css` using `@theme`. Token names map to utility classes automatically.

**When to use:** Always — this is the only config mechanism in v4.

**Example:**
```css
/* src/index.css */
@import "tailwindcss";

@theme {
  /* Colors — generates bg-ink, text-ink, etc. */
  --color-ink:            #1A1208;
  --color-ink-mid:        #4A3828;
  --color-ink-light:      #8B6E56;
  --color-parchment:      #FBF6EE;
  --color-parchment-dark: #F0E8D8;
  --color-parchment-deep: #E4D5BF;
  --color-ember:          #C44B1B;
  --color-ember-light:    #E8683A;
  --color-gold:           #C9991F;
  --color-gold-light:     #E5BC4A;
  --color-sage:           #5C7A5A;
  --color-sage-light:     #7FA87D;

  /* Fonts — generates font-display, font-body */
  --font-display: 'Cormorant Garamond', serif;
  --font-body:    'Outfit', sans-serif;

  /* Border radius */
  --radius-card: 20px;
  --radius-sm:   12px;
  --radius-pill: 50px;

  /* Animations */
  --animate-screen-in: screenIn 0.35s ease;
  --animate-sheet-up:  sheetUp 0.3s ease;
  --animate-fade-up:   fadeUp 0.3s ease;
  --animate-pop-in:    popIn 0.3s ease;
  --animate-flicker:   flicker 3s infinite alternate;
  --animate-pulse:     pulse 1.5s infinite;
  --animate-spin:      spin 0.7s linear infinite;

  @keyframes screenIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes sheetUp {
    from { transform: translateY(100%); }
    to   { transform: none; }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes popIn {
    from { opacity: 0; transform: scale(.92); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes flicker {
    0%   { transform: scale(1) rotate(-1deg);   filter: drop-shadow(0 0 30px rgba(232,104,58,.6)); }
    100% { transform: scale(1.06) rotate(1.5deg); filter: drop-shadow(0 0 50px rgba(201,153,31,.8)); }
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50%       { transform: scale(1.4); opacity: .7; }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
}
```

**Key v4 difference from v3:** Use CSS variables as arbitrary values with parentheses syntax:
```html
<!-- v4 syntax (correct) -->
<div class="bg-(--color-ember)"></div>
<!-- v3 syntax (wrong in v4) -->
<div class="bg-[--color-ember]"></div>
```

Source: Context7 `/tailwindlabs/tailwindcss.com`

### Pattern 2: Vite Config for GitHub Pages

**What:** `base` must match the repo name for correct asset paths on GH Pages.

```typescript
// vite.config.ts
// Source: https://vite.dev/guide/static-deploy#github-pages
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/cooking_contest/',  // must match GitHub repo name
  resolve: {
    alias: { '@': '/src' },
  },
})
```

### Pattern 3: HashRouter with React Router v7

**What:** `createHashRouter` is the v7 data-router API for hash-based routing. All routes use `/#/path` format which GitHub Pages serves correctly.

```typescript
// src/router.tsx
// Source: Context7 /remix-run/react-router
import { createHashRouter, RouterProvider } from 'react-router'

const router = createHashRouter([
  {
    path: '/',
    element: <HomeScreen />,
  },
  {
    path: '/admin/:code',
    element: <AdminScreen />,
  },
  {
    path: '/voter/:code',
    element: <VoterScreen />,
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
```

Deep link with pre-filled join code uses URL hash params: `/#/?code=ABC123&mode=join`.
Parse with `useSearchParams` from react-router.

### Pattern 4: Zustand Session Store with TTL

**What:** Session stored in localStorage via Zustand persist middleware. TTL enforced at read time (not at write time).

```typescript
// src/store/sessionStore.ts
// Source: Context7 /pmndrs/zustand
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type UserRole = 'admin' | 'participant'

interface Session {
  competitionId: string
  competitionCode: string
  competitionName: string
  participantId: string | null  // null when admin
  nickname: string
  role: UserRole
  authenticatedAt: number       // Date.now()
}

interface SessionStore {
  sessions: Record<string, Session>  // keyed by competitionCode
  addSession: (session: Session) => void
  getSession: (code: string) => Session | null
  removeSession: (code: string) => void
  clearExpired: () => void
}

const TTL_MS = 2 * 60 * 60 * 1000  // 2 hours

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      sessions: {},
      addSession: (session) =>
        set((s) => ({ sessions: { ...s.sessions, [session.competitionCode]: session } })),
      getSession: (code) => {
        const session = get().sessions[code]
        if (!session) return null
        if (Date.now() - session.authenticatedAt > TTL_MS) {
          get().removeSession(code)
          return null  // expired → triggers re-auth modal
        }
        return session
      },
      removeSession: (code) =>
        set((s) => {
          const { [code]: _, ...rest } = s.sessions
          return { sessions: rest }
        }),
      clearExpired: () =>
        set((s) => ({
          sessions: Object.fromEntries(
            Object.entries(s.sessions).filter(
              ([, sess]) => Date.now() - sess.authenticatedAt <= TTL_MS
            )
          ),
        })),
    }),
    { name: 'fornelli-sessions' }
  )
)
```

### Pattern 5: Supabase Client Singleton

```typescript
// src/lib/supabase.ts
// Source: Context7 /supabase/supabase-js
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,   // no Supabase Auth — custom session management
    },
  }
)
```

### Pattern 6: Edge Function Auth Pattern (competition-create)

**What:** Edge Functions use service role key to bypass RLS for writes. They handle hashing, validation, unique code generation.

```typescript
// supabase/functions/competition-create/index.ts
// Source: Context7 /supabase/supabase
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!  // bypasses RLS
)

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const body = await req.json()
  // validate with Zod
  // generate unique 6-char code
  // hash PIN/password
  // insert competition + participant records
  // return session data (no JWT — custom session)
  return Response.json({ code, participantId, role: 'admin' })
})
```

**Client-side call:**
```typescript
// Source: Context7 /supabase/supabase-js
const { data, error } = await supabase.functions.invoke('competition-create', {
  body: { name, nickname, pinHash, allowGuests, maxParticipants }
})
```

### Pattern 7: dishes_public View (Security Invoker)

**What:** PostgreSQL view that hides `chef_name` and `participant_id` unless the competition phase is 'finished'. Uses `security_invoker = true` so RLS from the underlying tables still applies.

```sql
-- Source: Context7 /supabase/supabase (RLS docs)
-- Requires Postgres 15+ (available on Supabase)
CREATE VIEW dishes_public
WITH (security_invoker = true)
AS
  SELECT
    d.id,
    d.competition_id,
    d.name,
    d.ingredients,
    d.recipe,
    d.story,
    d.created_at,
    -- only reveal chef identity when competition is finished
    CASE WHEN c.phase = 'finished' THEN d.chef_name ELSE NULL END AS chef_name,
    CASE WHEN c.phase = 'finished' THEN d.participant_id ELSE NULL END AS participant_id
  FROM dishes d
  JOIN competitions c ON c.id = d.competition_id;
```

**Important:** The view must be in the `public` schema to be accessible via the anon key. The underlying `dishes` table should have RLS enabled and block direct anon reads.

### Pattern 8: PIN Rate Limiting (DB-based)

**What:** Since Supabase has no built-in rate limiter for Edge Functions (Upstash Redis is recommended for production but adds external dependency), use a DB counter table for PIN attempts. Suitable for this app's scale (5-20 users per competition).

```sql
CREATE TABLE login_attempts (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_code text NOT NULL,
  nickname    text NOT NULL,
  attempted_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX ON login_attempts (competition_code, nickname, attempted_at);
```

In the Edge Function, before verifying PIN:
```typescript
// Count attempts in last 15 minutes
const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
const { count } = await supabase
  .from('login_attempts')
  .select('*', { count: 'exact', head: true })
  .eq('competition_code', code)
  .eq('nickname', nickname)
  .gte('attempted_at', fifteenMinutesAgo)

if ((count ?? 0) >= 5) {
  return Response.json({ error: 'Too many attempts. Wait 15 minutes.' }, { status: 429 })
}
// log attempt, then verify PIN
```

### Pattern 9: GitHub Actions Deploy Workflow

```yaml
# .github/workflows/deploy.yml
# Source: https://vite.dev/guide/static-deploy#github-pages
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

**Repository settings:** Settings → Pages → Source → GitHub Actions.

### Anti-Patterns to Avoid

- **Using BrowserRouter on GitHub Pages:** 404 on deep link refresh. HashRouter is mandatory.
- **Reading dishes table directly (anon):** Exposes `chef_name` before phase = 'finished'. Always query `dishes_public` view from frontend.
- **Storing PIN in plaintext in localStorage:** Only store session metadata (role, nickname, competitionCode). Never store PIN or password.
- **Using Supabase Auth:** Project decision is custom PIN auth. Mixing them creates confusion. The `auth.persistSession: false` in client config makes this explicit.
- **Creating view without `security_invoker = true`:** Default views bypass RLS (security definer). Without this flag, anon users can read all dishes including chef names.
- **Testing RLS via Supabase Studio:** Studio uses superuser which bypasses RLS. Always test with anon key via SDK client (confirmed pitfall from STATE.md).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session TTL management | Custom localStorage reader with expiry checks | Zustand persist + TTL check in `getSession` getter | Zustand handles serialization, storage key conflicts, hydration |
| CSS custom properties management | Inline style objects, CSS-in-JS | Tailwind v4 `@theme` tokens | Generates utility classes automatically, co-located with CSS |
| Image compression | Third-party library | Browser canvas API (`canvas.toDataURL('image/jpeg', 0.72)`) | No dependency, max 800px resize is straightforward canvas 2D |
| Supabase type safety | Manual interface definitions | `supabase gen types typescript --local > src/types/database.types.ts` | Auto-generated from actual schema, stays in sync |
| Edge Function input validation | Custom if/else validators | Zod schemas | Handles nested types, union types, error messages |

**Key insight:** The most common failure pattern is building bespoke solutions for problems that are 10 lines with the right library. Session management and type generation are the two biggest hand-roll traps in this phase.

---

## Common Pitfalls

### Pitfall 1: Tailwind v4 — No `tailwind.config.js`

**What goes wrong:** Developer creates `tailwind.config.js`, defines `theme.extend.colors`, nothing works. Custom classes don't generate.

**Why it happens:** v4 completely dropped the JS config file. The `@theme` directive in CSS is the only config mechanism.

**How to avoid:** Delete any `tailwind.config.js`. Define all tokens in `src/index.css` under `@theme`. Import with `@import "tailwindcss"` (not `@tailwind base; @tailwind components; @tailwind utilities`).

**Warning signs:** Custom color classes not appearing in build output; `bg-ember` returns nothing.

### Pitfall 2: RLS Testing in Supabase Studio

**What goes wrong:** Developer writes RLS policy, tests via Studio query editor, sees data → assumes policy works. In production with anon key, access is blocked or (worse) all data is exposed.

**Why it happens:** Studio uses `postgres` superuser role which bypasses all RLS.

**How to avoid:** Always test RLS with actual anon key. Use the SDK: `createClient(url, anonKey)` in a test file or Playwright test. Or use Supabase CLI: `supabase db test`.

**Warning signs:** Policy "works" in Studio but not in app.

### Pitfall 3: `dishes_public` View Without `security_invoker`

**What goes wrong:** View created normally. RLS on `dishes` table is set up. But view returns all rows including `chef_name` for anon users because views default to `SECURITY DEFINER` (postgres user context, which bypasses RLS).

**Why it happens:** Postgres default — view security is separate from table security.

**How to avoid:** Always add `WITH (security_invoker = true)` when creating the view. Requires Postgres 15+ (Supabase provides this).

**Warning signs:** `SELECT * FROM dishes_public` returns `chef_name` values before competition is 'finished'.

### Pitfall 4: HashRouter vs URL Params

**What goes wrong:** Deep link `?code=ABC123&mode=join` doesn't work because query params after `#` are parsed differently.

**Why it happens:** With HashRouter, the URL is `/#/?code=ABC123` — the `?` must come after `/#/`. Standard `window.location.search` reads params before `#`, not after.

**How to avoid:** Use React Router's `useSearchParams` hook — it correctly parses params from the hash portion. Deep link format: `https://user.github.io/cooking_contest/#/?code=ABC123&mode=join`.

**Warning signs:** `useSearchParams` returns empty; manual `new URLSearchParams(window.location.search)` returns empty.

### Pitfall 5: Supabase anon Key vs service_role Key Confusion

**What goes wrong:** Edge Function uses anon key internally → subject to RLS → can't write to protected tables. Or: service_role key accidentally exposed in frontend `.env`.

**Why it happens:** Two different clients needed; easy to mix up.

**How to avoid:**
- Frontend: always `VITE_SUPABASE_ANON_KEY` — safe to expose, subject to RLS
- Edge Functions: `SUPABASE_SERVICE_ROLE_KEY` (Deno env) — never in frontend, never in git, bypasses RLS
- Never prefix service_role key with `VITE_` — Vite bundles all `VITE_*` vars into client JS

**Warning signs:** Edge Function returns 403; frontend JS contains the service_role key string.

### Pitfall 6: Zod v4 Breaking Changes

**What goes wrong:** Import `z` from `zod`, use `z.string().nonempty()` or other v3-specific APIs that were removed or renamed in v4.

**Why it happens:** Zod v4 is a major version with breaking API changes. Training data likely reflects v3.

**How to avoid:** Check https://zod.dev/v4 at the time of writing Edge Functions. Key known change: `z.string().nonempty()` → use `z.string().min(1)`. Verify before coding.

**Warning signs:** TypeScript errors on Zod methods that "should work".

### Pitfall 7: localStorage Hydration on First Render

**What goes wrong:** App reads session from Zustand store before the persist middleware has rehydrated from localStorage → shows re-auth modal briefly even when session is valid.

**Why it happens:** Zustand persist hydration is async. First render uses initial state (empty sessions).

**How to avoid:** Check `useSessionStore.persist.hasHydrated()` or use the `onRehydrateStorage` callback before routing decisions. Show a loading splash (screen-loading) until hydration completes.

**Warning signs:** Re-auth modal flashes on page load for users with valid sessions.

---

## Code Examples

### Verified Pattern: Supabase Client with Database Types

```typescript
// src/lib/supabase.ts
// Source: Context7 /supabase/supabase-js
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
)
```

### Verified Pattern: Type Generation Command

```bash
# Source: Context7 /supabase/supabase (official CLI docs)
npx supabase gen types typescript --local > src/types/database.types.ts
```

### Verified Pattern: Edge Function Invocation

```typescript
// Source: Context7 /supabase/supabase-js
const { data, error } = await supabase.functions.invoke('competition-create', {
  body: { name: 'La Gara', nickname: 'Chef Mario', pinHash: simpleHash('1234') }
})
if (error) throw error
// data: { code: 'ABC123', participantId: '...', role: 'admin' }
```

### Verified Pattern: PIN Input Focus Management (React)

```tsx
// src/components/ui/PinInput.tsx
// Pattern per UI_REFERENCE.md — auto-focus next/prev box
const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
  if (e.key === 'Backspace' && !e.currentTarget.value && index > 0) {
    refs[index - 1].current?.focus()
  }
}

const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
  const digit = e.target.value.replace(/\D/g, '').slice(-1)
  updatePin(index, digit)
  if (digit && index < 3) {
    refs[index + 1].current?.focus()
  }
}

const handlePaste = (e: React.ClipboardEvent) => {
  const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
  digits.split('').forEach((d, i) => updatePin(i, d))
  refs[Math.min(digits.length, 3)].current?.focus()
}
```

### Verified Pattern: Simple Hash for PIN

```typescript
// src/lib/hash.ts
// Per FEATURES.md: "hash deterministico semplice (non crittografico)"
export function simpleHash(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash  // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}
```

Note: This is intentionally non-cryptographic per the project spec. The Edge Function uses this same function server-side for comparison. Both sides must use the same algorithm.

### Verified Pattern: Image Compression (Canvas API)

```typescript
// src/lib/compress.ts
// Per PROJECT.md: max 800px, quality 0.72 JPEG
export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const maxDim = 800
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const canvas = new OffscreenCanvas(
    Math.round(bitmap.width * scale),
    Math.round(bitmap.height * scale)
  )
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.72 })
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwind.config.js` | `@theme` in CSS | Tailwind v4 (Jan 2025) | Config must move to CSS; `tailwind.config.js` is ignored in v4 |
| `@tailwind base/components/utilities` | `@import "tailwindcss"` | Tailwind v4 | Single import replaces three directives |
| `bg-[--var-name]` arbitrary value | `bg-(--var-name)` | Tailwind v4 | Square brackets reserved for other use |
| `<HashRouter>` component | `createHashRouter()` + `<RouterProvider>` | React Router v6+ | Data router API; enables loaders/actions |
| Manual localStorage session | Zustand persist middleware | Zustand v4+ | Type-safe, handles edge cases |
| `supabase gen types typescript` (supabase CLI v1) | Same command, still current | — | No change; command is stable |

**Deprecated/outdated:**
- `tailwindcss/postcss` PostCSS plugin: still works in v4 but `@tailwindcss/vite` is faster and preferred for Vite projects
- `BrowserRouter` on GitHub Pages: never worked without 404 redirect hacks; HashRouter is the correct approach

---

## Open Questions

1. **Zod v4 exact API surface in Edge Functions (Deno)**
   - What we know: Zod v4 exists and has breaking changes from v3; `z.string().min(1)` is safe
   - What's unclear: Whether `npm:zod@4` works smoothly in Deno Edge Functions vs `npm:zod@3`
   - Recommendation: Verify at implementation time. Import as `import { z } from 'npm:zod@4'` and test a simple schema in local Edge Function serve before relying on v4 features.

2. **`dishes_public` view — Supabase Postgres version**
   - What we know: `security_invoker = true` requires Postgres 15+; Supabase runs Postgres 15+
   - What's unclear: Whether all Supabase projects (local dev via CLI) default to Postgres 15+
   - Recommendation: Verify Supabase CLI local Postgres version with `supabase start` output. If < 15, use alternative: block direct anon access to `dishes` table via RLS, query through Edge Function.

3. **Simple hash algorithm — server/client consistency**
   - What we know: The djb2-style hash above is deterministic and cross-platform
   - What's unclear: Whether Deno's V8 number representation matches browser V8 exactly for large hash values
   - Recommendation: Test with known inputs (e.g., PIN "1234") both in browser console and in Edge Function during 01-04 implementation. If mismatch: use hex string XOR or CRC32 from a shared npm package.

4. **Upstash Redis for rate limiting — needed or overkill?**
   - What we know: DB-based counter is simpler; Upstash is more robust
   - What's unclear: Whether the DB-based approach introduces enough DB load to matter at 5-20 users/competition
   - Recommendation: Use DB-based counter for Phase 01. Upstash Redis is a Phase 2 upgrade if needed.

---

## Sources

### Primary (HIGH confidence)

- Context7 `/vitejs/vite` — scaffold, GitHub Pages base config, deploy workflow
- Context7 `/tailwindlabs/tailwindcss.com` — v4 installation, `@theme`, Vite plugin, breaking changes
- Context7 `/supabase/supabase-js` — createClient, functions.invoke, TypeScript types
- Context7 `/supabase/supabase` — Edge Functions patterns, RLS policies, view security_invoker, type generation CLI, Storage RLS
- Context7 `/pmndrs/zustand` — persist middleware, TypeScript store, localStorage
- Context7 `/remix-run/react-router` — createHashRouter, HashRouter component, SPA guide
- https://vite.dev/guide/static-deploy#github-pages — official GitHub Pages deploy workflow YAML

### Secondary (MEDIUM confidence)

- https://tailwindcss.com/docs/upgrade-guide — breaking changes verified from official docs
- https://github.com/orgs/community/discussions/64096 — GitHub Pages BrowserRouter issue confirmed
- https://supabase.com/docs/guides/functions/examples/rate-limiting — Upstash Redis recommendation confirmed

### Tertiary (LOW confidence)

- Medium blog posts on GH Pages + HashRouter (community confirmation, not authoritative)
- WebSearch results on Zod v4 API surface (not verified against official Zod v4 docs)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified via Context7 with current versions
- Tailwind v4 config: HIGH — verified via official Context7 docs, breaking changes cross-checked
- HashRouter setup: HIGH — verified via Context7 React Router v7 docs
- Zustand persist pattern: HIGH — verified via Context7
- Supabase Edge Function pattern: HIGH — verified via Context7
- `dishes_public` view security_invoker: HIGH — verified via Context7 Supabase RLS docs
- PIN rate limiting (DB-based): MEDIUM — pattern is sound, Upstash is the official recommendation but DB-based is simpler for scale
- Zod v4 in Deno: LOW — flagged as open question, needs verification at implementation time
- Simple hash cross-platform consistency: LOW — flagged as open question

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (30 days — stable libraries, but Supabase Edge Functions patterns evolve)
