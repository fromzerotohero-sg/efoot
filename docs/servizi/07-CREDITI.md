# Servizio: Crediti & Pagamenti (Hero Points)

**Sistema monetizzazione e gestione HP**

---

## 1. Overview

| Aspect | Dettaglio |
|--------|-----------|
| **Valuta** | Hero Points (HP) |
| **Modello** | Prepagato (pay-as-you-go) |
| **Acquisto** | Stripe / PayPal |
| **Consumo** | Per utilizzo servizi |
| **Validità** | 12 mesi dall'acquisto |

**Riferimenti:** [COSTI_HP_USO_PIATTAFORMA.md](../COSTI_HP_USO_PIATTAFORMA.md) (costi per operazione), [VERIFICA_COERENZA_HP_DEFALCATI.md](../VERIFICA_COERENZA_HP_DEFALCATI.md) (verifica coerenza addebiti e whitelist task).

---

## 2. Flusso Acquisto

### 2.1 Checkout Stripe
```
Utente → Seleziona pacchetto (Starter/Standard/Pro)
    ↓
POST /api/stripe/create-checkout-session
    ↓
Stripe Session creata
    ↓
Redirect a Stripe Checkout
    ↓
Pagamento completato
    ↓
Webhook stripe: checkout.session.completed
    ↓
POST /api/credits/accredit
    ↓
UPDATE user_credit_usage SET credits_included = credits_included + X
    ↓
INSERT credit_transactions (type: 'purchase')
    ↓
Notifica utente: "X HP aggiunti!"
```

### 2.2 Consumo HP
```
Utente usa servizio (es. chat)
    ↓
API route chiama recordUsage()
    ↓
UPDATE user_credit_usage SET credits_used = credits_used + 1
    ↓
INSERT credit_transactions (type: 'usage', amount: -1)
    ↓
If credits_remaining < 10: mostra warning
    ↓
If credits_remaining == 0: blocca servizi a pagamento
```

---

## 3. Componenti

### 3.1 Frontend

#### CreditsBar (`components/CreditsBar.jsx`)
```javascript
export default function CreditsBar() {
  const [credits, setCredits] = useState({ used: 0, included: 0 })
  
  useEffect(() => {
    fetch('/api/credits/usage')
      .then(res => res.json())
      .then(setCredits)
  }, [])
  
  const remaining = credits.included - credits.used
  const percentage = (remaining / credits.included) * 100
  
  return (
    <div className="credits-bar">
      <span>HP: {remaining} / {credits.included}</span>
      <div className="progress-bar">
        <div className="fill" style={{ width: `${percentage}%` }} />
      </div>
      {remaining < 20 && <span className="warning">In esaurimento!</span>}
    </div>
  )
}
```

#### PurchasePage (`app/credits/page.jsx`)
```javascript
const PACKAGES = [
  { id: 'starter', name: 'Starter', hp: 100, price: 1000, label: '€10' },
  { id: 'standard', name: 'Standard', hp: 200, price: 2000, label: '€20' },
  { id: 'pro', name: 'Pro', hp: 550, price: 5000, label: '€50' }
]

export default function CreditsPage() {
  const handlePurchase = async (pkg) => {
    const res = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({ package: pkg.id })
    })
    const { url } = await res.json()
    window.location.href = url  // Redirect a Stripe
  }
  
  return (
    <div className="packages">
      {PACKAGES.map(pkg => (
        <PackageCard 
          key={pkg.id}
          {...pkg}
          onSelect={() => handlePurchase(pkg)}
        />
      ))}
    </div>
  )
}
```

### 3.2 Backend

#### Stripe Checkout (`app/api/stripe/create-checkout-session/route.js`)
```javascript
import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(req) {
  const { userId } = await authenticate(req)
  const { package: pkgId } = await req.json()
  
  const packages = {
    starter: { hp: 100, price: 1000 },
    standard: { hp: 200, price: 2000 },
    pro: { hp: 550, price: 5000 }
  }
  
  const pkg = packages[pkgId]
  if (!pkg) return NextResponse.json({ error: 'Invalid package' }, { status: 400 })
  
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'eur',
        product_data: {
          name: `${pkg.hp} Hero Points`,
          description: `Pacchetto ${pkgId}`
        },
        unit_amount: pkg.price  // Centesimi (€10 = 1000)
      },
      quantity: 1
    }],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/credits/success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/credits/cancel`,
    metadata: {
      user_id: userId,
      hp_amount: pkg.hp
    }
  })
  
  return NextResponse.json({ url: session.url })
}
```

#### Accredito HP (`app/api/credits/accredit/route.js`)
```javascript
export async function POST(req) {
  // Verifica webhook Stripe (firma)
  const sig = req.headers.get('stripe-signature')
  const event = stripe.webhooks.constructEvent(
    await req.text(),
    sig,
    process.env.STRIPE_WEBHOOK_SECRET
  )
  
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const userId = session.metadata.user_id
    const hpAmount = parseInt(session.metadata.hp_amount)
    
    // Accredita HP
    await creditService.accreditHP(userId, hpAmount, session.id)
    
    return NextResponse.json({ received: true })
  }
}
```

#### Registro Consumo (`lib/creditService.js`)
```javascript
export async function recordUsage(admin, userId, amount, operationType) {
  const periodKey = getCurrentMonthKey()  // "2026-02"
  
  // 1. Verifica saldo
  const { data: usage } = await admin
    .from('user_credit_usage')
    .select('*')
    .eq('user_id', userId)
    .eq('period_key', periodKey)
    .maybeSingle()
  
  const remaining = (usage?.credits_included || 0) - (usage?.credits_used || 0)
  
  if (remaining < amount) {
    throw new Error('Insufficient credits')
  }
  
  // 2. Aggiorna usage
  await admin
    .from('user_credit_usage')
    .upsert({
      user_id: userId,
      period_key: periodKey,
      credits_used: (usage?.credits_used || 0) + amount,
      credits_included: usage?.credits_included || 0,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,period_key' })
  
  // 3. Registra transazione
  await admin.from('credit_transactions').insert({
    user_id: userId,
    amount: -amount,
    type: 'usage',
    operation_type: operationType,
    period_key: periodKey
  })
  
  return { success: true, remaining: remaining - amount }
}

export async function accreditHP(admin, userId, amount, stripeSessionId) {
  const periodKey = getCurrentMonthKey()
  
  // Aggiorna o crea usage
  const { data: existing } = await admin
    .from('user_credit_usage')
    .select('*')
    .eq('user_id', userId)
    .eq('period_key', periodKey)
    .maybeSingle()
  
  if (existing) {
    await admin
      .from('user_credit_usage')
      .update({
        credits_included: existing.credits_included + amount,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
  } else {
    await admin
      .from('user_credit_usage')
      .insert({
        user_id: userId,
        period_key: periodKey,
        credits_included: amount,
        credits_used: 0
      })
  }
  
  // Registra transazione acquisto
  await admin.from('credit_transactions').insert({
    user_id: userId,
    amount: amount,
    type: 'purchase',
    reference_id: stripeSessionId,
    period_key: periodKey
  })
}
```

---

## 4. Database

### 4.1 Tabella User Credit Usage
```sql
CREATE TABLE user_credit_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_key VARCHAR(7) NOT NULL,  -- "2026-02"
  
  credits_included INTEGER DEFAULT 0,  -- HP acquistati/accreditati
  credits_used INTEGER DEFAULT 0,      -- HP consumati
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, period_key)
);

-- Indice per query veloce
CREATE INDEX idx_credit_usage_user_period ON user_credit_usage(user_id, period_key);
```

### 4.2 Tabella Credit Transactions
```sql
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  amount INTEGER NOT NULL,           -- Positivo: acquisto, Negativo: uso
  type VARCHAR(20) NOT NULL CHECK (type IN ('purchase', 'usage', 'refund', 'bonus')),
  operation_type VARCHAR(50),        -- Es: 'chat-message', 'upload-player'
  reference_id VARCHAR(100),         -- Stripe session ID, etc.
  period_key VARCHAR(7) NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici
CREATE INDEX idx_transactions_user ON credit_transactions(user_id, created_at DESC);
CREATE INDEX idx_transactions_type ON credit_transactions(type);
```

---

## 5. Tariffazione Servizi

| Servizio | Costo HP | Equivalente €* |
|----------|----------|----------------|
| Messaggio chat | 1 | €0.10 |
| Upload giocatore (AI) | 2 | €0.20 |
| Upload allenatore | 2 | €0.20 |
| Analisi sezione partita | 2 | €0.20 |
| Contromisure avversario | 3 | €0.30 |
| Estrazione dati foto | 3 | €0.30 |
| Analisi completa partita | 4 | €0.40 |

*Calcolato su pacchetto Standard (€20 = 200 HP)

---

## 6. API Routes

| Route | Metodo | Scopo | Auth |
|-------|--------|-------|------|
| `/api/stripe/create-checkout-session` | POST | Inizia checkout Stripe | JWT |
| `/api/credits/accredit` | POST | Webhook Stripe (accredito) | Stripe sig |
| `/api/credits/usage` | GET | Saldo attuale | JWT |
| `/api/credits/transactions` | GET | Storico transazioni | JWT |

---

## 7. Sicurezza

### 7.1 RLS
```sql
-- User credit usage: solo propri dati
CREATE POLICY "Users view own credit usage"
  ON user_credit_usage FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

-- Transactions: solo proprie
CREATE POLICY "Users view own transactions"
  ON credit_transactions FOR SELECT
  USING ((SELECT auth.uid()) = user_id);
```

### 7.2 Webhook Security
```javascript
// Verifica firma Stripe
const sig = req.headers.get('stripe-signature')
try {
  const event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
} catch (err) {
  return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
}
```

### 7.3 Idempotenza
Gli accrediti usano `reference_id` (Stripe session ID) per evitare duplicati:
```sql
UNIQUE(user_id, reference_id) WHERE type = 'purchase'
```

---

## 8. Rimborsi

### Politica
- **14 giorni**: Diritto di recesso (se HP non consumati)
- **HP consumati**: Nessun rimborso
- **Errori tecnici**: Rimborso su caso per caso

### Processo
```javascript
// Rimborso Stripe
await stripe.refunds.create({
  payment_intent: paymentIntentId,
  reason: 'requested_by_customer'
})

// Aggiorna database
await admin.from('credit_transactions').insert({
  user_id: userId,
  amount: -refundAmount,
  type: 'refund',
  reference_id: refundId
})
```

---

**Ultimo aggiornamento:** 14/02/2026
