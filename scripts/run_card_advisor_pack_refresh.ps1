# Alternativa con SUPABASE_SERVICE_ROLE_KEY in locale.
# Flusso standard (senza service key): vedi docs/AGGIORNAMENTO_DATABASE.md Parte B.
$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)
python scripts/sync_card_advisor_cards.py --replace-active --sleep 0.35
