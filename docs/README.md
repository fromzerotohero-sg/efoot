# Documentazione attiva — From Zero To Hero

Aggiornato: 15 settembre 2026. Audit storico, pitch, confronti prima/dopo e vecchie specifiche non restano nel ramo: Git è lo storico.

**Ordine delle fonti:** codice corrente → Supabase live (read-only) → decisioni owner → documenti tecnici attivi.

## Contratti tecnici

| Documento | Ruolo |
|-----------|--------|
| [ARCHITETTURA.md](./ARCHITETTURA.md) | Stack, shell, pilastri, cosa non riscrivere |
| [FLUSSI.md](./FLUSSI.md) | Flussi auth, chat, rosa, partite, HP, task |
| [FLUSSI_LOGICA_SUPABASE.md](./FLUSSI_LOGICA_SUPABASE.md) | Tabelle, side effect, intrecci |
| [COSTI_HP_USO_PIATTAFORMA.md](./COSTI_HP_USO_PIATTAFORMA.md) | Unica fonte costi HP |
| [SICUREZZA.md](./SICUREZZA.md) | Stato reale + rischi aperti |
| [DEPLOY.md](./DEPLOY.md) | Vercel + MetalGate + Supabase |

## Servizi (contratti corti)

| Servizio | Documento |
|----------|-----------|
| Auth | [servizi/01-AUTH.md](./servizi/01-AUTH.md) |
| Rosa | [servizi/02-ROSA.md](./servizi/02-ROSA.md) |
| Partite | [servizi/03-PARTITE.md](./servizi/03-PARTITE.md) |
| Chat Hero | [servizi/04-CHAT.md](./servizi/04-CHAT.md) |
| Palestra (motore interno) | [servizi/05-PALESTRA-COACH.md](./servizi/05-PALESTRA-COACH.md) |
| Crediti / MetalGate | [servizi/07-CREDITI.md](./servizi/07-CREDITI.md) |
| Task | [servizi/08-TASK.md](./servizi/08-TASK.md) |

Non esiste un servizio Classifica nel codice corrente (`/classifica`, `/api/leaderboard` assenti).

## Operativo

| Documento | Ruolo |
|-----------|--------|
| [02-FUNZIONALITA/OPENAI_MODEL_GPT5.md](./02-FUNZIONALITA/OPENAI_MODEL_GPT5.md) | Mappa modelli realmente usati |
| [PLAYER_CATALOG_IMPORT.md](./PLAYER_CATALOG_IMPORT.md) | Catalogo rosa: regole + tool presenti |
| [CARD_ADVISOR_MANUAL_SUPABASE_IMPORT.md](./CARD_ADVISOR_MANUAL_SUPABASE_IMPORT.md) | Import Card Advisor con script esistenti |
| [CHATBOT_KNOWLEDGE_BASE.md](./CHATBOT_KNOWLEDGE_BASE.md) | Unica base supporto |

## Legale (da verificare con legale)

| Documento | Nota |
|-----------|------|
| [LEGALE.md](./LEGALE.md) | Indice. Fatti prodotto aggiornati; titolare/P.IVA placeholder. |
| [TERMINI.md](./TERMINI.md) | MetalGate, no Stripe/classifica. Verifica legale obbligatoria. |
| [PRIVACY.md](./PRIVACY.md) | Stesso. |
| [COOKIE.md](./COOKIE.md) | Stato implementato, non la policy desiderata. |

## Runtime, non documentazione

- `info_rag.md` (root) — corpus RAG letto da `lib/ragHelper.js`. Non modificare in uno sprint docs/UX.
- `public/backgrounds/README.md` — asset sfondo.
- `version.txt` — metadato build.

## README di cartella

- [../README.md](../README.md)
- [../app/README.md](../app/README.md)
- [../app/api/README.md](../app/api/README.md)
- [../components/README.md](../components/README.md)
- [../lib/README.md](../lib/README.md)
