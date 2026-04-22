-- =========================================================
-- Credit error logs + refund audit trail
-- Data: 22 Aprile 2026
-- Scopo: tracciare errori e rimborsi crediti lato backend
-- =========================================================

CREATE TABLE IF NOT EXISTS credit_error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  operation_type TEXT,
  cosa TEXT NOT NULL,
  errore_testo TEXT,
  funzione TEXT,
  error_code TEXT,
  is_refundable BOOLEAN NOT NULL DEFAULT false,
  refund_applied BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

COMMENT ON TABLE credit_error_logs IS 'Log errori crediti: classificazione, funzione, rimborso applicato.';
COMMENT ON COLUMN credit_error_logs.cosa IS 'Tipo evento sintetico (es. operation_failed, refund_success, refund_failed).';
COMMENT ON COLUMN credit_error_logs.errore_testo IS 'Messaggio errore tecnico (sanitized).';
COMMENT ON COLUMN credit_error_logs.funzione IS 'Nome funzione/route dove e avvenuto l errore.';

CREATE INDEX IF NOT EXISTS idx_credit_error_logs_user_created
ON credit_error_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_credit_error_logs_operation_created
ON credit_error_logs (operation_type, created_at DESC);

ALTER TABLE credit_error_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'credit_error_logs'
      AND policyname = 'Users can read own credit error logs'
  ) THEN
    CREATE POLICY "Users can read own credit error logs"
      ON credit_error_logs FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;
