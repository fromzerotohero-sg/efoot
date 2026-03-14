# Servizio: Autenticazione & Sessione

**Gestione login, registrazione, JWT, protezione risorse**

---

## 1. Overview

| Aspect | Dettaglio |
|--------|-----------|
| **Provider** | Supabase Auth |
| **Metodo** | JWT (JSON Web Token) |
| **Flow** | PKCE (Proof Key for Code Exchange) |
| **Storage** | httpOnly cookie (Supabase gestisce) |
| **Refresh** | Automatico ogni 7 giorni |

---

## 2. Flusso Autenticazione

### 2.1 Registrazione
```
Utente → Form (email, password)
    ↓
POST /auth/v1/signup (Supabase)
    ↓
Email conferma inviata
    ↓
Click link → Account attivo
    ↓
Creazione record vuoto in user_profiles (trigger)
```

### 2.2 Login
```
Utente → Form (email, password)
    ↓
POST /auth/v1/token?grant_type=password
    ↓
Risposta: { access_token, refresh_token, user }
    ↓
Token salvato in cookie httpOnly
    ↓
Redirect a Dashboard
```

### 2.3 Sessione Attiva
```
Browser → Cookie con JWT
    ↓
Ogni richiesta API: Header "Authorization: Bearer <token>"
    ↓
Server valida token (validateToken)
    ↓
Estrazione user_id → Query DB filtrate per RLS
```

### 2.4 Logout
```
Utente click "Esci"
    ↓
supabase.auth.signOut()
    ↓
Cookie eliminato
    ↓
Redirect a /login
```

---

## 3. Componenti

### 3.1 Frontend

#### LoginPage (`app/login/page.jsx`)
```javascript
'use client'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const handleLogin = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (data) router.push('/')
  }
}
```

#### Auth Context (`lib/supabaseClient.js`)
```javascript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export const supabase = createClientComponentClient()

// Hook per controllare sessione
export function useSession() {
  const [session, setSession] = useState(null)
  
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })
    
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => setSession(session)
    )
    
    return () => listener.subscription.unsubscribe()
  }, [])
  
  return session
}
```

### 3.2 Backend

#### Validazione Token (`lib/authHelper.js`)
```javascript
export async function validateToken(token, supabaseUrl, anonKey) {
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': anonKey
      }
    })
    
    if (!response.ok) throw new Error('Invalid token')
    
    const userData = await response.json()
    return { userData, error: null }
  } catch (error) {
    return { userData: null, error }
  }
}

export function extractBearerToken(req) {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  return auth.slice(7)
}
```

---

## 4. API Routes

### Nessuna API custom per auth
Tutta l'autenticazione passa attraverso:
- **Supabase Auth** (client-side via `@supabase/auth-helpers-nextjs`)
- **Middleware** (opzionale, per protezione route)

### Protezione API Routes
```javascript
// Pattern in TUTTE le API routes
export async function POST(req) {
  const token = extractBearerToken(req)
  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  
  const { userData, error } = await validateToken(token, url, anonKey)
  if (error || !userData?.user?.id) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
  
  const userId = userData.user.id  // CRITICO: Mai da req.body!
  // ... business logic
}
```

---

## 5. Database

### 5.1 Tabella Auth (gestita da Supabase)
```sql
-- auth.users (tabella di sistema Supabase)
-- Non modificare direttamente!
id UUID PK
email VARCHAR
encrypted_password VARCHAR
email_confirmed_at TIMESTAMPTZ
raw_app_meta_data JSONB
raw_user_meta_data JSONB
created_at, updated_at TIMESTAMPTZ
```

### 5.2 Tabella Profilo Esteso
```sql
-- public.user_profiles
user_id UUID PK REFERENCES auth.users(id) ON DELETE CASCADE
nickname VARCHAR(50)
-- ... altri campi profilo

-- Trigger: crea record vuoto alla registrazione
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## 6. Sicurezza

### 6.1 Password Policy (Supabase Dashboard)
- Minimo 8 caratteri
- Almeno 1 maiuscola, 1 minuscola, 1 numero
- (Opzionale) 1 carattere speciale

### 6.2 JWT Security
- **Scadenza**: 1 ora (access_token)
- **Refresh**: 7 giorni (refresh_token)
- **Algoritmo**: RS256 (asimmetrico)

### 6.3 Row Level Security (RLS)
Ogni tabella utente DEVE avere:
```sql
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own profile"
  ON user_profiles
  FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
```

### 6.4 CORS
Configurato in `next.config.js` o Supabase Dashboard.
Allowed origins:
- `http://localhost:3000` (dev)
- `https://tuo-dominio.com` (prod)

---

## 7. Errori Comuni

| Errore | Causa | Soluzione |
|--------|-------|-----------|
| `Invalid login credentials` | Password errata | Reset password |
| `Email not confirmed` | Email non verificata | Reinvia email conferma |
| `JWT expired` | Token scaduto | Refresh automatico o re-login |
| `User not found` | Utente eliminato | Ricrea account |

---

## 8. Testing

```javascript
// Test auth flow
describe('Authentication', () => {
  it('should login with valid credentials', async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'validpassword123'
    })
    expect(error).toBeNull()
    expect(data.session).toBeDefined()
  })
  
  it('should reject invalid credentials', async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'wrongpassword'
    })
    expect(error).toBeDefined()
  })
})
```

---

## 9. Riferimenti

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Next.js Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [JWT.io](https://jwt.io/) — Decodifica token per debug

---

**Ultimo aggiornamento:** 14/02/2026
