/**
 * Helper per mappare errori tecnici a messaggi user-friendly.
 * Usato per non spaventare l'utente con errori tecnici.
 */

// Mappatura errori tecnici → messaggi utente (IT + EN per sicurezza/UX doppia lingua)
const ERROR_MAPPINGS = [
  // Errori OpenAI/Quota
  {
    patterns: ['quota', 'billing', 'exceeded your current quota', 'rate limit exceeded'],
    message: 'Servizio momentaneamente sovraccarico. Riprova tra qualche minuto.',
    messageEn: 'Service temporarily overloaded. Try again in a few minutes.',
    code: 'QUOTA_EXCEEDED'
  },
  // Errori di rete/timeout
  {
    patterns: ['timeout', 'request took too long', 'network error', 'fetch', 'failed to fetch'],
    message: 'Connessione lenta o interrotta. Verifica la tua rete e riprova.',
    messageEn: 'Connection slow or interrupted. Check your network and try again.',
    code: 'NETWORK_ERROR'
  },
  // Errori sessione / auth (Authentication required, Invalid or expired authentication)
  {
    patterns: ['sessione scaduta', 'session expired', 'invalid authentication', 'authentication required', 'invalid or expired', 'token', 'jwt'],
    message: 'Sessione scaduta. Accedi di nuovo per continuare.',
    messageEn: 'Session expired. Log in again to continue.',
    code: 'SESSION_EXPIRED',
    action: 'redirect_login'
  },
  // Errori Supabase/RLS
  {
    patterns: ['pgrst', 'new row violates row-level security', 'rls', 'permission denied'],
    message: 'Non hai i permessi per questa operazione. Ricarica la pagina.',
    messageEn: 'You do not have permission for this action. Reload the page.',
    code: 'PERMISSION_DENIED'
  },
  // Errori immagine
  {
    patterns: ['image too large', 'immagine troppo grande', 'max 10mb', 'invalid image'],
    message: 'Immagine troppo grande o non valida. Usa un file più piccolo (max 10MB).',
    messageEn: 'Image too large or invalid. Use a smaller file (max 10MB).',
    code: 'IMAGE_ERROR'
  },
  // Errori estrazione (include pattern OpenAI / formato non atteso)
  {
    patterns: [
      'extract', 'estrazione', 'failed to parse', 'json parse', 'parsing',
      'expected pattern', 'did not match', 'string did not match', 'match the expected',
      'invalid json', 'non valido', 'unable to extract', 'no content'
    ],
    message: 'Errore nella lettura dei dati. Prova con un altro screenshot più nitido.',
    messageEn: 'Could not read data from image. Try a clearer screenshot.',
    code: 'EXTRACTION_ERROR'
  },
  // Errori duplicati
  {
    patterns: ['duplicate', 'duplicato', 'already exists', 'già presente'],
    message: 'Dato già esistente. Verifica se hai già caricato questi dati.',
    messageEn: 'Data already exists. Check if you have already uploaded this.',
    code: 'DUPLICATE_ERROR'
  },
  // Errori server generici
  {
    patterns: ['500', 'internal server error', '502', '503', 'bad gateway'],
    message: 'Errore del server. Riprova tra poco.',
    messageEn: 'Server error. Try again shortly.',
    code: 'SERVER_ERROR'
  },
  // Errori validazione
  {
    patterns: ['required', 'obbligatorio', 'invalid', 'non valido', 'missing'],
    message: 'Dati mancanti o non validi. Verifica i campi inseriti.',
    messageEn: 'Missing or invalid data. Check the fields you entered.',
    code: 'VALIDATION_ERROR'
  }
];

/**
 * Trasforma un errore tecnico in un messaggio user-friendly (bilingue).
 * @param {Error|string} error - Errore da mappare
 * @param {string} [fallbackMessage='Si è verificato un errore. Riprova.'] - Messaggio di fallback (usa t() per localizzare)
 * @param {'it'|'en'} [lang='it'] - Lingua messaggio
 * @returns {{message: string, code: string, action?: string}} - Messaggio e codice errore
 */
export function mapErrorToUserMessage(error, fallbackMessage = 'Si è verificato un errore. Riprova.', lang = 'it') {
  const errorString = (error?.message || error || '').toLowerCase();
  const useEn = lang === 'en';

  for (const mapping of ERROR_MAPPINGS) {
    const matches = mapping.patterns.some(pattern =>
      errorString.includes(pattern.toLowerCase())
    );

    if (matches) {
      const msg = useEn && mapping.messageEn ? mapping.messageEn : mapping.message;
      return {
        message: msg,
        code: mapping.code,
        action: mapping.action
      };
    }
  }

  return {
    message: fallbackMessage,
    code: 'UNKNOWN_ERROR'
  };
}
