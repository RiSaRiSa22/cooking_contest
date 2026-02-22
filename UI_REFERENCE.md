# Fornelli in Gara — Riferimento UI/UX

> Documento di riferimento per l'implementazione del frontend.  
> Descrive design system, layout, componenti, animazioni e comportamenti interattivi.

---

## 1. Design System

### Palette Colori

```css
/* Core */
--ink:            #1A1208;   /* testo principale, sfondi dark */
--ink-mid:        #4A3828;   /* testo secondario */
--ink-light:      #8B6E56;   /* testo muted, label */

/* Background */
--parchment:      #FBF6EE;   /* sfondo pagina */
--parchment-dark: #F0E8D8;   /* sfondo card, input */
--parchment-deep: #E4D5BF;   /* bordi, divisori */

/* Accent */
--ember:          #C44B1B;   /* azione primaria, CTA */
--ember-light:    #E8683A;   /* hover stato ember */
--gold:           #C9991F;   /* accent secondario, badge, highlight */
--gold-light:     #E5BC4A;   /* hover stato gold */
--sage:           #5C7A5A;   /* azione secondaria (es. avvia votazioni) */
--sage-light:     #7FA87D;   /* hover stato sage */
```

### Tipografia

```css
/* Font families */
font-display: 'Cormorant Garamond', serif;   /* titoli, hero text */
font-body:    'Outfit', sans-serif;           /* tutto il resto */

/* Scale */
hero-title:   clamp(2.6rem, 10vw, 4.2rem)   /* titolo home */
page-title:   1.4rem / font-weight: 600      /* titoli sezione */
section-label: 0.72rem / uppercase / letter-spacing: 0.1em
body:         0.95rem
small:        0.82rem
micro:        0.68-0.72rem
```

### Ombre

```css
--shadow-sm: 0 2px 12px rgba(26,18,8,.08);
--shadow-md: 0 6px 28px rgba(26,18,8,.13);
--shadow-lg: 0 16px 56px rgba(26,18,8,.2);
--shadow-xl: 0 32px 80px rgba(26,18,8,.28);
```

### Border Radius

```css
--radius:    20px;   /* card, sheet, modal */
--radius-sm: 12px;   /* elementi secondari */
pill:        50px;   /* bottoni, badge */
```

### Texture

Applicare un grain SVG come overlay fisso su tutto il body (z-index altissimo, pointer-events: none, opacity ~0.025):
```
fractalNoise, baseFrequency 0.85, 4 octaves, opacity 0.035 su rect 300x300
```

---

## 2. Layout Generale

### Struttura pagina
L'app è **mobile-first, single-page**. Ogni "schermata" è un `div.screen` che viene mostrato/nascosto. Solo una screen è attiva alla volta.

```
screen-loading   → splash iniziale (sfondo dark, spinner gold)
screen-home      → home (sfondo dark, hero + lista gare + CTA)
screen-admin     → pannello admin (sfondo parchment, header + tab bar + content)
screen-voter     → schermata partecipante (sfondo parchment, header + tab bar + content)
```

### App Header (schermate admin/voter)
```
height: 62px
sticky top, backdrop-filter blur(14px)
background: rgba(251,246,238,.92)
border-bottom: 1px solid --parchment-deep

[←Home]    [Nome Gara / ADMIN · CODICE]    [Badge ruolo]
```

### Tab Bar
```
position: fixed bottom: 0 (o sticky)
height: 64px + safe-area-inset
background: rgba(251,246,238,.95) blur(16px)
4 tab: icona + label
tab attivo: colore --ember, font-weight 600
```

### Content Area
```
padding-bottom: 100px (spazio per tab bar)
padding: 0 18px (laterale)
max-width: 480px (centrato su desktop)
```

---

## 3. Componenti

### Bottoni

```
.btn-ember   → gradient(ember → ember-light), testo bianco, shadow ember
.btn-gold    → gradient(gold → gold-light), testo ink, shadow gold
.btn-sage    → gradient(sage → sage-light), testo bianco
.btn-ghost-light → bg rgba bianco, bordo rgba bianco — su sfondi dark
.btn-ghost-dark  → bg parchment-dark, bordo parchment-deep — su sfondi chiari

Sizes:
  default:  padding 16px 28px, font 0.95rem
  .btn-sm:  padding 10px 20px, font 0.85rem
  .btn-full: width 100%

Hover: translateY(-2px) + shadow aumentato
Border-radius: 50px (pillola)
```

### Form Inputs

```css
.form-input {
  width: 100%;
  padding: 14px 16px;
  background: var(--parchment-dark);
  border: 1.5px solid var(--parchment-deep);
  border-radius: var(--radius-sm);
  font-size: 0.95rem;
  transition: border-color .2s, box-shadow .2s;
}
.form-input:focus {
  border-color: var(--ember);
  box-shadow: 0 0 0 3px rgba(196,75,27,.12);
}

.form-label {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--ink-light);
  margin-bottom: 8px;
}
```

### PIN Input (4 box)

```css
.pin-row {
  display: flex;
  gap: 10px;
  justify-content: center;
}
.pin-input {
  width: 62px; height: 72px;
  type: tel, inputmode: numeric, maxlength: 1
  background: var(--parchment-dark);
  border: 2px solid transparent;
  border-radius: 14px;
  text-align: center;
  font-size: 2rem; font-weight: 700;
  transition: border-color .2s;
}
.pin-input:focus { border-color: var(--ember); background: white; }
```

Comportamento JS:
- Input → accetta solo cifre, max 1 carattere → auto-focus sul prossimo box
- Backspace su box vuoto → focus sul box precedente
- Paste → distribuisce le cifre sui box disponibili
- Enter → submit del form

### Upload Zone

```
area cliccabile con bordo dashed, border-radius 16px
sfondo: rgba parchment-dark
emoji grande centrata + testo descrittivo
input[type=file] hidden sopra
hover: border-color ember, sfondo leggermente più scuro
```

### Photo Gallery (upload preview)

```
griglia 3 colonne, gap 8px
thumbnail quadrato, border-radius 12px, object-fit cover
overlay "×" rosso in alto a destra per rimuovere
```

### Card Piatto (admin list)

```
border-radius: 20px
shadow-sm
overflow: hidden

[immagine 160px height, object-fit cover]
[body: padding 14px]
  [nome piatto — font 1rem, weight 600]
  [nome cuoco — font 0.82rem, color ink-light]
  [badge "nascosto ai votanti" — se fase voting/finished]
  [ingredienti preview — max 80 chars]
  [actions row: ✏️ 🗑 | count voti]
```

### Vote Card (schermata votazione)

```
border-radius: 20px
border: 2px solid transparent
shadow-sm
margin-bottom: 16px

Stati:
  default:  bordo transparent
  selected: bordo gold, background rgba(gold, 0.05), scale(1.01)
  disabled: opacity 0.5
  own-dish: bordo parchment-deep, background parchment-dark

[immagine 200px height]
[body: padding 16px]
  [nome piatto — Cormorant Garamond 1.3rem]
  [chef label — "🎭 Cuoco misterioso" + badge gold]
  [sezioni espandibili: ingredienti, ricetta, storia, foto]
  [vote button]
```

### Photo Grid (tab Piatti)

```
display: grid
grid-template-columns: repeat(3, 1fr)
gap: 2px
background: #1a1208 (dark gap color)

.photo-grid-item {
  aspect-ratio: 1;
  overflow: hidden;
  cursor: pointer;
  position: relative;
}
.photo-grid-item img {
  width: 100%; height: 100%;
  object-fit: cover;
  transition: transform .25s;
}
.photo-grid-item:hover img { transform: scale(1.05); }

Overlay label (bottom gradient):
  position: absolute bottom 0
  padding: 22px 6px 6px
  background: linear-gradient(transparent, rgba(26,18,8,.72))
  testo: nome piatto, bianco, 0.72rem

Badge foto count (top-right):
  position: absolute top 5px right 5px
  background: rgba(26,18,8,.55) blur
  "📷 N" testo bianco micro
```

### Dish Detail Sheet

Overlay bottom-sheet che si apre al tap su una cella della griglia:

```
overlay → backdrop semi-trasparente
sheet → border-radius 28px 28px 0 0, sale dal basso

[foto hero — width 100%, max-height 300px, object-fit cover]
[body: padding 20px 22px 32px]
  [nome — Cormorant Garamond 1.6rem]
  [pulsante chiudi — cerchio 34px, top-right]
  [chef label — normale o misterioso in base alla fase]
  [sezioni: ingredienti, ricetta, storia]
  [griglia foto extra — 3col, gap 4px]
  [vote button — se fase voting e non proprio piatto]
```

### Rank Item (classifica)

```
display: flex, align-items: center, gap: 12px
padding: 14px
border-radius: 16px
margin-bottom: 10px
shadow-sm

[medaglia — 44px cerchio, gradient in base alla posizione]
  🥇: gold gradient
  🥈: silver gradient
  🥉: bronze gradient
  altro: ink-light, numero
[thumbnail — 52px quadrato, border-radius 10px]
[info flex-1]
  [nome piatto — font 0.95rem weight 600]
  [nome cuoco — se rivelato, colore ember]
  [progress bar — height 4px, gold fill]
[score]
  [numero voti — font 1.3rem weight 700]
  [percentuale — micro, ink-light]
```

### Participant Card

```
display: flex, gap: 12px, align-items: center
padding: 14px 16px
border-radius: 14px
background: parchment-dark

[avatar — 44px cerchio, gradient ember, iniziale soprannome]
[info flex-1]
  [soprannome]
  [stato piatto — "🍽 Piatto: Nome" o "Nessun piatto inviato"]
[badge voto]
  "✓ Votato" (sage) / "— Non votato" (ink-light)
```

### Phase Banner

```
padding: 12px 16px
border-radius: 14px
display: flex, align-items: center, gap: 8px
margin-bottom: 16px

preparation: background rgba(201,153,31,.1), bordo gold, testo gold
voting:      background rgba(92,122,90,.1), bordo sage, testo sage
finished:    background rgba(196,75,27,.1), bordo ember, testo ember

Dot animato (pulse):
  width/height: 8px, border-radius 50%
  stesso colore del banner
  animation: pulse 1.5s infinite
```

### Status Bar (voto)

```
display: flex, align-items: center, gap: 10px
padding: 12px 16px
background: parchment-dark
border-radius: 12px
margin: 0 18px 16px

.status-dot {
  width: 10px; height: 10px; border-radius 50%;
  &.active: background sage, box-shadow sage glow
  &.idle:   background parchment-deep
}
.status-text { font-size: 0.85rem }
```

### Toast Notification

```
position: fixed bottom: 90px, left/right 20px (centrato max-width 320px)
background: ink
color: parchment
border-radius: 50px
padding: 12px 20px
font-size: 0.88rem
shadow-lg
z-index: 10000

opacity: 0 → 1 (show) → 0 (auto-dismiss 3.2s)
transform: translateY(10px) → 0
```

---

## 4. Overlays e Modali

Tutti i modali usano la stessa struttura:

```html
<div class="overlay [center]" id="modal-xxx">
  <div class="sheet">
    <div class="sheet-handle"></div>   <!-- solo su bottom-sheet -->
    <div class="sheet-title">Titolo</div>
    <p class="sheet-sub">Sottotitolo</p>
    <!-- contenuto -->
  </div>
</div>
```

```css
.overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(26,18,8,.5);
  backdrop-filter: blur(4px);
  display: flex; align-items: flex-end;   /* bottom-sheet default */
  opacity: 0; pointer-events: none;
  transition: opacity .3s;
}
.overlay.open { opacity: 1; pointer-events: all; }
.overlay.center { align-items: center; justify-content: center; }

.sheet {
  background: var(--parchment);
  border-radius: 28px 28px 0 0;   /* bottom-sheet */
  padding: 24px 20px 40px;
  width: 100%; max-width: 480px;
  max-height: 92vh;
  overflow-y: auto;
  animation: sheetUp .3s ease;
}
.overlay.center .sheet {
  border-radius: 28px;   /* dialog centrato */
  margin: 20px;
}

.sheet-handle {
  width: 40px; height: 4px;
  background: var(--parchment-deep);
  border-radius: 2px;
  margin: 0 auto 20px;
}
```

**Modali presenti:**
- `modal-create-comp` — crea gara
- `modal-join-comp` — entra in gara (codice + soprannome + PIN o password admin)
- `modal-add-dish` — aggiungi/modifica piatto (admin)
- `modal-my-dish` — aggiungi/modifica il tuo piatto (partecipante)
- `modal-auth` — re-autenticazione (PIN per partecipante, password per admin)
- `overlay-dish-detail` — dettaglio piatto dalla griglia

**Chiusura overlay:** click sul backdrop (area fuori dallo `.sheet`) chiude il modal.

---

## 5. Animazioni

```css
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
```

**Applicazione:**
- Ogni `.screen.active` → `screenIn 0.35s ease`
- `.sheet` al mount → `sheetUp 0.3s ease`
- Fiamma home → `flicker 3s infinite alternate`
- Phase dot → `pulse 1.5s infinite`
- Loading spinner → `spin 0.7s linear infinite`

---

## 6. Home Screen

```
sfondo: var(--ink) (dark)

hero (flex-1, centrato):
  fiamma 72px animata (flicker)
  titolo: "Fornelli in" / "Gara" — Cormorant Garamond, parchment
  "in" e "Gara" in gold italic
  subtitle: uppercase, ink-light, tracking wide

lista gare recenti (se presenti):
  label "Le tue gare" uppercase micro
  .comp-pill: bg rgba bianco 6%, bordo rgba bianco 10%
    icona 🔥 | nome gara + meta | ›
    hover: bg rgba 10%, bordo gold 30%

actions (padding bottom 60px):
  btn-ember full: "✨ Crea nuova gara"
  btn-ghost-light full: "🔗 Entra con codice"
```

---

## 7. Sezioni Espandibili (Piatto)

Usate nelle vote card e nel dettaglio piatto per mostrare ingredienti, ricetta, storia, foto aggiuntive.

```
header: display flex, justify-content space-between
  [titolo sezione]   [chevron ▼/▲]
  padding: 10px 0, bordo bottom parchment-deep
  cursor pointer

body: max-height 0, overflow hidden
      transition: max-height .3s ease
  quando aperto: max-height 500px (o fit-content via JS)
  padding: 8px 0
  font-size 0.9rem, color ink-mid, line-height 1.6
```

---

## 8. Comportamenti Responsivi

- Layout mobile-first, max-width 480px centrato su desktop
- Griglia foto: sempre 3 colonne indipendentemente dalla dimensione
- Tab bar: fissa in basso, gestisce `safe-area-inset-bottom` (iPhone notch)
- Modali: su mobile occupano quasi tutto lo schermo (max-height 92vh), su desktop si centrano

---

## 9. Icone ed Emoji

L'app usa esclusivamente emoji come icone — nessuna libreria di icone esterna.

| Elemento | Emoji |
|---|---|
| Home / fiamma | 🔥 |
| Piatto generico | 🍽 |
| Cuoco | 👨‍🍳 |
| Cuoco misterioso | 🎭 |
| Voto | 🗳 |
| Classifica | 🏆 |
| Foto | 📷 📸 |
| Ingredienti | 🥬 |
| Ricetta | 📋 |
| Storia | 📖 |
| 1° posto | 🥇 |
| 2° posto | 🥈 |
| 3° posto | 🥉 |
| Admin | 👑 |
| Impostazioni | ⚙️ |
| Partecipanti | 👥 |
| Fase preparazione | 📝 |
| Fase voting | 🗳 |
| Fase finished | 🏁 |

---

## 10. Stack Frontend Consigliato

L'interfaccia è stata prototipata come single HTML file. Per la versione strutturata, si consiglia:

- **Framework:** React (Vite) o Next.js
- **Styling:** Tailwind CSS con custom tokens che replicano il design system sopra, oppure CSS Modules con le variabili CSS definite
- **Font:** Google Fonts — Cormorant Garamond + Outfit
- **Routing:** React Router o Next.js App Router
- **State management:** Zustand o Context API (stato semplice)
- **HTTP client:** fetch nativo o Axios
- **Upload foto:** compressione client-side prima dell'upload (canvas API, max 800px, qualità 0.72 JPEG)

### Struttura cartelle suggerita

```
src/
  components/
    ui/           → Button, Input, PinInput, Modal, Toast, Badge
    layout/       → AppHeader, TabBar, Screen
    dishes/       → DishCard, VoteCard, PhotoGrid, DishDetail
    competition/  → PhaseBanner, StatusBar, RankItem, ParticipantCard
  screens/
    Home/
    Admin/        → tabs: Dishes, Participants, Ranking, Settings
    Voter/        → tabs: Vote, Gallery, Ranking, MyDish
  hooks/
    useCompetition.ts
    useAuth.ts
    usePhotoUpload.ts
  lib/
    api.ts        → wrapper API calls
    hash.ts       → simpleHash per PIN
    storage.ts    → localStorage session management
  types/
    index.ts      → Competition, Participant, Dish, Vote, Photo
```
