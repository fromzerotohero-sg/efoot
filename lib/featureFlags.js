/**
 * Feature Flags - Sistema di abilitazione sicura per nuove funzionalità
 * 
 * Uso:
 * import { isEnabled } from '@/lib/featureFlags'
 * if (isEnabled('NEW_GUIDE_SYSTEM')) { ... }
 * 
 * Le flag possono essere controllate via:
 * 1. Environment variables (NEXT_PUBLIC_FF_*)
 * 2. localStorage (per testing utente)
 * 3. Default values (fallback sicuro)
 */

const DEFAULT_FLAGS = {
  // NUOVA GUIDA E TOUR - Opzione A
  // Abilita il nuovo sistema di guida migliorato
  NEW_GUIDE_SYSTEM: true,

  // Smart coach trial separato dal Pro
  SMART_COACH_ENTRY: true,
  
  // Aggiungi qui future flag
}

function getEnvFlag(key) {
  if (typeof process === 'undefined') return undefined
  const envKey = `NEXT_PUBLIC_FF_${key}`
  const value = process.env[envKey]
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined
}

function getLocalStorageFlag(key) {
  if (typeof window === 'undefined') return undefined
  try {
    const value = localStorage.getItem(`ff_${key}`)
    if (value === 'true') return true
    if (value === 'false') return false
    return undefined
  } catch {
    return undefined
  }
}

/**
 * Controlla se una feature flag è abilitata
 * Precedenza: localStorage > env > default
 * @param {string} key - Nome della flag (es. 'NEW_GUIDE_SYSTEM')
 * @returns {boolean}
 */
export function isEnabled(key) {
  // 1. Controlla localStorage (utente può forzare)
  const localValue = getLocalStorageFlag(key)
  if (localValue !== undefined) return localValue
  
  // 2. Controlla environment
  const envValue = getEnvFlag(key)
  if (envValue !== undefined) return envValue
  
  // 3. Fallback al default
  return DEFAULT_FLAGS[key] ?? false
}

/**
 * Abilita/disabilita una flag in localStorage (per testing)
 * @param {string} key 
 * @param {boolean} value 
 */
export function setLocalFlag(key, value) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`ff_${key}`, String(value))
  } catch (e) {
    console.warn('[FeatureFlags] Cannot set local flag:', e)
  }
}

/**
 * Rimuove una flag da localStorage
 * @param {string} key 
 */
export function clearLocalFlag(key) {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(`ff_${key}`)
  } catch (e) {
    console.warn('[FeatureFlags] Cannot clear local flag:', e)
  }
}

export { DEFAULT_FLAGS }
