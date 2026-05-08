# Nuova Rosa - Metadata Promemoria

**Data:** 2026-05-08  
**Obiettivo:** fissare in modo semplice e operativo quali informazioni extra salvare dentro `players.metadata` per i giocatori creati dal catalogo, senza cambiare subito la tabella `players`.

---

## 1. Spiegazione semplice

`metadata` e una tasca extra gia presente dentro `players`.

Serve per salvare informazioni aggiuntive sul giocatore senza dover modificare subito la struttura del database.

Nel caso `Nuova Rosa`, il metadata serve per dire:

- da quale carta catalogo nasce questo player;
- quale immagine usare;
- quanto siamo sicuri del collegamento;
- come e stato creato.

---

## 2. Regola pratica V1

Per tutti i nuovi giocatori scelti dal catalogo:

- il player viene salvato normalmente in `players`;
- in piu si salva un piccolo blocco di informazioni dentro `metadata`.

Questo approccio e:

- sicuro in produzione;
- non breaking;
- sufficiente per partire;
- utile per la futura migrazione.

---

## 3. Campi minimi da salvare

Questi sono i campi minimi raccomandati.

## 3.1 Origine carta

- `catalog_source`
- `catalog_source_player_id`
- `catalog_card_instance_key`

### Significato semplice

- da dove arriva la carta;
- quale id aveva nella fonte;
- quale variante precisa era.

## 3.2 Identita carta

- `catalog_player_identity_key`
- `catalog_card_type`
- `catalog_pack_name`

### Significato semplice

- quale giocatore/identita era;
- che tipo di carta era;
- da quale pack o gruppo arriva.

## 3.3 Immagine

- `catalog_card_front_url`
- `catalog_card_back_url` opzionale

### Significato semplice

- URL della carta fronte;
- eventuale URL retro.

## 3.4 Tracciamento collegamento

- `catalog_link_method`
- `catalog_link_confidence`
- `catalog_linked_at`

### Significato semplice

- come e stato collegato;
- quanto siamo sicuri del collegamento;
- quando lo abbiamo fatto.

---

## 4. Valori consigliati

## 4.1 `catalog_link_method`

Valori consigliati:

- `catalog_picker`
- `manual_match`
- `backfill_auto`
- `backfill_suggested`

Per la V1 useremo soprattutto:

- `catalog_picker`

## 4.2 `catalog_link_confidence`

Valori consigliati:

- `high`
- `medium`
- `low`

Per i giocatori scelti direttamente dal picker:

- `high`

---

## 5. Cosa NON serve salvare subito

Non serve duplicare tutto il catalogo nel metadata.

Non salvare:

- tutte le stats complete una seconda volta se sono gia finite in `players`;
- tutte le skills catalogo se sono gia state mappate;
- tutto il payload catalogo originale intero se non serve.

Il metadata deve essere:

- leggero;
- utile;
- leggibile;
- orientato al collegamento.

---

## 6. Uso pratico del metadata nella UI

Con questi campi la nuova pagina puo:

- mostrare l immagine carta;
- sapere che il player viene dal catalogo;
- distinguere un player legacy da un player linked;
- aprire dettagli piu ricchi;
- evitare match ciechi in futuro.

---

## 7. Regola per utenti legacy

I vecchi `players` che non hanno questi campi:

- devono continuare a funzionare normalmente;
- non devono essere considerati rotti;
- non devono essere bloccati nella nuova pagina.

La UI deve supportare:

- player con metadata catalogo;
- player senza metadata catalogo.

---

## 8. Decisione finale

Per la V1 lab il metadata deve contenere almeno:

- `catalog_source`
- `catalog_source_player_id`
- `catalog_card_instance_key`
- `catalog_player_identity_key`
- `catalog_card_type`
- `catalog_pack_name`
- `catalog_card_front_url`
- `catalog_link_method`
- `catalog_link_confidence`
- `catalog_linked_at`

Questa e la base minima consigliata per partire in modo sicuro.
