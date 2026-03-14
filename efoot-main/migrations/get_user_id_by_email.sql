-- ============================================
-- Funzione per risolvere email → user_id (auth.users)
-- Uso: integrazione sito pagamenti quando si invia solo email per accredito Hero Point
-- Chiamabile solo con service role (RPC).
-- ============================================

CREATE OR REPLACE FUNCTION public.get_user_id_by_email(user_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM auth.users WHERE email = user_email LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_user_id_by_email(text) IS 'Risolve email utente in auth.users.id. Usato da API accredito crediti (sito pagamenti).';
