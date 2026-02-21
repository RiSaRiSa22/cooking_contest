# Fornelli in Gara — Specifiche Funzionali

> Documento di riferimento per lo sviluppo del backend e frontend.  
> Descrive tutte le funzionalità richieste, il modello dati, i flussi utente e le regole di business.

---

## 1. Panoramica del Prodotto

**Fornelli in Gara** è una web app per organizzare gare di cucina tra amici. Un organizzatore crea una gara, i partecipanti aggiungono i loro piatti, e durante la votazione i cuochi rimangono anonimi. La classifica finale rivela chi ha cucinato cosa.

### Utenti del sistema

| Ruolo | Descrizione |
|---|---|
| **Admin** | Organizzatore della gara. Crea la gara, gestisce i piatti, controlla le fasi, vede tutto inclusi i nomi dei cuochi |
| **Partecipante** | Ospite autenticato con soprannome + PIN. Aggiunge il proprio piatto, vota gli altri, vede la classifica |
| **Ospite (futuro)** | Votante senza piatto proprio — non ancora implementato |

---

## 2. Modello Dati

### Competition
```
id:               string (UUID)
code:             string (6 chars, uppercase alfanumerico, es. "ABC123") — codice pubblico per unirsi
name:             string — nome della gara
admin_pwd_hash:   string — hash della password admin
phase:            enum("preparation" | "voting" | "finished")
allow_guests:     boolean (default false) — se true, i partecipanti possono votare senza aggiungere un piatto
max_participants: integer|null — limite massimo partecipanti (null = illimitato)
created_at:       timestamp
```

### Participant
```
id:             string (UUID)
competition_id: string (FK → Competition)
nickname:       string — soprannome scelto dall'utente
pin_hash:       string — hash del PIN a 4 cifre
role:           enum("admin" | "participant") — ruolo nella gara
joined_at:      timestamp
```

> **Nota:** il voto è tracciato nella tabella `Vote` dedicata (sotto), non come campo `voted_dish_id` in Participant. Questo permette di estendere a voti multipli in futuro.

### Dish
```
id:             string (UUID)
competition_id: string (FK → Competition)
participant_id: string|null (FK → Participant) — null se aggiunto dall'admin
name:           string — nome del piatto (obbligatorio)
chef_name:      string — nome del cuoco (obbligatorio, rivelato solo a fine gara)
ingredients:    string|null
recipe:         string|null
story:          string|null
created_at:     timestamp
```

### Photo
```
id:             string (UUID)
dish_id:        string (FK → Dish)
url:            string — URL del file caricato (storage)
is_extra:       boolean — false = foto principale, true = foto aggiunta durante la gara
order:          integer — ordine di visualizzazione
created_at:     timestamp
```

### Vote
```
id:             string (UUID)
competition_id: string (FK → Competition)
participant_id: string (FK → Participant)
dish_id:        string (FK → Dish)
created_at:     timestamp
```
> Constraint: un partecipante può votare un solo piatto per gara. Un partecipante non può votare il proprio piatto.

---

## 3. Autenticazione e Sessioni

### Creazione gara (Admin)
1. L'admin inserisce: nome gara, password admin (min 4 caratteri), proprio soprannome
2. Il sistema genera un codice gara univoco a 6 caratteri
3. Il sistema salva `hash(password)` — mai la password in chiaro
4. L'admin ottiene una sessione autenticata

### Join gara (Partecipante)
1. Il partecipante inserisce: codice gara, soprannome, PIN a 4 cifre
2. Se il soprannome **non esiste** → crea nuovo partecipante con `hash(PIN)`
3. Se il soprannome **esiste già** → verifica `hash(PIN)` contro il record salvato
4. Se PIN errato → errore, non entra
5. Se fornisce password admin invece del PIN → accede come admin

### Re-autenticazione (ritorno alla gara)
- La sessione è salvata in `localStorage` con TTL di 2 ore
- Al ritorno, il sistema mostra un modal di verifica:
  - Admin → campo password
  - Partecipante → 4 box PIN
- Senza verifica corretta non si accede alla gara

### Hashing
- Usare un hash deterministico semplice (non crittografico) — l'app non gestisce dati sensibili
- In produzione considerare bcrypt o simile

---

## 4. Fasi della Gara

```
preparation → voting → finished
```

Solo l'admin può cambiare fase. Le transizioni sono **unidirezionali** (non si può tornare indietro).

### Fase: preparation
- I partecipanti possono aggiungere e modificare il proprio piatto
- L'admin può aggiungere, modificare ed eliminare qualsiasi piatto
- I voti non sono accettati
- I nomi dei cuochi sono visibili all'admin, non ai partecipanti

### Fase: voting
- I partecipanti NON possono più modificare il piatto
- I partecipanti possono votare (esattamente 1 voto, non il proprio piatto)
- I nomi dei cuochi sono nascosti a tutti tranne all'admin
- I partecipanti possono aggiungere **foto extra** al proprio piatto (foto scattate durante la gara)
- L'admin vede lo stato voti in tempo reale (chi ha votato, chi no)

### Fase: finished
- Votazione chiusa
- La classifica è visibile a tutti
- I nomi dei cuochi sono rivelati pubblicamente
- L'admin può scegliere se rivelare i cuochi nella classifica o no (toggle)

---

## 5. Gestione Piatti

### Aggiunta piatto (Admin)
- Campi: nome piatto*, nome cuoco*, ingredienti, ricetta, storia, foto (multiple)
- Il nome piatto e il nome cuoco sono **obbligatori**
- Foto: upload multiplo, compressione a max 800px / qualità 0.72 prima del salvataggio
- L'admin può aggiungere piatti anche per conto dei partecipanti

### Aggiunta piatto (Partecipante)
- Solo in fase `preparation`
- Ogni partecipante può avere al massimo 1 piatto
- Campi identici all'admin
- Il nome cuoco appare con nota: "svelato solo dopo la classifica"
- Il partecipante può modificare il piatto fino all'inizio delle votazioni

### Foto extra (solo fase voting)
- I partecipanti possono aggiungere foto al proprio piatto durante le votazioni
- Le foto extra (`is_extra: true`) sono visibili a tutti nella galleria
- Vengono mostrate insieme alle foto principali nelle sezioni espandibili

### Eliminazione piatto (solo Admin)
- Elimina anche i voti associati a quel piatto
- Richiede conferma

---

## 6. Votazione

- Disponibile solo in fase `voting`
- Ogni partecipante vota **esattamente 1 piatto**
- Non è possibile votare il proprio piatto
- Il voto può essere cambiato (sovrascrive il precedente)
- I nomi dei cuochi sono nascosti durante la votazione

### Calcolo classifica
- Ordinamento per numero di voti decrescente
- In caso di parità, ordine di inserimento (created_at)
- Percentuale = voti_piatto / totale_voti × 100
- Medaglie: 🥇 1° posto, 🥈 2° posto, 🥉 3° posto

---

## 7. Link di Condivisione

L'admin può generare due link:

| Link | Parametri URL | Comportamento |
|---|---|---|
| **Link partecipanti** | `?code=ABC123&mode=join` | Apre il modal di join pre-compilato con il codice |
| **Link votazione** | `?code=ABC123&mode=vote` | Stesso comportamento (il sistema gestisce la fase) |

Al caricamento dell'app, se sono presenti parametri URL:
1. Carica la gara corrispondente
2. Se esiste una sessione locale valida → chiede re-autenticazione
3. Se non esiste sessione → apre il modal di join pre-compilato

---

## 8. Pannello Admin

### Tab: Piatti
- Lista di tutti i piatti con: foto, nome, nome cuoco (con badge "nascosto ai votanti" in fase voting/finished), ingredienti (anteprima), contatore voti
- Azioni: modifica, elimina
- Pulsante: aggiungi piatto

### Tab: Partecipanti
- Lista partecipanti con: avatar (iniziale del soprannome), soprannome, stato piatto (ha/non ha piatto), stato voto (ha/non ha votato)

### Tab: Classifica
- Disponibile in qualsiasi fase
- Toggle: "Rivela cuochi" — mostra/nasconde il nome del cuoco accanto ad ogni piatto
- Visualizzazione: medaglia, foto thumbnail, nome piatto, (nome cuoco se rivelato), barra progresso, numero voti, percentuale
- Pulsante: "Calcola classifica"

### Tab: Impostazioni
- Codice gara (copiabile)
- Fase corrente
- Contatori: n. piatti, n. voti
- Gestione fasi: pulsanti per cambiare fase (con conferma)
- Reset voti (con conferma — azione irreversibile)
- Copia link partecipanti
- Copia link votazione

---

## 9. Schermata Partecipante

### Tab: Vota
- Banner fase corrente
- Status bar: "hai votato [nome piatto]" / "non hai ancora votato"
- In fase `preparation`: messaggio "votazioni non ancora aperte"
- In fase `voting`: lista piatti votabili
  - Card piatto: foto, nome, "Cuoco misterioso" badge, sezioni espandibili (ingredienti, ricetta, storia, foto)
  - Card proprio piatto: marcata "è il tuo piatto", non votabile
  - Card dopo il voto: piatto votato evidenziato, altri grayed out
- In fase `finished`: messaggio "gara conclusa, vai alla classifica"

### Tab: Piatti (Galleria)
- Griglia 3 colonne, stile rullino fotografico
- Ogni cella: foto quadrata, nome piatto sovrapposto in basso, badge con count foto se >1
- Tap su cella → sheet di dettaglio dal basso con: foto grande, nome, chef (nascosto o rivelato), ingredienti, ricetta, storia, foto extra, pulsante voto (se in fase voting)
- In fase `finished`: mostra nome cuoco con colore evidenziato

### Tab: Classifica
- Disponibile solo in fase `finished`
- Stessa visualizzazione del pannello admin (senza toggle rivelazione — i cuochi sono sempre visibili)
- Prima di `finished`: messaggio "attendi la fine della gara"

### Tab: Il mio piatto
- In fase `preparation`: mostra il piatto con pulsante modifica, oppure pulsante "aggiungi piatto" se non ancora aggiunto
- In fase `voting`: mostra il piatto (sola lettura) + area upload foto extra con messaggio esplicativo
- In fase `finished`: mostra il piatto completo con tutti i dettagli

---

## 10. Home Screen

- Lista "Gare recenti" — gare a cui si è già partecipato (da localStorage), con: nome gara, soprannome, ruolo (admin/partecipante)
- Click su gara recente → modal di re-autenticazione (PIN o password admin)
- Pulsante: "Crea nuova gara"
- Pulsante: "Entra con codice"

---

## 11. API Endpoints (da implementare)

### Competitions
```
POST   /api/competitions              — crea gara
GET    /api/competitions/:code        — carica gara (per codice pubblico)
PATCH  /api/competitions/:id/phase    — cambia fase (solo admin)
DELETE /api/competitions/:id/votes    — reset voti (solo admin)
```

### Participants
```
POST   /api/competitions/:code/join   — join gara (crea o autentica partecipante)
```

### Dishes
```
GET    /api/competitions/:code/dishes        — lista piatti
POST   /api/competitions/:code/dishes        — aggiungi piatto
PATCH  /api/dishes/:id                       — modifica piatto
DELETE /api/dishes/:id                       — elimina piatto (solo admin)
```

### Photos
```
POST   /api/dishes/:id/photos         — upload foto
DELETE /api/photos/:id                — elimina foto
```

### Votes
```
POST   /api/competitions/:code/votes  — vota
GET    /api/competitions/:code/votes  — lista voti (solo admin)
```

---

## 12. Regole di Sicurezza

- Il `chef_name` non viene mai esposto nelle API ai partecipanti durante le fasi `preparation` e `voting`
- Le password e i PIN non vengono mai salvati in chiaro
- L'admin è identificato da un token di sessione separato (non da un record Participant)
- I voti non rivelano chi ha votato chi — solo il conteggio per piatto è pubblico
- Nessun partecipante può modificare o eliminare i piatti degli altri

---

## 13. Funzionalità Non Ancora Implementate (Backlog)

- Real-time sync (WebSocket / polling) — attualmente i dati si aggiornano solo al cambio di tab
- Notifiche push quando le votazioni aprono
- QR code generato in-app per il link di condivisione
- Export classifica (PDF o immagine)
- Ruolo "ospite votante" (vota ma non ha un piatto)
- Timer votazione con countdown
- Limite massimo di partecipanti per gara
- Eliminazione gara
