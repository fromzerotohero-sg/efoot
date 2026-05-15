-- Stile Orchestrator (PESDB EN) mancante in lookup IT
INSERT INTO playing_styles (name, category, compatible_positions)
SELECT 'Orchestratore', 'midfield', ARRAY['CC', 'MED']::text[]
WHERE NOT EXISTS (
  SELECT 1 FROM playing_styles WHERE lower(trim(name)) = 'orchestratore'
);

-- Backfill playing_style_id e role IT da role EN (catalogo / rosa vecchia unita)
WITH style_map (en_key, it_name) AS (
  VALUES
    ('anchor man', 'Collante'),
    ('box to box', 'Onnipresente'),
    ('box-to-box', 'Onnipresente'),
    ('build up', 'Sviluppo'),
    ('classic no 10', 'Classico n°10'),
    ('creative playmaker', 'Regista creativo'),
    ('cross specialist', 'Specialista di cross'),
    ('deep lying forward', 'attacante di rientro'),
    ('deep-lying forward', 'attacante di rientro'),
    ('defensive full back', 'Terzino difensivo'),
    ('defensive full-back', 'Terzino difensivo'),
    ('defensive goalkeeper', 'Portiere difensivo'),
    ('destroyer', 'Incontrista'),
    ('the destroyer', 'Incontrista'),
    ('dummy runner', 'Senza palla'),
    ('extra frontman', 'Frontale extra'),
    ('fox in the box', 'Rapace d''area'),
    ('full back finisher', 'Terzino mattatore'),
    ('full-back finisher', 'Terzino mattatore'),
    ('goal poacher', 'Opportunista'),
    ('hole player', 'Giocatore chiave'),
    ('offensive full back', 'Terzino offensivo'),
    ('offensive full-back', 'Terzino offensivo'),
    ('offensive goalkeeper', 'Portiere offensivo'),
    ('offensive wingback', 'Terzino offensivo'),
    ('orchestrator', 'Orchestratore'),
    ('prolific winger', 'Ala prolifica'),
    ('roaming flank', 'Taglio al centro'),
    ('target man', 'Fulcro di gioco')
),
normalized AS (
  SELECT
    p.id,
    m.it_name,
    lower(trim(regexp_replace(replace(replace(replace(lower(trim(p.role)), '.', ''), '-', ' '), '°', ''), '\s+', ' ', 'g'))) AS role_key
  FROM players p
  JOIN style_map m ON lower(trim(regexp_replace(replace(replace(replace(lower(trim(p.role)), '.', ''), '-', ' '), '°', ''), '\s+', ' ', 'g'))) = m.en_key
  WHERE p.playing_style_id IS NULL
    AND p.role IS NOT NULL
    AND trim(p.role) <> ''
)
UPDATE players p
SET
  playing_style_id = ps.id,
  role = n.it_name
FROM normalized n
JOIN playing_styles ps ON lower(trim(ps.name)) = lower(trim(n.it_name))
WHERE p.id = n.id;

-- Giocatori con role gia in italiano ma FK mancante (backfill originale)
UPDATE players p
SET playing_style_id = ps.id
FROM playing_styles ps
WHERE p.playing_style_id IS NULL
  AND p.role IS NOT NULL
  AND trim(p.role) <> ''
  AND lower(trim(p.role)) = lower(trim(ps.name));

-- Allinea role IT se FK gia valorizzata ma role resta in inglese (import precedenti)
UPDATE players p
SET role = ps.name
FROM playing_styles ps
WHERE p.playing_style_id = ps.id
  AND p.role IS NOT NULL
  AND lower(trim(p.role)) <> lower(trim(ps.name))
  AND lower(trim(p.role)) IN (
    'anchor man', 'box to box', 'box-to-box', 'build up', 'classic no. 10', 'classic no 10',
    'creative playmaker', 'cross specialist', 'deep-lying forward', 'deep lying forward',
    'defensive full-back', 'defensive full back', 'defensive goalkeeper', 'destroyer', 'the destroyer',
    'dummy runner', 'extra frontman', 'fox in the box', 'full-back finisher', 'full back finisher',
    'goal poacher', 'hole player', 'offensive full-back', 'offensive full back', 'offensive goalkeeper',
    'offensive wingback', 'orchestrator', 'prolific winger', 'roaming flank', 'target man'
  );
