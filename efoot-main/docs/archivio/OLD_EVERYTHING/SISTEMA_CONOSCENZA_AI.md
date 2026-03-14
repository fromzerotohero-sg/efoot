# Sistema Conoscenza AI (AI Knowledge Score)

---
Stato: attivo  
Creato: 2026-02-13  
Aggiornato: 2026-02-13  
---

## Obiettivo

Indicare all’utente **quanto l’IA lo conosce** (0–100%) e guidarlo a completare profilo, rosa e partite per ottenere consigli migliori.

## Implementazione

- **Lib:** `lib/aiKnowledgeHelper.js`
- **API:** `GET /api/ai-knowledge` (legge profilo, rosa, partite, pattern, coach da Supabase e calcola lo score)
- **UI:** `components/AIKnowledgeBar.jsx` (barra in header + modale breakdown)
- **Aggiornamento:** dopo salvataggio partita, completamento task, e su richiesta dalla pagina Gestione Profilo

## Componenti dello score (totale 100%)

| Componente      | Peso  | Descrizione |
|-----------------|-------|-------------|
| Profilo         | 20%   | Campi compilati (nome, squadra, divisione, ecc.) |
| Rosa            | 25%   | 11 titolari + riserve + dati completi |
| Partite         | 30%   | Numero partite (max 10 considerate) |
| Pattern         | 15%   | Presenza e uso di formation_usage / playing_style_usage in `team_tactical_patterns` |
| Allenatore      | 10%   | Allenatore attivo in `coaches` |
| Utilizzo (bonus)| 10%   | Transazioni crediti / uso chat |
| Successi (bonus)| 15%   | Task completati, miglioramento divisione |

## Livelli

- **Beginner:** 0–30%
- **Intermediate:** 31–60%
- **Advanced:** 61–80%
- **Expert:** 81–100%

## Riferimenti

- Panoramica: [01-ARCHITETTURA/PANORAMICA_PROGETTO.md](../01-ARCHITETTURA/PANORAMICA_PROGETTO.md) (§7 Calcolo AI Knowledge Score)
- Tabella DB: `user_profiles` (`ai_knowledge_score`, `ai_knowledge_level`, `ai_knowledge_breakdown`)
