/** Chiavi e helper per prompt "Aggiungi a Home" (PWA). */

export const PWA_INSTALL_STORAGE_KEY = 'pwa_install_prompt_v1'
export const PWA_ENGAGED_STORAGE_KEY = 'pwa_install_engaged_v1'
export const OPEN_INSTALL_APP_PROMPT_EVENT = 'open-install-app-prompt'

const REMIND_LATER_MS = 3 * 24 * 60 * 60 * 1000
const DISMISS_MS = 14 * 24 * 60 * 60 * 1000
/** Dopo engagement: delay lungo così non si sovrappone al greeting/nudge. */
const AUTO_SHOW_DELAY_MS = 12000

export function isStandalonePwa() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.navigator.standalone === true
  )
}

export function isMobileInstallCandidate() {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent || ''
  const mobileUa = /Android|iPhone|iPad|iPod/i.test(ua)
  const narrow = window.matchMedia('(max-width: 1024px)').matches
  return mobileUa && narrow
}

export function getInstallPlatform() {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent || ''
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'other'
}

/** Segna uso reale (messaggio, azione). Auto-prompt solo da una visita successiva. */
export function markPwaEngaged() {
  if (typeof window === 'undefined') return
  try {
    const already = localStorage.getItem(PWA_ENGAGED_STORAGE_KEY)
    if (!already) {
      localStorage.setItem(PWA_ENGAGED_STORAGE_KEY, String(Date.now()))
      sessionStorage.setItem('pwa_engaged_this_session', '1')
    }
  } catch {
    /* ignore */
  }
}

export function hasPwaEngagement() {
  if (typeof window === 'undefined') return false
  try {
    return Boolean(localStorage.getItem(PWA_ENGAGED_STORAGE_KEY))
  } catch {
    return false
  }
}

/**
 * Mai al primo ingresso e mai nella stessa sessione del primo uso.
 * Apertura manuale (TopBar / evento) resta sempre disponibile.
 */
export function shouldAutoShowInstallPrompt() {
  if (!isMobileInstallCandidate() || isStandalonePwa()) return false
  if (!hasPwaEngagement()) return false
  try {
    if (sessionStorage.getItem('pwa_engaged_this_session') === '1') return false
  } catch {
    /* ignore */
  }
  return getPromptDismissState().show
}

export function getPromptDismissState() {
  if (typeof window === 'undefined') return { show: true }
  try {
    const raw = localStorage.getItem(PWA_INSTALL_STORAGE_KEY)
    if (!raw) return { show: true }
    if (raw === 'never') return { show: false }
    const parsed = JSON.parse(raw)
    if (parsed?.until && Date.now() < parsed.until) return { show: false }
    return { show: true }
  } catch {
    return { show: true }
  }
}

/** @param {'later' | 'dismiss' | 'never'} mode */
export function setPromptDismiss(mode) {
  if (typeof window === 'undefined') return
  try {
    if (mode === 'never') {
      localStorage.setItem(PWA_INSTALL_STORAGE_KEY, 'never')
      return
    }
    const ms = mode === 'later' ? REMIND_LATER_MS : DISMISS_MS
    localStorage.setItem(
      PWA_INSTALL_STORAGE_KEY,
      JSON.stringify({ until: Date.now() + ms, mode })
    )
  } catch {
    /* ignore */
  }
}

export function getAutoShowDelayMs() {
  return AUTO_SHOW_DELAY_MS
}
