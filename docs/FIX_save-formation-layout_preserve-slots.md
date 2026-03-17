# Fix: `save-formation-layout` non deve svuotare i titolari per errore

## Contesto

Endpoint: `POST /api/supabase/save-formation-layout`

Comportamento attuale (verificato nel codice):
- Se `preserve_slots` **è presente ed è un array**, libera solo gli slot non preservati.
- Se `preserve_slots` **manca / è null / non è un array**, esegue il “comportamento originale”: **libera tutti i titolari** (slot `0..10`) mettendo `players.slot_index = null`.

Questo introduce un rischio: l’endpoint “salva layout 2D” può accidentalmente causare un **reset completo dei titolari** se viene chiamato senza `preserve_slots`.

Riferimento implementazione:
- `app/api/supabase/save-formation-layout/route.js` (blocco “Gestione cambio formazione intelligente”).

## Problema preciso

Quando `preserve_slots` non viene inviato, il server esegue:

- `UPDATE players SET slot_index = NULL WHERE user_id = X AND slot_index IN (0..10)`

Quindi:
- se nel DB esistono titolari, la formazione può venire “svuotata” con una singola chiamata di salvataggio layout.

Nel flusso UI attuale la pagina `app/gestione-formazione/page.jsx` invia `preserve_slots=[0..10]` quando `titolari.length > 0`, quindi **in condizioni normali** non si osserva.
Ma resta possibile se la route viene chiamata:
- da codice futuro,
- da un client che invia solo `{ formation, slot_positions }`,
- oppure con stato UI temporaneamente desincronizzato.

## Obiettivo del fix

Rendere **impossibile** lo “svuotamento titolari” per chiamate incomplete.

Vincolo: fix **minimo, incrementale**, senza refactor.

## Soluzione proposta (minima, server-side)

### Opzione A (raccomandata): default server a “preserva tutto”

Se `preserve_slots` non è un array valido, impostare automaticamente:

- `preserve_slots = [0,1,2,3,4,5,6,7,8,9,10]`

In questo modo:
- `slotsToFree` è sempre vuoto,
- non viene liberato nessun titolare,
- l’endpoint torna ad essere “safe-by-default”.

#### Patch concettuale

Nel server, subito dopo aver letto il body:

```js
const { formation, slot_positions, preserve_slots } = await req.json()
const preserveSlotsSafe = Array.isArray(preserve_slots)
  ? preserve_slots
  : [0,1,2,3,4,5,6,7,8,9,10]
```

E sostituire `preserve_slots` con `preserveSlotsSafe` nel blocco “Gestione cambio formazione”.

**Nota**: il resto della route (UPSERT di `formation_layout`, sincronizzazione `players.position`) resta invariato.

### Opzione B: richiedere un flag esplicito per “clear starters”

Cambiare semantica:
- `save-formation-layout` **non libera mai** a meno che il client invii esplicitamente `clear_starters: true`.

È più “pulito” semanticamente, ma cambia API contract e richiede aggiornare ogni client.

## Impatto

### Funzionale
- In caso di chiamata senza `preserve_slots`, la route **non** svuoterà più i titolari.
- I flussi esistenti (UI attuale) non cambiano comportamento, perché già mandano `preserve_slots` quando serve.

### Rischi/Trade-off
- Se in futuro si volesse davvero usare `save-formation-layout` per “cambiare modulo” liberando slot non più validi, bisogna continuare a passare `preserve_slots` in modo intenzionale (come già avviene) oppure adottare l’Opzione B.

## Acceptance Criteria

- Chiamata `POST /api/supabase/save-formation-layout` con body `{ formation, slot_positions }` (senza `preserve_slots`) **non** modifica `players.slot_index` per i titolari esistenti.
- Chiamata con `preserve_slots` valido continua a comportarsi come prima.
- Nessun cambiamento al formato salvato in `formation_layout.slot_positions`.

## Test plan (manuale)

1. Preparare un utente con almeno 1 titolare (es. slot 0 e 1 occupati).
2. Chiamare `POST /api/supabase/save-formation-layout` con `preserve_slots` **omesso**:
   - atteso: `players.slot_index` non cambia.
3. Chiamare la stessa route con `preserve_slots: [0..10]`:
   - atteso: `players.slot_index` non cambia.
4. (Facoltativo) Chiamare con `preserve_slots` che esclude alcuni slot:
   - atteso: solo quei slot vengono liberati.

## Rollback

Rollback semplice: ripristinare il comportamento precedente rimuovendo il default server-side.

