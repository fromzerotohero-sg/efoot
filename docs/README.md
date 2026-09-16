# Documentazione attiva — From Zero To Hero

Aggiornato: 16 settembre 2026.  
**Fonte di verità:** codice corrente → Supabase live (read-only) → decisioni owner → questi documenti.

Git è lo storico. Non tenere pitch, confronti prima/dopo o specifiche obsolete nel ramo.

## Sistemi prodotto

| Sistema | Documento |
|---------|-----------|
| Auth / MetalGate | [sistemi/01-AUTH.md](./sistemi/01-AUTH.md) |
| Rosa / Formazione / Coach | [sistemi/02-ROSA.md](./sistemi/02-ROSA.md) |
| Partite / Vision / Contromisure | [sistemi/03-PARTITE.md](./sistemi/03-PARTITE.md) |
| Hero Chat | [sistemi/04-HERO-CHAT.md](./sistemi/04-HERO-CHAT.md) |
| Palestra Coach | [sistemi/05-PALESTRA-COACH.md](./sistemi/05-PALESTRA-COACH.md) |
| Card Advisor | [sistemi/06-CARD-ADVISOR.md](./sistemi/06-CARD-ADVISOR.md) |
| Crediti / HP | [sistemi/07-CREDITI.md](./sistemi/07-CREDITI.md) |
| Memoria / “Quanto ti conosce” | [sistemi/08-MEMORIA.md](./sistemi/08-MEMORIA.md) |
| Backend dormiente | [sistemi/09-BACKEND-DORMIENTE.md](./sistemi/09-BACKEND-DORMIENTE.md) |

## Contratti trasversali

| Documento | Ruolo |
|-----------|--------|
| [ARCHITETTURA.md](./ARCHITETTURA.md) | Stack, shell, pagine, cosa non riscrivere |
| [FLUSSI.md](./FLUSSI.md) | Flussi end-to-end |
| [FLUSSI_LOGICA_SUPABASE.md](./FLUSSI_LOGICA_SUPABASE.md) | Tabelle e side effect |
| [COSTI_HP_USO_PIATTAFORMA.md](./COSTI_HP_USO_PIATTAFORMA.md) | Unica fonte costi HP |
| [OPENAI_MODELLI.md](./OPENAI_MODELLI.md) | Modelli realmente usati |
| [SICUREZZA.md](./SICUREZZA.md) | Stato reale + rischi aperti |
| [DEPLOY.md](./DEPLOY.md) | Vercel + env + gate |

## Handoff Tommaso (MetalGate)

| Documento | Ruolo |
|-----------|--------|
| [../backend/handoff/TOMMASO.md](../backend/handoff/TOMMASO.md) | Perimetro, fatto, manca, non toccare |
| [../backend/handoff/ACCORGIMENTI_PER_TOMMASO.md](../backend/handoff/ACCORGIMENTI_PER_TOMMASO.md) | P0/P1 prima del cutover |
| [../backend/README.md](../backend/README.md) | Come avviare il backend spento |

## Operativo

| Documento | Ruolo |
|-----------|--------|
| [PLAYER_CATALOG_IMPORT.md](./PLAYER_CATALOG_IMPORT.md) | Import catalogo rosa |
| [CARD_ADVISOR_MANUAL_SUPABASE_IMPORT.md](./CARD_ADVISOR_MANUAL_SUPABASE_IMPORT.md) | Import Card Advisor |
| [CHATBOT_KNOWLEDGE_BASE.md](./CHATBOT_KNOWLEDGE_BASE.md) | Base supporto utenti |

## Legale (verifica legale obbligatoria)

| Documento | Nota |
|-----------|------|
| [LEGALE.md](./LEGALE.md) | Indice |
| [TERMINI.md](./TERMINI.md) | Condizioni |
| [PRIVACY.md](./PRIVACY.md) | Privacy |
| [COOKIE.md](./COOKIE.md) | Cookie effettivamente usati |

## Runtime, non documentazione

- `info_rag.md` (root) — corpus RAG letto da `lib/ragHelper.js`
- `public/backgrounds/README.md` — asset

## README di cartella

- [../README.md](../README.md)
- [../app/README.md](../app/README.md)
- [../app/api/README.md](../app/api/README.md)
- [../components/README.md](../components/README.md)
- [../lib/README.md](../lib/README.md)

## Fuori prodotto (non documentare come feature)

Tasks UI · Live Coach · Classifica · Starter Pack · Stripe/PayPal in-app · vector-RAG
