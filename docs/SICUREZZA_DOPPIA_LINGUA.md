# Sicurezza e doppia lingua (IT/EN)

**Scopo:** Messaggi legati a sicurezza (auth, permessi, sessione) e errori utente coerenti in italiano e inglese, senza esporre dettagli tecnici.

---

## 1. Stato attuale

### 1.1 API (risposte 401 / errori)

- **Maggior parte delle route:** restituiscono messaggi **solo in inglese** hardcoded: `Authentication required`, `Invalid or expired authentication`. Il client mostra `payload.error` così com’è → utente con lingua IT può vedere messaggi in EN.
- **Route con doppia lingua (errore in base a lingua richiesta):**
  - `refresh-diagnostic`: legge `Accept-Language`, risponde con `Autenticazione richiesta.` / `Authentication required.` e imposta header `Content-Language`.
  - `save-ai-info`, `assistant-chat`, `coach-feedback-chat`, `save-coach-feedback`: usano oggetti `{ it, en }` e (dove presente) lingua da header/body.

### 1.2 Frontend (i18n)

- Testi di sicurezza e conferme sono in **doppia lingua** in `lib/i18n.js`: `sessionExpired`, `notAuthenticated`, `confirmDeleteMatch`, `confirmDeletePlayer`, `resetLinkExpired`, `passwordsDoNotMatch`, ecc. (IT + EN).
- Dove il frontend mostra l’errore restituito dall’API (es. dopo `safeJsonResponse` o `response.json().error`), il messaggio è quello grezzo dell’API → se l’API è in EN, l’utente vede EN.

### 1.3 Mappatura errori (errorHelper)

- **mapErrorToUserMessage(error, fallback, lang):** mappa errori tecnici (sessione, quota, rete, RLS, immagine, validazione, ecc.) a messaggi user-friendly.
- **Comportamento:** Se `lang === 'en'` e la mappatura ha `messageEn`, viene restituito il messaggio in inglese; altrimenti italiano.
- **Fix applicato:** Aggiunto `messageEn` a tutte le mappature (QUOTA_EXCEEDED, NETWORK_ERROR, SESSION_EXPIRED, PERMISSION_DENIED, IMAGE_ERROR, DUPLICATE_ERROR, SERVER_ERROR, VALIDATION_ERROR). Estesi i pattern per SESSION_EXPIRED con `authentication required`, `invalid or expired` così gli errori 401 tipici delle API vengono mappati e mostrati nella lingua dell’utente.

### 1.4 Uso di `lang` nei componenti

- **Fix applicato:** Nei componenti che usano `mapErrorToUserMessage` è stato passato il parametro `lang` (da `useTranslation()`) dove mancava: AssistantChat, CoachFeedbackChat, match/new (saveMatchError), gestione-formazione (tutte le chiamate che non lo passavano). Così, anche quando l’API restituisce "Authentication required", l’utente vede "Sessione scaduta. Accedi di nuovo per continuare." (IT) o "Session expired. Log in again to continue." (EN).

---

## 2. Riepilogo modifiche (sicurezza doppia lingua)

| File | Modifica |
|------|----------|
| `lib/errorHelper.js` | Aggiunto `messageEn` a tutte le mappature; pattern SESSION_EXPIRED estesi con `authentication required`, `invalid or expired`. |
| `components/AssistantChat.jsx` | Passaggio di `lang` a `mapErrorToUserMessage(..., lang)`. |
| `components/CoachFeedbackChat.jsx` | Passaggio di `lang` a `mapErrorToUserMessage(..., lang)`. |
| `app/match/new/page.jsx` | Passaggio di `lang` a `mapErrorToUserMessage(err, t('saveMatchError'), lang)`. |
| `app/gestione-formazione/page.jsx` | Passaggio di `lang` a tutte le chiamate `mapErrorToUserMessage` che non lo avevano. |

---

## 3. Raccomandazioni

- **API:** Per uniformare le risposte 401 in IT/EN, le route che oggi restituiscono solo EN possono leggere `Accept-Language` (come `refresh-diagnostic`) e rispondere con il messaggio nella lingua appropriata. Opzionale: risposta sempre in una lingua “standard” (es. EN) e affidare la traduzione al frontend tramite `mapErrorToUserMessage`.
- **Client:** Dove si mostra `errorData.error` o `err.message` dopo una fetch, preferire `mapErrorToUserMessage(error, t('chiaveFallback'), lang)` e mostrare il `message` restituito, così auth/sessione/rete/permessi sono sempre nella lingua dell’utente.
- **AIKnowledgeBar:** Già riconosce sia IT che EN per il redirect login (`sessione scaduta|session expired|invalid or expired|authentication required`).

---

## 4. Riferimenti

- **i18n:** `lib/i18n.js` (chiavi `sessionExpired`, `notAuthenticated`, `confirmDelete*`, `resetLinkExpired`, ecc.).
- **Mappatura errori:** `lib/errorHelper.js` (`mapErrorToUserMessage`).
- **Esempio API con lingua:** `app/api/refresh-diagnostic/route.js` (`getPreferredLanguage(req)` da `Accept-Language`).
