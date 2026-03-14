# Audit Supabase: allineamento con il codice e tabelle (piene / vuote)

**Data**: 2026-02-08  
**Scopo**: Verificare che il database sia allineato al codice e spiegare a cosa servono le tabelle, incluse quelle vuote che compaiono nella dashboard Supabase.

---

## 1. Allineamento Supabase ↔ codice

**Sì, Supabase è allineato al progetto.** Tutte le tabelle **public** usate dall’app esistono e hanno lo schema atteso. Le migration in `migrations/` corrispondono alle tabelle create (create_*, add_*, fix_*). Non risultano tabelle public usate nel codice e mancanti in DB, né tabelle public in DB senza uso nel codice.

Riepilogo utilizzo:

| Tabella public | Usata da (esempi) |
|----------------|-------------------|
| `user_profiles` | assistant-chat, refresh-diagnostic, ai-knowledge, save-profile, gestione-profilo, taskHelper, analyze-match |
| `formation_layout` | assistant-chat, refresh-diagnostic, page (dashboard), save-formation-layout, assign-player-to-slot, gestione-formazione, generate-countermeasures |
| `players` | assistant-chat, refresh-diagnostic, save-player, assign-player-to-slot, gestione-formazione, analyze-match, aiKnowledgeHelper |
| `playing_styles` | assistant-chat, refresh-diagnostic, save-player, giocatore/[id], generate-countermeasures |
| `matches` | assistant-chat, refresh-diagnostic, save-match, update-match, delete-match, page, match/[id], taskHelper, analyze-match |
| `opponent_formations` | assistant-chat, refresh-diagnostic, save-opponent-formation, update-match, generate-countermeasures |
| `team_tactical_settings` | assistant-chat, refresh-diagnostic, save-tactical-settings, gestione-formazione, analyze-match, generate-countermeasures |
| `coaches` | assistant-chat, refresh-diagnostic, set-active-coach, save-coach, allenatori, update-match, analyze-match |
| `team_tactical_patterns` | assistant-chat, refresh-diagnostic, save-match, update-match, taskHelper, aiKnowledgeHelper, analyze-match, admin/recalculate-patterns |
| `weekly_goals` | tasks/list, taskHelper |
| `user_credit_usage` | creditService (consumo crediti) |
| `credit_transactions` | creditService, taskHelper |
| `player_performance_aggregates` | (trigger/aggregati da partite; lettura da analyze o report se presente) |
| `user_diagnostic_cache` | refresh-diagnostic (scrittura), assistant-chat (lettura) |

---

## 2. Tabelle nello schema **public** (il tuo progetto)

Conteggio righe attuale (indicativo):

| Tabella | Righe (circa) | A cosa serve |
|---------|----------------|--------------|
| `user_profiles` | 8 | Profilo utente (nome, squadra, problemi dichiarati, ai_knowledge_score, ecc.). Una riga per utente. |
| `formation_layout` | 14 | Formazione salvata e disposizione slot (user_id, formation, slot_positions). Una riga per utente. |
| `players` | 127 | Giocatori di tutti gli utenti (rosa). Collegati a user_id e opzionalmente a slot_index. |
| `playing_styles` | 24 | Catalogo stili di gioco (Collante, Opportunista, ecc.). Dati di riferimento, non per utente. |
| `matches` | 38 | Partite giocate (risultato, formazione usata, avversario, voti, ecc.). |
| `opponent_formations` | 91 | Formazioni avversario salvate (nome, stile). Usate nelle partite e in contromisure. |
| `team_tactical_settings` | 5 | Stile squadra (5 valori ammessi) + istruzioni individuali. Una riga per utente. |
| `coaches` | 12 | Allenatori caricati dagli utenti (nome, competenze, connection, stat_boosters). |
| `team_tactical_patterns` | 6 | Pattern tattici (formation_usage, recurring_issues) calcolati da ultime partite. Una riga per utente. |
| `weekly_goals` | 48 | Obiettivi settimanali (task) generati dall’IA. |
| `user_credit_usage` | 10 | Crediti consumati per utente/periodo (YYYY-MM). |
| `credit_transactions` | 57 | Storico transazioni crediti (acquisti e utilizzi). |
| `player_performance_aggregates` | 3 | Aggregati performance per giocatore (ultime 50 partite). Popolati da trigger dopo le partite. |
| `user_diagnostic_cache` | 1 | Cache del riassunto analisi (diagnostic) per la chat. Una riga per utente. |

In **public** non ci sono tabelle con 0 righe: sono tutte usate e con dati (o pronte a riceverne quando gli utenti le compilano).

### 2.1 Dove finiscono ruolo e stile (Collante, Opportunista, ecc.) – "sottotabelle"

I dati dei giocatori sono salvati nel posto giusto e le relazioni sono rispettate:

- **`playing_styles`** (catalogo): contiene i nomi degli stili (Collante, Opportunista, Regista creativo, Onnipresente, Giocatore chiave, Terzino offensivo, ecc.). È la **sottotabella di riferimento**: non è "sotto" a `players`, ma è la tabella a cui `players` si collega.
- **`players.playing_style_id`** (FK): deve puntare a `playing_styles.id`. L'app (save-player) risolve il nome stile (da `playing_style` **o** da `role` nel payload) con un lookup su `playing_styles` e salva qui l'id. Diagnostic, chat e contromisure usano questo FK per JOIN e filtri.
- **`players.role`** (testo): può contenere il "ruolo" mostrato in game (spesso uguale allo stile, es. "Collante"). Viene salvato così com'è inviato dal client; l'API inoltre, se riceve solo `role` (es. "Collante") e non `playing_style`, usa `role` per fare il lookup e compilare **anche** `playing_style_id`, così le informazioni restano allineate.

Quindi: **Collante** (e gli altri stili) vanno sia in **`players.role`** (testo per visualizzazione) sia in **`players.playing_style_id`** (FK a `playing_styles`) quando il nome corrisponde a una riga del catalogo. Le "sottotabelle" sono proprio questa relazione: `players` → `playing_styles` tramite `playing_style_id`. Nessun dato va in tabelle sbagliate.

---

## 3. Tabelle che vedi “vuote” (0 righe) – altri schemi

Nella dashboard Supabase compaiono anche schemi diversi da **public**. Molte tabelle lì sono **di sistema** o **opzionali**: restano vuote finché non usi quella funzionalità.

### 3.1 Schema **auth** (Supabase Auth)

Gestione login, sessioni, token. Quelle con 0 righe sono normali se non usi quella feature:

| Tabella | Righe | A cosa serve |
|---------|--------|--------------|
| `users` | 57 | Utenti registrati (email, password hash). **Usata**: sì, è il cuore dell’auth. |
| `sessions` | 125 | Sessioni attive. **Usata**: sì. |
| `refresh_tokens` | 232 | Token per rinnovare la sessione. **Usata**: sì. |
| `identities` | 13 | Identity provider (email, OAuth, ecc.). **Usata**: sì se usi login social. |
| `instances` | 0 | Multi-tenant (più istanze auth). Vuota = un solo progetto, **normale**. |
| `mfa_factors` | 0 | Fattori MFA (2FA). Vuota = non usi MFA. **Normale**. |
| `mfa_challenges` | 0 | Challenge MFA. Vuota se non usi MFA. **Normale**. |
| `sso_providers` | 0 | Provider SSO (Single Sign-On). Vuota = non usi SSO. **Normale**. |
| `sso_domains` | 0 | Domini associati a SSO. Vuota se non usi SSO. **Normale**. |
| `saml_providers` | 0 | Provider SAML. Vuota = non usi SAML. **Normale**. |
| `saml_relay_states` | 0 | Stati relay SAML. Vuota se non usi SAML. **Normale**. |
| `flow_state` | 0 | Stato flussi OAuth/SSO. Vuota se non usi OAuth/SSO. **Normale**. |
| `one_time_tokens` | 0 | Token usa-e-getta (conferma email, recovery). Vuota se nessuna richiesta in corso. **Normale**. |
| `oauth_clients` | 0 | Client OAuth (Supabase come OAuth server). Vuota = non usi OAuth. **Normale**. |
| `oauth_authorizations` | 0 | Autorizzazioni OAuth. Vuota se non usi OAuth. **Normale**. |
| `oauth_consents` | 0 | Consensi OAuth. Vuota se non usi OAuth. **Normale**. |
| `oauth_client_states` | 0 | Stati client OAuth. Vuota se non usi OAuth. **Normale**. |

**Conclusione auth**: le tabelle vuote sono per MFA, SSO, SAML, OAuth. Se fai solo login email/password, è normale che siano a 0. Non vanno eliminate.

### 3.2 Schema **storage**

File e bucket. Vuote = nessun upload con quella funzionalità:

| Tabella | Righe | A cosa serve |
|---------|--------|--------------|
| `buckets` | 1 | Definizione bucket (es. per upload screenshot). **Usata**: sì se usi Storage. |
| `objects` | 11 | File caricati. **Usata**: sì. |
| `s3_multipart_uploads` | 0 | Upload S3 multipart (file grandi). Vuota = non usi upload S3 multipart. **Normale**. |
| `s3_multipart_uploads_parts` | 0 | Parti degli upload multipart. Vuota come sopra. **Normale**. |
| `buckets_analytics` | 0 | Bucket per analytics. Vuota = non usi storage analytics. **Normale**. |
| `buckets_vectors` | 0 | Bucket per vettori (embedding). Vuota = non usi vector search. **Normale**. |
| `vector_indexes` | 0 | Indici vettoriali. Vuota se non usi vector. **Normale**. |

**Conclusione storage**: le tabelle vuote sono per upload S3 multipart e per funzionalità avanzate (analytics/vector). Non servono per l’app attuale.

### 3.3 Schema **realtime**

Supabase Realtime (subscription su cambi DB):

| Tabella | Righe | A cosa serve |
|---------|--------|--------------|
| `subscription` | 0 | Iscrizioni attive a canali realtime. Vuota = nessuna subscription realtime dall’app. **Normale**. |
| `messages` | 0 | Messaggi realtime. Vuota se non usi broadcast. **Normale**. |

**Conclusione realtime**: vuote se l’app non usa Realtime (subscription o broadcast). Normale.

### 3.4 Schema **vault**

Crittografia segreti (estensione optional):

| Tabella | Righe | A cosa serve |
|---------|--------|--------------|
| `secrets` | 0 | Segreti cifrati. Vuota = non usi Vault per salvare segreti in DB. **Normale**. |

**Conclusione vault**: opzionale; spesso non usato. Vuota è normale.

---

## 4. Quando si popolano le tabelle vuote (e perché servono)

Per ogni tabella che oggi vedi vuota: **quando** prende righe, **perché** succede e **a cosa serve**.

### 4.1 Auth – quando e perché si popolano

| Tabella | Quando si popola | Perché | A cosa serve |
|--------|-------------------|--------|---------------|
| **instances** | Mai, in progetti singoli | Contiene le “istanze” quando Supabase Auth è usato in modalità multi-tenant (più app/tenant sullo stesso progetto). Un solo progetto = una sola “istanza” logica, spesso non mappata qui. | Separare utenti per istanza in scenari multi-tenant. |
| **mfa_factors** | Quando un utente attiva la 2FA | L’utente va in “Sicurezza” (o simile) e aggiunge un secondo fattore (es. app authenticator o chiave hardware). Supabase scrive una riga per ogni fattore registrato. | Sapere quali fattori MFA ha ogni utente (TOTP, WebAuthn, telefono). |
| **mfa_challenges** | Durante la verifica 2FA | A ogni login con 2FA, Auth crea una “challenge” (codice da inserire, tap su chiave, ecc.). Dopo la verifica la riga può essere aggiornata o non più usata. | Gestire il flusso “dimostra di possedere il fattore” senza riusare codici. |
| **sso_providers** | Quando configuri un provider SSO in dashboard | In Supabase Dashboard → Authentication → Providers aggiungi un IdP (es. Okta, Azure AD) e abiliti SSO. Una riga = un provider. | Elenco dei provider SSO disponibili per il progetto. |
| **sso_domains** | Quando associ un dominio a un provider SSO | Dopo aver creato un SSO provider, associ un dominio email (es. `@azienda.com`) a quel provider. Una riga per dominio. | Per login: “email @azienda.com → usa questo IdP”. |
| **saml_providers** | Quando configuri SAML in dashboard | Abiliti l’integrazione SAML (Single Sign-On enterprise) e inserisci metadata XML dell’IdP. Una riga per IdP SAML. | Configurazione tecnica del collegamento SAML (entity ID, metadata, mapping). |
| **saml_relay_states** | Durante un login SAML in corso | L’utente clicca “Login con SAML”: si crea uno “stato” temporaneo (a chi restituire il risultato, redirect, ecc.). Si pulisce dopo il login. | Evitare attacchi e gestire il redirect corretto dopo la risposta dell’IdP. |
| **flow_state** | Durante login OAuth/SSO/magic link | Ogni flusso di login (OAuth, magic link, recovery password) crea uno stato temporaneo (code challenge, token, a dove tornare). Si elimina quando il flusso termina. | Tenere il contesto del login “in corso” tra un redirect e l’altro. |
| **one_time_tokens** | Quando qualcuno richiede recovery/conferma email | L’utente clicca “Recupera password” o “Conferma email”: Auth genera un token usa-e-getta e lo salva qui (o in tabella analoga). Dopo l’uso scade. | Token sicuri a uso singolo per link “conferma” o “reimposta password”. Può essere vuota se i token scadono e vengono puliti. |
| **oauth_clients** | Quando registri un client OAuth (raro) | Se usi Supabase come server OAuth (altre app che fanno login tramite il tuo progetto), registri un “client” (client_id, redirect_uri). Una riga per client. | Elenco delle app esterne autorizzate a usare il tuo Auth come OAuth. |
| **oauth_authorizations** | Quando un utente autorizza un client OAuth | L’utente vede “L’app X chiede accesso” e clicca “Autorizza”. Auth salva l’autorizzazione (user, client, scope). | Ricordare “questo utente ha detto sì a questo client” per non chiedere ogni volta. |
| **oauth_consents** | Stesso contesto di oauth_authorizations | Memorizza i consensi (scope concessi, data). Spesso usata insieme a oauth_authorizations. | Storico/revoca consensi OAuth. |
| **oauth_client_states** | Durante flusso OAuth in corso | Stato temporaneo (code_verifier, ecc.) durante la richiesta di autorizzazione OAuth. Si pulisce a fine flusso. | Sicurezza del flusso OAuth (PKCE, stato anti-CSRF). |

In sintesi: **auth** si popola quando attivi o usi **MFA**, **SSO/SAML** o **OAuth**. Con solo email/password queste restano vuote e va bene.

---

### 4.2 Storage – quando e perché si popolano

| Tabella | Quando si popola | Perché | A cosa serve |
|--------|-------------------|--------|---------------|
| **s3_multipart_uploads** | Quando inizi un upload di un file molto grande (S3 multipart) | Supabase Storage può spezzare file grandi in “parti” (multipart). Quando inizi un upload di questo tipo, viene creata una riga per quell’upload. | Tenere traccia dell’upload in corso (bucket, key, dimensione, firma). |
| **s3_multipart_uploads_parts** | Mentre carichi le “parti” del file | Ogni “parte” del file caricata (es. chunk da 5 MB) genera una riga. A upload completato le parti sono associate all’upload e poi il file finale viene assemblato. | Memorizzare le parti caricate (numero, etag, dimensione) per completare l’upload. |
| **buckets_analytics** | Quando crei un bucket di tipo “analytics” | In Dashboard → Storage puoi creare bucket speciali per analytics (log, metriche). Una riga per bucket analytics. | Configurazione bucket dedicati ad analytics su Storage. |
| **buckets_vectors** | Quando crei un bucket per vettori (embedding) | Se abiliti la funzionalità “vector” su Storage (file che contengono embedding per ricerche semantiche). Una riga per bucket vettoriale. | Bucket per dati vettoriali (es. embedding per ricerca semantica). |
| **vector_indexes** | Quando crei un indice su un bucket vettoriale | Dopo aver creato un bucket_vectors, crei un indice (dimensione vettore, metrica di distanza). Una riga per indice. | Definire come si fa la ricerca per similarità sui vettori. |

In sintesi: **storage** “vuote” si popolano se usi **upload multipart** (file molto grandi), **bucket analytics** o **vector storage**. Con upload normali (es. screenshot) usi solo `buckets` e `objects`.

---

### 4.3 Realtime – quando e perché si popolano

| Tabella | Quando si popola | Perché | A cosa serve |
|--------|-------------------|--------|---------------|
| **subscription** | Quando un client si iscrive a un canale Realtime | Nel frontend fai `supabase.channel('x').on('postgres_changes', ...).subscribe()`. Supabase registra quella subscription (canale, filtri, utente). Una riga per subscription attiva. | Sapere chi sta ascoltando quali tabelle/eventi per inviare solo gli aggiornamenti giusti. |
| **messages** | Quando usi “broadcast” o “presence” con messaggi | Se usi Realtime per messaggi custom (chat, notifiche in tempo reale) o presence, i messaggi possono transitare da qui. | Messaggi broadcast o presence tra client (es. “chi è online”, chat). |

In sintesi: **realtime** si popola quando l’app usa **Realtime** (subscription a cambi DB o canali custom). Se non chiami `.channel(...).subscribe()` e non usi broadcast/presence, restano vuote.

---

### 4.4 Vault – quando e perché si popola

| Tabella | Quando si popola | Perché | A cosa serve |
|--------|-------------------|--------|---------------|
| **secrets** | Quando salvi un segreto cifrato via Vault | Usi l’estensione/API Vault per salvare un segreto (API key, token) cifrato in DB. Una riga = un segreto (nome, valore cifrato). | Tenere segreti in DB in forma cifrata invece che in variabili d’ambiente. |

In sintesi: **vault** si popola solo se decidi di **salvare segreti in DB** con Vault. La maggior parte delle app usa solo env (es. `SUPABASE_SERVICE_ROLE_KEY`) e non tocca vault.

---

## 5. Riepilogo

- **Allineamento**: il progetto è allineato a Supabase. Le tabelle **public** usate nel codice esistono e sono popolate (o pronte a esserlo).
- **Tabelle “vuote” che vedi**:
  - In **public**: nessuna a 0 righe.
  - In **auth**: tabelle a 0 righe sono per MFA, SSO, SAML, OAuth; normali se usi solo email/password.
  - In **storage**: tabelle a 0 righe sono per S3 multipart, analytics e vector; normali se non le usi.
  - In **realtime** e **vault**: vuote se non usi Realtime o Vault.

Non è necessario eliminare queste tabelle: fanno parte della piattaforma Supabase e restano vuote finché non abiliti o usi quella funzionalità.
