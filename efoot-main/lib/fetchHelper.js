/**
 * Helper per gestire risposte fetch in modo sicuro.
 * Evita errori di parsing JSON quando il server restituisce HTML o testo.
 */

/**
 * Estrae JSON dalla risposta in modo sicuro.
 * Se la risposta non è JSON o il parsing fallisce, lancia un errore leggibile.
 * 
 * @param {Response} response - Oggetto Response da fetch
 * @param {string} [fallbackErrorMessage='Errore server'] - Messaggio di fallback
 * @returns {Promise<any>} - I dati JSON parsati
 * @throws {Error} - Se la risposta non è ok o non è JSON valido
 */
export async function safeJsonResponse(response, fallbackErrorMessage = 'Errore server') {
  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')

  // Se la risposta non è ok, gestisci l'errore
  if (!response.ok) {
    if (isJson) {
      try {
        const errorData = await response.json()
        throw new Error(errorData.error || errorData.message || `${fallbackErrorMessage}: ${response.status}`)
      } catch (parseError) {
        // Se anche il parsing dell'errore JSON fallisce
        if (parseError.message && !parseError.message.includes('Unexpected token')) {
          throw parseError
        }
        throw new Error(`${fallbackErrorMessage}: ${response.status} ${response.statusText}`)
      }
    } else {
      // Risposta non-JSON (probabilmente HTML di errore)
      let text = ''
      try {
        text = await response.text()
      } catch (e) {
        // ignore
      }
      // Estrai un messaggio utile se possibile
      const shortText = text.substring(0, 200).replace(/<[^>]*>/g, ' ').trim()
      throw new Error(`${fallbackErrorMessage}: ${response.status} ${response.statusText}${shortText ? ` - ${shortText}` : ''}`)
    }
  }

  // Risposta ok, prova a parsare JSON
  if (isJson) {
    try {
      return await response.json()
    } catch (parseError) {
      throw new Error(`Risposta non valida dal server (JSON malformato)`)
    }
  } else {
    // Risposta ok ma non è JSON - potrebbe essere vuota (es. 204 No Content)
    if (response.status === 204) {
      return null
    }
    // Prova comunque a parsare come JSON (alcuni server non settano Content-Type)
    try {
      const text = await response.text()
      if (!text || text.trim() === '') {
        return null
      }
      return JSON.parse(text)
    } catch (parseError) {
      throw new Error(`Risposta non-JSON ricevuta dal server`)
    }
  }
}
