# Prossimi Upgrade Contromisure

## Obiettivo
Rendere `contromisure-pre-partita` piu' coerente con cio' che e' realmente visibile in una singola foto della formazione avversaria, mantenendo l'output finale asciutto e operativo.

## Principi
- Nessuna fonte deve essere primaria: foto, modulo, rosa cliente, coach, storico, pattern, feedback e RAG devono essere incrociati.
- L'output finale deve restare sintetico: il sistema puo' ragionare internamente sui pattern visivi, ma non deve spiegarli all'utente.
- Da una sola foto vanno trattati come affidabili soprattutto modulo, giocatori, coach, disposizione reale sul campo e pattern spaziali.
- `playing_style`, `tactical_style` e `overall_strength` non devono essere il centro del flusso da questa schermata.

## Upgrade Prioritari

### 1. `app/api/extract-formation/route.js`
- Mantenere forte l'estrazione di:
  - `formation`
  - `players`
  - `coach`
  - `slot_index`
- Aggiungere segnali interni per il reasoning:
  - coordinate relative dei giocatori sul campo
  - `visual_tactical_profile`
- Il `visual_tactical_profile` deve coprire solo pattern visivi concreti:
  - `width_profile`
  - `side_bias`
  - `central_density`
  - `isolated_striker`
  - `weak_side`
  - `attackable_zones`

### 2. `app/api/supabase/save-opponent-formation/route.js`
- Salvare i nuovi segnali visivi dentro `extracted_data`
- Non stravolgere lo schema top-level in questa fase
- Mantenere compatibilita' col flusso attuale

### 3. `app/api/generate-countermeasures/route.js`
- Usare i segnali visivi dell'avversario come una fonte strutturata in piu'
- Incrociare sempre:
  - foto avversario
  - modulo dichiarato
  - rosa cliente
  - coach cliente
  - storico
  - `team_tactical_patterns`
  - `player_performance_aggregates`
  - feedback coach / game analysis
  - RAG eFootball
- Ogni contromisura deve sopravvivere a questo incrocio prima di essere emessa

### 4. `lib/countermeasuresHelper.js`
- Aggiungere una sezione interna di prompt dedicata al profilo visivo avversario
- Aggiungere una regola esplicita di incrocio multi-fonte
- Non cambiare il tono finale dell'output
- Non verbalizzare all'utente il ragionamento visivo

### 5. `info_rag.md` / `lib/ragHelper.js`
- Aggiungere una sezione specifica per mapping tra pattern visivi e leve tattiche
- Esempi da coprire:
  - squadra stretta -> ampiezza / cambi lato
  - overload su un lato -> attacco sul lato debole opposto
  - punta isolata -> schermare supporto
  - centro intasato -> non forzare il centro
  - canale lasciato libero -> attacco mirato del corridoio

## Tabelle e Logiche da Sfruttare Meglio
- `opponent_formations`: deve diventare piu' ricca nel significato tattico salvato
- `team_tactical_patterns`: utile come controllo di coerenza, oggi non pienamente sfruttata
- `player_performance_aggregates`: da integrare davvero nel motore contromisure
- `user_diagnostic_cache`: utile come sintesi enterprise, non come fonte primaria
- `user_tactical_feedback` e `user_game_analysis`: da usare come correttori finali di coerenza

## Cose da Non Toccare Subito
- Formato finale dell'output mostrato all'utente
- UI di `app/contromisure-pre-partita/page.jsx`
- Flusso `gestione-formazione`
- Refactor ampi del diagnostic system
- Riscritture pesanti del prompt senza prima migliorare il dato in ingresso

## Rischi
- Peggiorare un output che oggi e' gia' buono
- Dare troppo peso a segnali visivi rumorosi
- Gonfiare troppo `countermeasuresHelper.js`
- Creare conflitti tra foto, storico, coach e rosa

## Strategia Corretta
- Prima migliorare il dato visivo in ingresso
- Poi salvarlo in modo stabile
- Poi usarlo come fonte strutturata nell'incrocio decisionale
- Solo dopo rifinire prompt e RAG
