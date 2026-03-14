# Classifica mensile – Implementazione tecnica

---
Stato: attivo  
Creato: 2026-02-13  
Aggiornato: 2026-02-13  
---

## 1. Panoramica

La **classifica mensile "From Zero to Hero"** premia l’utilizzo dell’app: partite, task, utilizzo IA e profilo. Tutti gli utenti **eleggibili** entrano in classifica (nessun consenso richiesto).

| Elemento | Valore |
|----------|--------|
| **Pagine** | Dashboard (`app/page.jsx`), `/classifica` (`app/classifica/page.jsx`) |
| **API** | `GET /api/leaderboard?month=YYYY-MM` |
| **Helper** | `lib/leaderboardHelper.js` |
| **Tabelle** | `leaderboard_snapshots`, `user_profiles`, `matches`, `weekly_goals`, `credit_transactions` |

---

## 2. Calcolo Punti Coach

Formula: **Punti = matches + tasks + usage_ia + profile + improvement**

| Componente | Cap | Punti per unità | Note |
|------------|-----|-----------------|------|
| **Partite complete** | 15 | 2 pt/partita + 1 pt qualità | Qualità = `photos_uploaded ≥ 1` oppure `team_stats` valorizzato |
| **Task completati** | 5 | 4 pt/task | Da `weekly_goals` con `status = 'completed'` nel mese |
| **Bonus crescita** | 4 | 3 pt/task | Solo goal_type: `reduce_goals_conceded`, `increase_wins`, `improve_possession`, `improve_defense` |
| **Utilizzo IA** | 20 | 0.5 pt/azione | Da `credit_transactions` type=usage |
| **Bonus varietà IA** | — | +5 pt | Se ≥ 3 tipi distinti di utilizzo (`description`) |
| **Profilo completo** | — | 5 pt fissi | Se `profile_completion_score` ≥ 80 |

---

## 3. Eleggibilità

Per entrare in classifica l’utente deve:

| Requisito | Valore |
|-----------|--------|
| Partite complete nel mese | ≥ 1 |
| Task completati nel mese | ≥ 0 |
| `profile_completion_score` | ≥ 50 |

**Consenso:** non richiesto. Tutti gli utenti che soddisfano i requisiti sopra sono inclusi.

---

## 4. Flusso API `/api/leaderboard`

1. **Parametri:** `month` (YYYY-MM, default = mese corrente)
2. **Autenticazione:** Bearer token opzionale; se presente, `currentUser` (rank, points, pointsBreakdown) viene aggiunto alla risposta
3. **Lettura:** `leaderboard_snapshots` per il mese
4. **Se snapshot vuoti:** chiamata a `computeLeaderboardForMonth` + `saveLeaderboardSnapshot`
5. **Se utente loggato non è negli snapshot:** ricalcolo del mese e salvataggio (retroattivo)
6. **Nickname:** da `user_profiles` (user_id, nickname) per tutti gli user_id negli snapshot
7. **Risposta:** `{ month, rankings: [{ rank, nickname, points }], currentUser?, daysLeftInMonth }`

**Rate limit:** 60 req/min per endpoint (config in `lib/rateLimiter.js`).

---

## 5. Quando viene ricalcolata

| Evento | Dove | Cosa |
|--------|------|-----|
| GET leaderboard senza snapshot | `app/api/leaderboard/route.js` | `computeLeaderboardForMonth` + `saveLeaderboardSnapshot` |
| Utente loggato non in snapshot | `app/api/leaderboard/route.js` | Ricalcolo + salvataggio (retroattivo) |
| Salvataggio profilo | `app/api/supabase/save-profile/route.js` | `computeLeaderboardForMonth` (perché `profile_completion_score` influisce sui punti) |

---

## 6. Tabelle database

### `leaderboard_snapshots`
- `month` (text, formato YYYY-MM)
- `user_id` (uuid, FK auth.users)
- `rank` (int)
- `points` (int)
- `points_breakdown` (jsonb)

### Dati usati per il calcolo
- **user_profiles:** `user_id`, `nickname`, `profile_completion_score`
- **matches:** `user_id`, `match_date`, `data_completeness`, `photos_uploaded`, `team_stats`
- **weekly_goals:** `user_id`, `goal_type`, `status`, `completed_at`
- **credit_transactions:** `user_id`, `type`, `description`, `created_at` (solo `type = 'usage'`)

---

## 7. UI

### Dashboard
- Card "Classifica mensile" con posizione utente e giorni alla fine del mese
- Link a `/classifica`
- Evento `leaderboard-updated` per refetch (es. dopo salvataggio profilo/impostazioni)

### Pagina `/classifica`
- Lista completa dei classificati (rank, nickname, points)
- Posizione utente loggato (anche fuori top 10)
- Breakdown punti (solo per utente loggato, se disponibile)

### Impostazioni profilo
- Nickname (mostrato in classifica; se vuoto → "—")
- Nessun checkbox consenso (rimosso: tutti gli eleggibili sono inclusi)

---

## 8. Riferimenti

- Design originale: [DESIGN_CLASSIFICA_MENSILE_E_PREMI.md](./DESIGN_CLASSIFICA_MENSILE_E_PREMI.md)
- PANORAMICA: [01-ARCHITETTURA/PANORAMICA_PROGETTO.md](../01-ARCHITETTURA/PANORAMICA_PROGETTO.md) (§ Classifica)
- Costanti calcolo: `lib/leaderboardHelper.js` (CAP_*, PTS_PER_*, MIN_*_ELIGIBILITY)
