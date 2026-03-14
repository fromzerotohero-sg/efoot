# lib/ – Librerie e helper

## Core

| File | Scopo |
|------|-------|
| `supabaseClient.js` | Client Supabase frontend (RLS) |
| `authHelper.js` | validateToken, extractBearerToken |
| `openaiHelper.js` | callOpenAIWithRetry, parseOpenAIResponse |

## AI / RAG

| File | Scopo |
|------|-------|
| `ragHelper.js` | getRelevantSections, classifyQuestion, getRelevantSectionsForContext → legge info_rag.md |
| `countermeasuresHelper.js` | generateCountermeasuresPrompt, validateCountermeasuresOutput |

## Business logic

| File | Scopo |
|------|-------|
| `creditService.js` | recordUsage, getCurrentUsage, CREDIT_WEIGHTS |
| `aiKnowledgeHelper.js` | Calcolo barra conoscenza IA |
| `taskHelper.js` | Obiettivi settimanali |

## UI / i18n

| File | Scopo |
|------|-------|
| `i18n.js` | useTranslation, t, translations (IT/EN) |
| `errorHelper.js` | mapErrorToUserMessage |
| `fetchHelper.js` | safeJsonResponse |
| `guideTours.js` | getTourSteps |
| `playerPhotoTypes.js` | Config foto giocatore |
| `tacticalInstructions.js` | Istruzioni individuali |
| `validateFormationLimits.js` | Limiti formazione |

## Altri

| File | Scopo |
|------|-------|
| `rateLimiter.js` | checkRateLimit, RATE_LIMIT_CONFIG |

**Doc**: `docs/GUIDA_VALIDAZIONE_PROGRAMMATORE.md`, `DOCUMENTAZIONE_RIFERIMENTO.md` §5
