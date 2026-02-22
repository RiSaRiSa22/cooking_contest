# Phase 02: Admin + Dishes - Research

**Researched:** 2026-02-22
**Domain:** React tabbed UI, Supabase Storage uploads, Zustand stores, Edge Functions for dish/competition management
**Confidence:** HIGH

---

## Summary

Phase 02 builds the AdminScreen with 4 tabs (Piatti, Partecipanti, Classifica, Impostazioni) plus the dish write/delete/upload pipeline. The existing codebase already has the full data schema (dishes, photos, votes tables), RLS policies, Storage bucket `dish-photos`, Zustand session store, and the Edge Function pattern (Deno + zod + service_role). Phase 02 extends this foundation without schema changes.

The primary technical challenges are: (1) photo upload with client-side compression before hitting Supabase Storage directly via anon SDK — but the current migration intentionally blocks anon uploads, requiring a decision on whether to use Edge Function proxy upload or add an anon storage INSERT policy; (2) the `competitionStore` Zustand store must cache competition state and dishes to avoid redundant fetches across tabs; (3) the AdminScreen shell and tab navigation must follow the existing layout conventions from UI_REFERENCE.md (sticky header 62px + fixed tab bar 64px + scrollable content with pb-100px).

**Primary recommendation:** Upload photos directly from the client SDK by adding an anon INSERT policy on `storage.objects` for the `dish-photos` bucket (simpler, consistent with split-SDK pattern). Use Edge Functions only for dish metadata writes (dish-write, dish-delete, competition-settings). Photo URLs are stored as public URLs in the `photos` table via the `dish-write` Edge Function after the client uploads the blob.

---

## Standard Stack

### Core (already installed — no new packages needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | ^2.47.10 | Storage upload, Realtime, SDK reads | Already in project |
| `zustand` | ^5.0.3 | competitionStore for dishes/phase/participants | Already in project, sessionStore established the pattern |
| `react-router` | ^7.2.0 | Already wired — AdminScreen at `/admin/:code` | Already in project |
| `tailwindcss` | ^4.0.6 | Tailwind v4 @theme pattern established | Already in project |

### Supporting (no new installs)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Canvas API (browser built-in) | N/A | Client-side JPEG compression before upload | Always — before every photo upload |
| `zod` (via `npm:zod` in Deno) | latest | Edge Function input validation | In dish-write, dish-delete, competition-settings |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Canvas API compression | `browser-image-compression` npm library | Library is 40KB gzip; Canvas API is zero-dependency and sufficient for 800px/0.72 JPEG requirement |
| Client anon upload + EF metadata write | Edge Function proxy upload (FormData) | EF proxy doubles latency, adds complexity; anon policy on storage is simpler and consistent with the split-SDK architecture |
| Supabase Realtime for phase changes | Polling | Realtime is already available in supabase-js; polling wastes bandwidth |

**Installation:** No new packages needed.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── screens/
│   ├── Admin/
│   │   ├── AdminScreen.tsx          # Shell: header + TabBar + tab routing
│   │   ├── tabs/
│   │   │   ├── DishesTab.tsx        # Lista piatti, AddDishModal trigger
│   │   │   ├── ParticipantsTab.tsx  # Lista partecipanti con stato piatto/voto
│   │   │   ├── RankingTab.tsx       # Classifica admin (con toggle reveal chef)
│   │   │   └── SettingsTab.tsx      # Fase, reset voti, codice gara, QR
│   │   └── modals/
│   │       ├── AddDishModal.tsx     # Create/edit dish + photo upload
│   │       └── ConfirmModal.tsx     # Riutilizzabile: confirm fase change, reset voti
├── components/
│   ├── dishes/
│   │   ├── DishCard.tsx             # Card with photo, chef (admin sees it), actions
│   │   └── PhotoGrid.tsx            # Grid 3-col per le foto
│   └── competition/
│       ├── PhaseBanner.tsx          # preparation/voting/finished banner
│       └── ParticipantCard.tsx      # Avatar, nickname, dish status, vote badge
├── hooks/
│   ├── useCompetition.ts            # Data fetching + Realtime subscription
│   └── usePhotoUpload.ts            # Compression + upload pipeline
├── store/
│   └── competitionStore.ts          # Zustand: phase, dishes, participants, votes count
└── lib/
    └── compress.ts                  # Canvas-based image compression utility
```

### Pattern 1: competitionStore (Zustand)

**What:** Single store holding all competition runtime state. Components read from it; mutations go through Edge Functions, then invalidate/update the store.
**When to use:** Any component that needs competition data (dishes, participants, phase) — avoids prop drilling across 4 tabs.

```typescript
// Source: Context7 /pmndrs/zustand
import { create } from 'zustand'
import type { Database } from '../types/database.types'

type Competition = Database['public']['Tables']['competitions']['Row']
type Dish = Database['public']['Tables']['dishes']['Row']
type Participant = Database['public']['Tables']['participants']['Row']

interface CompetitionStore {
  competition: Competition | null
  dishes: Dish[]
  participants: Participant[]
  isLoading: boolean
  error: string | null
  setCompetition: (c: Competition) => void
  setDishes: (dishes: Dish[]) => void
  setParticipants: (participants: Participant[]) => void
  updatePhase: (phase: string) => void
  addDish: (dish: Dish) => void
  updateDish: (dish: Dish) => void
  removeDish: (dishId: string) => void
  setLoading: (b: boolean) => void
  setError: (e: string | null) => void
}

export const useCompetitionStore = create<CompetitionStore>()((set) => ({
  competition: null,
  dishes: [],
  participants: [],
  isLoading: false,
  error: null,
  setCompetition: (competition) => set({ competition }),
  setDishes: (dishes) => set({ dishes }),
  setParticipants: (participants) => set({ participants }),
  updatePhase: (phase) =>
    set((s) => ({ competition: s.competition ? { ...s.competition, phase } : null })),
  addDish: (dish) => set((s) => ({ dishes: [...s.dishes, dish] })),
  updateDish: (dish) =>
    set((s) => ({ dishes: s.dishes.map((d) => (d.id === dish.id ? dish : d)) })),
  removeDish: (dishId) =>
    set((s) => ({ dishes: s.dishes.filter((d) => d.id !== dishId) })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}))
```

Note: Do NOT use `persist` middleware on competitionStore — data is server-authoritative and should always be fetched fresh on mount.

### Pattern 2: useCompetition Hook

**What:** Fetches competition data on mount, subscribes to Realtime for phase changes, populates competitionStore.
**When to use:** Mount once in AdminScreen, consumers read from store.

```typescript
// Source: Context7 /supabase/supabase-js
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useCompetitionStore } from '../store/competitionStore'

export function useCompetition(competitionId: string) {
  const { setCompetition, setDishes, setParticipants, setLoading, setError } =
    useCompetitionStore()

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function load() {
      setLoading(true)
      // Fetch competition, dishes (admin reads from dishes table directly — not dishes_public)
      const [compRes, dishesRes, participantsRes] = await Promise.all([
        supabase.from('competitions').select('*').eq('id', competitionId).single(),
        supabase.from('dishes').select('*, photos(*)').eq('competition_id', competitionId),
        supabase.from('participants').select('*').eq('competition_id', competitionId),
      ])

      if (compRes.error) { setError(compRes.error.message); setLoading(false); return }
      setCompetition(compRes.data)
      setDishes(dishesRes.data ?? [])
      setParticipants(participantsRes.data ?? [])
      setLoading(false)
    }

    load()

    // Realtime: phase changes
    channel = supabase
      .channel(`competition-${competitionId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'competitions',
        filter: `id=eq.${competitionId}`,
      }, (payload) => {
        useCompetitionStore.getState().updatePhase((payload.new as { phase: string }).phase)
      })
      .subscribe()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [competitionId])
}
```

**Important:** Admin reads from `dishes` table (not `dishes_public` view) to see `chef_name` and `participant_id` always. The RLS policy `anon_read_dishes` allows this. Participant views must always use `dishes_public`.

### Pattern 3: Client-Side Photo Compression

**What:** Canvas API to resize and JPEG-encode before upload.
**When to use:** Always — before every `storage.from('dish-photos').upload()` call.

```typescript
// Source: UI_REFERENCE.md spec + browser Canvas API (built-in)
// lib/compress.ts
export async function compressImage(file: File): Promise<Blob> {
  const MAX_PX = 800
  const QUALITY = 0.72

  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, MAX_PX / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Compression failed')),
        'image/jpeg',
        QUALITY
      )
    }
    img.onerror = reject
    img.src = url
  })
}
```

### Pattern 4: Photo Upload Pipeline

**What:** Compress → upload blob to Storage → pass public URL + dish metadata to Edge Function for DB write.
**When to use:** Adding/editing a dish with photos (both admin and participant).

```typescript
// Source: Context7 /supabase/supabase-js
async function uploadPhoto(file: File, dishId: string, isExtra = false): Promise<string> {
  const compressed = await compressImage(file)
  const path = `${dishId}/${crypto.randomUUID()}.jpg`
  const { data, error } = await supabase.storage
    .from('dish-photos')
    .upload(path, compressed, { contentType: 'image/jpeg', upsert: false })
  if (error) throw new Error(error.message)
  const { data: urlData } = supabase.storage.from('dish-photos').getPublicUrl(data.path)
  return urlData.publicUrl
}
```

Note: `getPublicUrl` is synchronous (no await) — it derives the URL from the path without a network call.

### Pattern 5: Edge Function for Dish Writes (dish-write)

**What:** Validates caller is admin (or participant writing their own dish in preparation phase), writes dish + photo URLs to DB.
**Auth pattern:** Caller sends `{ participantId, competitionCode }` in body; Edge Function verifies against DB using service_role.

```typescript
// Pattern established by competition-create / competition-join Edge Functions
// supabase/functions/dish-write/index.ts — Deno + zod + service_role client
import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod'

const DishWriteSchema = z.object({
  competitionId: z.string().uuid(),
  participantId: z.string().uuid(),         // caller identity
  dishId: z.string().uuid().optional(),     // if editing existing dish
  name: z.string().min(1),
  chefName: z.string().min(1),
  ingredients: z.string().optional(),
  recipe: z.string().optional(),
  story: z.string().optional(),
  photoUrls: z.array(z.string().url()).optional(),  // already uploaded URLs
  isExtra: z.boolean().optional().default(false),
})

// Authorization: verify participant exists in competition, and either:
// - participant.role === 'admin' (can write any dish)
// - participant.id === dish.participant_id AND phase === 'preparation' (own dish only)
```

### Pattern 6: Edge Function for Competition Settings (competition-settings)

**What:** Handles phase transitions and vote reset — admin-only operations requiring confirmation on frontend.

```typescript
// supabase/functions/competition-settings/index.ts
const SettingsSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('advance_phase'), competitionId: z.string().uuid(), participantId: z.string().uuid() }),
  z.object({ action: z.literal('reset_votes'), competitionId: z.string().uuid(), participantId: z.string().uuid() }),
])

// Phase transition logic:
// preparation → voting → finished (unidirectional)
// Each transition: UPDATE competitions SET phase = next_phase WHERE id = ?
// reset_votes: DELETE FROM votes WHERE competition_id = ?
```

### Anti-Patterns to Avoid

- **Reading `dishes` table from participant view:** Always use `dishes_public` view for participants. Admin reads `dishes` directly.
- **Not validating phase in dish-write:** Participant must not modify dish once voting starts. Edge Function must check phase before allowing participant (non-admin) writes.
- **Uploading uncompressed files:** Always run `compressImage()` before `storage.upload()`. Never upload raw camera files.
- **Persisting competitionStore:** Do not add `persist` middleware — data must be server-fresh on every app load.
- **Using `dishes_public` view for admin operations:** The view nulls `chef_name` and `participant_id` in non-finished phases. Admin reads need the raw `dishes` table.
- **Calling `getPublicUrl` with await:** It is synchronous — `await` is not wrong but is misleading. Document this explicitly.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image resize/compress | Custom file API manipulation | Canvas API `toBlob()` with quality param | Browser-native, no deps, handles orientation EXIF edge cases if combined with `createObjectURL` |
| Tab state routing | Custom URL hash tab management | React state (`useState`) for active tab in AdminScreen | Tabs are not URL-addressable; no back-button requirement for tabs |
| Realtime phase sync | Polling `competitions` table | Supabase Realtime `postgres_changes` on competitions table | Already available, low latency, subscription cleanup handled in useEffect return |
| Admin verification in EF | Custom JWT or session token | Pass `participantId` in body + verify role=admin in DB via service_role | Consistent with existing competition-join pattern; service_role has full access |
| Confirmation dialogs | Custom blocking modal implementation | Reuse existing `Modal` component with variant='center' | Already built in Phase 01, handles backdrop click, body scroll lock |

**Key insight:** The existing Modal, Button, Input, Toast components from Phase 01 are production-ready. All Phase 02 UI builds on top of these — no new primitive components needed.

---

## Common Pitfalls

### Pitfall 1: Storage Upload Blocked for Anon Users

**What goes wrong:** The current migration adds `public_read_dish_photos` policy (SELECT only). There is no INSERT policy. Direct `supabase.storage.from('dish-photos').upload()` from the frontend using the anon key will return a 403 "Row Level Security" error.

**Why it happens:** The migration comment explicitly says "Anon direct upload is intentionally blocked; uploads go through Edge Function." This was the original design intent, but it adds significant complexity to the upload flow.

**How to avoid (two options — choose one):**

Option A (Recommended — simpler): Add a permissive anon INSERT policy on `storage.objects` for the `dish-photos` bucket via a new migration. Client compresses + uploads blob directly. Then sends the public URL to the `dish-write` Edge Function which writes the `photos` table record.

```sql
-- New migration: 02-storage-upload-policy
CREATE POLICY "anon_upload_dish_photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'dish-photos');
```

Option B (More complex): Edge Function proxy upload. Client sends compressed blob as FormData to `dish-write` Edge Function. EF receives FormData, uses service_role StorageClient to upload, returns URL. Adds 1 extra network hop and requires FormData parsing in Deno.

**Warning signs:** 403 response on `storage.upload()` call in browser console.

### Pitfall 2: Admin Reads dishes_public Instead of dishes

**What goes wrong:** Admin tab shows `null` for chef names in preparation/voting phases because `dishes_public` view nulls them out.

**Why it happens:** The view `dishes_public` correctly hides identity until `finished`. Admin needs raw data.

**How to avoid:** `useCompetition` hook must fetch from `dishes` table (not `dishes_public`) for admin context. The `anon_read_dishes` policy is permissive (`USING (true)`), so this works with the anon key.

**Warning signs:** `chef_name: null` in admin dish list during preparation phase.

### Pitfall 3: Phase Transition Not Reflected in UI Without Realtime

**What goes wrong:** Admin advances phase but other open browser tabs (participants) still show old phase.

**Why it happens:** Without Realtime subscription, components read stale store state.

**How to avoid:** Subscribe to `competitions` table UPDATE events in `useCompetition` and update store immediately. Also update local store optimistically on admin action.

**Warning signs:** Phase banner still shows "preparation" after admin clicks "Avvia votazioni."

### Pitfall 4: competitionStore Not Reset on Navigation Away

**What goes wrong:** User navigates from competition A to competition B (or home), but stale competitionStore data from A is shown briefly before B loads.

**Why it happens:** Zustand stores are singletons — they persist across route changes by default.

**How to avoid:** Reset competitionStore to initial state in the AdminScreen unmount effect (or on route change). Add a `reset()` action to the store.

**Warning signs:** Flash of wrong competition name or dish list when navigating between competitions.

### Pitfall 5: Multiple Photo Uploads Not Sequential

**What goes wrong:** Concurrent uploads of multiple photos fail intermittently or create race conditions writing to `photos` table.

**Why it happens:** `Promise.all()` for uploads works fine for Storage, but the `dish-write` EF call must happen after ALL uploads complete.

**How to avoid:** Upload photos sequentially or in parallel with `Promise.all()`, collect all URLs, then call `dish-write` once with the full `photoUrls` array.

### Pitfall 6: dish-delete Must Cascade Photos from Storage

**What goes wrong:** Deleting a dish removes DB records (CASCADE handles photos table) but the Storage blobs remain, causing orphaned files.

**Why it happens:** Supabase DB CASCADE deletes only remove rows from `photos` table, not Storage objects.

**How to avoid:** `dish-delete` Edge Function must: (1) fetch photo URLs from `photos` table, (2) delete Storage objects via service_role `storage.remove()`, (3) delete the dish record (CASCADE handles photos/votes rows).

---

## Code Examples

Verified patterns from official sources:

### Storage Upload + Public URL

```typescript
// Source: Context7 /supabase/supabase-js
const { data, error } = await supabase.storage
  .from('dish-photos')
  .upload(`${dishId}/${uuid}.jpg`, compressedBlob, {
    contentType: 'image/jpeg',
    upsert: false,
  })
if (error) throw new Error(error.message)

// getPublicUrl is SYNCHRONOUS — no await needed
const { data: urlData } = supabase.storage
  .from('dish-photos')
  .getPublicUrl(data.path)

const publicUrl = urlData.publicUrl
```

### Realtime Competition Subscription

```typescript
// Source: Context7 /supabase/supabase-js
const channel = supabase
  .channel(`competition-${competitionId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'competitions',
    filter: `id=eq.${competitionId}`,
  }, (payload) => {
    const updated = payload.new as { phase: string }
    useCompetitionStore.getState().updatePhase(updated.phase)
  })
  .subscribe()

// Cleanup in useEffect return:
return () => { supabase.removeChannel(channel) }
```

### Edge Function Invocation with Caller Identity

```typescript
// Source: Context7 /supabase/supabase-js — consistent with Phase 01 pattern
const { data, error } = await supabase.functions.invoke('dish-write', {
  body: {
    competitionId,
    participantId,   // from sessionStore — caller identity
    name,
    chefName,
    photoUrls,
  },
})
```

### Admin Tab Shell Pattern

```typescript
// AdminScreen.tsx — consistent with UI_REFERENCE.md layout
const TABS = ['piatti', 'partecipanti', 'classifica', 'impostazioni'] as const
type Tab = typeof TABS[number]

function AdminScreen() {
  const { code } = useParams<{ code: string }>()
  const session = useSessionStore((s) => s.getSession(code!))
  const [activeTab, setActiveTab] = useState<Tab>('piatti')

  useCompetition(session!.competitionId)  // loads store, subscribes Realtime

  return (
    <div style={{ background: 'var(--color-parchment)' }}>
      <AppHeader />
      <PhaseBanner />
      {activeTab === 'piatti' && <DishesTab />}
      {activeTab === 'partecipanti' && <ParticipantsTab />}
      {activeTab === 'classifica' && <RankingTab />}
      {activeTab === 'impostazioni' && <SettingsTab />}
      <TabBar active={activeTab} onChange={setActiveTab} tabs={TABS} />
    </div>
  )
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Uploading to Edge Function as FormData proxy | Client SDK direct upload + EF for metadata | Established in project arch decisions | Simpler, faster, less code |
| Polling for phase changes | Supabase Realtime CDC | Supabase SDK v2 | No polling overhead |
| Separate Storage bucket per competition | Single bucket with path prefix `{dishId}/{uuid}.jpg` | Standard Supabase pattern | Simpler bucket management |

**Not deprecated in this stack:**
- `supabase.storage.from().upload()` — current API
- `supabase.channel().on('postgres_changes')` — current Realtime API
- Zustand `create<Store>()()` with double-call — correct v5 TypeScript pattern

---

## Open Questions

1. **Storage anon upload policy**
   - What we know: Current migration blocks anon uploads. Phase 02 needs client-side uploads.
   - What's unclear: Whether to add permissive anon INSERT policy (Option A) or route through Edge Function (Option B).
   - Recommendation: Choose Option A (add RLS policy via migration). It is simpler, faster, and consistent with the split-SDK pattern. Document in PROJECT.md decisions.

2. **Tab URL addressability**
   - What we know: HashRouter is required. Tabs could be implemented as sub-routes (`/admin/:code/piatti`) or as local React state.
   - What's unclear: Whether the user wants tab state to survive page reload.
   - Recommendation: Use `useState` for tab selection (no sub-routes). Tab state is ephemeral — no requirement for deep linking to specific admin tabs.

3. **Participant dish read in DishesTab**
   - What we know: Admin sees all dishes from `dishes` table with `chef_name`. Dishes with `participant_id = null` are admin-created.
   - What's unclear: Whether admin-created dishes need a `chef_name` UI input or auto-fill from admin's nickname.
   - Recommendation: `chef_name` is a required field in the AddDishModal (matching DISH-01 spec). Admin fills it manually.

4. **QR code for Settings tab (ADMN-04)**
   - What we know: ADMN-04 requires QR code in Settings tab showing the join URL.
   - What's unclear: Which library to use (if any — QR could be a static image via an API).
   - Recommendation: Use `https://api.qrserver.com/v1/create-qr-code/?data=URL&size=200x200` — no npm package needed, no bundle size cost. If offline support is needed, consider `qrcode` npm package (LOW confidence this is needed for MVP).

---

## Sources

### Primary (HIGH confidence)
- `/supabase/supabase-js` (Context7) — Storage upload, getPublicUrl, Realtime channel subscription, functions.invoke
- `/pmndrs/zustand` (Context7) — create store, async actions, persist middleware
- `supabase/migrations/20260221000000_initial_schema.sql` — current schema, RLS policies, Storage bucket config
- `src/types/database.types.ts` — authoritative types for all tables and views
- `src/store/sessionStore.ts` — Zustand pattern established in Phase 01
- `supabase/functions/competition-create/index.ts` — Edge Function pattern (Deno + zod + service_role)
- `UI_REFERENCE.md` — design system, layout constraints, component specs

### Secondary (MEDIUM confidence)
- Browser Canvas API for image compression — standard web API, well-documented behavior
- Supabase Storage RLS policies for anon upload — derived from understanding of existing `anon_read_dishes` permissive pattern

### Tertiary (LOW confidence)
- QR code via external API (`api.qrserver.com`) — community pattern, no official source verified

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed, versions verified in package.json
- Architecture: HIGH — patterns derived from existing Phase 01 code + Context7 verified APIs
- Pitfalls: HIGH — pitfalls 1-4 verified against actual codebase; pitfall 5-6 from standard async/cascade patterns
- Open questions: MEDIUM — 4 decisions required at planning time, all have clear recommended answers

**Research date:** 2026-02-22
**Valid until:** 2026-03-22 (30 days — stable libraries)
