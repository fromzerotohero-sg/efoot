# Valutazione Economica — eFootball AI Coach

**Data:** 2026-02-13
**Pricing:** 200 HP (Hero Points) = 20 EUR prepagati
**Modello:** Prepagato. Il cliente paga prima, usa dopo. HP finiti = ricarica o stop.
**Modello AI:** GPT-4o (OpenAI)

---

## 1. COSTO PER OPERAZIONE

| Operazione | HP al cliente | Tuo costo OpenAI |
|---|---|---|
| Chat principale (1 msg) | 1 HP | $0.03 |
| Palestra Coach (1 msg) | 1 HP | $0.03 |
| Palestra Coach (salvataggio) | 1 HP | $0.03 |
| Upload giocatore (1 foto) | 2 HP | $0.06 |
| Upload allenatore (1 foto) | 2 HP | $0.06 |
| Partita (1 sezione, max 5) | 2 HP | $0.05 |
| Contromisure (generazione) | 3 HP | $0.10 |
| Extract formazione avversaria | 3 HP | $0.08 |
| Extract statistiche gioco | 3 HP | $0.08 |
| Analisi partita (riassunto) | 4 HP | $0.13 |

---

## 2. PROFILAZIONE COMPLETA (3 foto per giocatore)

| Azione | Dettaglio | HP |
|---|---|---|
| 11 titolari (card + stats + skills) | 11 × 3 foto × 2 HP | 66 |
| 12 riserve (card + stats + skills) | 12 × 3 foto × 2 HP | 72 |
| 1 allenatore | 1 foto | 2 |
| Palestra Coach (profilo base) | 5 msg + save | 6 |
| **TOTALE PROFILAZIONE** | | **146 HP** |

**Tuo costo profilazione: $4.38 (4.04 EUR)**

---

## 3. COSA RESTA AL CLIENTE DOPO LA PROFILAZIONE

| | HP |
|---|---|
| Budget acquistato | 200 |
| Profilazione completa | -146 |
| **Disponibili** | **54 HP** |

Con 54 HP puo fare circa:
- 3 partite con feedback e chat (51 HP)
- Oppure 4 contromisure con chat (44 HP)
- Oppure 54 messaggi chat

---

## 4. MARGINALITA PER CLIENTE

**Modello prepagato: il cliente paga 20 EUR prima. Il rischio per-cliente non esiste.**

| Scenario | HP usati | Tuo costo OpenAI | Tuo costo totale | Margine |
|---|---|---|---|---|
| Usa tutti i 200 HP | 200 | 5.25 EUR | 5.25 EUR | **14.75 EUR (74%)** |
| Usa 130 HP (media) | 130 | 3.65 EUR | 3.65 EUR | **16.35 EUR (82%)** |
| Usa 60 HP (light) | 60 | 1.95 EUR | 1.95 EUR | **18.05 EUR (90%)** |
| Non li usa | 0 | 0 EUR | 0 EUR | **20.00 EUR (100%)** |

---

## 5. COSTI FISSI MENSILI

| Servizio | Costo |
|---|---|
| Supabase Pro | 25 EUR |
| Vercel Pro | 20 EUR |
| Dominio | 1 EUR |
| **Totale** | **46 EUR** |

**Breakeven: 3 clienti** (60 EUR incasso - 46 EUR fissi - ~10 EUR OpenAI = +4 EUR)

---

## 6. PROIEZIONE A VOLUME

| Clienti | Incasso | OpenAI | Fissi | Margine netto | % |
|---|---|---|---|---|---|
| 3 | 60 EUR | 10 EUR | 46 EUR | 4 EUR | 7% |
| 10 | 200 EUR | 32 EUR | 46 EUR | 122 EUR | 61% |
| 25 | 500 EUR | 80 EUR | 46 EUR | 374 EUR | 75% |
| 50 | 1.000 EUR | 160 EUR | 46 EUR | 794 EUR | 79% |
| 100 | 2.000 EUR | 320 EUR | 46 EUR | 1.634 EUR | 82% |
| 500 | 10.000 EUR | 1.600 EUR | 70 EUR | 8.330 EUR | 83% |

(OpenAI calcolato su media 130 HP/cliente)

---

## 7. DAL SECONDO MESE

I giocatori sono gia caricati. Il cliente usa HP solo per partite, chat, contromisure e feedback.

| | Primo mese | Dal secondo mese |
|---|---|---|
| HP tipici consumati | ~150 | ~80-120 |
| Tuo costo OpenAI | ~4.80 EUR | ~2.50-3.50 EUR |
| Margine per cliente | ~15 EUR | ~16-17 EUR |
