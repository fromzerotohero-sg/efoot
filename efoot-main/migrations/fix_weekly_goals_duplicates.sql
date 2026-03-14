-- ============================================
-- MIGRAZIONE: Fix duplicati weekly_goals e aggiungi constraint UNIQUE
-- Data: 27 Gennaio 2026
-- Problema: Duplicati task per stessa settimana e goal_type
-- Soluzione: Constraint UNIQUE + pulizia duplicati
-- ============================================

-- 1. PULIZIA DUPLICATI (mantieni solo il più recente per ogni combinazione)
-- ============================================
-- Elimina duplicati mantenendo solo il task con created_at più recente
DELETE FROM weekly_goals wg1
WHERE wg1.id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id, week_start_date, goal_type 
             ORDER BY created_at DESC
           ) as rn
    FROM weekly_goals
  ) t
  WHERE t.rn > 1
);

-- 2. AGGIUNGI CONSTRAINT UNIQUE per prevenire duplicati futuri
-- ============================================
-- Rimuovi constraint esistenti se presenti (per sicurezza)
ALTER TABLE weekly_goals 
DROP CONSTRAINT IF EXISTS unique_weekly_goal_user_week_type;

-- Aggiungi constraint UNIQUE
ALTER TABLE weekly_goals
ADD CONSTRAINT unique_weekly_goal_user_week_type 
UNIQUE (user_id, week_start_date, goal_type);

-- 3. COMMENTI
-- ============================================
COMMENT ON CONSTRAINT unique_weekly_goal_user_week_type ON weekly_goals IS 
'Previene duplicati: un utente non può avere più task dello stesso tipo per la stessa settimana';

-- ============================================
-- VERIFICA POST-MIGRAZIONE
-- ============================================
-- Verifica che non ci siano più duplicati:
-- SELECT user_id, week_start_date, goal_type, COUNT(*) as count
-- FROM weekly_goals
-- GROUP BY user_id, week_start_date, goal_type
-- HAVING COUNT(*) > 1;
-- -- Dovrebbe restituire 0 righe

-- Verifica constraint:
-- SELECT conname, contype, pg_get_constraintdef(oid) as definition
-- FROM pg_constraint
-- WHERE conrelid = 'weekly_goals'::regclass
-- AND conname = 'unique_weekly_goal_user_week_type';
