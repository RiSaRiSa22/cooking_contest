# Phase 1: Foundation + Auth - Context

**Gathered:** 2026-02-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Scaffold tecnico (Vite + React + TypeScript + Tailwind v4 + HashRouter), schema Supabase, design system, home screen con gare recenti, e flusso completo di autenticazione: creazione gara, join partecipante, re-auth su sessione scaduta. Deep link con codice gara pre-compilato.

</domain>

<decisions>
## Implementation Decisions

### Home screen
- Layout a lista verticale con card per le gare recenti
- Ogni card mostra: nome gara, fase corrente (preparazione/votazione/finita), data
- CTA "Crea gara" e "Entra in gara" come FAB / bottone fisso in basso
- Empty state (primo accesso): schermata pulita con logo, titolo app e i due bottoni — niente illustrazioni

### Flusso creazione gara
- L'admin inserisce: nome gara, soprannome, PIN 4 cifre, opzioni (max partecipanti, ospiti sì/no)
- L'admin sceglie il proprio PIN (non generato automaticamente)
- Dopo la creazione: schermata dedicata full-screen con codice gara ben visibile, bottone copia, CTA per andare al pannello admin

### Flusso join + identità
- Form unico con tutti i campi: codice gara, soprannome, PIN 4 cifre — submit unico
- Non si sceglie chef/ospite al join: tutti entrano uguali, chi vuole aggiungere un piatto lo fa dopo dal pannello partecipante
- Conflitto soprannome: errore "Soprannome già in uso" con suggerimento automatico (es. aggiungi numero)
- Entry points in Phase 1: FAB nella home + deep link con codice pre-compilato
- Deep link: apre il form join con codice gara già inserito, l'utente aggiunge solo soprannome e PIN

### Re-auth
- Stesso flusso per admin e partecipanti: solo PIN (soprannome già salvato in localStorage)
- Il sistema distingue admin da partecipante tramite il ruolo in DB, non tramite il form

### Claude's Discretion
- Design system: palette colori, tipografia, stile componenti (non discusso — Claude ha libertà)
- Loading states e error handling UI
- Exact spacing e layout details

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-auth*
*Context gathered: 2026-02-21*
