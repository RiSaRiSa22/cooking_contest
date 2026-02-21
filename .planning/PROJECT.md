# Fornelli in Gara

## What This Is

Una web app mobile-first per organizzare gare di cucina tra amici. Un organizzatore crea una gara, i partecipanti aggiungono piatti con foto, durante la votazione i cuochi restano anonimi, e la classifica finale rivela chi ha cucinato cosa. Frontend React + Vite deployato su GitHub Pages, backend su Supabase.

## Core Value

I partecipanti devono poter votare piatti in modo anonimo (senza sapere chi ha cucinato cosa) e vedere la classifica finale con la rivelazione dei cuochi.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Autenticazione admin (crea gara con password) e partecipante (join con nickname + PIN)
- [ ] Gestione fasi gara: preparation → voting → finished (transizioni unidirezionali, solo admin)
- [ ] CRUD piatti con foto multiple (upload, compressione client-side)
- [ ] Votazione anonima (1 voto per partecipante, no voto al proprio piatto, cambio voto possibile)
- [ ] Classifica con medaglie, percentuali e rivelazione cuochi
- [ ] Pannello admin con tab: Piatti, Partecipanti, Classifica, Impostazioni
- [ ] Schermata partecipante con tab: Vota, Galleria piatti, Classifica, Il mio piatto
- [ ] Home screen con gare recenti (localStorage) e azioni crea/entra
- [ ] Link di condivisione (join e votazione) con deep linking
- [ ] QR code generato in-app per link di condivisione
- [ ] Ruolo ospite votante (vota senza avere un piatto proprio)
- [ ] Re-autenticazione con modal PIN/password al ritorno
- [ ] Foto extra durante fase voting

### Out of Scope

- Real-time sync (WebSocket/polling) — aggiornamento manuale, troppa complessità per v1
- Notifiche push — non critico per il flusso base
- Export classifica PDF/immagine — nice-to-have, v2
- Timer votazione con countdown — v2
- Limite massimo partecipanti — non necessario per gare tra amici
- Eliminazione gara — v2
- OAuth/login social — nickname + PIN sufficiente per il contesto

## Context

- L'app è stata prototipata come single HTML file — esiste già un design system completo (palette, tipografia, componenti, animazioni) documentato in UI_REFERENCE.md
- Il modello dati è definito in FEATURES.md con 5 entità: Competition, Participant, Dish, Photo, Vote
- Target: gruppi di amici (5-20 persone), uso mobile prevalente
- Le specifiche funzionali (FEATURES.md) e UI/UX (UI_REFERENCE.md) sono il riferimento primario per l'implementazione

## Constraints

- **Frontend stack**: React + Vite + TypeScript — deploy statico su GitHub Pages
- **Backend**: Supabase (Database, Auth, Storage, Edge Functions)
- **API pattern**: Client SDK + RLS per letture/upload, Edge Functions per business logic (auth, voto, cambio fase)
- **Design**: Mobile-first, max-width 480px centrato su desktop, emoji come icone (no librerie icone)
- **Font**: Cormorant Garamond (display) + Outfit (body) da Google Fonts
- **Foto**: Compressione client-side max 800px, qualità 0.72 JPEG prima dell'upload
- **Hashing**: Hash deterministico semplice per PIN/password (non crittografico, app non gestisce dati sensibili)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React + Vite (no Next.js) | Deploy statico su GitHub Pages, SPA sufficiente | — Pending |
| Supabase mix (SDK + Edge Functions) | SDK per letture/upload semplici, Edge Functions per business logic critica | — Pending |
| GitHub Pages per hosting | Gratuito, deploy dal repo, sufficiente per SPA | — Pending |
| Emoji come icone | Nessuna dipendenza esterna, consistente con il prototipo | — Pending |
| QR code in-app | Dall'originale backlog, facilita condivisione link gara | — Pending |
| Ospite votante in v1 | Dall'originale backlog, utile per gruppi dove non tutti cucinano | — Pending |

---
*Last updated: 2026-02-21 after initialization*
