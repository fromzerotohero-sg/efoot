-- ============================================
-- MIGRAZIONE: Rimuovi colonna background_key da user_profiles
-- Motivo: feature cambio sfondo app rimossa (UI, API, BackgroundLoader eliminati).
-- Eseguire solo se la colonna esiste (es. aggiunta in precedenza fuori repo).
-- ============================================

ALTER TABLE user_profiles
  DROP COLUMN IF EXISTS background_key;
