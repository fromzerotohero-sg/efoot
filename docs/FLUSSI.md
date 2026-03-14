# Controllo flussi — eFootball AI Coach

**Data:** 2026-02-14  
**Scopo:** Mappatura e verifica coerenza dei flussi principali (auth, onboarding, partite, classifica, profilo, palestra coach).

---

## 1. Flusso autenticazione

| Step | Dove | Cosa |
|------|------|-----|
| 1 | `/login` | Form email/password → Supabase Auth signIn |
| 2 | Supabase | Crea sessione, JWT in cookie/storage |
| 3 | Redirect | `router.push('/')` → Dashboard |
| 4 | Pagine protette | `getSession()` → se assente `router.push('/login')` |

**Pagine che controllano sessione:** `page.jsx` (dashboard), `gestione-formazione`, `giocatore/[id]`, `allenatori`, `match/[id]`, `match/new`, `gestione-profilo`, `impostazioni-profilo`, `guida`, `contromisure-pre-partita`, `classifica` (opzionale: può mostrare classifica anche anonimo).

**API:** Tutte le API che scrivono dati usano `extractBearerToken` + `validateToken`; lo user_id viene sempre dal token, mai dal body.

---

## 2. Flusso onboarding (primo utilizzo)

```
Login → Dashboard → (manca rosa/allenatore) → reminder banner
       → Impostazioni profilo (nome, squadra, divisione)
       → Gestione formazione (11 titolari)
       → Allenatori (almeno 1 attivo)
       → (opz.) Palestra Coach / Analisi partite
```

- **Entry:** Dashboard con `hasMissingSetup` (coach assente, partite < 11, analisi non caricata).
- **Link rapidi:** reminder items con `onClick: () => router.push('/allenatori')`, `router.push('/gestione-formazione')`, `setShowGameAnalysisModal(true)`.
- **Salvataggio profilo:** `POST /api/supabase/save-profile` → aggiorna `user_profiles`; dopo save viene ricalcolata classifica (`computeLeaderboardForMonth` + `saveLeaderboardSnapshot`).

---

## 3. Flusso partita (nuova / modifica)

| Step | Dove | API / DB |
|------|------|----------|
| 1 | Dashboard o link | `router.push('/match/new')` o `router.push(\`/match/${id}\`)` |
| 2 | Wizard 5 step | Casa/trasferta, avversario/risultato, statistiche, voti, analisi AI |
| 3 | Upload screenshot | `extract-match-data` (OpenAI Vision) per sezione |
| 4 | Salvataggio | `POST /api/supabase/save-match` o `update-match` |
| 5 | Backend | Scrive `matches`; chiama `calculateTacticalPatterns`; **sia save-match sia update-match** chiamano `updateTasksProgressAfterMatch()` (taskHelper); aggiorna AI Knowledge |

- **Redirect dopo save:** `router.push('/')` (dashboard).

---

## 4. Flusso classifica mensile

| Step | Dove | API / DB |
|------|------|----------|
| 1 | Dashboard o Gestione profilo | Link a `/classifica` o card "Classifica mensile" |
| 2 | Pagina classifica | `GET /api/leaderboard?month=YYYY-MM` con Bearer opzionale |
| 3 | API | **Mese corrente:** sempre `computeLeaderboardForMonth` + `saveLeaderboardSnapshot`, poi risposta da quello. **Mesi passati:** legge `leaderboard_snapshots`; se vuoto usa RPC fallback; se utente loggato non in snapshot → ricalcolo + save. |
| 4 | Risposta | `rankings[]` (rank, nickname, points), `currentUser?`, `daysLeftInMonth` |
| 5 | UI | Lista classificati + "La tua posizione" + dettaglio punti (se loggato) |

**Eleggibilità (in leaderboardHelper):** ≥1 partita completa nel mese, profile_completion_score ≥ 50. Nessun consenso richiesto.

**Quando si ricalcola:** (a) **mese corrente:** ogni GET leaderboard (così la classifica non resta con solo chi aveva il consenso); (b) mesi passati: GET senza snapshot o utente loggato non in snapshot; (c) save profilo (async).

---

## 5. Flusso gestione rosa (formazione)

| Step | Dove | API / DB |
|------|------|----------|
| 1 | Dashboard | `router.push('/gestione-formazione')` |
| 2 | Campo 2D + riserve | Click slot vuoto → AssignModal (Carica foto / Manuale / Scegli riserva) |
| 3 | Upload foto giocatore | `UploadPlayerModal` → estrazione → `save-player` o upload + conferma |
| 4 | Inserimento manuale | `ManualPlayerModal` (slotIndex da selectedSlot o null) → `save-player` con slot_index |
| 5 | Assegnazione riserva a slot | `POST /api/supabase/assign-player-to-slot` |
| 6 | Rimozione da slot | `remove-player-from-slot` |
| 7 | Formazione / tattica | `save-formation-layout`, `save-tactical-settings` |

- **Dettaglio giocatore:** Click su card → `router.push(\`/giocatore/${id}\`)`.

---

## 6. Flusso Palestra Coach (feedback)

| Step | Dove | API / DB |
|------|------|----------|
| 1 | Dashboard | Pulsante "Palestra Coach" → `setShowCoachFeedback(true)` |
| 2 | Modal | `CoachFeedbackChat` (fullscreen) con form profilo + chat |
| 3 | Messaggio chat | `POST /api/coach-feedback-chat` (OpenAI, contesto profilo/ultima partita) |
| 4 | Salva e chiudi | `POST /api/save-coach-feedback` → estrae insight + campi profilo → scrive `user_tactical_feedback` + aggiorna `user_profiles` |

- **Dati letti da:** `user_profiles`, ultima partita (dashboard passa `lastMatch`), `user_tactical_feedback` (per diagnosticBuilder).
- **Scopo unico (blindato):** solo raccolta profilo di gioco e feedback post-partita. Richieste fuori contesto (consigli tattici, formazioni, analisi) → risposta fissa di redirect alla chat principale. Vedi system prompt in `app/api/coach-feedback-chat/route.js`.

---

## 7. Flusso profilo e impostazioni

| Flusso | Pagina | Salvataggio |
|--------|--------|-------------|
| Gestione profilo | `/gestione-profilo` | `save-profile` (profilo, nickname; dopo save evento `leaderboard-updated`) |
| Impostazioni profilo | `/impostazioni-profilo` | `save-profile` (incluso nickname; nessun checkbox consenso classifica) |

- **Link incrociati:** Gestione profilo → link a Classifica, Impostazioni; Guida → link Impostazioni, Formazione.

---

## 8. Flusso contromisure

| Step | Dove | API |
|------|------|-----|
| 1 | Dashboard | "Contromisure pre-partita" → `router.push('/contromisure-pre-partita')` |
| 2 | Upload formazione avversario | `POST /api/extract-formation` → `save-opponent-formation` |
| 3 | Generazione | `POST /api/generate-countermeasures` (OpenAI, JSON strict) |
| 4 | UI | Mostra analisi + suggerimenti (con `pickLang` per bilingue). Suggerimenti giocatori "aggiungi ai titolari" mostrano sempre **chi sostituire** ("Sostituisci X con Y") tramite `replace_player_id` / `replace_player_name` (validati lato API). |

---

## 9. Riepilogo coerenza e sicurezza

| Aspetto | Stato |
|---------|--------|
| Auth: token su API | OK — `validateToken`, user_id sempre da token (eccezione: `/api/credits/accredit` con API key) |
| Redirect no-session | OK — `router.push('/login')` su pagine protette |
| Classifica: eleggibilità | OK — 1 partita + profilo ≥50, nessun consenso |
| Classifica: ricalcolo | OK — mese corrente: ogni GET; mesi passati: snapshot vuoto / utente assente / save profilo |
| Classifica: dati esposti | OK — API restituisce solo rank, nickname, points; pointsBreakdown solo in `currentUser` per utente loggato |
| Rosa: slot vuoto → Manuale | OK — ManualPlayerModal con slotIndex; "Inserimento manuale" anche da UploadPlayerModal |
| Profilo: nickname in classifica | OK — da user_profiles, mostrato in leaderboard |
| Palestra Coach → save feedback | OK — save-coach-feedback scrive feedback + profilo |
| Rate limit leaderboard | OK — 60/min GET leaderboard, 30/min leaderboard/me |
| leaderboard_snapshots | OK dopo migrazione — Rimossa policy SELECT per anon/authenticated con `migrations/restrict_leaderboard_snapshots_rls.sql`; solo service_role (API) può leggere. |

---

## 10. Audit sicurezza / flussi / coerenza (2026-02-14)

### 10.1 Sicurezza
- **API scrittura:** tutte le route che scrivono dati usano `extractBearerToken` + `validateToken`; lo `user_id` è preso da `userData.user.id`, mai dal body. Eccezione intenzionale: `POST /api/credits/accredit` (webhook sito pagamenti) protetto da `CREDITS_ACCREDIT_API_KEY`; il body può contenere `user_id` o `email` per risolvere l’utente da accreditare.
- **Classifica pubblica:** `GET /api/leaderboard` non espone mai `user_id` né `points_breakdown` nella lista; il breakdown è solo in `currentUser` per l’utente loggato.
- **leaderboard_snapshots:** in DB esiste la policy "Allow read leaderboard_snapshots for API" con `qual = true` per SELECT, quindi anon/authenticated possono leggere tutta la tabella (inclusi user_id e points_breakdown). Coerenza: l’API usa service_role e filtra; l’accesso diretto client alla tabella andrebbe evitato. Raccomandazione: rimuovere la policy SELECT per anon/authenticated così solo service_role (API) può leggere; vedi migrazione in `migrations/`.

### 10.2 Flussi
- Flussi §1–§8 allineati al codice: auth, onboarding, partita, classifica (mese corrente sempre ricalcolato), rosa, palestra coach, profilo, contromisure.
- Classifica: mese corrente → ogni GET ricalcola e salva snapshot; mesi passati → lettura snapshot, ricalcolo solo se utente loggato non in snapshot.

### 10.3 Coerenza dati
- Eleggibilità classifica: definita in `lib/leaderboardHelper.js` (≥1 partita completa nel mese, profile_completion_score ≥ 50); nessun filtro su `leaderboard_consent`.
- Snapshot: scritto da API (route leaderboard e save-profile) con service_role; lettura pubblica solo tramite API, non tramite client diretto su `leaderboard_snapshots`.

---

## 11. Riferimenti codice

- Auth: `lib/authHelper.js`, `supabase.auth.getSession()` in app
- Classifica: `app/api/leaderboard/route.js`, `lib/leaderboardHelper.js`, `app/classifica/page.jsx`
- Partita: `app/match/new/page.jsx`, `app/api/supabase/save-match/route.js`, `lib/taskHelper.js`
- Rosa: `app/gestione-formazione/page.jsx`, `app/api/supabase/assign-player-to-slot`, `save-player`, `save-formation-layout`
- Palestra Coach: `components/CoachFeedbackChat.jsx`, `app/api/coach-feedback-chat`, `save-coach-feedback`
- Profilo: `app/gestione-profilo/page.jsx`, `app/impostazioni-profilo/page.jsx`, `app/api/supabase/save-profile/route.js`
- Crediti / webhook: `app/api/credits/accredit/route.js` (auth: `CREDITS_ACCREDIT_API_KEY`)
- Guida: `app/guida/page.jsx`, chiavi i18n `guide*` in `lib/i18n.js`

---

## 12. Guida utente: coerenza con le sezioni

La pagina **Guida** (`/guida`) espone una card per ogni area dell’app. Tabella di allineamento con route e flussi:

| Sezione Guida | Route / Dove | FLUSSI / Coerenza |
|---------------|---------------|-------------------|
| **Dashboard** | `/` | §2 onboarding, §4 classifica (link), §6 Palestra Coach (pulsante), obiettivi, Conoscenza AI |
| **Gestione Formazione** | `/gestione-formazione` | §5 Gestione rosa; slot, riserve, formazione, tattica; link a dettaglio giocatore |
| **Aggiungi Partita** | `/match/new` | §3 Flusso partita; wizard, save-match |
| **Dettaglio Partita** | `/` → da dashboard clic su partita → `/match/[id]` | §3; analisi, riassunto AI, suggerimenti |
| **Dettaglio Giocatore** | `/gestione-formazione` → clic su giocatore → `/giocatore/[id]` | §5; dettaglio da card formazione |
| **Impostazioni Profilo** | `/impostazioni-profilo` | §7; save-profile, dati personali e preferenze |
| **Palestra Coach** | `/` → modal da dashboard | §6; solo profilo di gioco + feedback partita; consigli tattici → chat principale |
| **Contromisure pre-partita** | `/contromisure-pre-partita` | §8; upload formazione avversario, generate-countermeasures (pre-partita) |
| **Allenatori** | `/allenatori` | §2; almeno 1 attivo, estrazione da foto |
| **Classifica** | `/classifica` | §4; eleggibilità ≥1 partita nel mese + profilo ≥50% (nessun consenso) |
| **Gestione Profilo** | `/gestione-profilo` | §7; Hero Points, crediti, transazioni, link classifica |

**Note:** Dettaglio partita e Dettaglio giocatore non hanno pagina diretta `/match` o `/giocatore`; il pulsante "Vai alla pagina" porta a dashboard o gestione formazione; i testi della guida indicano "dalla dashboard/ formazione clicca su...".

Per flussi dettagliati e intersezioni con le tabelle Supabase vedi [FLUSSI_LOGICA_SUPABASE.md](./FLUSSI_LOGICA_SUPABASE.md).
