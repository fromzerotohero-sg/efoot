-- Disattiva sezioni eFHUB che non sono pack valutabili (bonus, campagne, store, skill-up…).
-- Non cancella lo storico. Il gate applicativo è lib/cardAdvisorReleaseGate.js.

UPDATE public.card_advisor_cards AS c
SET is_active = false, updated_at = now()
FROM public.card_advisor_releases AS r
WHERE c.release_id = r.id
  AND r.source = 'efhub'
  AND c.source = 'efhub'
  AND c.is_active = true
  AND (
    r.release_name ILIKE '%bonus%'
    OR r.release_name ILIKE '%reward%'
    OR r.release_name ILIKE '%login%'
    OR r.release_name ILIKE '%advertisement%'
    OR r.release_name ILIKE '%starter set%'
    OR r.release_name ILIKE '%skill up%'
    OR r.release_name ILIKE '%skill-up%'
    OR r.release_name ILIKE '%step-up%'
    OR r.release_name ILIKE '%step up%'
    OR r.release_name ILIKE '%manager pack%'
    OR r.release_name ILIKE '%webstore%'
    OR r.release_name ILIKE '%campaign%'
  );

UPDATE public.card_advisor_releases
SET is_active = false, updated_at = now()
WHERE source = 'efhub'
  AND is_active = true
  AND (
    release_name ILIKE '%bonus%'
    OR release_name ILIKE '%reward%'
    OR release_name ILIKE '%login%'
    OR release_name ILIKE '%advertisement%'
    OR release_name ILIKE '%starter set%'
    OR release_name ILIKE '%skill up%'
    OR release_name ILIKE '%skill-up%'
    OR release_name ILIKE '%step-up%'
    OR release_name ILIKE '%step up%'
    OR release_name ILIKE '%manager pack%'
    OR release_name ILIKE '%webstore%'
    OR release_name ILIKE '%campaign%'
  );

UPDATE public.card_advisor_releases
SET release_date = substring(release_name from '[0-9]{1,2}[[:space:]]+[A-Za-z]{3,9}[[:space:]]+''?[0-9]{2}')
WHERE source = 'efhub'
  AND (release_date IS NULL OR btrim(release_date) = '')
  AND release_name ~ '[0-9]{1,2}[[:space:]]+[A-Za-z]{3,9}[[:space:]]+''?[0-9]{2}';

UPDATE public.card_advisor_releases
SET category = CASE
  WHEN release_name ILIKE '%selection%' THEN 'Selection'
  WHEN release_name ILIKE '%highlight%' THEN 'Highlight'
  WHEN release_name ILIKE '%standout%' THEN 'Standout'
  WHEN release_name ILIKE '%encore%' THEN 'Encore'
  WHEN release_name ILIKE '%collaboration%' OR release_name ILIKE '%naruto%' THEN 'Collaboration'
  WHEN release_name ILIKE '%transfer%' THEN 'Transfer'
  WHEN release_name ILIKE '%edition%' THEN 'Edition'
  WHEN release_name ILIKE '%tactical%' THEN 'Event'
  ELSE category
END
WHERE source = 'efhub';
