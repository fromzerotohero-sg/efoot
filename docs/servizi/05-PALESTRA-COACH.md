# Palestra Coach — motore interno

Non è più un ingresso di prodotto da promuovere. In UX V2 è il motore “memoria/feedback” sotto Hero.

UI: `components/CoachFeedbackChat.jsx`, aperta da Home e contromisure. Nessuna route `/palestra`.

## API

| Route | Ruolo | HP |
|-------|--------|----|
| `POST /api/coach-feedback-chat` | Conversazione feedback | 2 |
| `POST /api/save-coach-feedback` | Persistenza | 2 |

Modello: `OPENAI_MODEL` || gpt-5.2, fallback gpt-4o.

## Dati da preservare

Scrittura su `user_tactical_feedback` e campi correlati di `user_profiles`.  
Pochi utenti hanno feedback (snapshot Master: 29 utenti / 104 righe): non perdere il passaggio conversazione → memoria.

Knowledge score usa anche questi dati; la chat principale oggi può ignorarli se la diagnostic cache è stale.

## Live Coach (separato)

Non è un messaggio di chat: sessione realtime + billing temporale.

- start 2 HP, minuto extra 5 HP (`lib/liveCoachPricing.js`)
- `/api/live-coach/session`, `heartbeat`, `end`
