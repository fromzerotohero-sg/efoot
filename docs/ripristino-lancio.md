# Ripristino lancio

## Scopo
Questo documento descrive il gate temporaneo di accesso pre-lancio che e' stato aggiunto al progetto, spiega perche' hai visto alcune "cancellazioni" nel diff, e indica come spegnerlo o rimuoverlo del tutto quando deciderai il lancio ufficiale.

## Cosa e' stato fatto
E' stato aggiunto un gate temporaneo dopo il login:

- tutti possono registrarsi e fare login
- se il gate e' attivo, l'utente non entra subito nell'app
- dopo il login viene inviato alla pagina `\/access`
- in `\/access` vede una pagina informativa con:
  - ringraziamento per la registrazione
  - spiegazione della piattaforma
  - immagine hero
  - input per inserire il codice
- se il codice e' corretto, l'utente entra nell'app per quella sessione
- al logout il permesso viene cancellato

La chiave Vercel usata per il codice e':

`PRELAUNCH_ACCESS_CODE`

## Perche' hai visto "tante cose cancellate"
Le cancellazioni che hai visto non sono una rimozione di funzionalita' del layout.

La parte piu' evidente e' `app/layout.jsx`:

- prima conteneva direttamente sidebar, topbar, bottom navigation e assistant chat
- adesso quella logica e' stata spostata in `components/AppLayoutShell.jsx`

Quindi:

- in `app/layout.jsx` c'e' meno codice
- ma il comportamento non e' stato eliminato
- il layout e' stato solo estratto in un componente dedicato

In pratica:

- `app/layout.jsx` e' stato alleggerito
- `components/AppLayoutShell.jsx` contiene il vecchio layout interno
- questo e' servito per poter mostrare `\/access`, `\/login` e le route pubbliche senza sidebar/topbar/nav

## File creati
Questi file sono nuovi e servono solo al gate pre-lancio:

- `app/access/page.jsx`
- `app/api/prelaunch/status/route.js`
- `app/api/prelaunch/unlock/route.js`
- `app/api/prelaunch/logout/route.js`
- `components/AppLayoutShell.jsx`
- `components/PrelaunchGate.jsx`
- `lib/prelaunchRoutes.js`
- `lib/prelaunchServer.js`

## File modificati
Questi file sono stati aggiornati per collegare il gate al flusso esistente:

- `app/layout.jsx`
- `app/login-success/page.jsx`
- `app/auth/magiclink-callback/page.jsx`
- `components/SidebarNew.jsx`
- `components/Sidebar.jsx`

Modifica minore non legata al gate:

- `app/page.jsx`
  - pulizia di whitespace nell'import

## Flusso attuale
### Login classico
1. L'utente fa login.
2. Viene reindirizzato a `\/access`.
3. Se il gate e' attivo e il codice non e' ancora stato inserito in questa sessione, resta su `\/access`.
4. Se inserisce il codice corretto, entra in `\/`.

### Logout
Al logout viene chiamata `\/api/prelaunch/logout`, che cancella il permesso di sessione.

Conseguenza:

- al login successivo il codice va reinserito

## Come funziona tecnicamente
### Variabile ambiente
Il gate si attiva solo se esiste:

`PRELAUNCH_ACCESS_CODE`

### Cookie
Quando il codice e' corretto, viene impostato un cookie HttpOnly temporaneo:

`fzth_prelaunch_access`

Questo cookie:

- non e' letto dal frontend
- vale solo come permesso di sessione
- viene eliminato al logout

### Route pubbliche escluse dal gate
Le route lasciate fuori dal blocco sono:

- `\/login`
- `\/login-success`
- `\/forgot-password`
- `\/reset-password`
- `\/access`
- tutte le route che iniziano con `\/auth\/`

## Come andare live nel modo piu' semplice
Questo e' il metodo consigliato.

### Spegnere il gate senza rimuovere il codice
1. Vai su Vercel.
2. Rimuovi oppure svuota la env:
   - `PRELAUNCH_ACCESS_CODE`
3. Fai redeploy.

Effetto:

- il gate smette di essere attivo
- gli utenti dopo il login entrano normalmente
- la pagina `\/access` non viene piu' usata come blocco
- tutta la struttura resta nel codice ma e' inattiva

Questo e' il ripristino piu' rapido e sicuro per il lancio.

## Come ripristinare completamente il progetto allo stato pre-gate
Se vuoi eliminare del tutto la feature dal codice, devi rimuovere questi punti.

### 1. Eliminare i file nuovi
Rimuovere:

- `app/access/page.jsx`
- `app/api/prelaunch/status/route.js`
- `app/api/prelaunch/unlock/route.js`
- `app/api/prelaunch/logout/route.js`
- `components/AppLayoutShell.jsx`
- `components/PrelaunchGate.jsx`
- `lib/prelaunchRoutes.js`
- `lib/prelaunchServer.js`

### 2. Ripristinare `app/layout.jsx`
Rimettere il layout originario direttamente dentro `app/layout.jsx`, cioe':

- import di `SidebarNew`
- import di `TopBar`
- import di `BottomNavigation`
- import di `AssistantChat`
- render diretto del layout interno senza `AppLayoutShell`

### 3. Ripristinare i redirect post-login
Rimettere:

- `app/login-success/page.jsx` -> redirect a `\/`
- `app/auth/magiclink-callback/page.jsx` -> redirect a `\/`

### 4. Ripristinare il logout pulito senza gate
Rimuovere queste chiamate:

- `fetch('/api/prelaunch/logout', { method: 'POST' })`

da:

- `components/SidebarNew.jsx`
- `components/Sidebar.jsx`

## Differenza tra "spegnere" e "rimuovere"
### Spegnere
Vuol dire:

- lasciare tutto il codice
- togliere solo `PRELAUNCH_ACCESS_CODE`

Vantaggi:

- rapidissimo
- basso rischio
- consigliato per il giorno del lancio

### Rimuovere
Vuol dire:

- cancellare tutti i file del gate
- ripristinare i redirect e il layout originario

Vantaggi:

- codice piu' pulito dopo il lancio

Svantaggi:

- piu' lavoro
- va fatto con attenzione

## Consiglio operativo
Per il lancio ufficiale ti consiglio questo ordine:

1. togli `PRELAUNCH_ACCESS_CODE` da Vercel
2. fai redeploy
3. verifica che login porti dentro l'app senza passare da `\/access`
4. solo dopo, se vuoi, pulisci definitivamente il codice del gate

## Test da fare quando spegni il gate
Controllare:

1. login Metalgate
2. login magic link / callback
3. logout e nuovo login
4. accesso diretto a `\/`
5. accesso diretto a `\/access`

Comportamento atteso a gate spento:

- login -> entra normalmente
- `\/access` non deve bloccare
- logout/login non deve chiedere nessun codice

## Troubleshooting deploy Vercel
Se il gate sembra non funzionare ma la env `PRELAUNCH_ACCESS_CODE` esiste, il primo controllo da fare non e' il login: e' verificare che il deployment corrente sia davvero quello che contiene il gate.

### Sintomi tipici di deployment sbagliato
Se vedi uno o piu' di questi comportamenti:

- fai login e vai ancora direttamente in dashboard
- `\/access` risponde `404`
- `\/api/prelaunch/status` risponde `404`

allora il dominio non sta servendo il commit del gate.

### Controlli rapidi da fare
1. In Vercel verifica quale deployment e' marcato `Current`.
2. Controlla che il deployment `Current` punti al commit del gate:
   - `79b5464` `Add prelaunch access gate and launch restore guide.`
3. Se `Current` e' un redeploy di un commit piu' vecchio, il gate non esistera' online anche se la env e' corretta.

### URL di verifica immediata
Da deployment corretto:

- `https://efootball.fromzerotohero.io/access`
  - non deve essere `404`
- `https://efootball.fromzerotohero.io/api/prelaunch/status`
  - non deve essere `404`

Se anche uno solo di questi URL da `404`, il deployment attivo non contiene il gate.

### Cosa fare se il deployment corrente e' quello sbagliato
1. Apri in Vercel il deployment del commit:
   - `79b5464`
2. Fai `Promote to Production` oppure redeploy proprio quel deployment.
3. Non redeployare un commit piu' vecchio, altrimenti il dominio restera' senza `\/access` e senza API prelaunch.

### Test corretto dopo il deploy giusto
1. Apri una finestra anonima.
2. Fai login completo via Metalgate.
3. Dopo il redirect dentro l'app, devi finire su `\/access`.
4. Solo dopo il codice corretto devi entrare in `\/`.

## Nota finale
Se vuoi il ripristino piu' sicuro e veloce:

- non cancellare subito la feature
- limita l'operazione a:
  - rimuovere la env `PRELAUNCH_ACCESS_CODE`
  - fare redeploy

Questa e' la strada migliore per il giorno del lancio.
