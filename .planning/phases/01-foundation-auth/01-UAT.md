---
status: complete
phase: 01-foundation-auth
source: [01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-04-SUMMARY.md]
started: 2026-02-22T23:50:00Z
updated: 2026-02-23T00:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Home screen loads with dark theme
expected: Sfondo scuro, fiamma animata, titolo "Fornelli in Gara" in Cormorant Garamond con accenti oro, sottotitolo uppercase, texture grain, due CTA in basso
result: pass

### 2. Responsive layout
expected: Su mobile i due CTA sono impilati verticalmente. Su tablet/desktop i CTA sono affiancati. Se ci sono gare recenti, le pill si dispongono su griglia (1 col mobile, 2 col sm, 3 col lg)
result: pass

### 3. Crea nuova gara — flusso completo
expected: Click "Crea nuova gara" → si apre bottom-sheet modal con campi: nome gara, soprannome, PIN (4 cifre). Compilando e inviando → schermata successo con codice 6 caratteri in oro, bottone copia codice, e CTA per andare al pannello admin
result: pass

### 4. Codice copiato negli appunti
expected: Nella schermata successo dopo creazione gara, click su "Copia codice" → il codice viene copiato negli appunti. Verifica con Ctrl+V/Cmd+V in un editor
result: pass

### 5. Entra con codice — nuovo partecipante
expected: Click "Entra con codice" → bottom-sheet con campi: codice gara, soprannome, PIN. Inserendo il codice della gara creata + un soprannome diverso + PIN → navigazione alla schermata voter (placeholder "Voter Panel — coming soon")
result: pass

### 6. Entra con codice — admin password fallback (AUTH-06)
expected: Click "Entra con codice" → inserire il codice gara + un soprannome qualsiasi + la stessa password admin usata per creare la gara → navigazione alla schermata admin (placeholder "Admin Panel — coming soon")
result: issue
reported: "non riesco a replicare mi entra con vista voter, e soprattutto non sarebbe corretta la gestione vorrei che se user e pin non combaciassero il login fallisse non ti torna?"
severity: major

### 7. Sessione recente appare nella home
expected: Tornando alla home (navigazione indietro o ricaricando), la gara appena creata/entrata appare come "pill" sotto "Le tue gare" con nome gara, ruolo (👑 Admin o 👤 Partecipante), e codice
result: pass

### 8. Re-auth da pill sessione
expected: Click su una pill sessione → si apre modal centrata "Rientra nella gara" con info sessione (nome gara, soprannome, ruolo) e campo PIN. Inserendo il PIN corretto → navigazione alla schermata corretta (admin o voter)
result: pass

### 9. PIN errato mostra errore
expected: Nel modal re-auth o join, inserendo un PIN sbagliato → messaggio di errore rosso (ember) sotto il campo PIN. Non si naviga via
result: pass

### 10. Route guard — accesso diretto senza sessione
expected: Navigare manualmente a /#/admin/CODICE o /#/voter/CODICE senza sessione valida → redirect automatico alla home con modal join/re-auth pre-compilata
result: skipped

### 11. Deep link join
expected: Navigare a /#/?code=CODICE&mode=join → la home si apre con JoinCompModal già aperta e codice pre-compilato (uppercase, read-only)
result: pass

## Summary

total: 11
passed: 9
issues: 1
pending: 0
skipped: 1

## Gaps

- truth: "Inserendo la password admin nel campo PIN durante il join, l'utente dovrebbe accedere come admin"
  status: failed
  reason: "User reported: non riesco a replicare mi entra con vista voter, e soprattutto non sarebbe corretta la gestione vorrei che se user e pin non combaciassero il login fallisse"
  severity: major
  test: 6
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
