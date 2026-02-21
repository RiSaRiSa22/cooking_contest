# Domain Pitfalls — Fornelli in Gara

**Domain:** Mobile-first SPA cooking contest webapp (React + Vite + TypeScript, Supabase, GitHub Pages)
**Researched:** 2026-02-21
**Confidence:** HIGH for Supabase RLS/Storage/Edge Functions (verified against official docs), MEDIUM for voting integrity and PIN security (community patterns + OWASP), HIGH for GitHub Pages routing (multiple confirmed sources)

---

## Critical Pitfalls

Mistakes that cause data leaks, security holes, or full rewrites.

---

### Pitfall 1: RLS INSERT/UPDATE Without WITH CHECK — Data Ownership Bypass

**What goes wrong:** A developer writes an INSERT policy that allows authenticated users to add rows, but omits `WITH CHECK`. Result: any participant can insert a dish with `participant_id` set to someone else's ID, effectively submitting dishes on behalf of other chefs. Same for UPDATE: without `WITH CHECK`, a participant can change a dish's `participant_id` to hijack ownership.

**Why it happens:** The `USING` clause (which rows are visible/mutable) and the `WITH CHECK` clause (what new data is valid) look redundant at first glance. Most tutorials only show `USING`.

**Consequences:** Data integrity failure. Vote counts are attributed to wrong participants. The chef anonymity invariant breaks silently — a malicious user can assign their competitor's dish to themselves.

**Prevention:**
```sql
-- WRONG: only controls row access, not what data gets written
CREATE POLICY "participants can update own dish"
ON dishes FOR UPDATE
USING (participant_id = auth.uid());

-- CORRECT: also validates new row state
CREATE POLICY "participants can update own dish"
ON dishes FOR UPDATE
USING (participant_id = auth.uid())
WITH CHECK (participant_id = auth.uid());
```
Always pair `WITH CHECK` on INSERT and UPDATE policies. Treat them as a mandatory pair, not an optional extra.

**Detection:** Test with a participant session: attempt to POST a dish with a different `participant_id`. It should be rejected. If it succeeds, `WITH CHECK` is missing.

**Phase:** Address in Phase — Auth + Data Model setup, before any dish CRUD is implemented.

**Confidence:** HIGH — Verified against Supabase official RLS docs.

---

### Pitfall 2: Chef Identity Leaks via Insufficiently Restrictive SELECT Policies

**What goes wrong:** The core product promise — "you don't know who cooked what during voting" — breaks if the `dishes` table SELECT policy exposes `participant_id` during the voting phase. A frontend query of `SELECT * FROM dishes` during voting returns `participant_id`, which can be cross-referenced with the `participants` table to reveal chef identities.

**Why it happens:** RLS controls row access, not column access. Even a correct SELECT policy will return all columns if the query selects `*`. Developers assume RLS handles privacy end-to-end.

**Consequences:** The app's core value proposition is destroyed. Contest results become meaningless if participants can see who cooked what before final reveal.

**Prevention:** Two-layer defence:
1. **RLS**: Policy restricts rows correctly (all participants can see all dishes — that's correct for voting).
2. **Column-level**: Never return `participant_id` in the dishes SELECT for non-admin roles. Use a Postgres view that omits `participant_id` for the voting phase, or handle this in the Edge Function that fetches dishes during voting.
3. **Phase-gated data**: The dish fetch endpoint should check `competition.phase`. If `voting`, return dishes without `participant_id`. Only return `participant_id` when phase is `finished`.

**Detection:** During voting phase, call `supabase.from('dishes').select('*')` with a participant's JWT. Check if `participant_id` appears in the response. It should not.

**Phase:** Address in Phase — Voting logic implementation. Must be designed before voting goes live.

**Confidence:** HIGH — RLS column restriction is documented Supabase behaviour. Pattern is well-established.

---

### Pitfall 3: SQL Editor Testing Bypasses RLS — False Confidence

**What goes wrong:** Developer tests RLS policies in the Supabase Studio SQL Editor, sees correct results, deploys, and users see wrong data (either too much or too little). The SQL Editor runs as the `postgres` superuser, which bypasses all RLS policies.

**Why it happens:** The Studio UI gives no warning that it's running as superuser. The experience looks identical to a real query.

**Consequences:** Security policies appear to work in testing but fail completely in production. Can result in data exposure or features appearing broken.

**Prevention:** Test RLS policies exclusively through the client SDK with a real JWT, or use `SET ROLE authenticated; SET request.jwt.claims = '{"sub":"<uuid>"}'; SELECT ...` in SQL Editor to simulate a real session. Write integration tests that authenticate as test users via the Supabase client and assert row visibility.

**Detection:** If your test queries in Studio always return all rows, that's suspicious — you may be testing as superuser.

**Phase:** Address in Phase — Project setup. Establish the testing discipline from day one.

**Confidence:** HIGH — Explicitly documented in Supabase RLS docs.

---

### Pitfall 4: GitHub Pages SPA Routing — 404 on Direct URL / Refresh

**What goes wrong:** Deep links like `https://user.github.io/cooking_contest/contest/abc123` work when navigated to via the app, but return a GitHub 404 if the user refreshes or pastes the URL directly. GitHub Pages serves static files only — there is no server to route all paths back to `index.html`.

**Why it happens:** React Router (BrowserRouter) uses the HTML5 History API. GitHub Pages has no fallback routing configuration. Any path that doesn't correspond to an actual file returns GitHub's own 404.

**Consequences:** Share links break on refresh. QR code join links fail. Deep linking is the entire UX for joining contests — this breaks a core feature.

**Prevention:** Two viable options for this project:

**Option A — HashRouter (recommended for this project):** Switch from `BrowserRouter` to `HashRouter`. URLs become `/#/contest/abc123`. Ugly but 100% reliable. Share links and QR codes still work because the hash is client-side. No server config needed.

**Option B — 404.html redirect trick:** Copy `index.html` to `404.html`. GitHub Pages serves `404.html` when no file is found, which then boots the React app. Caveat: browsers briefly receive a 404 status code (Brave shows a security warning), and link preview thumbnails on social media won't work.

**Recommendation:** Use HashRouter for this project. The target audience is friends sharing links via WhatsApp/message — hash URLs are fine. Social media previews are not a concern.

**Also required:** Set `base` in `vite.config.ts` to the repository name:
```typescript
// vite.config.ts
export default defineConfig({
  base: '/cooking_contest/',  // must match GitHub Pages path
})
```
Without this, assets load from `/` instead of `/cooking_contest/` and the page is blank.

**Detection:** Build and deploy, then navigate to any non-root route and refresh. A 404 is the symptom.

**Phase:** Address in Phase — Initial project setup (Vite config + router choice). Fix before first deploy.

**Confidence:** HIGH — Multiple confirmed sources including GitHub community discussions and official Vite docs.

---

### Pitfall 5: Anonymous Voting Integrity — Server-Side Enforcement Required

**What goes wrong:** Voting constraints enforced only on the frontend (or via RLS on a simple `votes` table) are bypassable. Specifically:
- "1 vote per participant" can be circumvented by direct API calls
- "Cannot vote for your own dish" can be bypassed by manipulating request payload
- "Vote changes allowed" window can be exploited to accumulate multiple vote records if the upsert logic is wrong

**Why it happens:** The RLS policy `INSERT ... USING (participant_id = auth.uid())` prevents someone else from inserting your vote, but it doesn't enforce business rules like "participant_id != dish.participant_id". These cross-table constraints require a join in the policy or a server-side function.

**Consequences:** Participants can vote for their own dish, inflating their score. One participant could submit multiple votes by sending raw HTTP requests.

**Prevention:** All vote submissions must go through a Supabase Edge Function that:
1. Reads the JWT to determine `participant_id` (never trust client-supplied participant ID)
2. Looks up the dish's `participant_id` from the database
3. Checks: `dish.participant_id !== voting_participant_id`
4. Upserts into `votes` with `ON CONFLICT (competition_id, participant_id) DO UPDATE` — this makes the operation idempotent and prevents duplicate votes at the database level
5. Returns the updated vote, not 204, so the client can confirm the write

```sql
-- Unique constraint that enforces 1-vote-per-participant at DB level
ALTER TABLE votes ADD CONSTRAINT one_vote_per_participant
UNIQUE (competition_id, participant_id);
```

**Detection:** Using a REST client (curl/Postman), submit a vote from a participant JWT targeting a dish owned by that same participant. It should fail. Also try submitting two different vote payloads rapidly — only one should persist.

**Phase:** Address in Phase — Voting logic implementation. This is the most security-sensitive phase.

**Confidence:** MEDIUM — Pattern from security research + Supabase architecture. Official Supabase docs confirm Edge Functions are the right place for business logic that requires cross-table validation.

---

## Moderate Pitfalls

Mistakes that cause delays, broken features, or technical debt.

---

### Pitfall 6: Photo Upload — Dual Limit System (Global + Bucket)

**What goes wrong:** Developer sets the global Supabase Storage limit to 50MB (free tier max). Forgets that each bucket also has its own limit which defaults to a lower value or is unset. Photos between the bucket limit and 50MB fail with a cryptic `413 Payload Too Large` error that appears to be a network error.

**Why it happens:** The Supabase Storage UI shows two separate settings in different places. The bucket limit configuration is less prominent.

**Consequences:** Photo uploads fail silently or with confusing errors. Users lose uploaded photos.

**Prevention:**
- Set the bucket limit explicitly to match your target size (e.g., 5MB per photo, matching the client-side compression target of 800px / 0.72 JPEG quality which typically produces ~200-500KB)
- The project already mandates client-side compression before upload — enforce this with a check before the upload call:
```typescript
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB — safety margin above compression output
if (file.size > MAX_UPLOAD_SIZE) {
  throw new Error('Immagine troppo grande dopo compressione');
}
```
- Log the actual file size before and after compression during development

**Detection:** Upload a large uncompressed image. If it fails with 413 but the global limit is set correctly, check the bucket-level limit.

**Phase:** Address in Phase — Photo upload implementation. Set bucket limits before writing upload code.

**Confidence:** HIGH — Verified against Supabase Storage official docs (file-limits page).

---

### Pitfall 7: Concurrent Photo Uploads to Same Path

**What goes wrong:** If two uploads target the same storage path (e.g., `contests/{id}/dishes/{dish_id}/photo.jpg`), the second upload fails with `400 Asset Already Exists`. This can happen if a user double-taps the upload button or if the same photo is re-submitted.

**Why it happens:** Supabase Storage is not a filesystem with overwrite semantics by default. Concurrent writes to the same key fail rather than queue.

**Prevention:**
- Use `upsert: true` on the upload call for replace-on-retry semantics
- Include a timestamp or UUID in the filename to guarantee uniqueness per upload attempt: `photo-{uuid}.jpg`
- Disable the upload button immediately on first tap and re-enable only on error

**Phase:** Address in Phase — Photo upload implementation.

**Confidence:** HIGH — Documented in Supabase Storage troubleshooting.

---

### Pitfall 8: Edge Functions — Wall Clock Time vs CPU Time Confusion

**What goes wrong:** Developers assume the 2-second CPU limit means functions time out after 2 seconds. In reality, the wall clock limit is 150 seconds (free) / 400 seconds (paid). The 2-second CPU limit means only 2 seconds of active compute (non-async) is allowed. A function that calls a slow external API and waits is fine (waiting = async I/O, doesn't count). A function doing heavy synchronous computation (e.g., iterating over thousands of vote records in JS) hits the CPU limit.

**Consequences for this project:** Vote tallying or ranking computation in JS would hit CPU limits at scale. Database-side aggregation via SQL is the correct approach.

**Prevention:** Do heavy computation in SQL/PostgreSQL (via `SELECT`, `COUNT`, `RANK()`), not in the Edge Function body. The Edge Function should orchestrate and return, not compute.

**Detection:** Monitor Edge Function logs in Supabase Studio for CPU limit errors.

**Phase:** Address in Phase — Ranking/results implementation.

**Confidence:** HIGH — Verified against Supabase Edge Functions limits documentation.

---

### Pitfall 9: PIN Hashing on the Client — False Security Theater

**What goes wrong:** Hashing a 4-digit PIN client-side (in the browser) before sending it provides essentially zero security. An attacker who intercepts the hash can replay it directly — the hash IS the credential. A 4-digit PIN has only 10,000 possible values; a precomputed rainbow table of SHA-256 hashes covers all of them in kilobytes.

**Why it happens:** Developers confuse "the password isn't sent in plaintext" with "the password is secure." Client-side hashing doesn't add meaningful entropy.

**Consequences for this project:** The PROJECT.md explicitly acknowledges "Hash deterministico semplice per PIN/password (non crittografico, app non gestisce dati sensibili)". This is an acceptable conscious tradeoff for a friends-group app. The risk: a participant could brute-force the organizer's admin PIN via direct API calls.

**Prevention (given the stated tradeoff):**
- Implement rate limiting on the Edge Function that validates PINs — maximum 5 attempts, then lockout
- Store a simple SHA-256 or bcrypt of the PIN server-side, never the raw PIN
- Be explicit in the codebase that this is not enterprise-grade auth — a comment is sufficient so future developers don't assume otherwise
- Do NOT use this pattern if the app ever expands to store real personal data

**What NOT to do:** Do not store PINs in plaintext in Supabase — even for a low-stakes app, plaintext storage in a database is unnecessary and violates basic hygiene.

**Phase:** Address in Phase — Auth implementation.

**Confidence:** MEDIUM — OWASP and security community consensus. The project's own constraints (non-crittografico) already acknowledge this; this pitfall is about the minimum viable protection within that constraint.

---

### Pitfall 10: State Management Complexity Creep

**What goes wrong:** The app starts with simple `useState` per component. As features are added (contest phase, auth state, vote state, dish list, participant list), developers progressively add more Context providers. At 5+ nested providers, re-render cascades cause performance issues. State becomes hard to trace.

**Why it happens:** Each Context addition looks local and reasonable. The problem is cumulative.

**Consequences for this project:** The app has several genuinely global state concerns: current session (user, role), contest state (phase, id), and possibly real-time vote counts. If all in separate Contexts, updating one triggers renders in all consumers.

**Prevention:** Pick an approach and stick to it from phase 1. Recommendation for this project:
- Use a single Zustand store for global app state (session, contest phase, active contest ID)
- Use React Query (TanStack Query) for server data (dishes, votes, participants) — this avoids caching bugs with manual `useState` + `useEffect` fetch patterns
- Use local `useState` only for UI state (modal open/closed, form values)

If the team prefers Context only: use a single combined `AppContext` rather than 5 separate ones, and `useMemo` the value to prevent unnecessary re-renders.

**Detection:** When you find yourself debating "should this live in Context X or Context Y", you've started creeping.

**Phase:** Address in Phase — Project setup. Establish state management conventions before building features.

**Confidence:** MEDIUM — Community consensus from multiple 2025 React state management articles. Zustand recommendation is well-supported.

---

### Pitfall 11: GitHub Actions — VITE_ Environment Variables Not Injected at Build Time

**What goes wrong:** The Supabase URL and anon key need to be available in the React app as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. These are build-time environment variables that Vite inlines into the bundle. If they're not present at build time, the app uses `undefined` for both values — causing silent auth failures and no useful error message.

**Why it happens:** Developers add them to GitHub repository secrets but forget to expose them in the GitHub Actions workflow as environment variables or use the wrong prefix (`SUPABASE_URL` instead of `VITE_SUPABASE_URL`).

**Consequences:** The deployed app on GitHub Pages cannot connect to Supabase. All API calls fail silently or with CORS errors. Debugging in production is painful.

**Prevention:**
```yaml
# .github/workflows/deploy.yml
- name: Build
  run: npm run build
  env:
    VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
    VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
```
Rules:
1. Secret names in GitHub must match exactly (including the `VITE_` prefix)
2. Variables must be passed as `env:` on the build step, not globally
3. The anon key is safe to expose in the client bundle (it's designed for this). Do NOT put the `service_role` key in the frontend.

**Detection:** After deploy, open browser DevTools and check if `import.meta.env.VITE_SUPABASE_URL` is undefined. If yes, the env vars weren't injected.

**Phase:** Address in Phase — First GitHub Actions pipeline setup.

**Confidence:** HIGH — GitHub Actions docs on secrets + Vite build-time env var behaviour.

---

## Minor Pitfalls

Fixable annoyances that slow down development.

---

### Pitfall 12: localStorage Race Condition on Page Load

**What goes wrong:** On app load, multiple components read from localStorage simultaneously to restore session state. If one component's `useEffect` updates localStorage while another is reading, the values are inconsistent. More common: the Supabase client's session restore is async, but components render synchronously first with `null` user, causing a flash of unauthenticated UI.

**Prevention:**
- Initialize Supabase auth state before rendering the app tree: use `supabase.auth.getSession()` in a top-level load and gate rendering on it
- For the custom nickname+PIN session (stored in localStorage), read it once at startup into a Zustand store, not in individual components
- Set an `isInitializing` flag while the session loads to render a loading state instead of unauthenticated UI

**Phase:** Address in Phase — Auth implementation.

**Confidence:** MEDIUM — Community pattern, verified against Supabase auth docs on session initialization.

---

### Pitfall 13: Lazy Loading Defeats Itself via Colocated Loaders

**What goes wrong:** A route component and its data-fetching logic are in the same file. The route is lazy-loaded, so the data fetch only starts after the JS chunk downloads. Users wait twice: once for JS, once for data. This is the most common lazy-loading anti-pattern in React SPAs.

**Prevention:** Separate data loaders from component files. The loader (data fetch) should be a static import so it runs in parallel with the lazy JS download:
```typescript
// routes/contest.ts — static import, runs immediately
export const contestLoader = async ({ params }) => {
  return supabase.from('competitions').select('*').eq('id', params.id).single();
};

// routes/ContestPage.tsx — lazy loaded
const ContestPage = lazy(() => import('./ContestPage'));
```

**Phase:** Address in Phase — Route architecture setup.

**Confidence:** HIGH — Verified against React Training official article on SPA lazy loading pitfalls.

---

### Pitfall 14: Vite Base Path Mismatch After Rename or Fork

**What goes wrong:** The project is deployed to `username.github.io/cooking_contest/`. If the repository is renamed, forked, or the `base` in `vite.config.ts` doesn't match the actual GitHub Pages path, all asset imports return 404.

**Prevention:** Make the base path configurable via an environment variable:
```typescript
// vite.config.ts
export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/cooking_contest/',
})
```

**Phase:** Address in Phase — Initial project setup.

**Confidence:** HIGH — Standard Vite deployment pattern.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|---|---|---|
| Project setup | Vite base path wrong → blank page on deploy | Set `base` in `vite.config.ts` before first deploy |
| Project setup | Router choice → 404 on deep link refresh | Use HashRouter from day one |
| Auth implementation | PIN stored plaintext | Hash server-side, add rate limiting in Edge Function |
| Auth implementation | Session flash (unauthenticated UI before Supabase loads) | Gate render on session initialization |
| Data model + RLS | Missing WITH CHECK on dishes/votes INSERT/UPDATE | Always pair USING + WITH CHECK, never test in Studio |
| Photo upload | 413 errors from dual limit system | Set bucket limit explicitly; add client-side size guard |
| Voting logic | Self-vote possible, duplicate votes possible | All vote writes via Edge Function with DB unique constraint |
| Voting logic | Chef identity leaked via participant_id in dishes query | Phase-gated column omission in dish fetch |
| Results + ranking | Heavy vote tallying in Edge Function JS → CPU timeout | Do aggregation in SQL, not JS |
| GitHub Actions | Build-time env vars missing → app broken in production | Use `VITE_` prefix + pass via `env:` on build step |
| State management | Context provider explosion → re-render cascades | Establish Zustand from phase 1 |

---

## Sources

- [Supabase Row Level Security — Official Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) (HIGH confidence)
- [Supabase RLS Performance and Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) (HIGH confidence)
- [Supabase Storage File Limits](https://supabase.com/docs/guides/storage/uploads/file-limits) (HIGH confidence)
- [Supabase Edge Functions Limits](https://supabase.com/docs/guides/functions/limits) (HIGH confidence)
- [GitHub Pages SPA 404 — community discussion](https://github.com/orgs/community/discussions/64096) (HIGH confidence — multiple confirming sources)
- [SPA Lazy Loading Pitfalls — React Training](https://reacttraining.com/blog/spa-lazy-loading-pitfalls) (HIGH confidence)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) (MEDIUM confidence — authoritative for PIN hashing guidance)
- [Auth0: Secure Browser Storage — The Facts](https://auth0.com/blog/secure-browser-storage-the-facts/) (MEDIUM confidence)
- [Taming Large Chunks in Vite + React (2025)](https://www.mykolaaleksandrov.dev/posts/2025/11/taming-large-chunks-vite-react/) (MEDIUM confidence)
- [Supabase Security — 170+ Apps Exposed by Missing RLS (2025)](https://byteiota.com/supabase-security-flaw-170-apps-exposed-by-missing-rls/) (MEDIUM confidence — real-world pattern evidence)
