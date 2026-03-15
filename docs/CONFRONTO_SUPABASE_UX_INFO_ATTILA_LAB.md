# Confronto Supabase vs UX — profilo info@attila-lab.net

Riferimento: dati in Supabase (query 14–15 marzo 2026) vs schermate UX inviate (15 marzo 2026).

---

## Dati in Supabase (user_profiles)

| Campo | Valore in DB |
|-------|----------------|
| **user_id** | 8225774a-c2ae-47ed-80fc-37bba56bd0bf |
| **first_name** | baschirotto |
| **last_name** | null |
| **current_division** | null |
| **favorite_team** | null |
| **team_name** | null |
| **ai_name** | JDrive |
| **profile_completion_score** | 25.00 |
| **initial_division** | Division 9 |
| **connection_quality** | good |
| **pass_level** | pa1 |
| **smart_assist** | no |
| **platform** | console |
| **is_metalgate_user** | true |
| **metalgate_user_id** | a601f5d5-6e76-429b-8d19-05e485a2187b |

---

## Confronto con le tre schermate UX

### 1. Sezione "Dati Personali" (Profilazione + Nome/Cognome)

| Campo UX | Valore atteso (da DB) | Valore visto in UX | Esito |
|----------|------------------------|---------------------|--------|
| **Nome** | baschirotto | **JDrive** | ❌ Non allineato |
| **Cognome** | (vuoto) | (vuoto / placeholder) | ✅ OK |
| **Barra completamento** | 25% | 25% | ✅ OK |

- **Problema:** Il campo **Nome** mostra "JDrive" (che in DB è **ai_name**), non "baschirotto" (**first_name**).  
  In codice il campo Nome è legato a `profile.first_name`. Quindi o:
  - l’API sta restituendo un profilo diverso (es. altro `user_id` per token/sessione), oppure
  - in quella sessione il backend ha restituito `first_name` errato (es. stesso valore di `ai_name`).

### 2. Sezione "Dati Gioco" (Divisione, Squadra del cuore, Nome squadra)

| Campo UX | Valore atteso (da DB) | Valore visto in UX | Esito |
|----------|------------------------|---------------------|--------|
| Divisione attuale | (vuoto) | Seleziona divisione / vuoto | ✅ OK |
| Squadra del cuore | (vuoto) | (vuoto) | ✅ OK |
| Nome squadra nel gioco | (vuoto) | (vuoto) | ✅ OK |

Tutto coerente con DB (tutti null/vuoti).

### 3. Sezione "Il mio profilo di gioco" (Palestra Coach — dati tecnici)

| Campo UX | Valore atteso (da DB) | Valore visto in UX | Esito |
|----------|------------------------|---------------------|--------|
| Piattaforma | console | **–** | ❌ Non mostrato |
| Connessione | good (Buona) | **–** | ❌ Non mostrato |
| Passaggi | pa1 | **–** | ❌ Non mostrato |
| Smart Assist | no | **–** | ❌ Non mostrato |
| Input delay | (null) | – | ⚠️ Coerente (null) |
| Punto debole | (null) | – | ⚠️ Coerente (null) |
| Divisione | (null) | placeholder "es. Div 3" | ✅ OK |
| Ore/sett | (null) | 0 | ⚠️ Default |
| Cosa vuoi imparare? / Note IA | (vuoti) | (vuoti) | ✅ OK |

- **Problema:** I campi **Piattaforma, Connessione, Passaggi, Smart Assist** in DB sono valorizzati (console, good, pa1, no) ma in UX compaiono come "–".  
  La Palestra Coach riceve `userProfile={profileData}` dalla pagina profilo e inizializza i select con questi valori; le opzioni (Console, Buona, PA1, No) ci sono. Quindi o:
  - `profileData` in quel momento è null o non ancora caricato (es. apertura Coach prima del caricamento profilo), oppure
  - l’API per questo utente non sta restituendo quel profilo (stesso dubbio token/identità del punto 1).

---

## Riepilogo

| Aspetto | Stato |
|--------|--------|
| Nome in "Dati Personali" | UX mostra **JDrive** invece di **baschirotto** → possibile profilo sbagliato o risposta API errata |
| Cognome, % completamento | Allineati |
| Dati Gioco (divisione, squadre) | Allineati (tutti vuoti) |
| Dati tecnici in Palestra Coach | UX mostra **–** invece di Console, Buona, PA1, No → stesso profilo non caricato o identità errata |

---

## Cosa verificare (debug)

1. **Network:** Per `GET /api/user/profile` controllare il **body della risposta**: `first_name`, `ai_name`, `platform`, `connection_quality`, `pass_level`. Se lì compaiono "baschirotto", "JDrive", "console", "good", "pa1" ma in UX no → bug frontend. Se il body ha altri valori o un altro profilo → problema di identità (token / MetalGate / user_id).
2. **Sessione:** Confermare di essere loggati come **info@attila-lab.net** (stesso browser/sessione delle schermate) e che `localStorage` abbia `metalgate_user` e `auth_token` coerenti con quell’account.
3. **Palestra Coach:** Aprire la Palestra Coach **dopo** che la pagina Profilo ha finito di caricare (e magari dopo un "Ricarica profilo") e controllare di nuovo se i dropdown mostrano Console, Buona, PA1, No.

---

*Documento creato il 15 marzo 2026.*
