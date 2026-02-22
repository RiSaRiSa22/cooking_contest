# Phase 3: Voting + Voter Screen + Sharing — Research

**Researched:** 2026-02-22
**Domain:** Voting Edge Function, VoterScreen tabs, deep linking con HashRouter, QR code
**Confidence:** HIGH

---

## Summary

La fase 3 completa il core value dell'app: i partecipanti votano, vedono la galleria, e a gara finita viene rivelata la classifica con i nomi dei cuochi. Il codebase della fase 2 fornisce tutti i pattern necessari — VoterScreen è quasi un mirror di AdminScreen, il pattern Edge Function è consolidato, e il deep linking con HashRouter è già funzionante per `mode=join`.

Il principale punto critico è la `vote-cast` Edge Function: deve implementare un upsert atomico (INSERT ... ON CONFLICT UPDATE) per permettere il cambio di voto, verificare che la fase sia `voting`, e bloccare il voto sul proprio piatto. Tutto questo richiede `service_role` — la tabella `votes` non ha policy anon, è default deny by design.

**Primary recommendation:** Replicare esattamente i pattern di AdminScreen/DishesTab/dish-write per VoterScreen e vote-cast. Non reinventare nulla.

---

## Standard Stack

### Core — tutto già installato, zero nuove dipendenze npm

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | ^2.47.10 | Letture da `dishes_public` via SDK anon | Già in use, Split SDK pattern |
| `react-router` | ^7.2.0 | `useSearchParams` per deep link `mode=vote` | Già in use, createHashRouter |
| `zustand` | ^5.0.3 | `competitionStore` + eventuale `voterStore` | Già in use, no persist |
| Supabase Edge Functions | — | `vote-cast` con service_role | Pattern consolidato da dish-write |

### Dipendenze esterne senza npm install

| Tool | Come | Note |
|------|------|------|
| QR code | `https://api.qrserver.com/v1/create-qr-code/?data=...&size=200x200` come `<img>` | Già implementato in SettingsTab.tsx per join link — da estendere per vote link |

**Nessun nuovo pacchetto da installare.** La decisione di usare `api.qrserver.com` è già locked e implementata.

### Installation
```bash
# Nessuna installazione necessaria — tutto già presente
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── screens/
│   └── Voter/
│       ├── VoterScreen.tsx          # mirror di AdminScreen.tsx
│       └── tabs/
│           ├── VoteTab.tsx          # lista piatti votabili
│           ├── GalleryTab.tsx       # griglia 3col + DishDetailSheet
│           ├── RankingTab.tsx       # clone di Admin/RankingTab ma da dishes_public
│           └── MyDishTab.tsx        # piatto del partecipante + foto extra
├── components/
│   └── dishes/
│       └── DishDetailSheet.tsx      # bottom-sheet con foto hero + sezioni espandibili
supabase/
└── functions/
    └── vote-cast/
        └── index.ts                 # upsert atomico vote, business logic
```

### Pattern 1: VoterScreen come mirror di AdminScreen

**What:** VoterScreen.tsx replica la struttura di AdminScreen — sticky header, PhaseBanner, tab bar in fondo, content area. Usa `useCompetition(session.competitionId)` identico all'admin ma legge da `dishes_public` (non `dishes`).

**Differenza chiave:** VoterScreen ha solo 4 tab ma Tab Classifica è `disabled` (o nascosta) in phase !== 'finished'. L'admin la vede sempre.

**Example:**
```typescript
// Source: pattern da AdminScreen.tsx (codebase)
const TABS = [
  { id: 'vota', label: 'Vota', emoji: '🗳️' },
  { id: 'galleria', label: 'Galleria', emoji: '📸' },
  { id: 'classifica', label: 'Classifica', emoji: '🏆' },
  { id: 'il-mio-piatto', label: 'Il mio piatto', emoji: '🍽️' },
] as const

// Tab Classifica: visibile solo in finished
// Approccio: mostrare tab sempre ma contenuto condizionale (VOTR-03 dice "visibile solo in finished")
// Decisione: nascondere il tab fisicamente quando phase !== 'finished' evita confusione UX
```

### Pattern 2: vote-cast Edge Function con upsert atomico

**What:** La tabella `votes` ha `UNIQUE(competition_id, participant_id)` — un solo voto per partecipante per gara. L'upsert PostgreSQL `INSERT ... ON CONFLICT (competition_id, participant_id) DO UPDATE SET dish_id = EXCLUDED.dish_id` implementa il cambio voto atomicamente.

**When to use:** Qualsiasi cambio voto — la EF distingue primo voto da cambio voto tramite l'ON CONFLICT, senza logica applicativa.

**Verifiche obbligatorie nella EF (in ordine):**
1. `participantId` esiste e appartiene a `competitionId`
2. `competition.phase === 'voting'`
3. `dish.competition_id === competitionId` (il piatto appartiene alla gara)
4. `dish.participant_id !== participantId` (non votare il proprio piatto)
5. Upsert atomico

**Example:**
```typescript
// Source: pattern verified via Context7 (supabase/supabase) + codebase dish-write pattern
// In vote-cast/index.ts

const { data: vote, error: voteError } = await supabase
  .from('votes')
  .upsert(
    {
      competition_id: competitionId,
      participant_id: participantId,
      dish_id: dishId,
    },
    { onConflict: 'competition_id,participant_id' }
  )
  .select()
  .single()
```

**IMPORTANTE:** L'upsert Supabase JS supporta `onConflict` come stringa con le colonne separate da virgola. Il constraint UNIQUE su `(competition_id, participant_id)` esiste già nello schema (`UNIQUE(competition_id, participant_id)` in `votes`).

### Pattern 3: Lettura voti per VoterScreen (conoscere il proprio voto attuale)

**What:** Il voter deve sapere se ha già votato e su quale piatto. La tabella `votes` è default deny per anon — non si può leggere col SDK. La EF `vote-cast` deve **restituire il voto corrente** nella response, oppure serve una seconda EF `vote-read` o alternativa.

**Opzione raccomandata:** La `vote-cast` response include il `dish_id` votato. Per il caricamento iniziale, aggiungere una EF `vote-read` (o parametro GET-like nella `vote-cast`) che restituisce il voto corrente del partecipante.

**Alternativa più semplice:** Includere il `myVote` (dish_id o null) nella response di `vote-cast`, e all'apertura di VoterScreen fare una chiamata iniziale `vote-cast` con solo `participantId` e `competitionId` (senza `dishId`) per leggere lo stato corrente. Però questo complica il contratto della EF.

**Scelta consigliata:** Creare `vote-read` EF separata (POST con `{participantId, competitionId}`) che restituisce `{dish_id: string | null}`. Questo mantiene la separazione read/write e rispetta il pattern EF esistente.

**Alternativa zero-code:** Aggiungere policy di lettura su `votes` per service_role e chiamarla via EF. Ma il problema rimane: il client anon non può leggere direttamente.

### Pattern 4: dishes_public per VoterScreen

**What:** VoterScreen legge sempre da `dishes_public` (view) — mai dalla tabella `dishes` diretta. La view nasconde `chef_name` e `participant_id` quando `phase != 'finished'`.

**Implication for useCompetition:** Il hook `useCompetition` esistente legge da `dishes` (per admin). Serve un hook alternativo `useVoterData` che:
- Legge da `dishes_public` invece di `dishes`
- Non carica participants (non necessario per voter)
- Carica il voto corrente del partecipante via `vote-read` EF

**Example:**
```typescript
// Source: pattern da useCompetition.ts (codebase) — adattato per voter
// In hooks/useVoterData.ts

const dishesRes = await supabase
  .from('dishes_public')        // VIEW — non dishes diretta
  .select('*, photos(*)')
  .eq('competition_id', competitionId)
```

**ATTENZIONE:** `dishes_public` è una view — ha i campi dello schema `DishPublic` con `chef_name: string | null` e `participant_id: string | null`. Il TypeScript type è già in `database.types.ts` come `DishPublic`. Serve un tipo `DishPublicWithPhotos = DishPublic & { photos: Photo[] }`.

### Pattern 5: Deep linking mode=vote

**What:** SHAR-01 richiede link `?code=X&mode=vote` che apra direttamente VoterScreen in Tab Vota. Il sistema esistente in `HomeScreen.tsx` gestisce già `mode=join` e `mode=reauth`. Il `mode=vote` è semplicemente un `mode=join` in cui dopo autenticazione si reindirizza a `/voter/:code` (che è già il comportamento di default — JoinCompModal dopo login va su `/voter/:code`).

**Implication:** `mode=vote` e `mode=join` potrebbero essere equivalenti nel comportamento (entrambi aprono JoinCompModal), differenziati solo da un parametro che influenza quale tab viene attivato al landing. Oppure `mode=vote` può semplicemente fare join e poi redirigere a `/voter/:code` — che è già quello che fa `mode=join`.

**Conclusione:** Non serve modifiche al router per `mode=vote`. HomeScreen può trattare `mode=vote` come `mode=join`. La distinzione è solo nel testo del QR (join vs vota) non nel comportamento. Verificare con i requisiti SHAR-01 — "link votazione" implica che chi clicca sa già di voler votare, non di dover fare un join completo.

**Scelta raccomandata:** `mode=vote` → stessa logica di `mode=join`, ma VoterScreen apre di default sul tab `vota` (già il default). Non serve logica aggiuntiva.

### Pattern 6: DishDetailSheet (bottom-sheet)

**What:** Bottom-sheet che si apre al tap su una cella della griglia in GalleryTab. Pattern definito in UI_REFERENCE.md sezione 4 (Overlays e Modali).

**Example:**
```tsx
// Source: UI_REFERENCE.md — Dish Detail Sheet spec
// Pattern overlay con sheetUp animation già definita in index.css

// Struttura:
// overlay (fixed inset-0, bg semi-trasparente, flex items-end)
//   └── sheet (border-radius 28px 28px 0 0, max-height 92vh, overflow-y auto)
//         ├── sheet-handle (40px × 4px bar)
//         ├── foto hero (width 100%, max-height 300px, object-fit cover)
//         ├── pulsante chiudi (cerchio 34px, top-right assoluto)
//         ├── nome piatto (Cormorant Garamond 1.6rem)
//         ├── chef label ("🎭 Cuoco misterioso" in voting, nome in finished)
//         ├── sezioni espandibili: ingredienti, ricetta, storia
//         ├── griglia foto extra (3col gap-1)
//         └── vote button (se phase=voting e dish.participant_id !== myParticipantId)
```

### Anti-Patterns to Avoid

- **Leggere da `dishes` (non `dishes_public`) nel VoterScreen:** chef_name leakage. La view esiste per questo.
- **Mettere la logica del voto nel client-side:** voto sul piatto sbagliato, doppio voto, voto fuori fase. Tutto va nella EF.
- **Usare persist middleware su voterStore:** stesso motivo di competitionStore — server-authoritative, reset() obbligatorio sull'unmount.
- **Modificare RequireSession per distinguere ruolo:** blocca l'accesso anticipato ma non è il requisito. Il blocker menziona "Non-admin possono accedere a /admin/:code se hanno sessione valida" — per ora non è un must-have della fase 3, da documentare come tech debt.
- **Costruire QR code client-side (canvas/libreria npm):** si usa già `api.qrserver.com` in SettingsTab — il pattern è locked.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Upsert "cambio voto" | if/else SELECT + INSERT o UPDATE | `supabase.upsert({ onConflict })` | Atomico, race-condition-safe |
| QR code rendering | Canvas API o qrcode.react | `<img src="https://api.qrserver.com/...">` | Già implementato in SettingsTab, nessuna dipendenza npm |
| Bottom-sheet animation | CSS custom o framer-motion | CSS `sheetUp` keyframe già in index.css | Animazione già definita e in uso (vedi AddDishModal.tsx) |
| Ranking sort | Query SQL con ORDER | JS `.sort()` locale su dati già caricati | I dati sono in store — aggiungi voteCount ai dish tramite JOIN nella EF o query separata |
| Hash URL per deep link | BrowserRouter + server config | createHashRouter (già in uso) | GitHub Pages non supporta BrowserRouter |

**Key insight:** In questa fase il rischio di reinvenzione è alto perché VoterScreen sembra "nuovo" ma in realtà replica esattamente i pattern dell'admin. Ogni deviazione dai pattern esistenti deve essere giustificata.

---

## Common Pitfalls

### Pitfall 1: dishes_public non include photos

**What goes wrong:** `dishes_public` è una VIEW su `dishes` — non fa JOIN automatico con `photos`. Fare `select('*, photos(*)')` sulla view può non funzionare come su una tabella.

**Why it happens:** PostgREST permette relazioni embedded solo su tabelle con FK esplicite. La view `dishes_public` non ha FK dichiarate — il FK è sulla tabella `dishes` sottostante.

**How to avoid:** Verificare il comportamento di `supabase.from('dishes_public').select('*, photos(*)')` prima di pianificare. Se non funziona, alternativa: fare due query (1. select da `dishes_public`, 2. select da `photos` con `dish_id in (...)`) oppure aggiungere FK hint alla view.

**Warning signs:** TypeScript type `DishPublic` non ha `photos` nel Row. Se il piano include `DishPublicWithPhotos`, bisogna testare l'embedded select.

**Azione raccomandata nel piano:** Il task 03-01 deve includere una verifica della query `dishes_public` con photos embedded prima di procedere con lo store.

**Update:** Guardando il migration, la view `dishes_public` usa `security_invoker = true` — PostgREST dovrebbe seguire le FK della tabella `dishes` per l'embedding. Confidence: MEDIUM. Testare comunque.

### Pitfall 2: RankingTab nel VoterScreen non ha accesso ai vote counts

**What goes wrong:** La tabella `votes` è default deny per anon. Il SDK Supabase con la anon key non può leggere vote counts per costruire la classifica.

**Why it happens:** Scelta architetturale di fase 1 — votes e login_attempts senza policy anon = default deny.

**How to avoid:** Due opzioni:
1. **EF `vote-read` (raccomandata):** restituisce `{dish_id, vote_count}[]` per tutti i piatti di una gara, autenticata con `participantId`. Usa service_role per leggere counts.
2. **Aggiungere policy read limitata su votes per anon:** rompe il design originale — NON fare.

**Implication per il piano:** RankingTab per il voter richiede una EF aggiuntiva o che `useVoterData` esegua anche una query via EF per i counts. Questa EF può essere la stessa `vote-read` usata per leggere il proprio voto.

### Pitfall 3: MyDishTab — partecipante ospite (allow_guests) non ha piatto

**What goes wrong:** Un partecipante con `allow_guests=true` può aver fatto join senza aggiungere un piatto. MyDishTab deve gestire il caso "nessun piatto".

**Why it happens:** AUTH-05 permette ospiti votanti senza piatto.

**How to avoid:** MyDishTab controlla se il partecipante ha un dish. Se `participantId` non corrisponde ad alcun `dish.participant_id`, mostra UI appropriata ("Non hai aggiunto un piatto a questa gara").

### Pitfall 4: vote-cast non gestisce il voto su piatto eliminato

**What goes wrong:** Se l'admin elimina un piatto su cui un partecipante ha votato (dish-delete fa CASCADE), il voto sparisce. Se il voter aveva selezionato quel piatto e poi ricarica, il suo stato locale mostra un voto ma il DB non l'ha.

**Why it happens:** CASCADE DELETE su `dishes` + `votes` (già in schema). Il client non sa che il piatto è stato eliminato.

**How to avoid:** `vote-read` EF restituisce `null` se il voto non esiste più. Il VoteTab deve ricaricare il proprio voto corrente e aggiornare lo stato locale. Questo è già gestito se `useVoterData` carica il voto fresco ad ogni mount.

### Pitfall 5: Tab Classifica nel VoterScreen — conflitto con Tab Classifica Admin

**What goes wrong:** Admin e voter hanno tab classifica con comportamenti diversi. L'admin ha toggle "rivela cuochi" e vede la classifica anche in voting. Il voter vede la classifica SOLO in finished, e senza toggle (i nomi vengono rivelati automaticamente dalla view).

**Why it happens:** `dishes_public` rivela `chef_name` solo quando `phase = 'finished'`. Non serve toggle nel voter — il DB gestisce la rivelazione.

**How to avoid:** Non riutilizzare il componente `RankingTab` dell'admin. Creare `Voter/tabs/RankingTab.tsx` separato che:
- Non ha toggle reveal (la view decide)
- È accessibile SOLO quando `phase === 'finished'`
- Mostra voteCount da `vote-read` EF

---

## Code Examples

Verified patterns from official sources and codebase:

### vote-cast Edge Function — struttura base
```typescript
// Source: pattern da dish-write/index.ts (codebase) + Context7 supabase/supabase
import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod'

const VoteCastSchema = z.object({
  competitionId: z.string().uuid(),
  participantId: z.string().uuid(),
  dishId: z.string().uuid(),
})

Deno.serve(async (req) => {
  // ... CORS headers (stesso pattern di dish-write)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  )

  // 1. Verifica participant
  const { data: participant } = await supabase
    .from('participants')
    .select('id, competition_id')
    .eq('id', participantId)
    .maybeSingle()

  // 2. Verifica competition phase
  const { data: competition } = await supabase
    .from('competitions')
    .select('phase')
    .eq('id', competitionId)
    .single()

  if (competition.phase !== 'voting') {
    return new Response(JSON.stringify({ error: 'Votazione non in corso' }), { status: 400 })
  }

  // 3. Verifica dish appartiene alla gara e non è del partecipante
  const { data: dish } = await supabase
    .from('dishes')
    .select('id, competition_id, participant_id')
    .eq('id', dishId)
    .single()

  if (dish.competition_id !== competitionId) {
    return new Response(JSON.stringify({ error: 'Piatto non in questa gara' }), { status: 400 })
  }
  if (dish.participant_id === participantId) {
    return new Response(JSON.stringify({ error: 'Non puoi votare il tuo piatto' }), { status: 400 })
  }

  // 4. Upsert atomico — gestisce primo voto E cambio voto
  const { data: vote, error } = await supabase
    .from('votes')
    .upsert(
      { competition_id: competitionId, participant_id: participantId, dish_id: dishId },
      { onConflict: 'competition_id,participant_id' }
    )
    .select()
    .single()

  return new Response(JSON.stringify({ vote }), { status: 200 })
})
```

### useVoterData hook — lettura da dishes_public
```typescript
// Source: pattern da useCompetition.ts (codebase) — adattato per voter
export function useVoterData(competitionId: string, participantId: string) {
  useEffect(() => {
    async function load() {
      const [compRes, dishesRes] = await Promise.all([
        supabase.from('competitions').select('*').eq('id', competitionId).single(),
        supabase
          .from('dishes_public')   // VIEW — chef_name null in preparation/voting
          .select('*, photos(*)')
          .eq('competition_id', competitionId),
      ])
      // ... set store
    }

    // Carica voto corrente via EF
    async function loadMyVote() {
      const res = await supabase.functions.invoke('vote-read', {
        body: { competitionId, participantId }
      })
      // store.setMyVote(res.data?.dish_id ?? null)
    }

    load()
    loadMyVote()
  }, [competitionId, participantId])
}
```

### Deep link mode=vote in HomeScreen
```typescript
// Source: HomeScreen.tsx (codebase) — estensione del pattern esistente
// mode=vote → stesso di mode=join (apre JoinCompModal con codice pre-filled)
// VoterScreen al landing di default apre tab 'vota'
} else if (mode === 'vote') {
  setDeepLinkCode(upperCode)
  setShowJoin(true)   // stesso di mode=join
}
```

### VoteTab — stato voto e selezione
```typescript
// Source: progettazione da requirements VOTE-01/02
// Stato locale: quale dish_id è selezionato + myCurrentVote dal server

const [selectedDishId, setSelectedDishId] = useState<string | null>(myVote)

async function handleVote(dishId: string) {
  const res = await supabase.functions.invoke('vote-cast', {
    body: { competitionId, participantId, dishId }
  })
  if (!res.error) {
    setSelectedDishId(dishId)
    // aggiorna store.myVote
  }
}

// Filtra piatto del partecipante (non votabile)
// dishes_public non espone participant_id in preparation/voting (è NULL)
// PROBLEMA: come sapere quale piatto è "il mio"?
// SOLUZIONE: il partecipante conosce il proprio dish_id dalla sessione
// oppure da una query separata su dishes_public filtrando per competition_id
// e confrontando con myDish caricato separatamente.
// ALTERNATIVA PIU' SEMPLICE: vote-cast EF restituisce 403 "non puoi votare il tuo piatto"
// e il client lo gestisce come errore UX. Il VoteTab NON deve nascondere il proprio piatto
// dalla lista (perché non sa qual è in fase voting), ma il voto verrà rifiutato dalla EF.
```

**IMPORTANTE — problema di design:** In `voting`, `dishes_public.participant_id` è `NULL`. Il voter non sa quale piatto è il proprio dalla sola view. Opzioni:
1. Il voter memorizza il proprio `dish_id` nella sessione (non è in `Session` ora)
2. La UI mostra tutti i piatti e la EF rifiuta il voto sul proprio (UX meno buona)
3. `vote-read` EF restituisce anche `myDishId`

**Raccomandazione:** Opzione 3 — `vote-read` restituisce `{myVotedDishId, myDishId}`. Il `myDishId` è ottenuto dalla EF cercando `dishes WHERE participant_id = participantId`. Il client usa `myDishId` per disabilitare la card del proprio piatto nel VoteTab.

### SettingsTab — aggiunta voteUrl (SHAR-01)
```typescript
// Source: SettingsTab.tsx (codebase) — estensione pattern joinUrl esistente
const joinUrl = `${window.location.origin}${window.location.pathname}#/?code=${code}&mode=join`
const voteUrl = `${window.location.origin}${window.location.pathname}#/?code=${code}&mode=vote`

// Due QR: uno per join (preparation) e uno per vote (voting)
// Oppure un solo QR che cambia in base alla fase corrente
const shareUrl = phase === 'voting' ? voteUrl : joinUrl
const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(shareUrl)}&size=200x200`
```

### RankingTab per Voter — classifica con voteCount
```typescript
// Source: progettazione da requirements VOTE-04
// Lette via vote-read EF che restituisce array {dish_id, vote_count}[]

interface DishRanking {
  dish_id: string
  dish_name: string
  chef_name: string | null   // null in voting, string in finished (dalla view)
  vote_count: number
  percentage: number
  photos: Photo[]
}

// Sorted descending by vote_count, ties by name
const ranked = [...dishesWithCounts].sort((a, b) =>
  b.vote_count - a.vote_count || a.dish_name.localeCompare(b.dish_name)
)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| QR code con qrcode.react npm | `api.qrserver.com` come `<img>` | Decisione fase 2 | Nessuna dipendenza npm |
| Lettura voti via RLS anon | EF con service_role | Decisione fase 1 | Sicurezza voti garantita DB-side |
| BrowserRouter | createHashRouter | Decisione fondazione | GitHub Pages compatibility |
| Sort classifica placeholder (alfabetico) | Sort per voteCount (fase 3) | Fase 3 | RankingTab.tsx admin va aggiornato |

**Deprecated/outdated:**
- `RankingTab.tsx` dell'admin usa sort alfabetico con nota "classifica per voti rimandata a Fase 3". In fase 3 va aggiornato per usare i vote counts reali.

---

## Open Questions

1. **dishes_public con photos embedded**
   - What we know: PostgREST può fare embedded select sulle view se le FK della tabella base sono presenti; la view ha `security_invoker = true`
   - What's unclear: Se `supabase.from('dishes_public').select('*, photos(*)')` funziona senza aggiungere hints espliciti
   - Recommendation: Il primo task di 03-01 deve testare questa query. Se non funziona, piano B: due query separate (dishes_public + photos WHERE dish_id IN)

2. **myDishId per VoteTab — come sapere quale piatto disabilitare**
   - What we know: `dishes_public.participant_id` è NULL in voting/preparation per design
   - What's unclear: Se è accettabile UX che il voter non sappia visivamente quale è il proprio piatto (la EF lo rifiuterebbe)
   - Recommendation: `vote-read` EF restituisce `{myVotedDishId: string|null, myDishId: string|null}`. Semplice e non richiede cambiamenti alla sessione.

3. **Ospiti senza piatto (allow_guests) in MyDishTab**
   - What we know: AUTH-05 esiste, `dishes.participant_id` è nullable
   - What's unclear: Se VOTR-04 si applica anche agli ospiti o solo ai partecipanti con piatto
   - Recommendation: MyDishTab mostra empty state "Non hai aggiunto un piatto" se `myDishId` è null.

4. **Admin RankingTab con vote counts reali**
   - What we know: Admin legge da `dishes` direttamente e la tabella `votes` è accessible via service_role EF
   - What's unclear: Se l'admin recupera i vote counts tramite la stessa `vote-read` EF o con una query diretta nel `useCompetition` hook
   - Recommendation: La `vote-read` EF è usata da tutti (voter e admin) per i counts. Admin può anche chiamarla direttamente. Alternativa: aggiungere vote_count alla query di `useCompetition` tramite un JOIN SQL (aggregazione lato DB).

---

## Sources

### Primary (HIGH confidence)
- Codebase attuale — tutti i pattern di AdminScreen, dish-write, useCompetition, sessionStore, router.tsx, SettingsTab.tsx verificati direttamente
- Context7 `/supabase/supabase-js` — upsert con onConflict, select da view
- Context7 `/remix-run/react-router` — createHashRouter, useSearchParams

### Secondary (MEDIUM confidence)
- Context7 `/supabase/supabase` — pattern EF con service_role, upsert atomico
- UI_REFERENCE.md — Dish Detail Sheet spec, Rank Item spec, Status Bar spec (documento interno verificato)
- Schema migration `20260221000000_initial_schema.sql` — struttura tabella votes, UNIQUE constraint, dishes_public view definizione

### Tertiary (LOW confidence)
- dishes_public con photos embedded via PostgREST: non testato empiricamente, comportamento inferito dalla documentazione PostgREST (view con security_invoker + FK base table). Richiede test nel task 03-01.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero nuove dipendenze, tutto già in codebase
- Architecture (VoterScreen/EF): HIGH — replica diretta dei pattern fase 2
- Architecture (vote-cast upsert): HIGH — pattern upsert verificato via Context7
- Architecture (dishes_public + photos): MEDIUM — PostgREST view embedding non testato
- Architecture (myDishId problem): MEDIUM — design decision, nessuna soluzione verificata empiricamente
- Pitfalls: HIGH — tutti derivati dall'analisi dello schema e codebase esistente

**Research date:** 2026-02-22
**Valid until:** 2026-03-22 (stack stabile, nessuna dipendenza esterna nuova)
