# Privacy Policy (bozza tecnica)

**Informativa art. 13 GDPR — bozza 13 agosto 2026.**  
Titolare, DPO, sede e basi giuridiche **da verificare con un legale**. Non pubblicare così com’è.

## Titolare

[Nome società / sede / P.IVA]  
Supporto: support@fromzerotohero.io  
Privacy/DPO: [da inserire — non usare più privacy@efootballaicoach.com senza conferma]

## Dati trattati (dal prodotto reale)

| Categoria | Esempi | Dove |
|-----------|--------|------|
| Identità account | email, id MetalGate | MetalGate + `user_profiles.metalgate_user_id` |
| Profilo di gioco | divisione, piattaforma, tattiche dichiarate | `user_profiles` |
| Rosa e coach | carte, slot, istruzioni | `players`, `coaches`, layout |
| Partite / stats | match, analisi, pattern | `matches`, `user_game_analysis`, `team_tactical_patterns` |
| Memoria coach | feedback Palestra | `user_tactical_feedback` |
| Conversazioni AI | messaggi verso OpenAI | API OpenAI (provider extra-UE: valutare Transfer) |
| Crediti | saldo e movimenti HP | MetalGate + `credit_transactions` |
| Tecnici | token in localStorage, cookie gate/maintenance | browser / Vercel |

Non conserviamo dati carta di credito in questa app. I pagamenti HP passano da MetalGate, non da Stripe in-app.

Non pubblichiamo una classifica nickname/punteggio in questa codebase.

## Finalità (bozza)

- Erogare il coach (contratto)
- Autenticazione MetalGate (contratto)
- Migliorare i consigli AI sul contesto dell’utente (da qualificare: contratto / legittimo interesse)
- Analytics di prodotto (GA, Clarity) — **oggi caricati in production senza banner di consenso nel codice**; base giuridica da allineare all’implementazione reale
- Manutenzione e prevenzione abusi

## Diritti

Accesso, rettifica, cancellazione, limitazione, opposizione, portabilità: richiesta a [email privacy da inserire].  
Cancellazione account: processo da confermare (supporto).

## Conservazione / fornitori

- Hosting: Vercel
- Database: Supabase
- Auth/wallet: MetalGate
- AI: OpenAI
- Analytics: Google, Microsoft (Clarity), solo se gli script sono attivi (spenti su staging/preview)

## Note implementative (non sono compliance)

- Nessun cookie banner nel frontend
- Token sessione in `localStorage` (debito)
- Service role solo server-side
- RLS **non** è uniforme su tutti gli store (vedi SICUREZZA.md)
