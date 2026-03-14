-- ============================================
-- Migration: Aggiungi tracking "formazione consigliata usata" per obiettivi settimanali
-- Data: Febbraio 2026
-- Sicurezza: ADD COLUMN only (non distruttivo).
-- RLS: nessuna modifica alle policy; le policy esistenti su matches (auth.uid() = user_id)
--      si applicano a tutta la riga incluso questo campo.
-- App: il valore deve essere impostato solo dall'API save-match/update-match con
--      validazione stretta (solo boolean true → true, altrimenti false). Vedi docs PIANO_* Parte 0.
-- Rollback: vedi sotto in commento
-- ============================================

ALTER TABLE matches
ADD COLUMN IF NOT EXISTS recommended_formation_used BOOLEAN DEFAULT false;

COMMENT ON COLUMN matches.recommended_formation_used IS 'True se l''utente ha indicato di aver usato la formazione consigliata (obiettivo settimanale use_recommended_formation). Valorizzato solo da API con validazione boolean.';

-- ============================================
-- ROLLBACK (solo se necessario, eseguire a mano)
-- ============================================
-- ALTER TABLE matches DROP COLUMN IF EXISTS recommended_formation_used;
