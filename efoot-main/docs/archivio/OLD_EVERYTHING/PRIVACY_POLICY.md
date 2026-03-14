# Privacy Policy

**eFootball AI Coach**  
**Informativa ai sensi art. 13 Regolamento (UE) 2016/679 (GDPR)**  
**Data ultimo aggiornamento:** 13/02/2026

---

## 1. Titolare del Trattamento

**[Nome Società]**  
Sede legale: [Indirizzo completo]  
P.IVA / C.F.: [Numero]  
Email: privacy@[dominio].com  
PEC: [indirizzo PEC]

**Responsabile della Protezione dei Dati (DPO):**  
Email: dpo@[dominio].com

---

## 2. Dati Personali Raccolti

### 2.1 Dati di Registrazione
- Email (obbligatoria, per autenticazione e comunicazioni)
- Password (criptata con bcrypt, non leggibile in chiaro)
- Data registrazione, ultimo accesso

### 2.2 Dati di Profilo (opzionali)
- Nome, cognome
- Nickname (pubblico in classifica)
- Paese, età
- Piattaforma di gioco (Console/PC/Mobile)
- Ore di gioco settimanali
- Divisione eFootball

### 2.3 Dati di Gioco
- Rosa giocatori (nomi, statistiche, posizioni)
- Partite giocate (avversari, risultati, formazioni)
- Screenshot caricati (card giocatori, statistiche)
- Feedback tattici forniti alla Palestra Coach

### 2.4 Dati di Utilizzo
- Log accessi (IP, timestamp, azioni)
- Hero Points acquistati e consumati
- Interazioni con AI (chat, analisi)
- Progressi in classifica

### 2.5 Dati Pagamento
- **NON** conserviamo dati carta di credito (gestiti da Stripe/PayPal)
- Transazioni (importo, data, pacchetto HP acquistato)
- Indirizzo fatturazione (solo su richiesta fattura)

---

## 3. Finalità e Base Giuridica

| Finalità | Base Giuridica | Dati Trattati |
|----------|----------------|---------------|
| **Erogazione servizio** | Esecuzione contratto (art. 6.1.b GDPR) | Tutti i dati di gioco e profilo |
| **Autenticazione** | Esecuzione contratto | Email, password |
| **Pagamenti** | Esecuzione contratto | Dati transazione |
| **Classifiche pubbliche** | Interesse legittimo (art. 6.1.f) + consenso implicito T&C | Nickname, punteggio |
| **Miglioramento AI** | Interesse legittimo (art. 6.1.f) — dati anonimizzati | Pattern di gioco, feedback |
| **Marketing diretto** | Consenso (art. 6.1.a) — modificabile in profilo | Email |
| **Obblighi legali** | Adempimento obbligo legale (art. 6.1.c) | Dati fiscali, log |
| **Sicurezza** | Interesse legittimo | Log accessi, IP |

---

## 4. Trattamento con AI e Terze Parti

### 4.1 OpenAI (GPT-4o)
- **Dati trasmessi**: Messaggi chat, dati rosa/partite (per contesto)
- **Finalità**: Generazione consigli tattici
- **Luogo**: USA (transfer con garanzie Standard Contractual Clauses)
- **Conservazione**: OpenAI non usa dati per training (API Enterprise)

### 4.2 Supabase (Database)
- **Dati**: Tutti i dati utente
- **Luogo**: UE (Francoforte) — GDPR compliant
- **Sicurezza**: Crittografia at-rest e in-transit

### 4.3 Stripe/PayPal (Pagamenti)
- **Dati**: Dati transazione, token pagamento
- **Luogo**: UE/USA (con garanzie)
- **Certificazione**: PCI-DSS Level 1

### 4.4 Vercel (Hosting)
- **Dati**: Traffico web, log
- **Luogo**: UE (opzione selezionata)
- **Sicurezza**: HTTPS, edge caching

---

## 5. Periodo di Conservazione

| Categoria | Durata | Criterio |
|-----------|--------|----------|
| **Dati account attivo** | Durata account + 2 anni | Interesse legittimo (recupero account) |
| **Dati partite/gioco** | 5 anni | Utilità storica per analisi |
| **Log di sicurezza** | 2 anni | Obbligo legale sicurezza |
| **Dati pagamento** | 10 anni | Obbligo fiscale (art. 2220 c.c.) |
| **Dati account cancellato** | 30 giorni (poi eliminazione) | GDPR "right to be forgotten" |
| **Backup** | 30 giorni | Recupero emergenza |

---

## 6. Diritti dell'Interessato (GDPR)

Puoi esercitare questi diritti contattando privacy@[dominio].com:

### 6.1 Diritto di Accesso (art. 15)
- Ricevere copia di tutti i tuoi dati personali
- Tempo di risposta: 30 giorni

### 6.2 Diritto di Rettifica (art. 16)
- Correggere dati inaccurati
- Modificabile autonomamente in "Impostazioni Profilo"

### 6.3 Diritto alla Cancellazione (art. 17) — "Right to be Forgotten"
- Richiedere eliminazione completa account
- **Eccezioni**: Dati fiscali (obbligo legale), log sicurezza
- Eliminazione effettiva entro 30 giorni

### 6.4 Diritto alla Portabilità (art. 20)
- Ricevere dati in formato strutturato (JSON)
- Trasferire dati ad altro servizio

### 6.5 Diritto di Opposizione (art. 21)
- Opporsi al trattamento per marketing
- Opporsi a decisioni automatizzate (la Piattaforma non ne fa)

### 6.6 Diritto di Limitazione (art. 18)
- Sospendere trattamento in caso di contestazione

---

## 7. Sicurezza dei Dati

### 7.1 Misure Tecniche
- **Crittografia**: TLS 1.3 per dati in transito, AES-256 at-rest
- **Password**: Hash bcrypt con salt (irreversibili)
- **Autenticazione**: JWT con scadenza, refresh token
- **Database**: Row Level Security (RLS), accesso solo via service role

### 7.2 Misure Organizzative
- Accesso dati limitato a personale autorizzato
- Audit log degli accessi
- Formazione privacy del personale
- DPO nominato

### 7.3 Breach Notification
In caso di violazione dei dati:
- Notifica al Garante entro 72 ore
- Notifica agli interessati se rischio elevato

---

## 8. Cookie e Tecnologie Simili

### 8.1 Cookie Tecnici (Necessari)
| Nome | Durata | Finalità |
|------|--------|----------|
| `sb-access-token` | Sessione | Autenticazione Supabase |
| `sb-refresh-token` | 7 giorni | Refresh autenticazione |
| `app_language` | Persistente | Preferenza lingua |

### 8.2 Cookie Analitici (Consenso)
- Google Analytics 4 (anonimizzato)
- Puoi rifiutare nel banner cookie

### 8.3 Gestione Consenso
- Banner cookie al primo accesso
- Modificabile in "Impostazioni → Privacy"
- Rifiuto cookie analitici non blocca il servizio

---

## 9. Dati Minori

- Il servizio è destinato a utenti **≥ 18 anni**
- Se rileviamo account di minori senza consenso genitore, li sospendiamo
- Per minori 16-18 anni: consenso genitore richiesto (verifica via email)

---

## 10. Modifiche alla Privacy Policy

- Modifiche sostanziali: notifica email 30 giorni prima
- Modifiche minori: aggiornamento in questa pagina
- Data ultimo aggiornamento sempre visibile in testa

---

## 11. Contatti Privacy

**Email DPO:** dpo@[dominio].com  
**Email Supporto:** privacy@[dominio].com  
**Tempo risposta:** 30 giorni (GDPR), solitamente 7 giorni lavorativi

**Reclamo all'Autorità:**  
Garante per la Protezione dei Dati Personali  
www.garanteprivacy.it  
Piazza Venezia 11, 00187 Roma

---

## 12. Accettazione

Registrandoti su eFootball AI Coach, dichiari di aver letto questa Privacy Policy e di acconsentire al trattamento dei tuoi dati personali nei termini qui descritti.

---

**Allegati consigliati:**
- [Termini e Condizioni](./TERMINI_CONDIZIONI.md)
- [Cookie Policy](./COOKIE_POLICY.md) (se separata)
