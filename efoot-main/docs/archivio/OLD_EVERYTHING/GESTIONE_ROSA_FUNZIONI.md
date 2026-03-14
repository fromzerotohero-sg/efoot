# Gestione Rosa – Documentazione per Funzione

**File**: `app/gestione-formazione/page.jsx`  
**Data**: 2 Febbraio 2026

Ogni sezione documenta una funzione o area del codice. Riferimento esatto per manutenzione e audit.

---

## 1. Fetch e caricamento dati

### `fetchData` (linee ~116-243)
- **Cosa fa**: Carica formazione (`formation_layout`), giocatori (`players`), allenatore attivo (`coaches`), impostazioni tattiche (`team_tactical_settings`).
- **Supabase**: query dirette su tabelle con filtro `user_id`.
- **Output**: Aggiorna stato `layout`, `titolari`, `riserve`, `activeCoach`, `tacticalSettings`.
- **Chiamata**: useEffect iniziale, dopo auth change, dopo salvataggi (assign, remove, delete, save-player, save-formation-layout).

---

## 2. Click e selezione slot

### `handleSlotClick(slotIndex)` (linee ~271-277)
- **Cosa fa**: Al click su uno slot titolare, imposta `selectedSlot` e apre `AssignModal`.
- **Input**: `slotIndex` (0-10).
- **Stato**: `setSelectedSlot`, `setShowAssignModal(true)`.

### `handlePositionChange(slotIndex, newPosition)` (linee ~351-385)
- **Cosa fa**: Aggiorna posizione personalizzata durante drag. Calcola `position` (PT, DC, TD, TS, CC, MED, P, SP, ecc.) da coordinate x,y.
- **Input**: `slotIndex`, `newPosition` { x, y }.
- **Usa**: `calculatePositionFromCoordinates`.
- **Stato**: `setCustomPositions`.

---

## 3. Calcolo posizione da coordinate

### `calculatePositionFromCoordinates(x, y, attackSlots)` (linee ~281-348)
- **Cosa fa**: Mappa coordinate (x: 0-100, y: 0-100) a ruolo eFootball.
- **Logica**: y>80 → PT; y 60-80 → DC/TS/TD; y 40-60 → MED/CC/CLS/CLD/TRQ/AMF; y<40 → P/SP/ESA/EDE/TRQ/CF.
- **attackSlots**: Opzionale, per logica relativa P vs SP quando più attaccanti.

---

## 4. Assegnazione da riserve

### `handleAssignFromReserve(playerId)` (linee ~387-732)
- **Cosa fa**: Assegna un giocatore da riserve a uno slot titolare.
- **Controlli**: Duplicati in campo e in riserve; modal conferma se duplicato.
- **API**: `PATCH /api/supabase/assign-player-to-slot` (player_id, slot_index).
- **Fallback duplicato**: Se confermato, `delete-player` del titolare esistente, poi `assign-player-to-slot`.

---

## 5. Rimozione da slot

### `handleRemoveFromSlot(playerId)` (linee ~596-660)
- **Cosa fa**: Rimuove giocatore dallo slot (torna in riserve).
- **API**: `PATCH /api/supabase/remove-player-from-slot` (player_id).
- **Gestione duplicato**: Se titolare da rimuovere è duplicato di uno in riserve, opzione elimina titolare e riassegna.

---

## 6. Eliminazione giocatori

### `handleDeletePlayer(playerId)` / `handleDeletePlayerConfirm` (unificato)
- **Cosa fa**: Conferma modale e elimina definitivamente giocatore titolare. Usa `handleDeletePlayerConfirm`.

### `handleDeleteReserve(playerId)` (unificato)
- **Cosa fa**: Conferma modale e elimina definitivamente giocatore da riserve. Usa la stessa `handleDeletePlayerConfirm`.
- **API**: `DELETE /api/supabase/delete-player` (player_id). Reset completo modal in entrambi i casi.

---

## 7. Upload foto e estrazione

### `handleUploadPhoto()` (linee ~806-811)
- **Cosa fa**: Chiude AssignModal, apre UploadPlayerModal per lo slot selezionato.

### `checkMissingData(playerData)` (linee ~814-856)
- **Cosa fa**: Verifica campi obbligatori (player_name, overall_rating, position) e opzionali (base_stats, skills, age, ecc.).
- **Output**: `{ required: [], optional: [] }` per MissingDataModal.

### `handleUploadPlayerToSlot()` (linee ~858-1260)
- **Cosa fa**: Invia immagini a `/api/extract-player`, raccoglie dati, gestisce duplicati, salva con `save-player`, assegna con `assign-player-to-slot`.
- **API**: `POST /api/extract-player`, `POST /api/supabase/save-player`, `POST /api/supabase/assign-player-to-slot`.

### `handleManualInput(manualData)` (linee ~1234-1264)
- **Cosa fa**: Completa dati mancanti con input manuale, poi salva.

### `handleRetryUpload()` / `handleSaveAnyway()` (linee ~1266-1278)
- **Cosa fa**: Ritenta upload o salva comunque ignorando dati mancanti opzionali.

---

## 8. Salvataggio layout e tattica

### Salvataggio layout (linee ~1378-1416)
- **Cosa fa**: Salva formazione e posizioni slot (drag & drop).
- **API**: `POST /api/supabase/save-formation-layout` (formation, slot_positions).

### Salvataggio impostazioni tattiche (linee ~1297-1320)
- **Cosa fa**: Salva stile squadra e istruzioni individuali.
- **API**: `POST /api/supabase/save-tactical-settings` (team_playing_style, individual_instructions).

---

## 9. Selezione formazione

### `FormationSelectorModal` + handler (linee ~4119-4670)
- **Cosa fa**: Modal per scegliere formazione (4-3-3, 4-2-3-1, ecc.).
- **API**: `POST /api/supabase/save-formation-layout` con nuova formazione.
- **Upload formazione da screenshot**: `POST /api/extract-formation` → poi `save-formation-layout`.

---

## 10. Componenti

### `SlotCard` (linee ~2744-3003)
- **Props**: slot, onClick, onRemove, isEditMode, onPositionChange, customPosition.
- **Cosa fa**: Card titolare con drag in edit mode, click per aprire AssignModal.

### `ReserveCard` (linee ~3005-3123)
- **Props**: player, onClick, disabled, onDelete.
- **Cosa fa**: Card riserva, click per assegnare, pulsante elimina.

### `AssignModal` (linee ~3125-3806)
- **Props**: slot, currentPlayer, riserve, onAssignFromReserve, onUploadPhoto, onRemove, onDelete, onClose, assigning.
- **Cosa fa**: Modal per assegnare da riserve, upload foto, rimuovere, eliminare.

### `UploadPlayerModal` (linee ~3808-4117)
- **Props**: slot, images, onImagesChange, onUpload, onClose, uploading.
- **Cosa fa**: Upload immagini (card, stats, skills/booster), estrazione, salvataggio.

---

## 11. API utilizzate (riepilogo)

| API | Uso |
|-----|-----|
| `POST /api/extract-formation` | Estrazione formazione da screenshot |
| `POST /api/extract-player` | Estrazione dati giocatore da screenshot |
| `POST /api/supabase/save-formation-layout` | Salva formazione e posizioni |
| `POST /api/supabase/save-player` | Salva/crea giocatore |
| `PATCH /api/supabase/assign-player-to-slot` | Assegna giocatore a slot |
| `PATCH /api/supabase/remove-player-from-slot` | Rimuove da slot |
| `DELETE /api/supabase/delete-player` | Elimina giocatore (body: player_id) |
| `POST /api/supabase/save-tactical-settings` | Salva tattica |
