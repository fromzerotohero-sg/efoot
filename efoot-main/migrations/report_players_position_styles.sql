-- ============================================
-- REPORT: Giocatori con position che contiene stili invece di posizioni
-- Data: 2026-01-28
-- Obiettivo: Identificare giocatori con position invalida per correzione manuale
-- ============================================

-- ⚠️ ATTENZIONE: Questo script NON corregge automaticamente.
-- Richiede correzione manuale perché il mapping stile → posizione dipende dal giocatore specifico.

-- 1. Posizioni valide eFootball
-- ============================================
-- PT, DC, TD, TS, CC, MED, P, SP, TRQ, CLD, CLS, EDA, ESA, CF

-- 2. REPORT: Giocatori con position che NON è una posizione valida
-- ============================================
SELECT 
  p.id,
  p.user_id,
  p.player_name,
  p.position as current_position,
  p.playing_style_id,
  ps.name as playing_style_name,
  p.role,
  p.original_positions,
  -- Suggerimento posizione basato su playing_style o role
  CASE 
    WHEN p.position ILIKE '%portiere%' OR p.position ILIKE '%PT%' THEN 'PT'
    WHEN p.position ILIKE '%difensore%' OR p.position ILIKE '%DC%' THEN 'DC'
    WHEN p.position ILIKE '%terzino%' OR p.position ILIKE '%TD%' OR p.position ILIKE '%TS%' THEN 
      CASE WHEN p.position ILIKE '%destro%' OR p.position ILIKE '%TD%' THEN 'TD' ELSE 'TS' END
    WHEN p.position ILIKE '%centrocampista%' OR p.position ILIKE '%CC%' OR p.position ILIKE '%MED%' THEN
      CASE 
        WHEN p.position ILIKE '%mediano%' OR p.position ILIKE '%MED%' THEN 'MED'
        WHEN p.position ILIKE '%centrale%' OR p.position ILIKE '%CC%' THEN 'CC'
        ELSE 'CC'
      END
    WHEN p.position ILIKE '%attaccante%' OR p.position ILIKE '%P%' OR p.position ILIKE '%SP%' THEN
      CASE
        WHEN p.position ILIKE '%seconda%' OR p.position ILIKE '%SP%' THEN 'SP'
        ELSE 'P'
      END
    ELSE NULL
  END as suggested_position,
  -- Flag: è uno stile riconosciuto?
  CASE 
    WHEN p.position ILIKE '%opportunista%' 
      OR p.position ILIKE '%tra le linee%'
      OR p.position ILIKE '%ala prolifica%'
      OR p.position ILIKE '%collante%'
      OR p.position ILIKE '%giocatore chiave%'
      OR p.position ILIKE '%regista creativo%'
      OR p.position ILIKE '%onnipresente%'
      OR p.position ILIKE '%terzino difensivo%'
      OR p.position ILIKE '%terzino offensivo%'
      OR p.position ILIKE '%portiere offensivo%'
      OR p.position ILIKE '%portiere difensivo%'
      OR p.position ILIKE '%frontale extra%'
      OR p.position ILIKE '%sviluppo%'
      OR p.position ILIKE '%incontrista%'
      OR p.position ILIKE '%classico%'
      OR p.position ILIKE '%taglio al centro%'
      OR p.position ILIKE '%terzino mattatore%'
    THEN TRUE
    ELSE FALSE
  END as is_recognized_style
FROM players p
LEFT JOIN playing_styles ps ON p.playing_style_id = ps.id
WHERE p.position IS NOT NULL
  AND p.position NOT IN ('PT', 'DC', 'TD', 'TS', 'CC', 'MED', 'P', 'SP', 'TRQ', 'CLD', 'CLS', 'EDA', 'ESA', 'CF')
  AND UPPER(p.position) NOT IN ('PT', 'DC', 'TD', 'TS', 'CC', 'MED', 'P', 'SP', 'TRQ', 'CLD', 'CLS', 'EDA', 'ESA', 'CF')
ORDER BY 
  is_recognized_style DESC, -- Prima quelli che sono chiaramente stili
  p.user_id,
  p.player_name;

-- 3. CONTEggio per statistiche
-- ============================================
SELECT 
  COUNT(*) as total_players_with_invalid_position,
  COUNT(DISTINCT user_id) as affected_users
FROM players
WHERE position IS NOT NULL
  AND position NOT IN ('PT', 'DC', 'TD', 'TS', 'CC', 'MED', 'P', 'SP', 'TRQ', 'CLD', 'CLS', 'EDA', 'ESA', 'CF')
  AND UPPER(position) NOT IN ('PT', 'DC', 'TD', 'TS', 'CC', 'MED', 'P', 'SP', 'TRQ', 'CLD', 'CLS', 'EDA', 'ESA', 'CF');

-- 4. ISTRUZIONI PER CORREZIONE MANUALE
-- ============================================
-- Per ogni giocatore identificato:
-- 1. Verifica la posizione originale dalla card (original_positions)
-- 2. Se original_positions è disponibile, usa quella
-- 3. Altrimenti, usa il suggested_position dal report
-- 4. Se position contiene uno stile, spostalo in role o playing_style_id
-- 
-- Esempio UPDATE (da eseguire manualmente dopo verifica):
-- UPDATE players 
-- SET position = 'P',  -- Posizione corretta
--     role = 'Opportunista'  -- Stile spostato in role
-- WHERE id = 'uuid-del-giocatore';

COMMENT ON FUNCTION fix_orphan_individual_instructions() IS 
  'Report per identificare giocatori con position invalida. Richiede correzione manuale.';
