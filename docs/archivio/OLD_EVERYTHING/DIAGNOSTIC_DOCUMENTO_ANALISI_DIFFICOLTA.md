# Documento di analisi cliente: dati, flussi e difficoltà

**Implementazione**: completata. Vedi `IMPLEMENTAZIONE_DIAGNOSTIC_CHAT.md`, `CONTROLLO_E2E_DIAGNOSTIC_CHAT.md`.  
**Schema DB verificato**: 2026-02 (tabelle public: matches, team_tactical_patterns, players, user_diagnostic_cache, ecc.).

Obiettivo: capire nel dettaglio **quali dati abbiamo**, **quando cambiano**, e **quali difficoltà** incontriamo se introduciamo un "documento che analizza rosa, partite, andamento, difficoltà, sinergie" e poi la chat ragiona su quello + la domanda.

---

## 1. Dati disponibili oggi

### 1.1 Rosa e formazione
- **players**: nome, position, slot_index (titolare/riserva), overall_rating, base_stats (vel/acc/res/fin/pas/tac…), skills, com_skills, form, height, weight, original_positions (competenze), playing_style_id.
- **formation_layout**: formation (es. "4-3-3"), slot_positions.
- **team_tactical_settings**: team_playing_style, individual_instructions.

**Quando cambiano**: aggiunta/rimozione giocatore, assign-player-to-slot, remove-player, save-formation-layout, save-tactical-settings.

### 1.2 Partite
- **matches**: match_date, opponent_name, result, formation_played, playing_style_played, opponent_formation_id, player_ratings (cliente/avversario: rating, goals, assists…), **team_stats** (JSONB), **attack_areas** (JSONB), ball_recovery_zones, goals_events, formation_discrepancies, players_in_match, data_completeness.

**team_stats** (per singola partita) può contenere, se estratti: possession, shots, shots_on_target, passes, **successful_passes**, **interceptions**, tackles, crosses, saves, fouls, corner_kicks, goals_scored, goals_conceded (vedi `extract-match-data` normalizeTeamStats).

**Quando cambiano**: save-match (nuova partita), update-match (aggiunta foto / aggiornamento sezioni). Dopo save/update viene chiamato `calculateTacticalPatterns`.

### 1.3 Pattern tattici (aggregati squadra)
- **team_tactical_patterns** (una riga per user_id):
  - **formation_usage**: { "4-3-3": { matches, wins, losses, draws, win_rate }, … } — **popolato** da calculateTacticalPatterns.
  - **playing_style_usage**: stesso schema per stile — **popolato**.
  - **recurring_issues**: array problemi ricorrenti — **oggi vuoto** (commento: "può essere implementato in futuro con analisi AI").
  - Colonne **avg_possession**, **avg_pass_accuracy**, **avg_shots**, **attack_areas_avg**, **recovery_zones_avg**, ecc. esistono in tabella ma **non sono scritte** dal flusso save-match/update-match (solo formation_usage, playing_style_usage, recurring_issues).

Quindi: **andamento per formazione/stile** (e win rate) c’è; **medie statistiche squadra** (passaggi riusciti, intercettazioni, possesso) sono nelle singole partite (team_stats) ma non aggregate in team_tactical_patterns dal flusso attuale.

### 1.4 Performance giocatori (aggregati)
- **player_performance_aggregates**: per player_id, average_rating, total_goals, total_assists, rating_trend (ultimi voti), position_performance, last_50_matches_count, ecc. Aggiornati da trigger o job dopo le partite (da verificare dove viene popolata questa tabella).

### 1.5 Allenatore e profilo
- **coaches** (attivo): coach_name, playing_style_competence.
- **user_profiles**: common_problems, how_to_remember, team_name, ai_name, profile_completion_score, **ai_knowledge_score**, **ai_knowledge_breakdown**.

**Quando cambiano**: save-coach, set-active-coach, save-profile. Dopo save-profile viene aggiornato AI Knowledge.

---

## 2. Eventi che invalidano “l’idea” del cliente

Se il documento di analisi è una **cache** (generato una volta e riusato), deve essere rigenerato quando cambia qualcosa che lo compone. Eventi rilevanti:

| Evento | Cosa cambia | Impatto sul documento |
|--------|-------------|------------------------|
| Aggiunta/rimozione giocatore, cambio slot, cambio formazione | Rosa, titolari, riserve | Sezione rosa e formazione nel doc è obsoleta. |
| save-formation-layout, save-tactical-settings | Formazione, stile squadra, istruzioni | Sezione tattica/forma nel doc è obsoleta. |
| save-match, update-match | Nuova partita o dati partita (team_stats, voti, attack_areas) | Pattern (formation_usage, playing_style_usage) vengono ricalcolati; eventuali medie passaggi/intercettazioni andrebbero ricalcolate. recurring_issues oggi non viene popolato qui. |
| save-coach, set-active-coach | Allenatore attivo, competenze stili | Sezione allenatore/sinergie nel doc è obsoleta. |
| save-profile | common_problems, nome, ecc. | Sezione profilo/problemi nel doc è obsoleta. |

**Conclusione**: qualsiasi modifica a rosa, formazione, tattica, partite, allenatore, profilo rende il documento **potenzialmente obsoleto** fino a rigenerazione.

---

## 2.1 Simplificazione: refresh su richiesta (tasto + rate limit)

Invece di invalidare il documento da ogni route (save-match, save-player, formazione, coach, profilo), si può fare così:

- **Tasto in UI**: il cliente ha un pulsante tipo **"Aggiorna analisi"** / **"Aggiorna conoscenza"** (es. in dashboard vicino alla barra Conoscenza AI o nella chat). Quando ha aggiornato qualcosa (rosa, partita, allenatore, tattica), clicca il tasto.
- **Backend**: la chiamata (es. `POST /api/refresh-diagnostic` o simile) fa un **check** (legge rosa, partite, pattern, coach, profilo da DB), **ricalcola** il documento di analisi e lo salva in cache (tabella o user_profiles). La chat userà sempre l’ultima versione cachata.
- **Rate limit stringente**: es. **max 2 richieste al minuto** per utente. Se il cliente clicca una terza volta entro il minuto:
  - **HTTP 429** (Too Many Requests) e **alert in UI**: *"Puoi aggiornare l’analisi al massimo 2 volte al minuto. Riprova tra X secondi."* (con X = secondi mancanti al reset della finestra).
- **Vantaggi**: niente hook di invalidazione in save-match, save-player, save-formation, ecc.; un solo punto di ingresso; il limite protegge da abuso e da costi eccessivi (se il refresh è pesante); l’utente ha un feedback chiaro su quando può aggiornare di nuovo.

**Dettaglio rate limit**: finestra sliding o fixed di 1 minuto, max 2 chiamate per user_id. All’avvio della finestra (o ogni minuto) il contatore si resetta. In risposta 429 si può includere `Retry-After: <secondi>` e in body un messaggio localizzato (IT/EN) per l’alert.

---

## 3. Difficoltà 1: quando rigenerare (solo se NON si usa il tasto)

Se non si adotta il **tasto + rate limit** (§2.1), le opzioni sotto restano rilevanti. Con il tasto, la rigenerazione avviene **solo** quando il cliente clicca (entro il rate limit).

- **Opzione A – A ogni messaggio chat**: si legge sempre da DB (rosa, partite, pattern, coach, …) e si costruisce il documento al volo. Pro: sempre aggiornato. Contro: latenza e carico per ogni messaggio; logica di “analisi” (sintesi, difficoltà, sinergie) deve essere veloce (solo regole) o si aggiunge una chiamata AI ogni volta (costo/latenza).
- **Opzione B – Cache + invalidazione**: il documento viene generato (e magari cachato in DB o in memoria per user_id) e **invalidato** ad ogni evento della tabella sopra. Alla prima chat dopo un evento si rigenera. Pro: meno calcolo per messaggio. Contro: serve un meccanismo di invalidazione affidabile (tutte le route che toccano rosa/partite/coach/profile devono segnare “diagnostic stale” o ricalcolare).
- **Opzione C – Cache con TTL**: il documento è valido per X minuti (es. 5). Dopo X minuti si rigenera al prossimo messaggio. Pro: semplice. Contro: se l’utente cambia rosa e subito dopo chiede in chat, può vedere ancora il vecchio documento per fino a X minuti (accettabile se X è basso).
- **Opzione D – Ibrido**: invalidazione esplicita su eventi “forti” (nuova partita, cambio formazione/rosa, cambio allenatore) + TTL corto (es. 2–5 min) per catturare altri casi. Richiede che le route chiamino una funzione “invalida diagnostic per user_id” o “ricalcola diagnostic”.

**Raccomandazione**: almeno **invalidazione esplicita** sugli eventi che già avete (save-match, update-match, save-player, assign/remove, save-formation-layout, save-tactical-settings, save-coach, set-active-coach, save-profile). Se non volete toccare tutte le route subito, un **TTL corto** (es. 5 min) riduce il rischio di risposte su dati vecchi.

---

## 4. Difficoltà 2: aggiornamento rosa / cambio qualcosa

- **Problema**: l’utente aggiunge un giocatore, toglie un titolare, cambia modulo. Se il documento è in cache, fino a rigenerazione la chat “crede” ancora alla rosa/modulo vecchi e può consigliare nomi non più in rosa o formazioni diverse da quella attuale.
- **Mitigazione**:
  - **Invalidazione**: ogni route che modifica players, formation_layout, team_tactical_settings deve invalidare (o ricalcolare) il documento per quel user_id.
  - **Fallback in prompt**: anche se usate il documento, potete continuare a passare in prompt “solo nomi in ROSA” e “formazione attuale: X” come fatto oggi (da buildPersonalContext). Così il modello ha almeno il dato “fresco” di formazione/rosa se lo leggete al volo da DB, e il documento dà il “quadro” (andamento, difficoltà, sinergie). In alternativa il documento va rigenerato prima della risposta quando si rileva “diagnostic stale”.

---

## 5. Difficoltà 3: partite nuove, andamento e statistiche (passaggi, intercettazioni)

- **Partite nuove**: a ogni save-match/update-match viene già chiamato `calculateTacticalPatterns`, che ricalcola **formation_usage** e **playing_style_usage** sulle ultime 50 partite. Quindi **andamento per formazione/stile** (e win rate) è aggiornato. Il documento di analisi può leggere team_tactical_patterns e includere “Formazione più usata: 4-3-3 (N partite, X% vittorie)” ecc.
- **Statistiche per partita**: in **matches.team_stats** avete già, quando l’estrazione le fornisce: possession, shots, **successful_passes**, **interceptions**, tackles, crosses, saves, ecc. (normalizeTeamStats in extract-match-data).
- **Statistiche aggregate squadra**: le colonne **avg_possession**, **avg_pass_accuracy**, **avg_shots** in **team_tactical_patterns** **non** sono popolate dal flusso attuale. Quindi:
  - **Opzione 1** – Per il documento di analisi: calcolare le medie **al volo** dalle ultime N partite (SELECT team_stats da matches) quando si costruisce il documento. Così “passaggi riusciti in media”, “intercettazioni” ecc. entrano nel documento senza cambiare save-match.
  - **Opzione 2** – Estendere `calculateTacticalPatterns` (e l’upsert su team_tactical_patterns) per aggregare team_stats delle ultime 50 partite e scrivere avg_possession, avg_pass_accuracy, avg_shots, e eventualmente altre medie (interceptions, tackles). Poi il documento legge direttamente da team_tactical_patterns.

**Nuove statistiche in futuro** (es. un nuovo campo “duelli vinti” nell’estrazione): (i) estendere normalizeTeamStats e lo schema/salvataggio in matches.team_stats; (ii) se usate aggregati in team_tactical_patterns, aggiungere la colonna e la logica in calculateTacticalPatterns; (iii) estendere il template del documento di analisi per citare quella stat quando presente. Il flusso “partita → team_stats → aggregato (opzionale) → documento” resta lo stesso.

---

## 6. Difficoltà 4: difficoltà ricorrenti (recurring_issues)

- **Stato attuale**: `recurring_issues` in team_tactical_patterns è **sempre vuoto** (array vuoto) in save-match e update-match (“può essere implementato in futuro con analisi AI”).
- **Dove potrebbero arrivare**:
  - **analyze-match**: l’analisi AI della partita potrebbe produrre “problemi” (es. fasce scoperte, attacco sterile). Oggi non sembra che analyze-match scriva in team_tactical_patterns.recurring_issues; andrebbe aggiunto un passo che aggrega le uscite di analyze-match (o un job periodico) e fa upsert di recurring_issues.
  - **Job dedicato**: un processo che legge le ultime partite (e magari i summary/ai_summary) e con una chiamata AI o con regole inferisce recurring_issues e fa upsert.
- **Per il documento di analisi**: se recurring_issues resta vuoto, il documento non può “ragionare sulle sue difficoltà” se non inferendole da altri dati (es. attack_areas medie, formation_usage dove perde di più). Se in futuro popolate recurring_issues, il documento le includerà; altrimenti la sezione “difficoltà” del documento andrà costruita con euristiche (es. “perde spesso con 4-3-3 quando attack_areas wide”) finché non avete l’AI che le scrive.

---

## 7. Difficoltà 5: dati parziali (partite non complete, foto mancanti)

- **Partite**: data_completeness = 'partial' | 'complete'; missing_photos; team_stats o player_ratings possono essere vuoti se l’utente non ha caricato tutte le foto.
- **Rischio**: il documento dice “possesso medio 52%” ma è calcolato su 3 partite su 10 che hanno team_stats. L’utente potrebbe pensare che sia su tutte le partite.
- **Mitigazione**: nel documento indicare esplicitamente la base (“basato su ultime N partite con dati disponibili”, “possesso medio 52% su 5 partite con statistiche”). Stesso discorso per eventuali medie giocatore (rating_trend, ecc.): “quando disponibili”.

---

## 8. Difficoltà 6: sinergie e “idea” coerente

- **Sinergie** (es. “stile squadra allineato all’allenatore”, “modulo che sfrutta i tuoi esterni”) oggi non sono una tabella dedicata: si **derivano** da rosa + team_playing_style + playing_style_competence + formation_usage. Il documento di analisi può includere frasi tipo “Il tuo allenatore è forte su Possesso; lo stile squadra attuale è Possesso → allineato” o “Stile Contropiede ma allenatore ha Contropiede 55 → considera Possesso (85)”.
- **Coerenza**: il documento deve essere generato con **stesse regole/paletti** della chat (solo nomi in rosa, regola oro, 5 stili, ecc.) così la chat che ragiona su quel documento non “inventa” dati che il documento non contiene.

---

## 9. Riepilogo difficoltà e scelte

| Difficoltà | Scelta suggerita |
|------------|------------------|
| **Quando rigenerare** | **Raccomandato**: tasto "Aggiorna analisi" in UI + rate limit 2/min con alert ("Puoi aggiornare al massimo 2 volte al minuto. Riprova tra X secondi"). Nessuna invalidazione nelle altre route. Alternativa: invalidazione su eventi + TTL (vedi §3). |
| **Rosa / cambio qualcosa** | Ogni route che modifica rosa/formazione/tattica invalida (o ricalcola) il documento; in alternativa si passa ancora formazione/rosa “freschi” in prompt insieme al documento. |
| **Partite nuove e statistiche** | formation_usage/playing_style_usage già aggiornati. Per passaggi/intercettazioni: o medie al volo da matches.team_stats quando si builda il doc, o estendere calculateTacticalPatterns per scrivere avg_* in team_tactical_patterns. |
| **Nuove stat in futuro** | Aggiungere campo in team_stats (estrazione + save) → opzionale in aggregato → citare nel template del documento. |
| **recurring_issues** | Oggi vuoti. In futuro: populate da analyze-match o job dedicato; fino ad allora documento può usare euristiche o lasciare sezione “difficoltà” generica. |
| **Dati parziali** | Nel documento dichiarare sempre la base (“su N partite con dati”, “quando disponibili”). |
| **Sinergie** | Derivare nel documento da rosa + stile + allenatore + pattern (regole fisse o mini-prompt). |

---

## 10. Enterprise, IA e cosa mettere nel riassunto

**Ragionamento enterprise in sintesi**  
Ogni allenatore ha **caratteristiche proprie** (connection, stat boosters, training affinity) che dipendono dai **giocatori in rosa**: la **connection** si attiva solo se in rosa c’è chi matcha Focal Point (stile + posizione) e Key Man (stile + posizione); i **booster** beneficiano solo chi ha quel ruolo/stat. Quindi non basta “allenatore Capello, competenze 89/89/64…”: serve un **riassunto che già contiene** (a) chi in rosa attiva (o no) la connection, (b) chi beneficia dei booster, (c) il **build** della rosa (tipo di squadra: fisica, tecnica, da area, ecc.), (d) le **abilità rilevanti** presenti in rosa per formazione/stile/connection. In questo modo la **IA in chat** non deve più incrociare coach ↔ players né interpretare liste grezze: riceve **solo** il riassunto (dati + sinergie + build + abilità) e il **RAG** (meccaniche, regole, limiti) e **ragiona unicamente su queste due fonti** — decisioni su formazione, sostituzioni, istruzioni, connection e gameplay basate su informazioni già “digestate”.

**Stili giocatore (Collante, Opportunista, Tra le linee, ecc.) e movimento**  
Hai ragione: gli **stili** non sono etichette decorative — descrivono **come il giocatore si muove e si comporta** in campo. Esempi dal RAG (§2): **Collante** (MED) = centrocampista arretrato davanti alla difesa, scudo, opzione di passaggio sicura; **Opportunista** (P) = gioca a contatto con l’ultimo difensore, scatta verso porta, adatto a passaggi filtranti e contropiede; **Tra le linee** (CC/MED) = rimane arretrato e lancia azioni offensive; **Box-to-Box** = corre da area a area; **Rapace d’area** (P) = in agguato in area per finalizzare su cross e ribalzi. Di conseguenza ha senso **usare gli stili per capire se “si muovono meglio”** in un certo modulo/istruzione/stile squadra: un MED con Collante “si muove” trattenuto davanti alla difesa → ottimo per ancoraggio e costruzione, meno per pressing alto (meglio Box-to-Box o Incontrista); un P Opportunista “si muove” in profondità sugli spazi → adatto a contropiede e filtranti, meno a possesso con punta riferimento. Quindi il riassunto enterprise dovrebbe **non solo** elencare “Seedorf Onnipresente, Rijkaard Collante” ma **interpretare** il fit movimento: es. “In mediana: Rijkaard (Collante) si muove davanti alla difesa — ideale per solidità e costruzione; per pressing alto o copertura totale preferibile un Box-to-Box.” “In attacco: Rummenigge (Opportunista) e Zlatan (Rapace d’area) — movimenti complementari (scatti in profondità vs permanenza in area).” La **IA** ha dal RAG la semantica “stile X = movimento/comportamento Y” e dal riassunto “chi ha quale stile + sintesi fit con modulo/istruzioni”; ragiona su “dato come si muovono questi giocatori, in questa formazione/stile squadra vanno bene o serve un cambio”. Non stai sbagliando: è proprio questa la direzione (stili → movimento → fit → consiglio).

### 10.1 L’idea è enterprise?

Sì, se la strutturiamo così:
- **Un solo “brief” per utente** (documento di analisi) con sezioni fisse (profilo, rosa, formazione/tattica, andamento, difficoltà, allenatore, sinergie/note), generato da **dati reali** (Supabase) e da **regole deterministiche** (o una chiamata AI controllata). Niente interpretazione libera: il documento è la **fonte di verità** che la chat usa.
- **Refresh esplicito** (tasto + rate limit) invece di invalidation nascosta: comportamento prevedibile, limiti chiari, meno bug da race condition.
- **Paletti uguali** a quelli della chat (solo nomi in rosa, regola oro, 5 stili): il documento non contiene nulla che la chat non possa “dire”.

### 10.2 L’IA risponde meglio?

Non è garantito al 100%, ma è **molto probabile** che migliori perché:
- Oggi il modello deve **estrarre** da un blocco lungo “ROSA E DATI” (liste, numeri) l’idea del cliente e poi rispondere: due passi in uno, con rischio di trascurare un dato o di essere incoerente.
- Con il **riassunto** il modello riceve già un’**interpretazione** (“Rosa forte in attacco, allenatore forte su Contrattacco, stile non impostato → consiglia Contrattacco o Passaggio lungo”; “Formazione salvata 4-1-2-3 ma in partita usa spesso 5-2-3 e 3-2-3-2”). Il suo compito diventa: “Dato questo quadro, rispondi alla domanda” — un solo passo, con input più “narrativo” e meno grezzo. Meno token sprecati su parsing, più su decisione.
- Per **misurarlo** in produzione: stesso set di domande con e senza riassunto, confronto qualità (feedback utente o valutazione interna).

### 10.3 Enterprise: cosa mettiamo nel riassunto (e perché l’IA ragiona solo su RAG + questo)

L’obiettivo è che il riassunto contenga **tutto ciò che deriva dai dati** (rosa, allenatore, partite, pattern): sinergie, connection, build, abilità rilevanti. La **IA in chat** riceve solo (1) **questo riassunto** e (2) **RAG** (meccaniche, regole, §5 istruzioni, §7 gameplay, ecc.) e **ragiona solo su queste due fonti**: nessun parsing di liste grezze, nessuna “scoperta” di connection o sinergie al volo — è già tutto interpretato nel riassunto.

**Dati allenatore da includere (oggi in DB, spesso non passati alla chat):**
- **connection** (JSONB): `name`, `description`, **focal_point** (`playing_style` + `position`), **key_man** (`playing_style` + `position`). Il collegamento si attiva **solo** con giocatori che matchano: es. “Passaggio sopra la testa A” richiede un Focal Point = stile “Tra le linee” in MED e un Key Man = stile “Opportunista” in P. Se in rosa non c’è nessuno con quello stile in quel ruolo, la connection **non** è attivabile.
- **stat_boosters** (array): es. `{ "stat_name": "Finalizzazione", "bonus": 1 }` — quali statistiche sono potenziate; utile per dire “quali giocatori beneficiano” (es. punte per Finalizzazione, difensori per Comportamento difensivo).
- **training_affinity_description**: testo (es. veterani +% esperienza); può essere citato nel riassunto se rilevante.

**Sezioni enterprise del riassunto:**

1. **Profilo**: nome, squadra, ore/settimana, problemi dichiarati, livello conoscenza.
2. **Rosa (sintesi)**: formazione, titolari (nome, ruolo, overall, stile card), riserve; **punti di forza**; **fit stile–movimento** (es. “MED con Collante: movimento trattenuto davanti alla difesa, adatto a costruzione; per pressing alto preferibile Box-to-Box” — chi si muove come e se è adatto al modulo/stile squadra attuale). Vedi paragrafo sopra: stili = movimento/comportamento, quindi “si muovono meglio” in certi contesti.
3. **Tattica**: stile squadra, istruzioni individuali attive.
4. **Andamento**: ultime N partite, formation_usage (e playing_style_usage), frasi sintetiche su moduli che funzionano / che no.
5. **Statistiche (se disponibili)**: medie su partite con team_stats, con base esplicita.
6. **Difficoltà**: recurring_issues o euristiche + problemi dichiarati.
7. **Allenatore (completo)**  
   - Nome, competenze (consigliabili ≥70, sconsigliabili &lt;70).  
   - **Connection**: nome, descrizione breve; **Focal Point** richiesto (stile + posizione); **Key Man** richiesto (stile + posizione).  
   - **Match connection ↔ rosa**: “Connection attiva: Focal Point [nome giocatore] (Tra le linee, MED), Key Man [nome] (Opportunista, P)” oppure “Connection non attivabile: in rosa nessun MED con stile Tra le linee” / “Key Man compatibili: Rummenigge, Dembélé (Opportunista, P); Focal Point mancante”. Così l’IA non deve incrociare coach.connection con players: è già fatto.  
   - **Stat boosters**: “Booster attivi: Finalizzazione +1, Comportamento difensivo +1. Beneficiano: [nomi punte] per Finalizzazione, [nomi difensori] per Comportamento difensivo.”  
   - **Training affinity**: una riga se presente.
8. **Build (sintesi)**  
   Una frase o due che descrivono il “tipo” di rosa e **come si muove** in base agli stili: es. “Rosa fisica in difesa (DC alti, Dominio palle alte), centrocampo con Collante (movimento trattenuto) + Onnipresente (copertura), attacco da area (Rapace d’area, Opportunista).” Oppure “MED con Collante → build orientato a solidità e costruzione; attacco con Opportunista/Rapace d’area → movimenti adatti a filtranti e cross.” Così l’IA sa non solo “chi c’è” ma “come si muovono” e se il build è coerente con modulo/stile squadra (e con connection, se richiede certi movimenti).
9. **Abilità rilevanti in rosa**  
   Elenco breve: quali abilità (skills/com_skills) sono presenti e **rilevanti** per formazione/stile/connection. Es. “Passaggio filtrante: Neymar, Seedorf, Kaká (utile per connection Passaggio sopra la testa); Colpo di testa: Zlatan, Rummenigge; Contrasto aggressivo: Baresi, Pepe; Riserva di lusso: [nome].” Così l’IA sa già “chi ha cosa” senza scorrere la lista grezza.
10. **Sinergie / note (derivate)**  
    - Allineamento coach–stile squadra (o “stile non impostato → consigliabile X”).  
    - Connection attiva / parziale / non attivabile (già al punto 7).  
    - Disallineamento formazione salvata vs moduli usati in partita.  
    - Eventuali conflitti (es. Contropiede su difensori ma coach Contropiede &lt;70).

Tutto in **linguaggio breve**, per la chat. La IA poi **ragiona solo su**: (a) questo riassunto, (b) RAG (meccaniche, limiti §3.4, istruzioni §5, gameplay §7, regola oro, esempi §10). Niente dati grezzi in prompt (o al massimo un blocco “ROSA E DATI” ridotto come fallback se il riassunto non è ancora stato generato). Lunghezza indicativa riassunto: 400–1000 parole.

### 10.4 Come si “decidono” fit e consigli: parametri dal RAG

Il RAG (`info_rag.md`) non è solo definizioni: contiene i **criteri** per dire “questo stile/ruolo/abilità **quando serve** e **perché**”. Chi costruisce il riassunto (o la IA, se il riassunto è generato da AI) deve usare proprio questi parametri.

**Cosa c’è nel RAG che usiamo come parametri:**

- **§2 Stili giocatore**: per ogni stile c’è **“Quando serve”** (contesto: stile squadra, tipo di gioco, modulo) e **“Perché”** (movimento/ruolo). Es. Collante: “Quando serve: scudo difensivo, Vie laterali. Perché: fondamentale per solidità.” Opportunista: “Quando serve: passaggi filtranti, contropiede. Perché: scatta in profondità.” → Il riassunto può dire: “MED con Collante → fit per Vie laterali e costruzione; per pressing alto il RAG dice che serve Resistenza alta e stili tipo Incontrista/Box-to-Box.”
- **§3 Moduli**: ruoli (Mediano, Mezzala, Regista basso, Ala tagliente…) con **“Quando serve”**. **§3.4 Limiti**: max 2 P, max 1 EDA/ESA, max 3 DC, max 1 TD/TS, ecc. → Il riassunto e i consigli devono rispettare questi limiti.
- **§4 Stili squadra**: i 5 configurabili con **“Quando serve”** (es. Possesso: centrocampisti tecnici; Vie laterali: Collante per solidità). → Fit stile squadra ↔ rosa/allenatore si decide con questi criteri.
- **§5 Istruzioni individuali**: regole (max 2 Ancoraggio; Linea bassa non a difensori; Contropiede solo CC e attaccanti). → I consigli sulle istruzioni devono rispettare il RAG.
- **§7 Meccaniche**: movimenti con **“Quando serve”** e **“Rosa”** (quali stili/abilità). → Per “come si muovono” e “chi mettere” usiamo queste tabelle.
- **§8 Abilità**: ogni abilità ha **“Quando serve”** (ruolo, situazione). → Nel riassunto “abilità rilevanti” si derivano da qui.
- **§10 Note critiche / esempi**: regola oro, cosa dire e non dire. → Il riassunto non deve contraddire il RAG.

In sintesi: **non inventiamo i criteri**. Il riassunto (e poi la IA) usa **solo** “Quando serve” e “Perché” dal RAG + limiti §3.4 e regole §5 per decidere fit, build, sinergie e consigli.

### 10.5 Quando la chat usa il RAG (in breve)

- Il backend chiama **`classifyQuestion(messaggio)`**: se la domanda è su tattica, formazione, giocatori, stili, meccaniche (es. “Che modulo per la mia rosa?”, “Come difendo?”) → restituisce **`'efootball'`**. Se la domanda è su app/menu/upload (“Dove carico la partita?”, “Come faccio a…”) → restituisce **`'platform'`**.
- **Se `'efootball'`**: si carica **tutto il RAG** e si mette nel prompt. La IA **vede** le regole (stili, limiti, “Quando serve”, regola oro) e risponde **usando** il RAG.
- **Se `'platform'`**: il RAG **non** si carica. La IA risponde solo: “Sono qui per consigli tattici; per il resto esplora il menu.”

Quindi: **RAG usato solo quando la domanda è “da eFootball”**. Domanda su app = niente RAG.

---

## 11. Esempio reale: riassunto Niccoló Zingaro (dati Supabase)

Dati letti da Supabase (user_id associato a Niccoló Zingaro). Esempio di **cosa** mettere nel riassunto e **come** si presenta.

**Profilo**  
Niccoló Zingaro, squadra Cairo vattene. Ore/settimana: 20. Problemi dichiarati: Formazione, Difesa. Conoscenza AI: 98% (profilo, rosa, partite, pattern, allenatore ben compilati).

**Rosa**  
Formazione salvata: 4-1-2-3. Titolari: Schmeichel (PT 102), Baresi (DC 103), Ferdinand (DC 101), Pepe (DC 101), Bergomi (TD 98), Rijkaard (MED 98), Neymar Jr (TRQ 101), Seedorf (CC 99, Onnipresente), Zlatan Ibrahimović (P 104, Rapace d'area), Rummenigge (P 100, Opportunista), Messi (SP 104). Riserve: Iniesta (CC 101), Cristiano Ronaldo (P 101), Dembélé (P 100, Opportunista), Mbappé (100), Yamal (CLD 100), Ronaldinho (TRQ 99), Kaká (TRQ 99, Regista creativo), Maldini (TS 99), Maicon (TD 99), Isak (P 99), Verón (CC 98). Rosa molto alta in overall; attacco e difesa centrali molto forti.

**Tattica**  
Stile squadra: non impostato (null). Istruzioni individuali: Contropiede attivo su 2 difensori (slot difesa_1, difesa_2).

**Andamento (ultime 12 partite)**  
Formation usage: 5-2-3 (2 partite, 100% vittorie), 3-2-3-2 (1, 100%), 5-2-1-2 (1, 100%), 3-3-2-2 (1, 100%); 4-2-1-3 (2 partite, 50%), 4-3-1-2 (2, 50%), 3-3-1-3 (2, 50%); 4-1-2-3 (1 partita, pareggio). Stile di gioco usato in partita: non registrato (playing_style_usage vuoto). Ultime partite: risultati misti (1-0, 5-0, 4-0, 4-6, 4-1, 0-2, 6-0, 3-4, 2-1). Possesso nelle partite con dati: 40–54%. Passaggi riusciti: 61–125 (dove disponibile).

**Difficoltà**  
Recurring issues: nessuno in DB. Problemi dichiarati: Formazione, Difesa. Dati andamento: 4-1-2-3 usato una sola volta (pareggio); moduli con 50% win rate: 4-2-1-3, 4-3-1-2, 3-3-1-3.

**Allenatore (completo)**  
Fabio Capello attivo. Competenze: Contrattacco 89, Passaggio lungo 89, Vie laterali 64, Contropiede veloce 57, Possesso palla 46. Stili consigliabili (≥70): Contrattacco, Passaggio lungo, Vie laterali. Sconsigliabili: Possesso palla (46), Contropiede veloce (57).  
- **Connection**: “Passaggio sopra la testa A”. Focal Point richiesto: stile **Tra le linee**, posizione MED. Key Man richiesto: stile **Opportunista**, posizione P. Descrizione: l’Uomo chiave avanza quando il Punto focale ha palla in propria metà; passaggi filtranti/filtranti alti del Focal verso Key Man hanno maggiore precisione.  
- **Match connection ↔ rosa**: Key Man compatibili: Rummenigge (Opportunista, P), Dembélé (Opportunista, P), Isak (Opportunista, P). Focal Point: in rosa nessun MED/CC con stile “Tra le linee” (Seedorf è Onnipresente, Neymar TRQ senza match) → **connection non pienamente attivabile**; per attivarla servirebbe un centrocampista con stile Tra le linee.  
- **Stat boosters**: Finalizzazione +1, Comportamento difensivo +1. Beneficiano: Zlatan, Rummenigge, Messi, CR7, Dembélé, Mbappé, Isak (ruoli P/SP) per Finalizzazione; Baresi, Ferdinand, Pepe, Bergomi, Maldini (difesa) per Comportamento difensivo.  
- **Training affinity**: non compilata.

**Build (sintesi)**  
Rosa molto alta in overall; difesa centrale solida (Baresi, Ferdinand, Pepe), terzini e MED più bassi (98). Centrocampo con Seedorf (Onnipresente), Neymar TRQ; attacco con Zlatan (Rapace d’area), Rummenigge (Opportunista), Messi SP. Build adatto a possesso/verticalizzazione e a sfruttare punte da area; connection allenatore richiede un “Tra le linee” in MED per essere attiva.

**Abilità rilevanti in rosa**  
Passaggio filtrante / filtrante alto (utili per connection): presenti su Neymar, Seedorf, Kaká, Iniesta (da verificare in skills/com_skills per nome esatto). Colpo di testa / Tiro al volo: Zlatan, Rummenigge. Contrasto / Intercettazione / Marcatura: Baresi, Ferdinand, Pepe. Riserva di lusso: da verificare in rosa. Dominio palle alte / Superiorità aerea: utile per DC (Baresi, Pepe, ecc.) se presenti.

**Sinergie / note**  
- Allenatore forte su Contrattacco e Passaggio lungo; stile squadra non impostato → consigliabile impostare Contrattacco o Passaggio lungo.  
- Connection “Passaggio sopra la testa A” solo parziale: Key Man ok (Rummenigge/Dembélé/Isak), Focal Point mancante (Tra le linee in MED) → consiglio: inserire o cercare in rosa un MED/CC con stile Tra le linee per attivare la connection.  
- Formazione salvata 4-1-2-3 vs uso reale 5-2-3, 3-2-3-2, 4-2-1-3 → disallineamento; moduli con miglior win rate: 5-2-3, 3-2-3-2.  
- Contropiede su 2 difensori attivo; coach Contropiede 57 (<70) — per contropiede sistematico preferire stile Contrattacco/Passaggio lungo o allenatore con Contropiede ≥70.

---

Questo blocco è il **riassunto enterprise** che la chat riceve per Zingaro. La IA **ragiona solo su**: (1) questo riassunto, (2) RAG (meccaniche, limiti, istruzioni §5, gameplay §7, regola oro, esempi). La domanda dell’utente viene risposta **a partire da questo quadro**, senza dover interpretare connection, booster o build dai dati grezzi.

---

Questo documento può essere usato come specifica per progettare il “documento di analisi” (formato, chi lo genera, quando, dove si cache) e per estendere i flussi esistenti (es. calculateTacticalPatterns, recurring_issues, invalidazione).
