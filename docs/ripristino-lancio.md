# Gate pre-lancio

Il gate esiste ancora. Si spegne togliendo la env, **non** cancellando la shell.

## Comportamento

Se `PRELAUNCH_ACCESS_CODE` è impostato:

1. Login MetalGate → sessione prelaunch
2. Redirect `/access`
3. Codice corretto → cookie HttpOnly → app
4. Logout chiama `/api/prelaunch/logout` e al login successivo il codice va reinserito

Se la env **non** c’è, il gate è spento: login entra in app.

Pagine pubbliche (senza sidebar): `/login`, `/access`, callback auth, `/maintenance`. Gestite da `AppLayoutShell` + `PrelaunchGate` / `MaintenanceGate`.

## File del gate (tenere)

- `app/access/page.jsx`
- `app/api/prelaunch/*`
- `components/PrelaunchGate.jsx`
- `lib/prelaunchRoutes.js`, `lib/prelaunchServer.js`

## File che NON fanno parte del gate

`components/AppLayoutShell.jsx` è la **shell globale** (sidebar, topbar, bottom nav, Daily Spin, Live Coach, AssistantChat). È stata estratta da `layout.jsx`, non è un file temporaneo del prelaunch.

**Non cancellare `AppLayoutShell` per “ripristinare il lancio”.** Si rompe l’app.

## Giorno del lancio (consigliato)

1. Rimuovere `PRELAUNCH_ACCESS_CODE` da Vercel
2. Redeploy
3. Verificare: login → app, `/access` non blocca, logout/login senza codice

Solo dopo, eventuale pulizia codice del gate con prompt dedicato. Non ripristinare un layout.tsx e non inlinare di nuovo tutta la shell in `layout.jsx`.

## Manutenzione

Separato: `MAINTENANCE_MODE` + `/maintenance` + `MaintenanceGate`. Stessa regola: spegnere via env, non demolire la shell.
