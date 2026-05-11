-- ============================================
-- MIGRAZIONE: Catalogo globale allenatori
-- Fonte iniziale: EFHub manager builder
-- ============================================

CREATE TABLE IF NOT EXISTS public.coach_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identita sorgente/catalogo
  source TEXT NOT NULL DEFAULT 'efhub',
  source_coach_id TEXT NOT NULL,
  source_url TEXT,
  source_card_image_url TEXT,
  source_version TEXT,

  -- Dati base allenatore
  coach_name TEXT NOT NULL,
  coach_name_ja TEXT,
  category TEXT,
  pack_type TEXT,

  -- Formato allineato alla tabella utente coaches
  playing_style_competence JSONB NOT NULL DEFAULT '{}'::jsonb,
  stat_boosters JSONB NOT NULL DEFAULT '[]'::jsonb,
  boost_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  connection JSONB,
  photo_slots JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Payload pronto per creare un record in public.coaches
  coach_payload JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Qualita/controllo visibilita
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  catalog_ready BOOLEAN NOT NULL DEFAULT true,
  needs_review BOOLEAN NOT NULL DEFAULT false,
  last_source_sync_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT coach_catalog_source_coach_unique UNIQUE (source, source_coach_id)
);

CREATE INDEX IF NOT EXISTS idx_coach_catalog_ready
ON public.coach_catalog (source, catalog_ready, needs_review);

CREATE INDEX IF NOT EXISTS idx_coach_catalog_name
ON public.coach_catalog (coach_name);

CREATE INDEX IF NOT EXISTS idx_coach_catalog_playstyles_gin
ON public.coach_catalog USING GIN (playing_style_competence);

CREATE OR REPLACE FUNCTION public.refresh_coach_catalog_payloads()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.coach_catalog
  SET coach_payload = jsonb_build_object(
      'coach_name', coach_name,
      'category', category,
      'pack_type', pack_type,
      'playing_style_competence', playing_style_competence,
      'training_affinity_description', NULL,
      'stat_boosters', stat_boosters,
      'connection', connection,
      'photo_slots', photo_slots,
      'source_catalog', jsonb_build_object(
        'catalog', 'coach_catalog',
        'catalog_id', id,
        'source', source,
        'source_coach_id', source_coach_id,
        'source_card_image_url', source_card_image_url
      )
    ),
    updated_at = NOW()
  WHERE catalog_ready = true
    AND needs_review = false;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_coach_catalog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS coach_catalog_updated_at_trigger ON public.coach_catalog;
CREATE TRIGGER coach_catalog_updated_at_trigger
BEFORE UPDATE ON public.coach_catalog
FOR EACH ROW
EXECUTE FUNCTION public.update_coach_catalog_updated_at();

ALTER TABLE public.coach_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ready coach catalog is readable" ON public.coach_catalog;
CREATE POLICY "Ready coach catalog is readable"
ON public.coach_catalog FOR SELECT
USING (catalog_ready = true AND needs_review = false);
