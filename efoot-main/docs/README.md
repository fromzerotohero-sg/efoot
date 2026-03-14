# From Zero to Hero — Documentazione

**Prodotto:** From Zero to Hero (eFootball AI Coach). Piattaforma di coaching tattico personale per eFootball.

---

## 📚 Documentazione per Servizio

Ogni documento descrive un servizio completo: API, componenti, database, sicurezza.

| # | Servizio | Documento | Descrizione |
|---|----------|-----------|-------------|
| 1 | **Auth** | [servizi/01-AUTH.md](./servizi/01-AUTH.md) | Login, JWT, sessioni, RLS |
| 2 | **Rosa** | [servizi/02-ROSA.md](./servizi/02-ROSA.md) | Giocatori, formazione, upload |
| 3 | **Partite** | [servizi/03-PARTITE.md](./servizi/03-PARTITE.md) | Match, analisi, pattern |
| 4 | **Chat AI** | [servizi/04-CHAT.md](./servizi/04-CHAT.md) | Assistant, RAG, prompt |
| 5 | **Palestra Coach** | [servizi/05-PALESTRA-COACH.md](./servizi/05-PALESTRA-COACH.md) | Feedback, training AI |
| 6 | **Classifica** | [servizi/06-CLASSIFICA.md](./servizi/06-CLASSIFICA.md) | Leaderboard, premi |
| 7 | **Crediti** | [servizi/07-CREDITI.md](./servizi/07-CREDITI.md) | HP, Stripe, pagamenti |
| 8 | **Task** | [servizi/08-TASK.md](./servizi/08-TASK.md) | Obiettivi settimanali, use_ai_recommendations |

---

## 📖 Altri Documenti

| Ruolo | Documento |
|-------|-----------|
| 👤 **Utenti** | [GUIDA_UTENTE.md](./GUIDA_UTENTE.md) |
| ⚖️ **Legale** | [LEGALE.md](./LEGALE.md) + [TERMINI.md](./TERMINI.md) + [PRIVACY.md](./PRIVACY.md) |
| 👨‍💻 **Architettura** | [ARCHITETTURA.md](./ARCHITETTURA.md) |
| 🔒 **Sicurezza** | [SICUREZZA.md](./SICUREZZA.md) |
| 🚀 **Deploy** | [DEPLOY.md](./DEPLOY.md) |

### Audit e riferimenti tecnici

| Documento | Contenuto |
|-----------|-----------|
| [FLUSSI.md](./FLUSSI.md) | Flussi principali (auth, partite, classifica, profilo) |
| [FLUSSI_LOGICA_SUPABASE.md](./FLUSSI_LOGICA_SUPABASE.md) | Flussi per sezione e intersezioni con tabelle Supabase |
| [REVISIONE_LOGICA_PIATTAFORMA.md](./REVISIONE_LOGICA_PIATTAFORMA.md) | Revisione logica e checklist |
| [AUDIT_FLUSSO_RIDONDANZE_ALLINEAMENTO.md](./AUDIT_FLUSSO_RIDONDANZE_ALLINEAMENTO.md) | Audit ridondanze e allineamento |
| [AUDIT_COERENZA_ENTERPRISE.md](./AUDIT_COERENZA_ENTERPRISE.md) | Coerenza dashboard enterprise |
| [SICUREZZA_DOPPIA_LINGUA.md](./SICUREZZA_DOPPIA_LINGUA.md) | Messaggi errore/sessione IT/EN |
| [COSTI_HP_USO_PIATTAFORMA.md](./COSTI_HP_USO_PIATTAFORMA.md) | Costi HP per uso piattaforma |
| [VERIFICA_COERENZA_HP_DEFALCATI.md](./VERIFICA_COERENZA_HP_DEFALCATI.md) | Verifica coerenza HP defalcati e whitelist task |

---

## 🏗️ Stack (TL;DR)

```
Next.js 14 + React 18 + Supabase (PostgreSQL) + OpenAI GPT-4o + Stripe + Vercel
```

---

## 📂 Struttura Progetto

```
app/                    # Next.js App Router
├── api/               # API Routes (backend)
│   ├── assistant-chat/
│   ├── coach-feedback-chat/
│   ├── save-coach-feedback/
│   ├── supabase/      # CRUD operations
│   └── ...
├── classifica/
├── gestione-formazione/
└── ...

components/            # React Components
├── CoachFeedbackChat.jsx
├── AssistantChat.jsx
└── ...

lib/                   # Business Logic
├── aiKnowledgeHelper.js
├── diagnosticBuilder.js
├── ragHelper.js
├── creditService.js
└── ...

migrations/            # SQL Supabase
docs/                  # Questa cartella
  ├── servizi/         # <-- Documentazione per servizio
  ├── ARCHITETTURA.md
  ├── SICUREZZA.md
  └── ...
```

---

## 🚀 Quick Start

```bash
# Installa
npm install

# Configura
cp .env.example .env.local
# Modifica .env.local con le tue chiavi

# Avvia
npm run dev
```

Vedi [DEPLOY.md](./DEPLOY.md) per produzione.

---

## 🔐 Sicurezza (Priorità #1)

Vedi [SICUREZZA.md](./SICUREZZA.md):
- Pattern autenticazione
- RLS su tutte le tabelle
- Rate limiting
- Gestione segreti

**TODO critico:**
- [ ] Rimuovere 12 Edge Functions obsolete
- [ ] Implementare audit log
- [ ] Redis per rate limiting

---

## ⚖️ Compliance Legale

Vedi [LEGALE.md](./LEGALE.md):
- [TERMINI.md](./TERMINI.md) — Condizioni d'uso
- [PRIVACY.md](./PRIVACY.md) — GDPR
- [COOKIE.md](./COOKIE.md) — Cookie Policy

---

## 📞 Supporto

- Email: support@efootballaicoach.com
- Docs: Questa cartella

---

*Documentazione aggiornata: 14/02/2026*
