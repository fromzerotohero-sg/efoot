-- Sicurezza: leaderboard_snapshots non deve essere leggibile da anon/authenticated.
-- L'API GET /api/leaderboard usa service_role e restituisce solo rank, nickname, points;
-- points_breakdown e user_id non devono essere esposti via accesso diretto al DB.
-- Rimuoviamo la policy SELECT per anon/authenticated (se presente) così solo service_role può leggere/scrivere.

DROP POLICY IF EXISTS "Allow read leaderboard_snapshots for API" ON leaderboard_snapshots;

-- Con RLS attivo e nessuna policy per anon/authenticated, i client non possono leggere la tabella.
-- L'API (service_role) continua a funzionare perché bypassa RLS.
