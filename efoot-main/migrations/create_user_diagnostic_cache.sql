-- ============================================
-- MIGRAZIONE: Tabella user_diagnostic_cache per riassunto analisi (diagnostic)
-- Scopo: cache del riassunto enterprise usato dalla chat al posto del blocco ROSA E DATI grezzo
-- Riferimento: docs/IMPLEMENTAZIONE_DIAGNOSTIC_CHAT.md, docs/DIAGNOSTIC_DOCUMENTO_ANALISI_DIFFICOLTA.md
-- ============================================

-- 1. CREA TABELLA user_diagnostic_cache
-- ============================================
CREATE TABLE IF NOT EXISTS user_diagnostic_cache (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lang TEXT
);

-- 2. ROW LEVEL SECURITY
-- ============================================
ALTER TABLE user_diagnostic_cache ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT e INSERT/UPDATE solo per il proprio user_id
CREATE POLICY "user_diagnostic_cache_select_own"
  ON user_diagnostic_cache FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_diagnostic_cache_insert_own"
  ON user_diagnostic_cache FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_diagnostic_cache_update_own"
  ON user_diagnostic_cache FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
