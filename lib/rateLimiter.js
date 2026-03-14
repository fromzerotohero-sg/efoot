/**
 * Rate Limiter semplice per endpoint API
 * Usa in-memory store (Map)
 *
 * ⚠️ LIMITAZIONE: Su Vercel (multi-istanza) ogni istanza ha il suo Map.
 *    Un utente può bypassare il limite distribuendo richieste su più istanze.
 *
 * 🚀 SOLUZIONE PROD: Implementare con Redis/Upstash:
 *    - Upstash Redis (serverless, compatibile Vercel)
 *    - Redis Cloud (gestito)
 *    - Supabase non ha Redis integrato, serve servizio esterno
 *
 * Priorità: Media (il rate limit attuale è un mitigante, non una protezione forte)
 */

const rateLimitStore = new Map()

/**
 * Rate limiter per endpoint
 * @param {string} userId - User ID
 * @param {string} endpoint - Endpoint path
 * @param {number} maxRequests - Max richieste
 * @param {number} windowMs - Finestra temporale in millisecondi
 * @returns {Promise<{allowed: boolean, remaining: number, resetAt: number}>}
 */
export async function checkRateLimit(userId, endpoint, maxRequests = null, windowMs = 60000) {
  const key = `${userId}:${endpoint}`
  const now = Date.now()
  
  // Se maxRequests non specificato, usa configurazione
  const config = RATE_LIMIT_CONFIG[endpoint]
  if (!maxRequests && config) {
    maxRequests = config.maxRequests
    windowMs = config.windowMs
  }
  
  // Default se non configurato
  if (!maxRequests) {
    maxRequests = 10
  }
  
  // Recupera o crea entry
  let entry = rateLimitStore.get(key)
  
  if (!entry || now > entry.resetAt) {
    // Nuova finestra o scaduta
    entry = {
      count: 0,
      resetAt: now + windowMs
    }
    rateLimitStore.set(key, entry)
  }
  
  // Verifica limite PRIMA di incrementare (per evitare di contare richieste rifiutate)
  const currentCount = entry.count
  const allowed = currentCount < maxRequests
  
  // Incrementa contatore solo se allowed (o se è l'ultima richiesta permessa)
  if (allowed || currentCount === 0) {
    entry.count++
  }
  
  const remaining = Math.max(0, maxRequests - entry.count)
  
  // Cleanup vecchie entry (ogni 1000 chiamate, per evitare memory leak)
  if (Math.random() < 0.001) {
    cleanupExpiredEntries(now)
  }
  
  return {
    allowed,
    remaining,
    resetAt: new Date(entry.resetAt)
  }
}

/**
 * Pulisce entry scadute
 */
function cleanupExpiredEntries(now) {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key)
    }
  }
}

/**
 * Configurazione rate limit per endpoint
 */
export const RATE_LIMIT_CONFIG = {
  '/api/analyze-match': {
    maxRequests: 20, // 20 richieste (aumentato per analisi più frequenti)
    windowMs: 60000 // per minuto
  },
  '/api/supabase/delete-match': {
    maxRequests: 5, // 5 richieste
    windowMs: 60000 // per minuto
  },
  '/api/supabase/save-match': {
    maxRequests: 20, // 20 richieste
    windowMs: 60000 // per minuto
  },
  '/api/supabase/update-match': {
    maxRequests: 30, // 30 richieste
    windowMs: 60000 // per minuto
  },
  '/api/generate-countermeasures': {
    maxRequests: 5, // 5 richieste
    windowMs: 60000 // per minuto
  },
  '/api/supabase/save-profile': {
    maxRequests: 30, // 30 richieste
    windowMs: 60000 // per minuto
  },
  '/api/supabase/save-coach': {
    maxRequests: 20, // 20 richieste
    windowMs: 60000 // per minuto
  },
  '/api/supabase/set-active-coach': {
    maxRequests: 20, // 20 richieste
    windowMs: 60000 // per minuto
  },
  '/api/supabase/save-tactical-settings': {
    maxRequests: 30, // 30 richieste
    windowMs: 60000 // per minuto
  },
  '/api/extract-match-data': {
    maxRequests: 10, // 10 richieste (usa OpenAI, costoso)
    windowMs: 60000 // per minuto
  },
  '/api/extract-player': {
    maxRequests: 15, // 15 richieste (usa OpenAI, costoso)
    windowMs: 60000 // per minuto
  },
  '/api/extract-formation': {
    maxRequests: 10, // 10 richieste (usa OpenAI, costoso)
    windowMs: 60000 // per minuto
  },
  '/api/extract-coach': {
    maxRequests: 5, // 5 richieste (usa OpenAI, costoso)
    windowMs: 60000 // per minuto
  },
  '/api/extract-game-analysis': {
    maxRequests: 5,
    windowMs: 60000
  },
  '/api/supabase/delete-player': {
    maxRequests: 5, // 5 richieste (DELETE, critico)
    windowMs: 60000 // per minuto
  },
  '/api/ai-knowledge': {
    maxRequests: 20, // 20 richieste (lettura score, con cache)
    windowMs: 60000 // per minuto
  },
  '/api/assistant-chat': {
    maxRequests: 30, // 30 richieste (chat AI, costoso)
    windowMs: 60000 // per minuto
  },
  '/api/tasks/list': {
    maxRequests: 60, // 60 richieste (lettura task, endpoint leggero)
    windowMs: 60000 // per minuto
  },
  '/api/tasks/generate': {
    maxRequests: 5, // 5 richieste (generazione task, può usare AI)
    windowMs: 60000 // per minuto
  },
  '/api/refresh-diagnostic': {
    maxRequests: 2, // 2 richieste per minuto (diagnostic pesante)
    windowMs: 60000
  },
  '/api/leaderboard': {
    maxRequests: 60, // lettura classifica, può essere chiamata spesso (dashboard + pagina)
    windowMs: 60000
  },
  '/api/leaderboard/me': {
    maxRequests: 30,
    windowMs: 60000
  },
  '/api/supabase/save-player': {
    maxRequests: 30,
    windowMs: 60000
  },
  '/api/supabase/save-formation-layout': {
    maxRequests: 20,
    windowMs: 60000
  },
  '/api/supabase/save-opponent-formation': {
    maxRequests: 15,
    windowMs: 60000
  },
  '/api/supabase/assign-player-to-slot': {
    maxRequests: 30,
    windowMs: 60000
  },
  '/api/supabase/remove-player-from-slot': {
    maxRequests: 30,
    windowMs: 60000
  },
  '/api/supabase/save-ai-info': {
    maxRequests: 20,
    windowMs: 60000
  },
  '/api/coach-feedback-chat': {
    maxRequests: 30, // 30 richieste (chat feedback, 1 credito/msg)
    windowMs: 60000
  },
  '/api/save-coach-feedback': {
    maxRequests: 5, // 5 richieste (salvataggio sessione, 1 credito)
    windowMs: 60000
  }
}
