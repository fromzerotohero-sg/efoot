-- ============================================
-- Backfill: imposta playing_style_id dove c'è role ma FK mancante
-- Collega i giocatori già salvati (con solo role, es. "Collante") al catalogo playing_styles
-- Riferimento: docs/CONTROLLO_E2E_DIAGNOSTIC_CHAT.md, save-player lookup da role
-- ============================================

UPDATE players p
SET playing_style_id = ps.id
FROM playing_styles ps
WHERE p.playing_style_id IS NULL
  AND p.role IS NOT NULL
  AND TRIM(p.role) <> ''
  AND LOWER(TRIM(p.role)) = LOWER(TRIM(ps.name));
