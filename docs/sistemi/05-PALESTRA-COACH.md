# Palestra Coach

Motore interno sotto Hero. Nessuna route pagina `/palestra`.

UI: workflow in `components/hero-chat/HeroChat.jsx`.

## Ruolo

**Ascolta, raccoglie, fa domande, aggiorna conoscenza.**  
Non sostituisce Hero come coach tattico: se l’utente chiede consigli di modulo/chi schierare, redirect verso la chat principale.

## API

| Route | Ruolo | HP |
|-------|--------|----|
| `POST /api/coach-feedback-chat` | Conversazione | 2 |
| `POST /api/save-coach-feedback` | Estrazione + persistenza | 2 |

## Persistenza

- Scrive `user_tactical_feedback`
- Può aggiornare campi di gioco su `user_profiles`
- Usa gli **ultimi** messaggi della conversazione (non i primi) entro il limite
- `common_problems`: unisce ai valori già presenti, non sovrascrive alla cieca

## Contesto chat

Profilo live (piattaforma, PA, delay, weak point, divisione, …) + ultima partita se presente.

## Backend dormiente

Dominio `backend/src/domains/coach-feedback/` allineato a production. MetalGate header legacy (`x-metalgate-*`) restano documentati per Tommaso in transizione.
