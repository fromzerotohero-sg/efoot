# Guida Deploy Produzione

**Setup da zero su Vercel + Supabase**

---

## 1. Prerequisiti

- Account Vercel (vercel.com)
- Account Supabase (supabase.com)
- Account Stripe (stripe.com)
- Account OpenAI (platform.openai.com)
- Dominio (opzionale, consigliato)

---

## 2. Setup Supabase

### 2.1 Crea Progetto
1. Vai su supabase.com → New Project
2. Nome: `efootball-ai-coach`
3. Region: `West Europe (Frankfurt)` (per utenti EU)
4. Piano: Free (o Pro per produzione)

### 2.2 Ottieni Credenziali
Vai su Project Settings → API:
- `URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` (sezione API > Project API keys) → `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **IMPORTANTE**: `service_role` bypassa RLS. Non condividerla mai client-side.

### 2.3 Esegui Migrations
Vai su SQL Editor → New query, esegui in ordine:

1. `migrations/create_user_profiles_table.sql`
2. `migrations/create_players_table.sql`
3. `migrations/create_matches_table.sql`
4. `migrations/create_coaches_table.sql`
5. `migrations/create_user_tactical_feedback.sql`
6. `migrations/create_leaderboard_snapshots_and_user_prizes.sql`
7. `migrations/add_ai_knowledge_to_user_profiles.sql`
8. ... (tutte le altre in ordine cronologico)

Oppure usa CLI:
```bash
supabase login
supabase db push
```

---

## 3. Setup Stripe

### 3.1 Configura Prodotto
1. Dashboard Stripe → Products → Add product
2. Nome: "Hero Points"
3. Crea 3 prices:
   - Starter: €10.00 (metadata: `hp=100`)
   - Standard: €20.00 (metadata: `hp=200`)
   - Pro: €50.00 (metadata: `hp=550`)

### 3.2 Ottieni Chiavi
Vai su Developers → API keys:
- `Publishable key` → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `Secret key` → `STRIPE_SECRET_KEY`

### 3.3 Webhook (opzionale ma consigliato)
Vai su Developers → Webhooks:
- Endpoint URL: `https://tuo-dominio.com/api/stripe/webhook`
- Events: `checkout.session.completed`, `invoice.paid`
- Signing secret → `STRIPE_WEBHOOK_SECRET`

---

## 4. Setup OpenAI

1. platform.openai.com → API keys
2. Create new secret key
3. Copia key → `OPENAI_API_KEY`
4. (Opzionale) Imposta limiti di spesa per sicurezza

---

## 5. Deploy Vercel

### 5.1 Importa Progetto
1. vercel.com → Add New Project
2. Importa da GitHub (repo)
3. Framework: Next.js

### 5.2 Environment Variables
Aggiungi tutte le variabili:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_APP_URL=https://tuo-dominio.vercel.app
```

### 5.3 Deploy
Clicca "Deploy"

---

## 6. Configurazioni Post-Deploy

### 6.1 Dominio Custom (opzionale)
Vercel Project → Settings → Domains:
- Aggiungi dominio personalizzato
- Configura DNS (record A/CNAME forniti da Vercel)

### 6.2 Supabase RLS Verification
Assicurati che RLS sia attivo:
```sql
-- Verifica stato RLS sulle tabelle principali
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'players', 'matches');
-- Dovrebbe restituire TRUE per tutte
```

### 6.3 Edge Functions Cleanup (IMPORTANTE)
Se avevi Edge Functions obsolete (verify_jwt=false):
1. Supabase Dashboard → Edge Functions
2. Elimina tutte le funzioni non usate
3. Verifica che il codice non faccia riferimento a queste funzioni

---

## 7. Checklist Pre-Go-Live

- [ ] Migrations eseguite correttamente
- [ ] Environment variables tutte configurate
- [ ] Stripe webhooks testati (modalità test)
- [ ] Email configurate (Supabase Auth → Auth Settings)
- [ ] Termini, Privacy, Cookie linkati nel footer
- [ ] Banner cookie implementato
- [ ] Rate limiting funzionante
- [ ] Backup automatici attivi (Supabase Pro)

---

## 8. Comandi Utili

```bash
# Dev locale
npm run dev

# Build test
npm run build

# Lint
npm run lint

# Supabase CLI (se installato)
supabase login
supabase db push
supabase db reset  # ATTENZIONE: cancella dati
```

---

## 9. Troubleshooting

### Errore 500 su API
- Verifica `SUPABASE_SERVICE_ROLE_KEY` corretta
- Controlla logs Vercel (Functions tab)

### RLS violazioni
- Verifica che le API usino `service_role` server-side
- Mai `anon_key` per operazioni sensibili

### Stripe non funziona
- Verifica che le chiavi siano di produzione (non test)
- Webhook endpoint HTTPS valido

---

**Deploy completato!** 🚀

Aggiornato: 14/02/2026
