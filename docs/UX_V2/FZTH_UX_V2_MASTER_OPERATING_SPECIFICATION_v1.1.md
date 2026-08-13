> **STATO DOCUMENTO** SOURCE OF TRUTH operativo. Ogni prompt futuro e ogni validazione devono ereditare i vincoli di questo documento. Il documento NON autorizza da solo modifiche a produzione, database, RLS, auth, wallet o prompt AI.

| Campo | Valore |

| --- | --- |

| Versione | 1.1 |

| Data snapshot | 12 agosto 2026 |

| Prodotto | From Zero To Hero — eFootball AI Coach |

| Stack verificato | Next.js 14 / React 18 / Supabase / MetalGate / OpenAI / Vercel |

| Obiettivo | Refactoring UX V2 senza rompere il prodotto già in produzione |

| Metodo | Una slice alla volta → staging → validazione codice + dati → merge controllato |

| Owner operativo | L’owner decide prodotto/economia; ChatGPT prepara i prompt e valida; Cursor implementa solo lo scope autorizzato. |

Questo documento nasce da verifica del codice applicativo reale (snapshot `efoot-main (2).zip`) e da interrogazioni read-only dei progetti Supabase live `eFootball` e `MetalGate`. I documenti storici non sono stati usati come fonte primaria per i comportamenti descritti.

# FROM ZERO TO HERO — UX V2 MASTER OPERATING SPECIFICATION

Versione 1.1 — 13 agosto 2026


---


# 0. Come usare questo documento

> **REGOLA DI EREDITARIETÀ** Ogni prompt Cursor deve contenere esplicitamente: PRE-FLIGHT, SCOPE, TENERE/PRESERVARE, BYPASS UX, NON TOCCARE, STATI/VARIANTI, RESPONSIVE, CONTRATTI DATI/API, TEST, STOP CONDITIONS e OUTPUT. Se una di queste sezioni manca, il prompt è incompleto.

Il documento è organizzato in quattro blocchi:

- A — Product/UX Source of Truth: come deve essere percepito il prodotto e quali funzioni confluiscono in Coach, Rosa, Carte e Utility.
- B — Technical Preservation Map: quali API, tabelle, eventi, cache, side effect, wallet e sistemi non devono essere spezzati.
- C — Warning & Risk Register: problemi già esistenti scoperti nel codice/Supabase, separati dal redesign.
- D — Prompt & Validation Governance: formato obbligatorio dei prompt che ChatGPT darà a Cursor e checklist con cui ChatGPT validerà ogni commit.

## 0.1 Definizioni operative

| Termine | Significato |

| --- | --- |

| TENERE / PRESERVARE | La funzione o il contratto resta operativo e semanticamente invariato. Può cambiare posizione/visuale solo se autorizzato. |

| BYPASS UX | La vecchia destinazione/widget non viene più esposto come ingresso primario, ma il motore/API/dato resta attivo e viene raggiunto da una nuova UX. NON significa bypassare auth, RLS, crediti o sicurezza. |

| NON TOCCARE | File, contratto, schema o logica esclusi dalla slice. Se Cursor ritiene indispensabile modificarli deve fermarsi e motivare. |

| QUARANTENA | Codice/feature potenzialmente legacy: non si elimina e non si integra nella UX finché non si dimostra chi lo usa. |

| SLICE | Unità minima implementabile, testabile e reversibile. Una slice non deve diventare un refactor trasversale non richiesto. |

| SOURCE OF TRUTH | Codice corrente + Supabase live read-only + questo documento. Le immagini sono direzione visuale, non fonte dati/funzionale. |


## 0.2 Ordine delle fonti in caso di conflitto

1. Codice corrente del branch/commit effettivamente in lavorazione.
1. Schema e dati Supabase live verificati in sola lettura.
1. Decisioni owner esplicite più recenti.
1. Questo Master Operating Specification.
1. Reference grafiche UX.
1. Documentazione storica: solo supporto, mai usata per sovrascrivere il comportamento reale senza verifica.

# 1. Decisioni esecutive non negoziabili

| Decisione | Esito |

| --- | --- |

| Motore prodotto | NON si riscrive durante la UX V2. Backend, DB, RAG, auth, wallet e contratti esistenti restano il più possibile invariati. |

| Navigazione primaria | 3 ingressi: Coach · Rosa · Carte. |

| Home | La Home diventa Coach, non una dashboard gestionale. |

| Hero Chat + Palestra | Una sola esperienza conversazionale per l’utente; inizialmente motori/API restano separati sotto la stessa UI. |

| Palestra Coach | BYPASS come destinazione separata; PRESERVARE raccolta profilo, feedback, salvataggi e `user_tactical_feedback`. |

| Mission/Task/Journey/Suggestions | BYPASS come widget concorrenti; confluiscono UX in `Prossima azione` / `Piano Coach`, preservando i side effect necessari. |

| Knowledge | Rinominare/percepire come “Quanto Hero ti conosce”; non promettere memoria persistente finché il context builder non incorpora feedback stale correttamente. |

| Profilo | BYPASS dalla nav primaria; separare Account da Memoria Hero/Profilo di gioco. Dati `user_profiles` da preservare. |

| HP / pagamenti | Utility globale. Wallet MetalGate e logiche economiche NON si modificano nel redesign senza prompt dedicato. |

| Statistiche/Partite/Contromisure | Non sono tab primari: diventano strumenti contestuali di Coach/Progressi. Route e API restano. |

| Live Coach | Resta modalità speciale sotto Coach; non va fusa come semplice messaggio perché ha sessione realtime e billing temporale. |

| Rosa | Progressive disclosure: semplice fuori, capacità avanzate intatte. Non riscrivere la pagina da ~9.8k righe in 4 giorni. |

| Carte | Card Advisor resta pilastro autonomo e usa il contesto reale della rosa. |

| Rollout | Branch/staging prima; main congelato; merge solo dopo validazione. |

> **NORTH STAR** From Zero To Hero non deve sembrare “una piattaforma con 15 strumenti”. Deve sembrare “Hero è il mio Coach eFootball: conosce la mia squadra, impara da come gioco e usa lo strumento giusto quando serve”.


# 2. Snapshot verificato: codice e dati reali


## 2.1 Stack e struttura corrente

- Next.js 14 App Router, React 18, `@supabase/supabase-js`, lucide-react, jsonwebtoken. Nessun framework UI esterno pesante; nessun Tailwind nel package corrente.
- `AppLayoutShell.jsx` monta globalmente SidebarNew, TopBar, BottomNavigation, DailySpinWidget, InstallAppPrompt, LiveCoachLauncher e AssistantChat popup.
- `/gestione-formazione` re-esporta `nuova-rosa-lab`: la vera esperienza Rosa è concentrata in una pagina molto grande e ricca di logica.
- Card Advisor ha route/API dedicate e usa profilo, rosa, coach, tattiche, pattern, statistiche, diagnostic, feedback e performance.
- RAG attuale non è vector-RAG: `lib/ragHelper.js` legge `info_rag.md`, seleziona sezioni via keyword/classificazione e le mette nel prompt.

## 2.2 Realtà utenti/dati Supabase eFootball — snapshot live

| Indicatore | Valore verificato | Implicazione UX |

| --- | --- | --- |

| Auth users eFootball | 632 | Quasi tutti hanno profilo locale; non assumere stesso livello di setup. |

| Profili `user_profiles` | 630 | È il vero hub utente e non può essere trattato come semplice pagina Profilo. |

| Utenti con giocatori | 373 | Molti utenti non hanno ancora una rosa completa. |

| Utenti con 11 titolari | 279 | Home deve gestire `roster_incomplete`. |

| Utenti con coach attivo | 364 | Stato `no_coach` è reale e frequente. |

| Utenti con game analysis | 142 | Statistiche devono essere suggerite contestualmente, non obbligatorie all’ingresso. |

| Utenti con match salvati | 33 (229 match) | Post-match/progressi sono preziosi ma non possono dominare la Home per tutti. |

| Utenti con feedback Palestra | 29 (104 righe) | Memoria Coach esiste ma è poco diffusa. |

| Diagnostic cache | 421 righe; 0 fresche <6h al controllo | La chat principale non deve dipendere da una cache fresca per “ricordare”. |

| Knowledge score medio | 16.8 | Non usare il numero come status competitivo; deve guidare la raccolta contesto. |


## 2.3 Utilizzo reale funzioni — ultimi 90 giorni (da `credit_transactions`)

| Operazione | Utilizzi | Utenti | Lettura prodotto |

| --- | --- | --- | --- |

| assistant-chat | 1.864 | 136 | Hero Chat è l’ingresso AI più diffuso. |

| coach-feedback-chat | 751 | 51 | Palestra è usata molto come conversazione. |

| save-coach-feedback | 70 | 20 | Il passaggio conversazione→memoria ha forte dispersione. |

| card-advisor-deep-analysis | 541 | 72 | Card Advisor merita il pilastro Carte. |

| extract-game-analysis | 207 | 90 | Statistiche sono importanti ma episodiche. |

| generate-countermeasures | 286 | 53 | Pre-match è uno strumento Coach, non necessariamente un tab. |

| extract-match-data | 1.070 | 37 | Gli utenti che salvano match sono pochi ma molto attivi. |

| live-coach-start | 60 | 18 | Feature di nicchia/alto valore, da mantenere come modalità speciale. |


# 3. Architettura prodotto target

```
FROM ZERO TO HERO

                    HERO COACH
                         |
            +------------+------------+
            |            |            |
          COACH         ROSA         CARTE
            |            |            |
  Hero conversation   Formazione   Card Advisor
  Memoria/feedback    Catalogo     Release/Pack
  Pre-match            Allenatore   Fit/Build
  Post-match           Tattiche     Deep verdict
  Statistiche          Build Coach  Alternative
  Progressi
  Live Coach

UTILITY GLOBALI: Account · Memoria Hero · HP/Wallet · Daily reward · Lingua · Guida · Tornei · Logout
```


## 3.1 Cosa significa “semplificare”

- Ridurre il numero di decisioni di navigazione, NON ridurre le capacità del motore.
- Una sola CTA dominante per stato; gli strumenti avanzati compaiono quando sono contestualmente utili.
- Hero deve diventare il router cognitivo: l’utente esprime un obiettivo, Hero propone l’azione/applicazione corretta.
- Le vecchie route possono rimanere vive per compatibilità/deep link anche se non sono più esposte nella nav primaria.
- Niente dati fake per riempire il design. Stato vuoto reale > contenuto inventato.

# 4. Coach: una sola esperienza conversazionale


## 4.1 Decisione Hero Chat + Palestra

Per l’utente esiste una sola entità: Hero Coach. A livello tecnico, nella prima fase non si fondono brutalmente gli endpoint: la UI unificata instrada verso il motore corretto.

```
HeroCoachConversation
   |
   +-- domanda/consiglio ----------> /api/assistant-chat
   |
   +-- raccolta feedback/profilo --> /api/coach-feedback-chat
   |                                  |
   |                                  +--> /api/save-coach-feedback
   |                                  +--> /api/supabase/save-ai-info
   |
   +-- live voice -----------------> /api/live-coach/*
```


## 4.2 Palestra: cosa TENERE e cosa BYPASSARE

| Elemento | Regola |

| --- | --- |

| Prompt Palestra single-purpose | TENERE inizialmente: raccoglie profilo + feedback e rifiuta consigli tattici. |

| Endpoint `/api/coach-feedback-chat` | TENERE. Non alterare contratto/costo senza slice dedicata. |

| Endpoint `/api/save-coach-feedback` | TENERE. Produce profile updates + `user_tactical_feedback`. |

| `session_type` | TENERE: `profile_setup`, `feedback`, `update`. |

| Pagina/modal “Palestra Coach” come prodotto separato | BYPASS UX progressivo. Non cancellare componente nella prima fase. |

| Form profilo esplicito | Ridurre/contestualizzare, ma TENERE il salvataggio dei campi. |

| Feedback post-partita | Portare dentro Hero come CTA `Raccontami com’è andata`. |


## 4.3 Memoria Hero: tassonomia obbligatoria

| Tipo | Esempio | Destinazione | Consenso |

| --- | --- | --- | --- |

| Profilo stabile | “Gioco PA2”, “sono su PlayStation”, “ho input delay” | `user_profiles` | Esplicito prima di salvare/modificare dati persistenti. |

| Esperienza partita | “Soffro le fasce”, “Mbappé in profondità ha funzionato” | `user_tactical_feedback` con `match_id` quando disponibile | Esplicito: card “Vuoi che lo ricordi?”. |

| Contesto temporaneo | “Stasera sono stanco”, domanda una tantum | Solo conversazione | NON salvare. |

| Pattern | “3/4 partite mostrano problema sulle fasce” | Derivato da più evidenze/pattern, non da una singola frase | Non deve essere inventato dal client. |

> **ECONOMIA HP APERTA** Oggi `coach-feedback-chat` costa 2 HP e `save-coach-feedback` altri 2 HP. La nuova UX non deve nascondere un doppio addebito. Finché l’owner non approva una nuova politica economica, ogni prompt deve PRESERVARE i costi attuali oppure rendere il costo esplicito; non rendere “Salva memoria” gratuito di nascosto.


## 4.4 Problema memoria già esistente — P1 tecnico

`assistant-chat` usa `user_diagnostic_cache` solo se generata da meno di 6 ore. Se la cache è stale usa `buildPersonalContext`; quel fallback non incorpora direttamente `user_tactical_feedback`. Al controllo live tutte le 421 cache erano oltre le 6 ore. Risultato: la memoria Palestra è persistente nel DB e usata da altre funzioni, ma la Hero Chat può perderne il dettaglio nel tempo.

> **REGOLA** Non promettere in produzione “Hero ricorda” finché la slice Memory Context non garantisce che il contesto live includa feedback/memorie pertinenti anche con cache stale.


## 4.5 RAG: preservare, non rifare

- `lib/ragHelper.js` legge `info_rag.md`; parsing per `##`, matching keyword, filtri per ruolo e contesto.
- È usato da Hero Chat, Card Advisor deep, Analyze Match, Live Coach/countermeasures helpers.
- Durante UX V2: NON cambiare contenuto RAG, retrieval, limiti o classificazione salvo prompt dedicato e test di regressione AI.
- Hero Actions/Memory possono essere aggiunti come contratto strutturato sopra il retrieval esistente; non serve vectorizzare per il redesign.

# 5. Home Coach e “Prossima azione”


## 5.1 Consolidamento sistemi concorrenti

Oggi quattro sistemi diversi guidano l’utente: `HeroCoachJourney`, `TaskWidget`, `MissionCenter`, `CoachSuggestions`. La UX V2 deve esporre un solo concetto principale: `Prossima azione`, con dettaglio opzionale `Piano Coach`.

> **SIDE EFFECT DA NON PERDERE** `/api/tasks/list` NON è una semplice GET passiva: se mancano weekly goals li genera; quando la lista viene aperta ricalcola anche il progresso. Non rimuovere TaskWidget/MissionCenter senza spostare o preservare questi side effect.


## 5.2 Stati Home obbligatori

| Stato | Condizione | CTA primaria | Secondario |

| --- | --- | --- | --- |

| NEW / NO ROSTER | 0 giocatori | Crea la tua rosa | Scopri Hero / Carte solo se utile |

| ROSTER INCOMPLETE | <11 titolari | Completa rosa | Scegli/controlla carte |

| NO ACTIVE COACH | 11 titolari, no coach | Scegli allenatore | Statistiche facoltative |

| READY / NO STATS | Rosa+coach, no game analysis | Entra in Hero / aggiungi stats | Non bloccare l’uso Coach |

| OPERATIONAL | Contesto sufficiente | Composer Hero | 3 suggerimenti contestuali max |

| POST MATCH | Match recente / flow appena completato | Raccontami com’è andata | Vedi match |

| MEMORY CANDIDATE | Hero rileva dato persistente | Salva / Ricorda | Modifica / Ignora |

| LOW HP | Azione a pagamento con saldo insufficiente | Ottieni HP | Annulla |

| ERROR / PARTIAL DATA | API/contesto incompleto | Riprova / continua con dati disponibili | Non inventare output |


## 5.3 Correzione incoerenza già presente

In `HeroCoachJourney`, lo stato `coach_chat` dice “Usa Hero Chat” ma l’azione primaria è cablata su `openCoachFeedback` (Palestra). La UX V2 deve eliminare questa ambiguità: “Chiedi al Coach” apre sempre l’esperienza Hero corretta.


# 6. Onboarding operativo, non tutorial

`OnboardingFlow` attuale è un carosello esplicativo a 5 step; esiste inoltre `OnboardingFormation`. La UX V2 deve evitare doppio tutorial e portare l’utente a configurare dati reali.

```
BENVENUTO
   ↓
CREA / IMPORTA ROSA REALE
   ↓
SCEGLI ALLENATORE
   ↓
HERO È PRONTO
   ↓
Profilazione progressiva dentro la conversazione, solo quando serve
```


## 6.1 Regole

- Non bloccare onboarding su statistiche, PA, connessione, weak point, ore/settimana o obiettivi.
- Slot rosa → catalogo DB reale come percorso primario; foto/OCR solo fallback quando realmente necessario.
- Allenatore → `coach_catalog` reale; nessun coach inventato dalle reference grafiche.
- Utente esistente: NON mostrare onboarding nuovo se il suo setup reale è già sufficiente. Deve entrare in stato Home coerente.
- Nessuna migrazione dati per “far sembrare” completo il setup.

# 7. Account, Profilo di gioco e Memoria Hero


## 7.1 `user_profiles` è hub critico

`user_profiles` è letto/usato da oltre 50 file/API. Contiene identità locale, mapping MetalGate, setup Coach, campi AI, divisione, leaderboard consent e Knowledge. La pagina Profilo può essere semplificata; il contratto dei campi NON può essere banalizzato.

| Area UX | Campi/concetti | Regola |

| --- | --- | --- |

| Account | first_name, last_name, nickname, lingua, logout | Utility sotto avatar; preservare SSO. |

| Profilo gioco | current_division, platform, pass_level, smart_assist, connection/input_delay | Hero può raccoglierli progressivamente; restano modificabili manualmente. |

| Memoria Hero | ai_weak_point, ai_learn_goals, ai_notes, common_problems | Mostrare “Cosa sa Hero”, con origine/aggiornabilità. |

| Identità Coach | ai_name, how_to_remember | Preservare personalizzazione conversazione. |

| MetalGate | is_metalgate_user, metalgate_user_id | NON esporre/modificare nella UX; contratto infrastrutturale. |


# 8. Hero Points, pagamenti e Daily Spin


## 8.1 Architettura economica attuale

L’identità/credito effettivo è collegato a MetalGate. eFootball mantiene tracking locale (`user_credit_usage`, `credit_transactions`, `credit_error_logs`) e `creditService` comunica con API MetalGate tramite server-side internal key.


## 8.2 Regole UX

- HP sempre visibili come utility compatta in header/mobile top bar.
- Tap HP → saldo, attività recente, acquisto e Daily Reward; non voce primaria di navigazione.
- Mostrare il costo prima dell’azione quando noto (`2 HP`, Live Coach start/minute, Card Advisor deep).
- Gestire 402 con messaggio UX dedicato, mai come errore tecnico generico.
- Daily Spin: BYPASS del widget globale invasivo, ma PRESERVARE claim/idempotenza/accredito; integrare nella utility wallet.
- Nessun prompt UX può modificare `creditService`, endpoint MetalGate, prezzi o refund policy senza autorizzazione esplicita owner.

## 8.3 Costi correnti verificati

| Operazione | Costo corrente |

| --- | --- |

| AI standard (Hero Chat, Palestra, save feedback, estrazioni, contromisure, analyze-match) | 2 HP per chiamata |

| Game analysis multi-image | 2 HP × immagine/URL |

| Card Advisor deep analysis | 2 HP |

| Live Coach start | 2 HP |

| Live Coach minuti extra | 5 HP per blocco minuto secondo pricing corrente |


# 9. Rosa: progressive disclosure senza rifare il motore

La vera route `/gestione-formazione` re-esporta `nuova-rosa-lab/page.jsx`, una pagina ~9.8k righe con catalogo, slot, riserve, coach, foto/OCR, build, tattiche e controlli avanzati. È ad alto rischio di regressione se rifatta integralmente durante lo sprint UX.


## 9.1 Default UX

- Campo/formazione + 11 titolari come focus.
- Panchina/riserve immediatamente sotto, senza pannelli concorrenti.
- CTA semplice: aggiungi/sostituisci giocatore → picker catalogo esistente.
- Allenatore attivo e tattiche visibili come summary; dettagli avanzati dietro drawer/sheet.
- Build Coach, posizioni, booster, skill, istruzioni individuali: progressive disclosure, non eliminate.

## 9.2 Contratti da preservare

| Elemento | Preservare |

| --- | --- |

| `players.slot_index` | Semantica 0–10 per titolari e logiche riserve esistenti. |

| RPC/route assegnazione slot | Atomicità e ownership; non sostituire con update client ingenuo. |

| `formation_layout` | Modulo + posizioni custom. |

| `team_tactical_settings` | Stile squadra + istruzioni individuali. |

| Trigger cleanup player delete | Rimozione istruzioni orfane dopo delete giocatore. |

| `coach_catalog` / `coaches.is_active` | Catalogo e coach attivo reali. |


# 10. Carte / Card Advisor

Carte resta uno dei tre pilastri perché ha un job-to-be-done distinto: “questa carta migliora davvero la mia squadra?”.


## 10.1 Contesto reale usato dal deep analysis

- `user_profiles`
- `players` + formation
- `coaches`
- `team_tactical_settings`
- `team_tactical_patterns`
- `user_game_analysis`
- `user_diagnostic_cache`
- `user_tactical_feedback`
- `player_performance_aggregates`
- RAG eFootball
> **NON SEMPLIFICARE IL MOTORE** La UX può ridurre i pannelli, ma non deve degradare il contesto del verdetto. Card Advisor è già uno dei punti dove feedback Palestra viene letto direttamente: cambiare schema `user_tactical_feedback` avrebbe effetti immediati.


# 11. Partite, statistiche, contromisure e progressi


## 11.1 Nuova collocazione UX

| Funzione | Nuova scoperta UX | Motore da preservare |

| --- | --- | --- |

| Statistiche eFootball | Hero propone “Aggiungi/aggiorna statistiche” quando migliorano la risposta | `GameAnalysisModal`, `user_game_analysis`, `/api/extract-game-analysis` |

| Partite | Coach → Progressi / ultimo match / post-match | `matches`, `/match*`, save/update/delete APIs |

| Grafici | Coach → Progressi → dettaglio | Route grafici esistente |

| Contromisure | Hero/pre-match → “Prepara piano partita” | `opponent_formations`, `/api/generate-countermeasures` |

| Feedback post-match | Hero → “Raccontami com’è andata” | Palestra engine + `user_tactical_feedback` |


## 11.2 Catena dati delicata

```
matches
  ├─> player_performance_aggregates
  ├─> team_tactical_patterns
  ├─> weekly_goals / progress
  ├─> AI Knowledge
  ├─> diagnostic
  └─> Hero / Card Advisor / Countermeasures / Live Coach
```

> **BUG/RISCHIO DELETE MATCH** Save/update ricalcolano più elementi; `delete-match` elimina il match e aggiorna Knowledge, ma non mostra lo stesso ricalcolo completo di pattern/performance. Al controllo live non risultavano pattern palesemente disallineati, ma il percorso è fragile. Correzione separata, non nascosta dentro il redesign.


# 12. Live Coach

- Resta sotto Coach, ma come modalità dedicata/full-screen o sheet, non semplice branch della chat testuale.
- Preservare session lifecycle, heartbeat, wake lock/microfono, start cost, minute billing, end/refund handling.
- `liveCoachContext` legge anche feedback Palestra e diagnostic: cambiare formato memoria senza adattarlo rompe il coaching live.
- Non mettere Live Coach nella bottom nav primaria finché i dati d’uso non giustificano un ingresso permanente.

# 13. “Quanto Hero ti conosce”: Knowledge Score


## 13.1 Pesi codice corrente

| Componente | Max |

| --- | --- |

| Profilo | 16 |

| Rosa | 20 |

| Partite | 24 |

| Pattern | 12 |

| Allenatore | 8 |

| Utilizzo | 4 |

| Successi | 8 |

| Palestra/Coach training | 8 |

| Totale | 100 |


## 13.2 Warning logici

- `usage` non misura realmente i messaggi Hero: deriva da `playersCount + matchesCount + completedGoalsCount` e stima `chatMessages = floor(matchesCount/3)`.
- Il progresso divisione assegna bonus quando il numero di divisione aumenta (`current > initial`), mentre semanticamente eFootball tende a considerare Division 1 migliore di Division 2. Da correggere solo dopo conferma/regression test.
- Il commento schema `ai_knowledge_score` descrive una formula storica diversa dai pesi codice correnti.
- La maggior parte dei profili ha score basso/stale: il componente deve suggerire azioni utili, non far sentire l’utente “incompleto”.
> **REGOLA UX** Mostrare breakdown e “cosa manca” come guida. Non usare score/level come claim di precisione AI se le fonti sottostanti sono stale o proxy.


# 14. Piano Coach, weekly goals e missioni


## 14.1 Side effect di `/api/tasks/list`

- Legge `weekly_goals` con service role.
- Se settimana corrente e nessun goal: chiama `generateWeeklyTasksForUser` e crea task.
- Quando l’utente apre la lista, chiama `updateTasksProgressAfterMatch` per sincronizzare progressi anche non legati a match.
- Nasconde `use_recommended_formation` dalla risposta.
- Se tutto fallisce restituisce 3 task statici hardcoded per evitare UI vuota.
> **DECISIONE** Nella UX V2 non vogliamo obiettivi inventati presentati come personali. Il fallback statico va trattato come debt P2: prima di rimuoverlo, separare bene “nessun obiettivo personalizzato” da “servizio non disponibile”.


# 15. Navigazione e responsive


## 15.1 Desktop

```
Sidebar primaria
  Coach
  Rosa
  Carte

Footer sidebar / avatar menu
  Account
  Memoria Hero
  HP
  Lingua
  Guida
  Tornei
  Logout
```


## 15.2 Tablet

- Rail compatta con 3 icone principali; dettagli in drawer.
- Niente sidebar larga che sottrae campo utile alla formazione.
- Modali complessi → drawer/full-height panel quando necessario.

## 15.3 Mobile

```
TOP BAR: Logo / Hero Points / Avatar

CONTENT

BOTTOM NAV (safe-area): Coach | Rosa | Carte
```

- Bottom nav attuale ha 6 voci; UX V2 massimo 3.
- Sheet/full-screen per catalogo, Palestra/memoria, HP, Knowledge detail, tattiche.
- Niente modali desktop compressi.
- Test obbligatori: 360×800, 375×812, 390×844, 430×932, 768×1024, 1024×1366, 1280, 1366, 1440, 1728 desktop.
- Preservare `env(safe-area-inset-bottom)` e focus/keyboard behavior.

# 16. Shell globale, PWA, analytics e deep link


## 16.1 Cose globali oggi montate

- SidebarNew
- TopBar
- BottomNavigation
- DailySpinWidget
- InstallAppPrompt
- LiveCoachLauncher (launcher button hidden)
- AssistantChat popup
- MaintenanceGate + PrelaunchGate

## 16.2 Staging traps

- Google Analytics `G-X69T3QE3GG` e Microsoft Clarity `wylmfczjap` sono hardcoded in `app/layout.jsx`: Preview deve disabilitarli o usare un ambiente separato.
- `InstallAppPrompt` è globale: Preview deve disattivarlo per evitare installazioni staging.
- Manifest PWA già esiste (`display: standalone`, orientation portrait). Non riscriverlo nella prima slice.
- Deep link/query correnti (`openCoach`, `openAssistantChat`, `openGameAnalysis`, `openCardAdvisor`) vanno preservati o mappati con compatibilità durante la transizione.

# 17. Event glue e contratti invisibili

Molti componenti comunicano tramite eventi `window/document`. Un componente può sembrare “solo UI” ma essere listener/dispatcher. Nessun prompt deve eliminare componenti/eventi senza mappa impatto.

| Evento | Esempi di uso / rischio |

| --- | --- |

| `open-assistant-chat` | Dashboard apre la chat popup con messaggio precompilato. |

| `coach-feedback-visibility-change` | Evita sovrapposizione tra AssistantChat e Palestra. |

| `open-game-analysis-modal` | Hero/CTA apre statistiche. |

| `open-card-advisor-entry` | Apertura Card Advisor da home. |

| `open-live-coach` | Apertura Live Coach. |

| `credits-consumed` / `credits-accredited` | Refresh saldo/quest/journey. |

| `knowledge-should-refresh` | Refresh Knowledge dopo profilo/Palestra/stats. |

| `match-saved` | Refresh Knowledge, MissionCenter, TaskWidget. |

| `diagnostic-updated` | Aggiornamento task e contesto. |

| `coach-profile-updated` | Dashboard aggiorna stato profilo Coach. |

> **REGOLA CURSOR** Prima di rimuovere/ricreare un componente, cercare sempre `dispatchEvent`, `addEventListener`, query-param listener, context provider e import indiretti. Durante UX V2 preferire adapter/wrapper rispetto a cancellazioni.


# 18. Mappa dati critica e intrecci

| Dato/Tabella | Consumatori principali | Conseguenza se cambia |

| --- | --- | --- |

| `user_profiles` | Auth mapping, Hero, Palestra, Card Advisor, countermeasures, match analysis, credits, tasks, Knowledge, Live | ALTISSIMA: non cambiare schema/semantica in UX. |

| `user_tactical_feedback` | Diagnostic, Card Advisor, countermeasures, Live Coach, Knowledge | ALTISSIMA per “memoria Hero”. |

| `user_diagnostic_cache` | Hero Chat, Card Advisor, Live Coach, refresh flows | Cache non è source of truth; gestire stale. |

| `matches` | Patterns, aggregates, tasks, Hero, progressi | CRUD ha side effect; test delete/update. |

| `team_tactical_patterns` | Hero, Card Advisor, countermeasures, dashboard, tasks | Pattern derivato: non editarlo dalla UI. |

| `user_game_analysis` | Hero, Card Advisor, countermeasures, Live | One-row-per-user latest stats; non trattarlo come storico. |

| `players` / `formation_layout` | Rosa, Hero, Card Advisor, coach analysis | Slot e layout sono contratto operativo. |

| `coaches` / `coach_catalog` | Rosa, Hero, Card Advisor | `is_active` è contesto essenziale. |

| `weekly_goals` | Task/Piano Coach, Knowledge | GET lista ha side effect di generazione/progresso. |

| `credit_transactions` / `user_credit_usage` | Wallet UI, Hero journey, analytics prodotto | Tracking locale; saldo reale MetalGate per utenti MG. |


# 19. Auth e MetalGate: preservare integralmente nello sprint UX


## 19.1 Flusso verificato

```
/login
  -> NEXT_PUBLIC_METALGATE_LOGIN_URL
  -> /auth/callback
  -> /api/auth/metalgate-callback
  -> user_profiles mapping metalgate_user_id
  -> localStorage: metalgate_user + auth_token
  -> /login-success
  -> app
```

- `validateToken` prova la verifica MetalGate SSO e costruisce metadata `is_metalgate_user`/`metalgate_user_id`.
- Tutti i 630 profili eFootball verificati risultano MetalGate con mapping distinto.
- NON cambiare SSO, callback, token storage, mapping IDs o `authHelper` durante UX V2 senza prompt auth dedicato.
- Il token in localStorage è debito sicurezza da valutare separatamente; non fare migrazione cookie/session nel redesign.

# 20. Branching, staging e rollback


## 20.1 Git/Vercel

```
main ----------------------> PRODUCTION
  |
  +-- ux-redesign ----------> VERCEL PREVIEW / STAGING
       |
       +-- ogni slice = commit isolato + validazione
```

- Production branch Vercel deve restare `main`.
- Prima di ogni prompt: `git status`, branch, HEAD SHA, latest remote state.
- Cursor non deve creare/merge/rebase su main durante le slice.
- Tag di rollback consigliato prima dello sprint (es. `pre-ux-v2-2026-08-12`).
- Preview URL stabile per branch; ogni push aggiorna solo preview.

## 20.2 Supabase staging levels

| Livello | Uso consentito | Vincoli |

| --- | --- | --- |

| L1 — Preview frontend su Supabase prod | Solo UX/layout + test controllati con account test | Niente schema/RLS/auth; niente test distruttivi; attenzione ai side effect e HP reali. |

| L2 — Supabase development branch | Test di contratti, migration, memoria, RLS e flussi scrittura isolati | Branch è data-less: serve seed sicuro; credenziali separate. |

| L3 — Produzione | Solo dopo gate completo | Nessuna sperimentazione diretta. |

> **REGOLA** Qualsiasi prompt che tocchi schema, RLS, auth, wallet, trigger, RPC, Edge Functions o contratti persistenti richiede L2 isolato o un piano di test equivalente approvato. Non testare questi cambi su utenti reali.



### 20.2.1 Decisione owner — database durante il lavoro UX

> **DECISIONE OPERATIVA** Durante il redesign UX V2 non si duplica il database e non si ricostruisce Supabase. Lo staging Vercel usa inizialmente lo stesso Supabase eFootball e lo stesso collegamento MetalGate della produzione.

Questa scelta vale per le slice di presentazione, navigazione, shell, Home Coach, responsive, progressive disclosure di Rosa/Carte e altre modifiche UX che non richiedono alterazioni strutturali del motore dati.

Regole obbligatorie:

- usare un account test dedicato per qualunque azione che scrive dati;
- ricordare che ogni scrittura effettuata dallo staging modifica dati reali;
- non eseguire test distruttivi;
- non creare seed/copie DB inutili;
- non modificare migrations, schema, RLS, trigger, RPC, auth, wallet/HP, service role, Edge Functions o contratti persistenti senza prompt dedicato.

> **STOP CONDITION** Se una slice richiede realmente una modifica strutturale o rischiosa del database o dei contratti persistenti, Cursor deve fermarsi e riportarlo. Solo in quel momento si valuta L2 (Supabase development branch) o un ambiente isolato equivalente. Non introdurre un secondo database “per sicurezza” se la slice può essere validata sullo stesso database con account test e vincoli read-only/non distruttivi.

## 20.3 Feature flag

Il sistema attuale `lib/featureFlags.js` ha precedenza `localStorage > env > default`. Quindi una futura `UX_V2` non va usata come barriera di sicurezza se può essere forzata da localStorage in produzione. Per rollout: branch/staging resta barriera primaria; eventuale flag produzione deve essere non overridabile dai client oppure ristretto a tester.


# 21. WARNING & RISK REGISTER — sicurezza

> **NESSUNA MODIFICA ESEGUITA** Tutti i punti seguenti sono risultati di lettura/advisor. Non è stato applicato SQL, non sono state cambiate policy e non sono state distribuite Edge Functions.


## 21.1 P0 — MetalGate wallet / Data API

| Finding live | Gravità | Azione |

| --- | --- | --- |

| RLS disabilitato su `credentials`, `streamers`, `perc`, `streamer_notifications`, `ai_usage_logs` in schema public | P0 | Audit dedicato immediato. Non abilitare RLS alla cieca: prima mappare chiamanti/policy richieste. |

| RPC `add_credits`, `deduct_credits`, `process_referral_purchase` sono `SECURITY DEFINER` e advisor le segnala eseguibili da `anon`/`authenticated` | P0 | Audit ACL + owner + chiamanti. I corpi letti ricevono `p_user_id` e non mostrano controllo `auth.uid()` interno. |

| `credentials` contiene colonna `password` | P0/P1 | Verificare natura/formato e access surface; non includere dati sensibili in UI/log. |

Riferimenti Supabase: Database Advisors lint 0028/0029 (SECURITY DEFINER executable), RLS/Data API. Questi finding sono separati dalla UX e richiedono prompt sicurezza dedicato.


## 21.2 P0/P1 — eFootball Supabase

| Finding live | Gravità | Azione |

| --- | --- | --- |

| `atomic_slot_assignment` SECURITY DEFINER eseguibile da anon/auth secondo advisor | P0/P1 | Verificare grants; funzione accetta `p_user_id` e non usa `auth.uid()` nel corpo letto. |

| `get_user_id_by_email` SECURITY DEFINER eseguibile da anon/auth | P1 | Verificare se deve essere pubblico; potenziale exposure identificativi. |

| Funzioni refresh/catalog/trigger helper SECURITY DEFINER eseguibili da ruoli client | P1 | Restringere execute dopo mappa chiamanti; non in UX prompt. |

| `card_advisor_cards` e `card_advisor_releases`: RLS enabled ma nessuna policy | INFO/P1 | Attualmente route server/service role possono funzionare; non rendere accesso client diretto senza policy. |

| Leaked password protection Auth disabilitata | P1 | Valutare enable separatamente. |

| Alcune RLS usano `auth.uid()` senza `(select ...)` | P2 performance | Ottimizzare in hardening dedicato. |


## 21.3 Edge Functions in quarantena

Sono state rilevate 12 Edge Functions eFootball attive con `verify_jwt=false`, tra cui `process-screenshot`, `analyze-rosa`, import/scrape, GPT image/formation/ratings, `voice-coaching-gpt`, `realtime-proxy`. Nel codice Next.js corrente non sono emersi riferimenti diretti agli slug. Alcune funzioni lette usano vecchie tabelle (`players_base`, `user_rosa`, `player_builds`) e service role.

> **QUARANTENA** Non collegare, riscrivere o cancellare queste funzioni durante UX V2. Prima serve audit chiamanti/log/necessità e autenticazione per singola funzione.


# 22. WARNING & RISK REGISTER — coerenza/logica

| ID | Finding | Priorità | Regola |

| --- | --- | --- | --- |

| L-01 | Hero Chat perde dettaglio `user_tactical_feedback` quando diagnostic cache >6h | P1 | Fix chirurgico prima di claim forte “Hero ricorda”. |

| L-02 | `HeroCoachJourney` stato coach_chat apre Palestra invece della chat principale | P1 UX | Correggere nell’orchestrazione V2. |

| L-03 | `/api/tasks/list` genera/aggiorna dati su GET/list open | P1 | Preservare side effect finché non spostato consapevolmente. |

| L-04 | Task fallback statici presentano goal non personalizzati | P2 | Separare empty/error/personalized. |

| L-05 | Delete match non ricalcola esplicitamente pattern/performance come save/update | P2 | Quick fix dedicato + test. |

| L-06 | Knowledge usage usa proxy da match/players/goals, non vero usage Hero | P2 | Ricalibrare in fase Knowledge. |

| L-07 | Success score divisione usa `current > initial` | P2 | Verificare semantica e correggere con dati normalizzati. |

| L-08 | Divisioni salvate in formati eterogenei (`Division 1`, `D1`, `Divisione 1`, typo…) | P2 | Normalizzazione separata; UI nuova usa select controllato senza migrare alla cieca. |

| L-09 | Knowledge schema comment e formula codice non coincidono | P3 | Allineare docs/comment dopo decisione formula. |

| L-10 | Analytics e Install Prompt attivi anche su Preview se non condizionati | P1 staging | Fix S0. |


# 23. Quarantena e legacy

- `SMART_COACH_ENTRY` default false: Smart Coach non deve ricomparire come nuovo ingresso durante UX V2.
- `smart_coach_contexts` ha dati ma usage limitato; mantenere route finché non si decide decommission.
- Vecchie Edge Functions Supabase con tabelle legacy: non usare come shortcut per implementare nuove UX.
- Vecchi componenti dashboard/nav non si cancellano nella prima slice: possono fungere da fallback dietro branch/flag finché la nuova UX non passa regression test.
- Non creare un secondo sistema di stato/credits/profile in parallelo solo perché la UI nuova è diversa.

# 24. STANDARD OBBLIGATORIO PER OGNI PROMPT CURSOR

> **POLICY** ChatGPT è il prompt owner e validator. Cursor non riceve prompt generici tipo “rifai la pagina”. Ogni prompt deve essere una specifica implementativa con confini verificabili.


## 24.1 Blocco 1 — PRE-FLIGHT

```
PRIMA DI MODIFICARE:
1. git status --short --branch
2. git branch --show-current
3. git rev-parse HEAD
4. verifica branch autorizzato e working tree
5. identifica i file reali coinvolti e i loro consumer
6. se sei su main o branch diversa: STOP, nessuna modifica
7. non creare branch/merge/rebase autonomamente salvo istruzione esplicita
```


## 24.2 Blocco 2 — SCOPE AUTORIZZATO

Il prompt deve enumerare file/aree modificabili e risultato atteso. “Solo UX” non è sufficiente: specificare shell, componenti, route, eventi e stato.


## 24.3 Blocco 3 — TENERE / PRESERVARE

Ogni prompt deve elencare esplicitamente logiche, API, eventi, dati, accessibility behavior, deep links, costi HP e side effect che devono sopravvivere.


## 24.4 Blocco 4 — BYPASS UX

Elencare ciò che non sarà più ingresso principale ma deve restare disponibile dietro la nuova orchestrazione. Esempio: Palestra separata, Statistiche tab, Mission widget. BYPASS non permette mai di bypassare auth/RLS/crediti.


## 24.5 Blocco 5 — NON TOCCARE

```
DEFAULT UX SPRINT — NON TOCCARE salvo autorizzazione esplicita:
- migrations / schema / RLS / trigger / RPC
- authHelper / MetalGate SSO / callback / token mapping
- creditService / wallet / prezzi / refund
- RAG info_rag.md / ragHelper / prompt AI core
- catalog sync scripts / import pipeline
- Edge Functions legacy
- service role / env secrets
- route API contract esistente
- dati di produzione / cleanup massivo
- nuove dipendenze UI/framework non necessarie
```


## 24.6 Blocco 6 — VARIANTI E STATI

Ogni prompt visuale deve elencare almeno: loading, empty, partial data, success, error, unauthorized/session expired, low HP se l’azione costa, mobile keyboard/focus, returning user e stato con dati legacy.


## 24.7 Blocco 7 — RESPONSIVE

Specificare behavior desktop/tablet/mobile e non solo “responsive”. Inserire viewport acceptance e safe-area. Per modali complessi definire trasformazione in sheet/fullscreen su mobile.


## 24.8 Blocco 8 — DATA/API CONTRACT

Per ogni CTA indicare: sorgente dati reale, API/route esistente, side effect, evento dispatchato/ascoltato e fallback. Se il dato non esiste: UI onesta, non hardcode.


## 24.9 Blocco 9 — STOP CONDITIONS

```
STOP E RIPORTA, SENZA “AGGIUSTARE” AUTONOMAMENTE, SE:
- serve modificare DB/schema/RLS/auth/wallet/RAG fuori scope
- trovi un contratto dati incompatibile con la reference
- la branch è main o non verificabile
- la build baseline è già rotta e impedisce attribuzione del regressione
- una modifica richiede nuova dependency non autorizzata
- per far funzionare la UI dovresti inventare dati/fake success
- il test richiede consumare HP reali senza account test/piano approvato
- trovi un problema sicurezza P0 non correlato alla slice
```


## 24.10 Blocco 10 — QUALITY GATE / OUTPUT

- Build reale (`npm run build`) obbligatoria. `npm run lint` solo se lo script è effettivamente supportato dalla versione/config; non mascherare failure.
- Nessun errore console nuovo nelle route toccate.
- Regressione route e CTA collegate.
- Responsive viewport minimi definiti nella slice.
- Diff contenuto: file modificati, perché, contratti preservati, rischi residui.
- Commit solo sul branch autorizzato con messaggio definito nel prompt.
- Mai merge/push a main se non richiesto dall’owner.

# 25. PROTOCOLLO DI VALIDAZIONE CHATGPT DOPO OGNI LAVORO CURSOR

1. Risolvo il repository/branch/HEAD effettivo e confronto il commit con la baseline della slice.
1. Leggo il diff reale; non valuto sulla base del report scritto da Cursor.
1. Controllo import, component tree, route, eventi e query param coinvolti.
1. Cerco modifiche fuori scope: migrations, auth, RAG, creditService, service role, Edge Functions, catalog scripts.
1. Verifico contratti API: body, status code, error/402, side effect, deep link e compatibility.
1. Verifico Supabase in sola lettura quando la slice tocca dati: tabelle, righe test, trigger/policy pertinenti, senza modificare produzione.
1. Controllo che non siano stati introdotti dati demo/hardcoded presentati come reali.
1. Eseguo/valuto build e test esistenti; distinguo errori baseline da regressioni nuove.
1. Verifico responsive e accessibilità minima: focus, keyboard, aria/dialog, safe area, mobile scroll.
1. Verifico HP/economia per ogni CTA AI: costo visibile, 402, credits events e nessun doppio addebito inatteso.
1. Verifico i flussi esistenti che il componente alimentava anche se non più visibile (task generation, Knowledge refresh, events).
1. Classifico risultato: PASS / PASS CON WARNINGS / FIX REQUIRED / BLOCKED. Solo PASS può avanzare alla slice successiva.

## 25.1 Formato report di validazione

```
VALIDAZIONE SLICE <N>
Commit/branch: ...
Esito: PASS | PASS CON WARNINGS | FIX REQUIRED | BLOCKED

1. Scope rispettato
2. Qualità codice
3. UX + responsive
4. Contratti preservati
5. Dati/Supabase
6. HP/Auth/Security
7. Regressioni
8. Warning residui
9. Next action autorizzata
```


# 26. Roadmap implementativa raccomandata

| Slice | Obiettivo | Cosa può toccare | Cosa NON deve toccare |

| --- | --- | --- | --- |

| S0 — Safety/Staging | Branch preview, analytics/install staging off, rollback guard | layout env gating, staging badge, branch config | DB, auth, wallet, RAG |

| S1 — Shell | Nav 3 pilastri + account utilities | AppLayoutShell, Sidebar/BottomNav/TopBar adapters | core pages/API |

| S2 — Coach Home | Home semplice + Next Action façade | app/page, wrapper components, existing state APIs | task backend semantics, AI prompt |

| S3 — Conversation façade | Hero unica visualmente, routing Palestra/Chat | new wrapper/orchestrator, existing Assistant/Palestra components | merge backend endpoints |

| S4 — Memory Context | Hero ricorda feedback oltre cache 6h | assistant context builder/diagnostic refresh con test | RAG knowledge corpus, schema memoria |

| S5 — Memory Consent | Card “Vuoi che lo ricordi?” | structured UI + existing save contracts | economia HP senza decisione owner |

| S6 — Onboarding | Setup reale rosa+coach | onboarding facade + existing picker flows | deep roster refactor |

| S7 — Rosa UX | Progressive disclosure | nuova-rosa-lab presentation/component extraction controllata | slot semantics/catalog APIs |

| S8 — Carte UX | Semplifica Card Advisor | Card Advisor page presentation | evaluation/deep backend |

| S9 — Utilities | Account/Memory/HP/Daily reward | profile/wallet UI adapters | MetalGate wallet logic |

| S10 — Coach tools | Stats, matches, counters, live, progress as contextual tools | navigation/orchestrator | engine rewrite |

| S11 — Regression/Rollout | E2E, mobile, PWA, rollout | bugfix scope only | feature creep |

> **P0 SICUREZZA** Le issue MetalGate/eFootball SECURITY DEFINER/RLS/Edge Functions NON devono essere infilate in S0–S11. Preparare una workstream SECURITY separata con prompt dedicati, test e rollback. L’unica eccezione è se bloccano direttamente staging/rollout.


# 27. Acceptance criteria per area


## 27.1 Coach

- Una sola identità Hero percepita; nessuna CTA “Palestra” obbligatoria per capire il prodotto.
- Domanda normale usa assistant engine; feedback/profile usa Palestra engine senza perdita dati.
- Non possono essere aperte due chat concorrenti/sovrapposte.
- Memoria salvata è distinguibile da messaggio temporaneo e ha consenso.
- CTA generate dalla UI puntano a funzioni reali e rispettano HP.

## 27.2 Rosa

- Catalog picker reale
- 11 slot + riserve coerenti
- coach/tattiche persistono
- nessuna perdita build/booster/skills
- mobile usable senza overflow/blocco keyboard

## 27.3 Carte

- Release attive reali
- fit usa rosa reale
- deep analysis mantiene contesto
- 2 HP/402 coerenti
- gold accent riservato Carte/premium

## 27.4 Utility

- HP refresh corretto dopo consumo/accredito
- Daily reward idempotente
- account/logout funzionante
- lingua IT/EN
- Tornei resta raggiungibile
- install prompt solo ambienti autorizzati

# 28. Design system UX V2

- Dark premium: charcoal/navy, non nero piatto ovunque.
- Cyan = interaction/Coach; Gold = Carte/HP/premium; Green = success; Red/Amber = error/warning.
- Glow ridotto: usarlo per stato/CTA, non su ogni card.
- Più spazio bianco/negativo, meno dashboard density.
- Gerarchia: 1 primary action, max 3 suggestions; il resto dietro dettaglio.
- No dipendenza nuova solo per stile. Riutilizzare CSS/componenti esistenti; non introdurre Tailwind/shadcn nello sprint salvo decisione esplicita.
- Immagini reference sono direzione: testi/dati al loro interno NON sono contratti e possono essere fake visuali.

# 29. Reference visuali — direzione, NON source of truth funzionale

Le reference seguenti rappresentano il tono visivo e la semplificazione. Qualsiasi nome, statistica, match, carta o coach mostrato nelle immagini va ignorato se non proviene dal prodotto reale.


# 30. Evidenze principali — code paths verificati

| Area | File/route chiave |

| --- | --- |

| Shell/navigation | `components/AppLayoutShell.jsx`, `SidebarNew.jsx`, `BottomNavigation.jsx`, `TopBar.jsx`, `app/layout.jsx` |

| Home | `app/page.jsx`, `HeroCoachJourney.jsx`, `TaskWidget.jsx`, `MissionCenter.jsx`, `CoachSuggestions.jsx`, `AIKnowledgeBar.jsx` |

| Hero Chat | `components/AssistantChat.jsx`, `app/api/assistant-chat/route.js` |

| Palestra | `components/CoachFeedbackChat.jsx`, `/api/coach-feedback-chat`, `/api/save-coach-feedback`, `/api/supabase/save-ai-info` |

| RAG | `lib/ragHelper.js`, `info_rag.md` |

| Diagnostic/memory | `lib/diagnosticBuilder.js`, `/api/refresh-diagnostic`, `user_diagnostic_cache`, `user_tactical_feedback` |

| Knowledge | `lib/aiKnowledgeHelper.js`, `/api/ai-knowledge` |

| Rosa | `app/nuova-rosa-lab/page.jsx`, `/api/formation`, player/coach catalog routes, tactical settings APIs |

| Carte | `app/card-advisor-lab/page.jsx`, `/api/card-advisor-lab/*` |

| Match/Stats | `app/match*`, `GameAnalysisModal.jsx`, match/save/update/delete/extract routes |

| Countermeasures | `app/contromisure-pre-partita`, `/api/generate-countermeasures` |

| Live | `LiveCoachLauncher.jsx`, `/api/live-coach/*`, `lib/liveCoachContext.js`, `liveCoachPricing.js` |

| Credits | `CreditsBar.jsx`, `DailySpinWidget.jsx`, `lib/creditService.js`, `/api/credits/*`, `/api/daily-spin` |

| Auth | `lib/authHelper.js`, `/api/auth/metalgate-callback`, `/auth/callback`, `/login`, `/login-success` |

| Feature flags | `lib/featureFlags.js` |


## 30.1 Supabase projects verificati

| Project | Ref | Ruolo |

| --- | --- | --- |

| eFootball | zliuuorrwdetylollrua | Dati prodotto, rosa, partite, context, Card Advisor, tracking HP locale |

| MetalGate | nglwdlahfebrfucilein | Identità/SSO, wallet Hero Points, transazioni/accrediti upstream |


## 30.2 Documentazione ufficiale consultata per le regole di sicurezza/staging

- Supabase Branching: https://supabase.com/docs/guides/deployment/branching

- Supabase Storage Access Control: https://supabase.com/docs/guides/storage/security/access-control

- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security

- Supabase Security Definer Advisors 0028: https://supabase.com/docs/guides/database/database-advisors?queryGroups=lint&lint=0028_anon_security_definer_function_executable

- Supabase Security Definer Advisors 0029: https://supabase.com/docs/guides/database/database-advisors?queryGroups=lint&lint=0029_authenticated_security_definer_function_executable


# 31. Regola finale di governo

> **NESSUNA IMPROVVISAZIONE** Da questo momento, prima di dare un prompt Cursor, ChatGPT deve verificare il codice/commit corrente, classificare la slice, rileggere i vincoli pertinenti di questo master e includere TENERE/BYPASS/NON TOCCARE. Dopo l’implementazione, ChatGPT deve validare il diff e i dati reali, non il racconto dell’agente.

Se una nuova scoperta modifica una regola di questo documento, non si ignora il Master: si crea una nuova revisione (v1.1, v1.2…) con changelog, così le future chat e fonti mantengono una cronologia coerente.


## 31.1 Changelog

| Versione | Data | Modifica |

| --- | --- | --- |

| 1.0 | 12 agosto 2026 | Prima baseline enterprise: UX V2, preservazione motori, staging, prompt governance, validation governance, warning sicurezza e debiti logici verificati. |

| 1.1 | 13 agosto 2026 | Decisione owner consolidata: durante il lavoro UX V2 lo staging usa inizialmente lo stesso Supabase/MetalGate di produzione; nessuna duplicazione o ricostruzione DB necessaria. Test di scrittura solo con account test; ambiente DB isolato solo quando una slice richiede modifiche strutturali/persistenti. |
