# Cookie — stato implementato

Questo file descrive i cookie/script **presenti nel codice**, non una policy di marketing.  
Non c’è banner, `cookie_consent`, né pagina Impostazioni → Cookie.

## Tecnici (app)

| Nome / meccanismo | Scopo |
|-------------------|--------|
| Token MetalGate in `localStorage` (`metalgate_user`, `auth_token`) | Sessione. Non è un cookie HttpOnly. |
| Cookie prelaunch (HttpOnly) | Gate `/access` se `PRELAUNCH_ACCESS_CODE` è set |
| Cookie maintenance bypass | Solo team, se manutenzione attiva |
| Preferenza lingua | i18n client |

Eventuali cookie `sb-*` di Supabase possono comparire sui flussi legacy magic-link/password, non sul login MetalGate primario.

## Analitici / terze parti (production)

Caricati da `app/layout.jsx` **senza consenso UI**, tranne quando `NEXT_PUBLIC_APP_ENV=staging` o `VERCEL_ENV=preview`:

| Fornitore | ID nel codice | Scopo |
|-----------|---------------|--------|
| Google Analytics 4 | `G-X69T3QE3GG` | Misurazione uso |
| Microsoft Clarity | `wylmfczjap` | Session replay / heatmap |

L’utente può bloccarli dal browser. Non esiste “Accetta tutti / Rifiuta” in app.

## Cosa non dire

- Non scrivere che gli analitici partono solo con consenso: oggi non è vero.
- Non elencare Stripe.
- Contatto: support@fromzerotohero.io (privacy legale da definire).
