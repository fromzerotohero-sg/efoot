# Aggiungi queste variabili al tuo .env.local

# Metalgate SSO Configuration
NEXT_PUBLIC_METALGATE_LOGIN_URL=http://localhost:3000/login.html
NEXT_PUBLIC_METALGATE_API_URL=http://localhost:4001/api
METALGATE_SSO_CALLBACK_URL=http://localhost:3001/auth/callback

# Supabase Service Role Key (necessario per SSO)
# Copia questa dal tuo dashboard Supabase → Settings → API → service_role (secret)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsaXV1b3Jyd2RldHlsb2xscnVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzkwOTQxOSwiZXhwIjoyMDgzNDg1NDE5fQ.3YYO0hrJUfmML4Ejn7cRxrWJdHUDO_a-kCoQHJ2aXzY

# Le altre variabili dovrebbero già esistere:
# NEXT_PUBLIC_SUPABASE_URL=https://zliuuorrwdetylollrua.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
