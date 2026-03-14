/**
 * Configurazione unificata per i 3 tipi di foto giocatore (Card/Statistiche, Abilità, Booster).
 * Usata in: gestione-formazione (modal Upload), pagina giocatore (sezioni Statistiche/Abilità/Booster).
 * Design unificato: stesse icone Lucide, stessi colori, stesso stile card.
 */

// Chiavi tipo: 'card' = prima foto (statistiche/card), 'stats' = abilità, 'skills' = booster
export const PHOTO_TYPE_KEYS = ['card', 'stats', 'skills']

// Colori unificati (CSS vars o hex)
const COLORS = {
  card: 'var(--neon-blue)',      // Statistiche / Card
  stats: 'var(--neon-purple)',    // Abilità
  skills: 'var(--neon-orange)'   // Booster
}

const BG_COLORS = {
  card: 'rgba(0, 212, 255, 0.08)',
  stats: 'rgba(168, 85, 247, 0.08)',
  skills: 'rgba(245, 158, 11, 0.08)'
}

const BORDER_COLORS = {
  card: 'rgba(0, 212, 255, 0.25)',
  stats: 'rgba(168, 85, 247, 0.25)',
  skills: 'rgba(245, 158, 11, 0.25)'
}

/**
 * Restituisce config per un tipo (colore, bg, bordo). Le label/descrizione restano in i18n.
 * @param {string} key - 'card' | 'stats' | 'skills'
 * @returns {{ color, bgColor, borderColor }}
 */
export function getPhotoTypeStyle(key) {
  return {
    color: COLORS[key] || COLORS.card,
    bgColor: BG_COLORS[key] || BG_COLORS.card,
    borderColor: BORDER_COLORS[key] || BORDER_COLORS.card
  }
}

/**
 * Config completa per modal/lista (con required per il primo e secondo tipo).
 * @param {string} key - 'card' | 'stats' | 'skills'
 * @returns {{ key, color, bgColor, borderColor, required: boolean }}
 */
export function getPhotoTypeConfig(key) {
  const style = getPhotoTypeStyle(key)
  return {
    key,
    ...style,
    required: key === 'card' || key === 'stats'
  }
}
