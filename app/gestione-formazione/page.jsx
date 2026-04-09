'use client'

import React, { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import { ArrowLeft, Upload, Camera, AlertCircle, AlertTriangle, CheckCircle2, RefreshCw, Info, X, Plus, User, Settings, BarChart3, Zap, Gift, ChevronDown, ChevronUp, Users, Star, Move, Pencil, BookOpen } from 'lucide-react'
import TacticalSettingsPanel from '@/components/TacticalSettingsPanel'
import RosaTutorialModal from '@/components/RosaTutorialModal'
import OnboardingFormation from '@/components/OnboardingFormation'
import PositionSelectionModal from '@/components/PositionSelectionModal'
import MissingDataModal from '@/components/MissingDataModal'
import ConfirmModal from '@/components/ConfirmModal'
import ManualPlayerModal from '@/components/ManualPlayerModal'
import ManualBoostersModal from '@/components/ManualBoostersModal'
import { safeJsonResponse } from '@/lib/fetchHelper'
import { mapErrorToUserMessage } from '@/lib/errorHelper'
import { PHOTO_TYPE_KEYS, getPhotoTypeConfig } from '@/lib/playerPhotoTypes'
import { optimizeImageFile } from '@/lib/imageUploadOptimizer'
import { getImageOptimizeUserMessage } from '@/lib/imageOptimizeUserMessage'

// =====================================================
// FEATURE FLAG - Sicurezza modifiche window.confirm
// =====================================================
// Imposta a true SOLO quando hai testato TUTTO su Vercel
// MODALITÀ SICURA: true = ConfirmModal (UI coerente, i18n); false = window.confirm
const USE_CONFIRM_MODAL = true
// =====================================================

/** Massimo numero di riserve consentite (eFootball: 11 titolari + 12 in panchina) */
const MAX_RESERVES = 12

/** Portiere: zona ristretta davanti alla porta (% campo), non tutta la larghezza della rete. */
const GK_GOAL_AREA = { xMin: 36, xMax: 64, yMin: 83, yMax: 96 }

function clampGkInGoalMouth(x, y) {
  const nx = Number(x)
  const ny = Number(y)
  if (!Number.isFinite(nx) || !Number.isFinite(ny)) return { x: 50, y: 90 }
  return {
    x: Math.max(GK_GOAL_AREA.xMin, Math.min(GK_GOAL_AREA.xMax, nx)),
    y: Math.max(GK_GOAL_AREA.yMin, Math.min(GK_GOAL_AREA.yMax, ny))
  }
}

/** Durante il drag: se sei in fascia portiere (y>80), limita a bocca porta; altrimenti campo pieno. */
function clampPointerForGkSlot(x, y) {
  const xx = Math.max(5, Math.min(95, x))
  const yy = Math.max(5, Math.min(95, y))
  if (yy > 80) return clampGkInGoalMouth(xx, yy)
  return { x: xx, y: yy }
}

/**
 * Helper per conferma sicura con feature flag
 * Permette rollback istantaneo cambiando USE_CONFIRM_MODAL a false
 * 
 * @param {Object} options - Opzioni
 * @param {Function} options.fallback - Funzione window.confirm originale
 * @param {Object} options.modalConfig - Config per ConfirmModal (title, message, etc)
 * @param {Function} options.setConfirmModal - Setter per stato ConfirmModal
 * @returns {Promise<boolean>} - true se confermato, false se annullato
 */
async function showConfirmSafe({ fallback, modalConfig, setConfirmModal }) {
  if (!USE_CONFIRM_MODAL) {
    // MODALITÀ SICURA: usa window.confirm (vecchio metodo funzionante)
    return fallback()
  }
  
  // MODALITÀ NUOVA: usa ConfirmModal con Promise
  return new Promise((resolve) => {
    setConfirmModal({
      show: true,
      ...modalConfig,
      onConfirm: () => {
        setConfirmModal(null)
        resolve(true)
      },
      onCancel: () => {
        setConfirmModal(null)
        resolve(false)
      }
    })
  })
}

/** Legge ?tutorial=1 dall'URL e apre il tutorial; deve stare dentro Suspense (Next.js useSearchParams). */
function TutorialQueryListener({ onOpen }) {
  const searchParams = useSearchParams()
  React.useEffect(() => {
    if (typeof window !== 'undefined' && searchParams?.get('tutorial') === '1') {
      onOpen()
      window.history.replaceState(null, '', '/gestione-formazione')
    }
  }, [searchParams, onOpen])
  return null
}

/** Modal conferma giocatore duplicato: componente separato per evitare ReferenceError in bundle (scope/closure). */
function DuplicatePlayerConfirmModal({ state, t }) {
  if (!state || !state.show) return null
  return (
    <ConfirmModal
      show={state.show}
      title={t('duplicatePlayerTitle')}
      message={t('duplicateInFormationMessage', {
        playerName: state.playerName || '',
        playerAge: state.playerAge || '',
        slotIndex: state.slotIndex || ''
      }) || `Il giocatore "${state.playerName || ''}"${state.playerAge || ''} è già presente in formazione nello slot ${state.slotIndex || ''}.`}
      details={t('duplicateInFormationDetails')}
      variant="warning"
      confirmLabel={t('replace')}
      cancelLabel={t('cancel')}
      onConfirm={state.onConfirm || (() => {})}
      onCancel={state.onCancel || (() => {})}
    />
  )
}

export default function GestioneFormazionePage() {
  const { t, lang } = useTranslation()
  const router = useRouter()
  const [layout, setLayout] = React.useState(null) // { formation, slot_positions }
  const [titolari, setTitolari] = React.useState([]) // Giocatori con slot_index 0-10
  const [riserve, setRiserve] = React.useState([]) // Giocatori con slot_index NULL
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [toast, setToast] = React.useState(null) // { message, type: 'success' | 'error' | 'warning' }
  const [selectedSlot, setSelectedSlot] = React.useState(null) // { slot_index, position }
  const [selectedReserve, setSelectedReserve] = React.useState(null) // Player ID per visualizzare statistiche riserva
  const [showAssignModal, setShowAssignModal] = React.useState(false)
  const [assigning, setAssigning] = React.useState(false)
  const [showFormationSelectorModal, setShowFormationSelectorModal] = React.useState(false)
  const [showUploadReserveModal, setShowUploadReserveModal] = React.useState(false)
  const [uploadingFormation, setUploadingFormation] = React.useState(false)
  const [uploadingReserve, setUploadingReserve] = React.useState(false)
  const [showUploadPlayerModal, setShowUploadPlayerModal] = React.useState(false)
  const [showManualPlayerModal, setShowManualPlayerModal] = React.useState(false)
  const [uploadImages, setUploadImages] = React.useState([])
  const [uploadReserveImages, setUploadReserveImages] = React.useState([])
  const [uploadingPlayer, setUploadingPlayer] = React.useState(false)
  const [showRosaTutorial, setShowRosaTutorial] = React.useState(false)
  const [activeCoach, setActiveCoach] = React.useState(null)
  const [tacticalSettings, setTacticalSettings] = React.useState(null)
  const [savingTacticalSettings, setSavingTacticalSettings] = React.useState(false)
  const titolariIds = React.useMemo(() => new Set((titolari || []).map(p => p.id)), [titolari])
  const tacticalSettingsForPanel = React.useMemo(() => {
    if (!tacticalSettings) return tacticalSettings
    const ins = tacticalSettings.individual_instructions || {}
    const filtered = {}
    for (const k of Object.keys(ins)) {
      const data = ins[k]
      if (!data) continue
      if (data.player_id && !titolariIds.has(data.player_id))
        filtered[k] = { ...data, player_id: '' }
      else
        filtered[k] = data
    }
    return Object.keys(filtered).length ? { ...tacticalSettings, individual_instructions: { ...ins, ...filtered } } : tacticalSettings
  }, [tacticalSettings, titolariIds])
  const [isEditMode, setIsEditMode] = React.useState(false)
  const [customPositions, setCustomPositions] = React.useState({}) // { slot_index: { x, y } }
  const [showPositionSelectionModal, setShowPositionSelectionModal] = React.useState(false)
  const [extractedPlayerData, setExtractedPlayerData] = React.useState(null)
  const [selectedOriginalPositions, setSelectedOriginalPositions] = React.useState([])
  // Contesto per PositionSelectionModal: nuovo salvataggio (titolare/riserva) oppure modifica competenze player esistente
  const [positionModalCtx, setPositionModalCtx] = React.useState(null) // { mode: 'new'|'edit', playerId?: string, slotIndex?: number|null, photoSlots?: object }
  const [showMissingDataModal, setShowMissingDataModal] = React.useState(false)
  const [missingData, setMissingData] = React.useState({ required: [], optional: [] })
  const [duplicateConfirmModal, setDuplicateConfirmModal] = React.useState(null) // { show, playerName, playerAge, slotIndex, onConfirm }
  const [confirmModal, setConfirmModal] = React.useState(null) // { show, title, message, onConfirm, onCancel, variant }
  const [showManualBoostersModal, setShowManualBoostersModal] = React.useState(false)
  const [manualBoosters, setManualBoosters] = React.useState([])
  const [manualBoostersPlayerId, setManualBoostersPlayerId] = React.useState(null)
  const [savingManualBoosters, setSavingManualBoosters] = React.useState(false)

  // Funzione fetchData riutilizzabile (estratta da useEffect per essere chiamabile)
  const fetchData = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      let token = localStorage.getItem('auth_token')
      
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }
      
      if (!token) {
        // Se non c'è token, AuthWrapper gestirà il redirect, ma qui mostriamo loading o errore
        setError(t('sessionExpiredRedirect'))
        return
      }

      // Usa API aggregata per caricare tutto in una volta (supporta sia Supabase che Custom Token)
      // FIX: Aggiunto timestamp per evitare caching del browser e cache: 'no-store'
      const res = await fetch(`/api/formation?t=${new Date().getTime()}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        cache: 'no-store'
      })
      
      if (!res.ok) {
        if (res.status === 401) {
           // Token scaduto
           localStorage.removeItem('auth_token')
           router.push('/login')
           return
        }
        throw new Error('Failed to load formation data')
      }
      
      const data = await res.json()
      const { layout: layoutData, playingStyles, players, activeCoach, tacticalSettings: tacticalSettingsData } = data

      // 1. Layout
      if (layoutData) {
        setLayout({
          formation: layoutData.formation,
          slot_positions: layoutData.slot_positions || {}
        })
      }

      // 2. Styles Lookup
      const stylesLookup = {}
      if (playingStyles) {
        playingStyles.forEach(style => {
          stylesLookup[style.id] = style.name
        })
      }

      // 3. Players Mapping
      const playersArray = (players || [])
        .filter(p => p && p.id && p.player_name)
        .map(p => ({
          id: p.id,
          player_name: String(p.player_name || t('unknownPlayer')).trim(),
          position: p.position ? String(p.position).trim() : null,
          overall_rating: p.overall_rating != null ? Number(p.overall_rating) : null,
          team: p.team ? String(p.team).trim() : null,
          slot_index: p.slot_index != null ? Number(p.slot_index) : null,
          age: p.age != null ? Number(p.age) : null,
          club_name: p.club_name ? String(p.club_name).trim() : null,
          nationality: p.nationality ? String(p.nationality).trim() : null,
          role: p.role ? String(p.role).trim() : null,
          playing_style_id: p.playing_style_id || null,
          playing_style_name: p.playing_style_id && stylesLookup[p.playing_style_id] 
            ? stylesLookup[p.playing_style_id] 
            : null,
          base_stats: p.base_stats || null,
          skills: p.skills || null,
          com_skills: p.com_skills || null,
          available_boosters: p.available_boosters || null,
          photo_slots: p.photo_slots || null,
          original_positions: p.original_positions || null
        }))

      const titolariArray = playersArray
        .filter(p => p.slot_index !== null && p.slot_index >= 0 && p.slot_index <= 10)
        .sort((a, b) => (a.slot_index || 0) - (b.slot_index || 0))
      
      const riserveArray = playersArray
        .filter(p => p.slot_index === null)
        .sort((a, b) => (a.player_name || '').localeCompare(b.player_name || ''))

      setTitolari(titolariArray)
      setRiserve(riserveArray)

      // 4. Coach
      if (activeCoach) {
        setActiveCoach(activeCoach)
      }

      // 5. Tactical Settings
      if (tacticalSettingsData) {
        setTacticalSettings(tacticalSettingsData)
      }
      
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('knowledge-should-refresh'))

    } catch (err) {
      console.error('[GestioneFormazione] Error:', err)
      setError(err.message || t('errorLoadingData'))
    } finally {
      setLoading(false)
    }
  }, [supabase, router])

  // Carica layout e giocatori al mount
  React.useEffect(() => {
    fetchData()

    if (!supabase) return

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Prevent redirect if using custom auth token
        if (localStorage.getItem('auth_token')) return

        if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
          router.push('/login')
        }
      }
    )

    return () => {
      subscription?.unsubscribe()
    }
  }, [router, fetchData])

  // Funzione helper per mostrare toast (definita prima delle funzioni che la usano)
  const showToast = React.useCallback((message, type = 'success') => {
    setToast({ message, type })
  }, [])

  /** Aggiorna il riassunto analisi (diagnostic) in cache dopo un salvataggio che modifica rosa/tattica/formazione. Fire-and-forget. */
  const refreshDiagnosticAfterSave = React.useCallback(async () => {
    try {
      let token = localStorage.getItem('auth_token')
      
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }

      if (token) {
        await fetch('/api/refresh-diagnostic', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        })
      }
    } catch (_) { /* non bloccare UI */ }
  }, [supabase])

  const openManualBoostersForPlayer = React.useCallback((player) => {
    if (!player?.id) return
    const existing = Array.isArray(player.available_boosters) ? player.available_boosters : []
    setManualBoosters(existing.length > 0 ? existing : [{ name: '', effect: '' }])
    setManualBoostersPlayerId(player.id)
    setShowManualBoostersModal(true)
  }, [])

  const saveManualBoostersForPlayer = React.useCallback(async () => {
    if (!manualBoostersPlayerId) return
    setSavingManualBoosters(true)
    try {
      let token = localStorage.getItem('auth_token')
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }
      if (!token) throw new Error(t('sessionExpired'))

      const cleaned = (Array.isArray(manualBoosters) ? manualBoosters : [])
        .map(b => ({
          name: typeof b?.name === 'string' ? b.name.trim() : '',
          effect: typeof b?.effect === 'string' ? b.effect.trim() : ''
        }))
        .filter(b => b.name || b.effect)

      // Merge photo_slots.booster=true
      const resPlayer = await fetch(`/api/players/${manualBoostersPlayerId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const current = await resPlayer.json().catch(() => ({}))
      const existingPhotoSlots = current?.player?.photo_slots && typeof current.player.photo_slots === 'object' ? current.player.photo_slots : {}
      const mergedPhotoSlots = { ...existingPhotoSlots, booster: true }

      const patchRes = await fetch(`/api/players/${manualBoostersPlayerId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          available_boosters: cleaned,
          photo_slots: mergedPhotoSlots
        })
      })
      await safeJsonResponse(patchRes, t('errorUpdatingPlayer'))

      setShowManualBoostersModal(false)
      setManualBoosters([])
      setManualBoostersPlayerId(null)
      showToast(t('boostersUpdated'), 'success')
      await fetchData()
      refreshDiagnosticAfterSave()
    } catch (err) {
      console.error('[ManualBoosters] save error:', err)
      const { message } = mapErrorToUserMessage(err, t('errorUpdatingPlayer'), lang)
      showToast(message, 'error')
    } finally {
      setSavingManualBoosters(false)
    }
  }, [manualBoosters, manualBoostersPlayerId, supabase, t, lang, fetchData, refreshDiagnosticAfterSave, showToast])

  // Auto-dismiss toast
  React.useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // Correzione DX/SX: se un layout salvato ha TD/TS invertiti, normalizziamo in base a X.
  // DX = x alto, SX = x basso. Solo normalizzazione in memoria (non persiste finché non salvi).
  const normalizeSlotPositionsDxSx = React.useCallback((slotPositions) => {
    const out = { ...(slotPositions || {}) }
    for (const [k, v] of Object.entries(out)) {
      if (!v) continue
      const x = v.x != null ? Number(v.x) : null
      const pos = String(v.position || '').trim().toUpperCase()
      if (x == null || !Number.isFinite(x)) continue
      if (pos === 'TD' && x < 50) out[k] = { ...v, position: 'TS' }
      if (pos === 'TS' && x > 50) out[k] = { ...v, position: 'TD' }
    }
    return out
  }, [])

  const handleSlotClick = (slotIndex) => {
    const normalized = normalizeSlotPositionsDxSx(layout?.slot_positions)
    const slotPos = normalized?.[slotIndex]
    if (!slotPos) return

    setSelectedSlot({ slot_index: slotIndex, ...slotPos })
    setShowAssignModal(true)
  }

  const clampPercent = (v, min = 5, max = 95) => Math.max(min, Math.min(max, Number(v)))

  // Snap verticale proporzionato (stile eFootball): oltre alle linee principali,
  // il centrocampo è diviso in sotto-fasce vicine (MED e CC possono essere molto vicini).
  // Manteniamo libertà su X; su Y guidiamo per leggibilità e coerenza.
  const snapYToBand = (roleCode, y) => {
    const yy = clampPercent(y)
    const role = String(roleCode || '').trim().toUpperCase()

    // Fasce target (percentuali Y)
    const BANDS = {
      GK: 90,
      DEF: 66,
      // Centrocampo: MED e CC hanno più spazio; TRQ più stretto (più vicino al CC)
      DMF: 58,  // MED/DMF — più vicino alla linea difesa (più spazio mediano)
      CMF: 50,  // CC/CMF
      AMF: 46,  // TRQ/AMF (trequarti) — fascia più alta, meno “ovunque”
      // Attacco su sotto-fasce: SP deve stare un filo più basso (più "spazio" rispetto al CF)
      CF: 28,
      SP: 34,
      WING: 30,
      FWD: 30
    }

    // Se il ruolo è esplicito, preferisci la fascia "giusta"
    if (role === 'PT') return BANDS.GK
    if (['DC', 'TD', 'TS'].includes(role)) return BANDS.DEF
    if (['MED', 'DMF'].includes(role)) return BANDS.DMF
    if (['CC', 'CMF', 'CLS', 'CLD', 'LMF', 'RMF'].includes(role)) return BANDS.CMF
    if (['TRQ', 'AMF', 'SS'].includes(role)) return BANDS.AMF
    if (role === 'CF') return BANDS.CF
    if (role === 'SP') return BANDS.SP
    if (['ESA', 'EDA', 'EDE', 'LWF', 'RWF'].includes(role)) return BANDS.WING
    if (role === 'P') return 26
    if (['P', 'SP', 'CF', 'ESA', 'EDA', 'EDE', 'LWF', 'RWF'].includes(role)) return BANDS.FWD

    // Fallback: allineato a calculatePositionFromCoordinates (difesa da y≥63)
    if (yy > 80) return BANDS.GK
    if (yy >= 63) return BANDS.DEF
    if (yy >= 54) return BANDS.DMF
    if (yy >= 46) return BANDS.CMF
    if (yy >= 40) return BANDS.AMF
    return BANDS.FWD
  }

  // Garantisce che slot_positions contenga sempre 0..10 (evita che il server "ricomponga"
  // slot mancanti con default, causando salti dopo il refresh).
  const completeSlotPositionsClient = React.useCallback((slots) => {
    const complete = { ...(slots || {}) }
    const defaults = {
      0: { x: 50, y: 90, position: 'PT' },
      1: { x: 20, y: 65, position: 'DC' },
      2: { x: 40, y: 65, position: 'DC' },
      3: { x: 60, y: 65, position: 'DC' },
      4: { x: 80, y: 65, position: 'DC' },
      5: { x: 30, y: 52, position: 'CC' },
      6: { x: 50, y: 58, position: 'MED' },
      7: { x: 70, y: 52, position: 'CC' },
      8: { x: 25, y: 34, position: 'SP' },
      9: { x: 50, y: 28, position: 'CF' },
      10: { x: 75, y: 34, position: 'SP' }
    }
    for (let i = 0; i <= 10; i++) {
      if (!complete[i]) complete[i] = defaults[i]
    }
    return complete
  }, [])

  // Render: mappa codici ruolo verso label coerente IT/EN, senza cambiare ciò che salviamo.
  const formatRoleLabel = React.useCallback((code) => {
    const c = String(code || '?').trim().toUpperCase()
    if (!c || c === '?') return '?'
    // In italiano preferiamo sigle "nostre" (MED/CC/TRQ); in inglese le sigle eFootball (DMF/CMF/AMF).
    if (lang === 'it') {
      if (c === 'DMF') return 'MED'
      if (c === 'CMF') return 'CC'
      if (c === 'AMF') return 'TRQ'
      if (c === 'LMF') return 'CLS'
      if (c === 'RMF') return 'CLD'
      if (c === 'LWF') return 'ESA'
      if (c === 'RWF') return 'EDA'
      if (c === 'EDE') return 'EDA'
      return c
    }
    // English
    if (c === 'MED') return 'DMF'
    if (c === 'CC') return 'CMF'
    // Keep TRQ as TRQ (avoid AMF label in UI)
    if (c === 'CLS') return 'LMF'
    if (c === 'CLD') return 'RMF'
    if (c === 'ESA') return 'LWF'
    if (c === 'EDA') return 'RWF'
    if (c === 'EDE') return 'RWF'
    return c
  }, [lang])

  // Placeholder "umano" per slot vuoti (IT/EN), senza cambiare i codici salvati.
  const formatRolePlaceholder = React.useCallback((code) => {
    const c = String(code || '?').trim().toUpperCase()
    if (!c || c === '?') return lang === 'it' ? 'Slot' : 'Slot'

    const it = {
      PT: 'Portiere',
      DC: 'Difensore centrale',
      TD: 'Terzino DX',
      TS: 'Terzino SX',
      MED: 'Mediano',
      CC: 'Centrocampista',
      TRQ: 'Trequartista',
      CLS: 'Esterno SX',
      CLD: 'Esterno DX',
      ESA: 'Ala SX',
      EDA: 'Ala DX',
      CF: 'Centravanti',
      SP: 'Seconda punta',
      P: 'Punta'
    }

    const en = {
      PT: 'Goalkeeper',
      DC: 'Center back',
      TD: 'Right back',
      TS: 'Left back',
      MED: 'Defensive mid',
      CC: 'Central mid',
      TRQ: 'Attacking mid',
      CLS: 'Left mid',
      CLD: 'Right mid',
      ESA: 'Left wing',
      EDA: 'Right wing',
      CF: 'Center forward',
      SP: 'Second striker',
      P: 'Striker'
    }

    const table = lang === 'it' ? it : en
    return table[c] || c
  }, [lang])

  // Calcola ruolo in base alle coordinate x,y sul campo
  // Nota: per distinguere P vs SP usa la classifica relativa degli slot in attacco, basata su slotIndex (non su match “quasi uguale” di coordinate).
  const calculatePositionFromCoordinates = (slotIndex, x, y, attackSlots = null) => {
    // y: 0-100 (0 = porta avversaria, 100 = nostra porta)
    // x: 0-100 (0 = sinistra, 100 = destra)
    const xx = clampPercent(x)
    const yy = clampPercent(y)
    // Soglie coerenti: DC più stretto (colonna centrale); MED/CC ampi; TRQ solo striscia sotto l’attacco
    const CENTER_X_LO = 30
    const CENTER_X_HI = 70
    const WING_L = 28
    const WING_R = 72
    
    // Portiere: sempre in area porta (y > 80)
    if (yy > 80) {
      return 'PT'
    }
    
    // Difesa: y tra 63-80 (la fascia 60-62 è centrocampo — meno DC “verso il centrocampo”)
    if (yy >= 63 && yy <= 80) {
      if (xx < 34) return 'TS'  // Terzino sinistro (sinistra campo)
      if (xx > 66) return 'TD'   // Terzino destro (destra campo)
      return 'DC'              // Centrale difesa
    }
    
    // Centrocampo: y tra 40-62 (include ex-fascia 60-62 davanti alla difesa)
    if (yy >= 40 && yy <= 62) {
      if (xx < WING_L) return 'CLS'  // Centrocampista laterale sinistro (sinistra campo)
      if (xx > WING_R) return 'CLD'  // Centrocampista laterale destro (destra campo)
      // TRQ: striscia avanzata stretta (solo y 40-44, centro)
      if (yy >= 40 && yy <= 44 && xx >= CENTER_X_LO && xx <= CENTER_X_HI) return 'TRQ'
      // CC: cuore centrale (più compatto — più spazio al MED sotto)
      if (xx >= CENTER_X_LO && xx <= CENTER_X_HI && yy >= 45 && yy <= 52) return 'CC'
      // MED: fascia centrale ampia (mediano “respira” fino alla linea difesa)
      if (xx >= CENTER_X_LO && xx <= CENTER_X_HI && yy >= 50 && yy <= 62) return 'MED'
      return 'MED'
    }
    
    // Attacco: y < 40
    if (yy < 40) {
      if (xx < 30) return 'ESA'  // Estremo sinistro avanzato / Ala sinistra (sinistra campo)
      if (xx > 70) return 'EDA'  // Estremo destro avanzato / Ala destra (destra campo)
      // TRQ in attacco: solo striscia vicina alla linea centrocampo (più coerente con MED/CC)
      if (yy >= 36 && yy <= 40 && xx >= 30 && xx <= 70) {
        // Se è in zona centrale (x: 48-52) e molto avanzato (y: 30-31), probabilmente è CF, non TRQ
        if (yy >= 30 && yy <= 31 && xx >= 48 && xx <= 52) {
          // Lascia che vada a logica CF/SP/P
        } else {
          return 'TRQ'  // Trequartista in attacco
        }
      }
      
      // Logica relativa per P vs SP se ci sono più giocatori in attacco
      if (attackSlots && attackSlots.length > 1) {
        // Ordina per y (dal più avanzato al più arretrato)
        const sorted = [...attackSlots].sort((a, b) => {
          // y più piccolo = più avanzato; tie-break su x per stabilità
          if (a.y !== b.y) return a.y - b.y
          return (a.x ?? 50) - (b.x ?? 50)
        })
        const currentIndex = sorted.findIndex(s => Number(s.slotIndex) === Number(slotIndex))
        
        if (currentIndex === 0) {
          return 'P'  // Il più avanzato → Punta
        } else if (currentIndex === 1) {
          return 'SP' // Il secondo → Seconda Punta
        } else {
          return 'SP' // Altri → Seconda Punta
        }
      }
      
      // Logica assoluta (fallback)
      if (yy < 25) return 'P'    // Punta (molto avanzato)
      if (yy < 35) return 'CF'   // Centravanti
      return 'SP'               // Seconda punta
    }
    
    // Default: centrocampo
    return 'MED'
  }

  const handlePositionChange = (slotIndex, newPosition) => {
    // Raccogli tutti gli slot in attacco (y < 40) per logica relativa P vs SP
    const allSlotsInAttack = []
    Object.entries(customPositions).forEach(([idx, pos]) => {
      if (pos.y < 40) {
        allSlotsInAttack.push({ slotIndex: Number(idx), x: pos.x, y: pos.y })
      }
    })
    // Aggiungi anche il nuovo slot se è in attacco
    if (newPosition.y < 40) {
      allSlotsInAttack.push({ slotIndex: Number(slotIndex), x: newPosition.x, y: newPosition.y })
    }
    // Aggiungi anche slot esistenti in attacco (non modificati)
    if (layout?.slot_positions) {
      Object.entries(layout.slot_positions).forEach(([idx, pos]) => {
        if (pos.y < 40 && !customPositions[idx]) {
          allSlotsInAttack.push({ slotIndex: Number(idx), x: pos.x, y: pos.y })
        }
      })
    }
    
    // Calcola nuova position in base alle coordinate (con logica relativa se in attacco)
    const computedRole = calculatePositionFromCoordinates(
      slotIndex,
      newPosition.x,
      newPosition.y,
      allSlotsInAttack.length > 1 ? allSlotsInAttack : null
    )

    // MED/CC hanno poco margine: aggiungiamo una micro-isteresi SOLO tra questi due ruoli
    // per evitare flip continuo vicino al confine durante drag.
    const applyMedCcHysteresis = (prev, computed, x, y) => {
      const p = String(prev || '').trim().toUpperCase()
      const c = String(computed || '').trim().toUpperCase()
      if (!(p === 'MED' || p === 'CC')) return computed
      if (!(c === 'MED' || c === 'CC')) return computed
      if (p === c) return computed

      const xx = clampPercent(x)
      const yy = clampPercent(y)

      const ccCore = (xx >= 30 && xx <= 70 && yy >= 45 && yy <= 52)
      const outsideCcHold = (xx < 27 || xx > 73 || yy < 42 || yy > 60)

      if (c === 'CC') return ccCore ? 'CC' : p
      if (c === 'MED') return outsideCcHold ? 'MED' : p
      return computed
    }

    const prevRole =
      customPositions?.[slotIndex]?.position ||
      customPositions?.[String(slotIndex)]?.position ||
      layout?.slot_positions?.[slotIndex]?.position ||
      layout?.slot_positions?.[String(slotIndex)]?.position ||
      null

    const newRole = applyMedCcHysteresis(prevRole, computedRole, newPosition.x, newPosition.y)
    // Durante il drag manteniamo coordinate libere (fluide).
    const rawY = clampPercent(newPosition.y)
    const rawX = clampPercent(newPosition.x)
    let finalX = rawX
    let finalY = rawY
    if (String(newRole || '').toUpperCase() === 'PT') {
      const gk = clampGkInGoalMouth(rawX, rawY)
      finalX = gk.x
      finalY = gk.y
    }

    setCustomPositions(prev => ({
      ...prev,
      [slotIndex]: {
        x: finalX,
        y: finalY,
        position: newRole  // Aggiorna anche la position
      }
    }))
  }

  const handleAssignFromReserve = async (playerId) => {
    if (!selectedSlot) return

    setAssigning(true)
    setError(null)

    try {
      // CONTROLLI INCROCIATI: verifica duplicati sia in campo che in riserve
      const playerToAssign = riserve.find(p => p.id === playerId)
      if (!playerToAssign) {
        throw new Error(t('playerNotFoundInReserves'))
      }
      
      const playerName = String(playerToAssign.player_name || '').trim().toLowerCase()
      const playerAge = playerToAssign.age != null ? Number(playerToAssign.age) : null
      
      // 1. Verifica duplicati in CAMPO (titolari)
      const duplicateInField = titolari.find(p => {
        const pName = String(p.player_name || '').trim().toLowerCase()
        const pAge = p.age != null ? Number(p.age) : null
        
        // Match esatto se nome+età corrispondono
        if (playerName && pName && playerAge && pAge) {
          return pName === playerName && pAge === playerAge && p.slot_index !== selectedSlot.slot_index
        }
        // Fallback: solo nome se età non disponibile
        if (playerName && pName) {
          return pName === playerName && p.slot_index !== selectedSlot.slot_index
        }
        return false
      })

      // 2. Verifica duplicati in RISERVE (oltre a quello che stiamo assegnando)
      const duplicateInReserves = riserve.filter(p => {
        const pName = String(p.player_name || '').trim().toLowerCase()
        const pAge = p.age != null ? Number(p.age) : null
        return p.id !== playerId && // Escludi riserva che stiamo assegnando
               pName === playerName && 
               (playerAge ? pAge === playerAge : (playerAge === null && pAge === null))
      })

      // Se ci sono duplicati, gestisci
      if (duplicateInField || duplicateInReserves.length > 0) {
        const playerAgeStr = playerAge ? ` (${playerAge} ${t('years')})` : ''
        let errorMsg = t('duplicatePlayerAlert')
          .replace('${playerName}', playerToAssign.player_name)
          .replace('${playerAge}', playerAgeStr)
        
        if (duplicateInField) {
          errorMsg += `\n- ${t('duplicateInField').replace('${slotIndex}', duplicateInField.slot_index)}`
        }
        if (duplicateInReserves.length > 0) {
          errorMsg += `\n- ${t('duplicateInReserves').replace('${count}', duplicateInReserves.length)}`
        }
        errorMsg += `\n\n${t('deleteDuplicatesAndProceed')}`
        
        // FIX RC-002: Sostituzione window.confirm con ConfirmModal (feature flag)
        const confirmed = await showConfirmSafe({
          fallback: () => window.confirm(errorMsg),
          modalConfig: {
            title: t('duplicatePlayerTitle'),
            message: errorMsg,
            variant: 'warning',
            confirmLabel: t('deleteAndProceed'),
            cancelLabel: t('cancel')
          },
          setConfirmModal
        })
        
        if (!confirmed) {
          setAssigning(false)
          return
        }
        
        // Elimina duplicati in riserve
        if (duplicateInReserves.length > 0) {
          let token = localStorage.getItem('auth_token')
          if (!token && supabase) {
            const { data: session } = await supabase.auth.getSession()
            token = session?.session?.access_token
          }
          if (!token) throw new Error(t('sessionExpired'))
          
          for (const dup of duplicateInReserves) {
            const deleteRes = await fetch('/api/supabase/delete-player', {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ player_id: dup.id })
            })
            if (!deleteRes.ok) {
              const deleteData = await deleteRes.json()
              throw new Error(deleteData.error || `${t('errorDeletingDuplicateReserve')}: ${dup.player_name}`)
            }
          }
        }
      }

      // NUOVO: Verifica posizioni originali e conferma se NON originale
      const originalPositions = Array.isArray(playerToAssign.original_positions) && playerToAssign.original_positions.length > 0
        ? playerToAssign.original_positions
        : (playerToAssign.position ? [{ position: playerToAssign.position, competence: "Alta" }] : [])

      const slotPosition = selectedSlot.position

      // Verifica se posizione slot è originale
      const isOriginalPosition = originalPositions.some(
        op => op.position && op.position.toUpperCase() === slotPosition.toUpperCase()
      )

      // Se NON è originale, chiedi conferma con competenza
      if (!isOriginalPosition && originalPositions.length > 0 && slotPosition) {
        const originalPosList = originalPositions.map(op => op.position).join(', ')
        const stats = playerToAssign.base_stats || {}
        
        // Cerca competenza per posizione slot
        const competenceInfo = originalPositions.find(
          op => op.position && op.position.toUpperCase() === slotPosition.toUpperCase()
        )
        const competence = competenceInfo?.competence || t('competenceLow')
        
        // Costruisci messaggio con statistiche rilevanti
        let statsWarning = ''
        if (slotPosition === 'DC' && stats.difesa) {
          statsWarning = `\n${t('positionNotOriginal').replace('${slotPosition}', slotPosition)}\n- ${t('defending')}: ${stats.difesa} (${t('required')}: 80+)\n`
        } else if (slotPosition === 'P' && stats.finalizzazione) {
          statsWarning = `\n${t('positionNotOriginal').replace('${slotPosition}', slotPosition)}\n- ${t('finishing')}: ${stats.finalizzazione} (${t('required')}: 85+)\n`
        } else {
          statsWarning = `\n${t('positionNotOriginal').replace('${slotPosition}', slotPosition)}\n`
        }
        
        // Alert con warning e competenza (i18n - sostituzione manuale template)
        const competenceLabel = competence === 'Alta' ? t('competenceHigh') : competence === 'Intermedia' ? t('competenceMedium') : t('competenceLow')
        const confirmMessage = t('confirmPositionChange')
          .replace('${playerName}', playerToAssign.player_name)
          .replace('${originalPositions}', originalPosList)
          .replace('${slotPosition}', slotPosition)
          .replace('${competence}', competenceLabel)
          .replace('${statsWarning}', statsWarning)
        
        // FIX RC-002: Sostituzione window.confirm con ConfirmModal (feature flag)
        const confirmed = await showConfirmSafe({
          fallback: () => window.confirm(confirmMessage),
          modalConfig: {
            title: t('confirmPositionChangeTitle'),
            message: confirmMessage,
            variant: 'warning',
            confirmLabel: t('confirm'),
            cancelLabel: t('cancel')
          },
          setConfirmModal
        })
        
        if (!confirmed) {
          // Annulla, non spostare giocatore
          setAssigning(false)
          return
        }
        // Se conferma, cliente si prende responsabilità → procedi
      }

      let token = localStorage.getItem('auth_token')
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }
      if (!token) throw new Error(t('sessionExpired'))

      const res = await fetch('/api/supabase/assign-player-to-slot', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          slot_index: selectedSlot.slot_index,
          player_id: playerId
        })
      })

      const data = await safeJsonResponse(res, t('errorAssignment'))

      // Messaggio di successo
      showToast(t('playerAssignedSuccessfully'), 'success')
      
      // Reset stati UI
      setShowAssignModal(false)
      setSelectedSlot(null)
      
      // Ricarica dati senza reload pagina
      await fetchData()
      refreshDiagnosticAfterSave()
    } catch (err) {
      console.error('[GestioneFormazione] Assign error:', err)
      const { message } = mapErrorToUserMessage(err, t('errorAssigningPlayer'), lang)
      setError(message)
      showToast(message, 'error')
    } finally {
      setAssigning(false)
      setShowAssignModal(false)
      setSelectedSlot(null)
    }
  }

  const handleRemoveFromSlot = async (playerId) => {
    if (riserve.length >= MAX_RESERVES) {
      showToast(t('maxReservesReached'), 'error')
      return
    }

    setAssigning(true)
    setError(null)

    try {
      let token = localStorage.getItem('auth_token')
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }
      if (!token) throw new Error(t('sessionExpired'))

      // Rimuovi da slot tramite endpoint API
      const res = await fetch('/api/supabase/remove-player-from-slot', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ player_id: playerId })
      })

      // Gestione sicura della risposta JSON
      let data
      try {
        data = await res.json()
      } catch (jsonError) {
        throw new Error(`${t('errorServer')}: ${res.status} ${res.statusText}`)
      }
      
      if (!res.ok) {
        // Se è errore di duplicato riserva, gestisci
        if (data.duplicate_reserve_id) {
          const playerAgeStr = data.duplicate_player_age ? ` (${data.duplicate_player_age} ${t('years')})` : ''
          const confirmMsg = t('duplicateReserveAlert')
            .replace('${playerName}', data.duplicate_player_name || t('thisPlayer'))
            .replace('${playerAge}', playerAgeStr)
          // FIX RC-002: Sostituzione window.confirm con ConfirmModal (feature flag)
          const confirmed = await showConfirmSafe({
            fallback: () => window.confirm(confirmMsg),
            modalConfig: {
              title: t('duplicatePlayerTitle'),
              message: confirmMsg,
              variant: 'warning',
              confirmLabel: t('deleteAndProceed'),
              cancelLabel: t('cancel')
            },
            setConfirmModal
          })
          
          if (confirmed) {
            // Elimina duplicato riserva
            const deleteRes = await fetch('/api/supabase/delete-player', {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ player_id: data.duplicate_reserve_id })
            })
            if (deleteRes.ok) {
              // Riprova rimozione
              const retryRes = await fetch('/api/supabase/remove-player-from-slot', {
                method: 'PATCH',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ player_id: playerId })
              })
              const retryData = await safeJsonResponse(retryRes, t('errorRemovalAfterDuplicate'))
            } else {
              throw new Error(t('errorDeletingDuplicateReserve'))
            }
          } else {
            throw new Error(t('operationCancelledDuplicateReserve'))
          }
        } else {
          throw new Error(data.error || t('errorRemoving'))
        }
      }

      // Messaggio di successo
      showToast(t('playerMovedToReserves'), 'success')
      
      // Reset stati UI
      setSelectedSlot(null)
      
      // Ricarica dati senza reload pagina
      await fetchData()
      refreshDiagnosticAfterSave()
    } catch (err) {
      console.error('[GestioneFormazione] Remove error:', err)
      const { message } = mapErrorToUserMessage(err, t('errorMovingPlayer'), lang)
      setError(message)
      showToast(message, 'error')
    } finally {
      setAssigning(false)
    }
  }

  // Elimina definitivamente giocatore (unificato: titolare o riserva)
  const handleDeletePlayerConfirm = async (playerId) => {
    setAssigning(true)
    setError(null)
    try {
      let token = localStorage.getItem('auth_token')
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }
      if (!token) throw new Error(t('sessionExpired'))

      const res = await fetch('/api/supabase/delete-player', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ player_id: playerId })
      })

      await safeJsonResponse(res, t('errorDeletion'))

      // Reset UI: chiudi modal e deseleziona (sia titolare che riserva)
      setShowAssignModal(false)
      setSelectedSlot(null)
      setSelectedReserve(null)

      showToast(t('playerDeletedSuccessfully'), 'success')
      await fetchData()
      refreshDiagnosticAfterSave()
    } catch (err) {
      console.error('[GestioneFormazione] Delete error:', err)
      const { message } = mapErrorToUserMessage(err, t('errorDeletingPlayer'), lang)
      setError(message)
      showToast(message, 'error')
    } finally {
      setAssigning(false)
    }
  }

  const handleDeletePlayer = (playerId) => {
    if (!supabase) return
    setConfirmModal({
      show: true,
      title: t('confirm'),
      message: t('confirmDeletePlayer'),
      confirmLabel: t('delete'),
      cancelLabel: t('cancel'),
      variant: 'danger',
      onConfirm: () => {
        setConfirmModal(null)
        handleDeletePlayerConfirm(playerId)
      },
      onCancel: () => setConfirmModal(null)
    })
  }

  const handleDeleteReserve = (playerId) => {
    if (!supabase) return
    setConfirmModal({
      show: true,
      title: t('confirm'),
      message: t('confirmDeleteReserve'),
      confirmLabel: t('delete'),
      cancelLabel: t('cancel'),
      variant: 'danger',
      onConfirm: () => {
        setConfirmModal(null)
        handleDeletePlayerConfirm(playerId)
      },
      onCancel: () => setConfirmModal(null)
    })
  }

  const handleUploadPhoto = () => {
    // Apri modal upload giocatore per questo slot (mantieni selectedSlot)
    setShowAssignModal(false)
    // NON resettare selectedSlot qui - serve per UploadPlayerModal
    setShowUploadPlayerModal(true)
  }

  // Funzione per verificare dati mancanti dopo estrazione
  const checkMissingData = (playerData) => {
    const missing = { required: [], optional: [] }
    
    // Campi OBBLIGATORI (bloccano salvataggio se mancanti)
    if (!playerData.player_name || String(playerData.player_name).trim().length === 0) {
      missing.required.push({ field: 'player_name', label: t('playerName') })
    }
    if (playerData.overall_rating == null || playerData.overall_rating === 0) {
      missing.required.push({ field: 'overall_rating', label: t('overallRating') })
    }
    if (!playerData.position && (!playerData.original_positions || playerData.original_positions.length === 0)) {
      missing.required.push({ field: 'position', label: t('position') })
    }
    
    // Campi OPZIONALI ma importanti (warning, non bloccano)
    if (!playerData.base_stats || Object.keys(playerData.base_stats || {}).length === 0) {
      missing.optional.push({ field: 'base_stats', label: t('statistics') })
    }
    if (!playerData.skills || (Array.isArray(playerData.skills) && playerData.skills.length === 0)) {
      missing.optional.push({ field: 'skills', label: t('skills') })
    }
    if (!playerData.com_skills || (Array.isArray(playerData.com_skills) && playerData.com_skills.length === 0)) {
      missing.optional.push({ field: 'com_skills', label: t('comSkills') })
    }
    if (!playerData.boosters || (Array.isArray(playerData.boosters) && playerData.boosters.length === 0)) {
      missing.optional.push({ field: 'boosters', label: t('boosters') })
    }
    if (!playerData.age || playerData.age === 0) {
      missing.optional.push({ field: 'age', label: t('age') })
    }
    if (!playerData.height_cm || playerData.height_cm === 0) {
      missing.optional.push({ field: 'height_cm', label: t('height') })
    }
    if (!playerData.weight_kg || playerData.weight_kg === 0) {
      missing.optional.push({ field: 'weight_kg', label: t('weight') })
    }
    if (!playerData.nationality || String(playerData.nationality).trim().length === 0) {
      missing.optional.push({ field: 'nationality', label: t('nationality') })
    }
    
    return missing
  }

  const handleUploadPlayerToSlot = async () => {
    if (!selectedSlot || uploadImages.length === 0) return

    setUploadingPlayer(true)
    setError(null)

    try {
      let token = localStorage.getItem('auth_token')
      
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }

      if (!token) {
        throw new Error(t('sessionExpired'))
      }

      // Carica tutte le immagini e estrai dati
      let playerData = null
      let allExtractedData = {}
      const photoSlots = {} // Traccia quali foto sono state caricate
      const errors = [] // Raccogli errori per mostrare messaggio specifico

      for (const img of uploadImages) {
        const extractRes = await fetch('/api/extract-player', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Accept-Language': lang === 'en' ? 'en' : 'it'
          },
          body: JSON.stringify({ imageDataUrl: img.dataUrl })
        })

        let extractData
        try {
          extractData = await extractRes.json()
        } catch (jsonError) {
          const errorMsg = `${t('errorServer')}: ${extractRes.status} ${extractRes.statusText}`
          console.warn('[UploadPlayer] Errore estrazione (JSON invalido):', errorMsg)
          errors.push(errorMsg)
          continue
        }
        if (!extractRes.ok) {
          const { message } = mapErrorToUserMessage(extractData?.error || '', t('errorUnknown'), lang)
          console.warn('[UploadPlayer] Errore estrazione:', message)
          errors.push(message)
          continue
        }
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('credits-consumed'))

        if (extractData.player) {
          // Merge dati (prima immagine = dati base)
          if (!playerData) {
            playerData = extractData.player
          } else {
            // Validazione: verifica che nome+età corrispondano (se presenti)
            const currentName = String(extractData.player.player_name || '').trim().toLowerCase()
            const currentAge = extractData.player.age != null ? Number(extractData.player.age) : null
            const existingName = String(playerData.player_name || '').trim().toLowerCase()
            const existingAge = playerData.age != null ? Number(playerData.age) : null
            
            // Se entrambi hanno nome+età, devono corrispondere
            if (currentName && existingName && currentAge && existingAge) {
              if (currentName !== existingName || currentAge !== existingAge) {
                throw new Error(`${t('imagesDifferentPlayers')}: "${playerData.player_name}" (${existingAge}) vs "${extractData.player.player_name}" (${currentAge})`)
              }
            }
            
            // Merge dati aggiuntivi
            // IMPORTANTE: overall_rating viene gestito DOPO il loop per usare il valore più alto tra tutte le foto
            const { overall_rating, ...extractDataWithoutRating } = extractData.player
            playerData = {
              ...playerData,
              ...extractDataWithoutRating,
              // Mantieni dati migliori (escludi overall_rating dal merge qui)
              base_stats: extractData.player.base_stats || playerData.base_stats,
              skills: extractData.player.skills || playerData.skills,
              com_skills: extractData.player.com_skills || playerData.com_skills,
              boosters: extractData.player.boosters || playerData.boosters
            }
          }
          // Salva sempre i dati estratti (inclusa la prima foto) per calcolare Math.max() dopo
          allExtractedData[img.type] = extractData.player
          
          // Traccia foto caricate: card=Statistiche, stats=Abilità, skills=Booster (design unificato)
          if (img.type === 'card') {
            photoSlots.card = true
            if (extractData.player?.base_stats && Object.keys(extractData.player.base_stats || {}).length > 0) {
              photoSlots.statistiche = true
            }
          } else if (img.type === 'stats') {
            photoSlots.abilita = true
          } else if (img.type === 'skills') {
            photoSlots.booster = true
            if (extractData.player?.skills?.length || extractData.player?.com_skills?.length) {
              photoSlots.abilita = true
            }
          } else if (img.type === 'booster') {
            photoSlots.booster = true
          }
        }
      }

      // Se tutte le immagini sono fallite, mostra errore specifico
      if (!playerData || !playerData.player_name) {
        if (errors.length > 0) {
          // Se c'è un errore di quota OpenAI, mostralo chiaramente
          const quotaError = errors.find(e => e.includes('quota') || e.includes('billing'))
          if (quotaError) {
            throw new Error(t('openAQuotaError'))
          }
          // Altrimenti mostra il primo errore specifico
          throw new Error(`${t('errorExtractionDataList')}: ${errors[0]}`)
        }
        throw new Error(t('errorPlayerDataNotExtracted'))
      }

      // FIX: overall_rating - l'overall_rating è presente in tutte e tre le foto (card, statistiche, abilità)
      // Usa il valore più alto tra quelli estratti (per evitare errori dell'AI che estrae valori più bassi)
      const allRatings = Object.values(allExtractedData)
        .map(p => p?.overall_rating)
        .filter(r => r != null && r > 0)
      if (allRatings.length > 0) {
        playerData.overall_rating = Math.max(...allRatings)
      }

      // Check dati mancanti: UX non bloccante (solo warning, si puo completare dopo)
      const missing = checkMissingData(playerData)
      if (missing.required.length > 0 || missing.optional.length > 0) {
        const requiredFields = missing.required.map(m => m.label).join(', ')
        const optionalFields = missing.optional.map(m => m.label).join(', ')
        const chunks = []
        if (requiredFields) chunks.push(`${t('requiredFields')}: ${requiredFields}`)
        if (optionalFields) chunks.push(`${t('optionalFields')}: ${optionalFields}`)
        const fallbackLater = lang === 'en'
          ? 'You can complete missing info later from player details.'
          : 'Puoi completare i dati mancanti in seguito dai dettagli giocatore.'
        const msg = `${chunks.join(' • ')}. ${fallbackLater}`
        showToast(msg, 'warning')
      }

      // NUOVO: Dopo estrazione dati, mostra modal selezione posizioni
      const mainPosition = playerData.position || 'AMF'
      setSelectedOriginalPositions([{
        position: mainPosition,
        competence: 'Alta'
      }])
      
      setExtractedPlayerData({
        ...playerData,
        photo_slots: photoSlots,
        slot_index: selectedSlot.slot_index
      })
      setPositionModalCtx({
        mode: 'new',
        slotIndex: selectedSlot.slot_index,
        photoSlots
      })
      
      setShowUploadPlayerModal(false)
      setShowPositionSelectionModal(true)
      setUploadingPlayer(false)
      return // Non salvare ancora, aspetta conferma modal

    } catch (err) {
      console.error('[GestioneFormazione] Upload player error:', err)
      const { message } = mapErrorToUserMessage(err, t('errorUploadingPhoto'), lang)
      setError(message)
      showToast(message, 'error')
      setUploadingPlayer(false)
    }
  }

  // NUOVO: Salva giocatore con posizioni selezionate (chiamato da modal)
  const handleSavePlayerWithPositions = async () => {
    if (!extractedPlayerData || selectedOriginalPositions.length === 0 || !positionModalCtx) return

    setUploadingPlayer(true)
    setError(null)

    try {
      let token = localStorage.getItem('auth_token')
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }
      if (!token) throw new Error(t('sessionExpired'))

      // Modal in modalità EDIT: aggiorna solo original_positions del player esistente
      if (positionModalCtx.mode === 'edit' && positionModalCtx.playerId) {
        const patchRes = await fetch(`/api/players/${positionModalCtx.playerId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ original_positions: selectedOriginalPositions })
        })
        const patchData = await safeJsonResponse(patchRes, t('errorUpdatingPlayer'))
        setShowPositionSelectionModal(false)
        setPositionModalCtx(null)
        setExtractedPlayerData(null)
        setSelectedOriginalPositions([])
        showToast(t('competencesUpdated'), 'success')
        await fetchData()
        refreshDiagnosticAfterSave()
        return
      }

      // Modal in modalità NEW: salvataggio completo via save-player
      const slotIndexToSave = positionModalCtx.mode === 'new'
        ? (positionModalCtx.slotIndex ?? extractedPlayerData.slot_index ?? null)
        : (extractedPlayerData.slot_index ?? null)

      // Validazione duplicati titolari: verifica se stesso giocatore (nome+età) già presente nei titolari
      // (solo se stiamo salvando un titolare in uno slot 0-10)
      const playerName = String(extractedPlayerData.player_name || '').trim().toLowerCase()
      const playerAge = extractedPlayerData.age != null ? Number(extractedPlayerData.age) : null

      const isSavingStarter = slotIndexToSave !== null && slotIndexToSave !== undefined
      const duplicatePlayer = isSavingStarter ? titolari.find(p => {
        const pName = String(p.player_name || '').trim().toLowerCase()
        const pAge = p.age != null ? Number(p.age) : null

        // Match esatto se nome+età corrispondono
        if (playerName && pName && playerAge && pAge) {
          return pName === playerName && pAge === playerAge && p.slot_index !== slotIndexToSave
        }
        // Fallback: solo nome se età non disponibile
        if (playerName && pName) {
          return pName === playerName && p.slot_index !== slotIndexToSave
        }
        return false
      }) : null

      if (duplicatePlayer) {
        const playerAgeStr = playerAge ? ` (${playerAge} ${t('years')})` : ''
        // Salva variabili necessarie per la closure
        const duplicatePlayerId = duplicatePlayer.id
        const duplicateSlotIndex = duplicatePlayer.slot_index
        const currentExtractedData = { ...extractedPlayerData }
        const currentSelectedPositions = [...selectedOriginalPositions]
        const currentRiserve = [...riserve]
        
        // Mostra modal conferma invece di window.confirm()
        setDuplicateConfirmModal({
          show: true,
          playerName: extractedPlayerData.player_name,
          playerAge: playerAgeStr,
          slotIndex: duplicatePlayer.slot_index,
          duplicatePlayerId: duplicatePlayer.id,
            onConfirm: async () => {
            setDuplicateConfirmModal(null)
            setUploadingPlayer(true)
            
            try {
              // Limite riserve: se non stiamo eliminando un duplicato, non possiamo aggiungere il titolare in panchina
              const duplicateReserve = currentRiserve.find(p => {
                const pName = String(p.player_name || '').trim().toLowerCase()
                const pAge = p.age != null ? Number(p.age) : null
                return pName === playerName && 
                       (playerAge ? pAge === playerAge : true) &&
                       p.id !== duplicatePlayerId
              })
              if (!duplicateReserve && currentRiserve.length >= MAX_RESERVES) {
                setUploadingPlayer(false)
                showToast(t('maxReservesReached'), 'error')
                return
              }
              if (duplicateReserve) {
                // Elimina duplicato riserva prima di rimuovere titolare
                const deleteRes = await fetch('/api/supabase/delete-player', {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ player_id: duplicateReserve.id })
                })
                if (!deleteRes.ok) {
                  const deleteData = await deleteRes.json()
                  throw new Error(deleteData.error || t('errorDeletingDuplicateReserve'))
                }
              }
              
              // Rimuovi vecchio giocatore (torna riserva)
              await fetch(`/api/players/${duplicatePlayerId}`, {
                method: 'PATCH',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ slot_index: null })
              })
              
              // Continua con il salvataggio del nuovo giocatore
              const saveRes = await fetch('/api/supabase/save-player', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  player: {
                    ...currentExtractedData,
                    original_positions: currentSelectedPositions,
                    slot_index: slotIndexToSave,
                    photo_slots: currentExtractedData.photo_slots
                  }
                })
              })

              const saveData = await safeJsonResponse(saveRes, t('errorSavingPlayerGeneric'))

              setShowUploadPlayerModal(false)
              setShowPositionSelectionModal(false)
              setPositionModalCtx(null)
              setUploadImages([])
              setSelectedSlot(null)
              setExtractedPlayerData(null)
              setSelectedOriginalPositions([])
              
              showToast(t('photoUploadedSuccessfully'), 'success')
              await fetchData()
              refreshDiagnosticAfterSave()
            } catch (err) {
              console.error('[GestioneFormazione] Confirm duplicate error:', err)
              const { message } = mapErrorToUserMessage(err, t('errorUploadingPhoto'), lang)
              setError(message)
              showToast(message, 'error')
            } finally {
              setUploadingPlayer(false)
            }
          },
          onCancel: () => {
            setDuplicateConfirmModal(null)
            setUploadingPlayer(false)
          }
        })
        return // Ferma qui, il modal gestirà la continuazione
      }

      // Salva giocatore con original_positions
      const saveRes = await fetch('/api/supabase/save-player', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          player: {
            ...extractedPlayerData,
            original_positions: selectedOriginalPositions,  // NUOVO: posizioni selezionate
            slot_index: slotIndexToSave,
            photo_slots: positionModalCtx?.photoSlots || extractedPlayerData.photo_slots
          }
        })
      })

      const saveData = await safeJsonResponse(saveRes, t('errorSavingPlayerGeneric'))

      setShowUploadPlayerModal(false)
      setShowPositionSelectionModal(false)
      setPositionModalCtx(null)
      setUploadImages([])
      setSelectedSlot(null)
      setExtractedPlayerData(null)
      setSelectedOriginalPositions([])
      
      // Messaggio di successo
      showToast(t('photoUploadedSuccessfully'), 'success')
      
      // Ricarica dati senza reload pagina
      await fetchData()
      refreshDiagnosticAfterSave()
    } catch (err) {
      console.error('[GestioneFormazione] Save player with positions error:', err)
      const { message } = mapErrorToUserMessage(err, t('errorUploadingPhoto'), lang)
      setError(message)
      showToast(message, 'error')
    } finally {
      setUploadingPlayer(false)
    }
  }

  // Handler per inserimento manuale dati mancanti
  const handleManualInput = (manualData) => {
    if (!extractedPlayerData) return
    
    // Merge dati manuali con dati estratti
    const updatedData = {
      ...extractedPlayerData,
      ...manualData
    }
    
    setExtractedPlayerData(updatedData)
    setShowMissingDataModal(false)
    setMissingData({ required: [], optional: [] })
    
    // Verifica se ci sono ancora dati obbligatori mancanti
    const stillMissing = checkMissingData(updatedData)
    if (stillMissing.required.length > 0) {
      // Se ancora mancano obbligatori, mostra di nuovo modal
      setMissingData(stillMissing)
      setShowMissingDataModal(true)
      return
    }
    
    // Se tutto ok, procedi con selezione posizioni
    const mainPosition = updatedData.position || 'AMF'
    setSelectedOriginalPositions([{
      position: mainPosition,
      competence: 'Alta'
    }])
    setShowUploadPlayerModal(false)
    setPositionModalCtx({
      mode: 'new',
      slotIndex: selectedSlot?.slot_index ?? null,
      photoSlots: updatedData.photo_slots || null
    })
    setShowPositionSelectionModal(true)
  }

  // Handler per ricarica foto
  const handleRetryUpload = () => {
    setShowMissingDataModal(false)
    setMissingData({ required: [], optional: [] })
    setExtractedPlayerData(null)
    // Mantieni uploadImages e selectedSlot per permettere ricarica
    // L'utente può chiudere e riaprire modal upload
  }

  // Handler per salva comunque (solo dati opzionali mancanti)
  const handleSaveAnyway = () => {
    if (!extractedPlayerData) return
    
    setShowMissingDataModal(false)
    setMissingData({ required: [], optional: [] })
    
    // Procedi con selezione posizioni
    const mainPosition = extractedPlayerData.position || 'AMF'
    setSelectedOriginalPositions([{
      position: mainPosition,
      competence: 'Alta'
    }])
    setShowUploadPlayerModal(false)
    setPositionModalCtx({
      mode: 'new',
      slotIndex: extractedPlayerData?.slot_index ?? selectedSlot?.slot_index ?? null,
      photoSlots: extractedPlayerData?.photo_slots || null
    })
    setShowPositionSelectionModal(true)
  }

  // Salva impostazioni tattiche
  const handleSaveTacticalSettings = async (settings) => {
    setSavingTacticalSettings(true)
    setError(null)

    try {
      let token = localStorage.getItem('auth_token')
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }

      if (!token) throw new Error(t('sessionExpired'))

      const res = await fetch('/api/supabase/save-tactical-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      })

      const data = await safeJsonResponse(res, t('errorSavingTacticalSettings'))

      setTacticalSettings(data.settings)
      showToast(t('tacticalSettingsSaved'), 'success')
      if (data.warning) showToast(data.warning, 'error')
      
      // Ricarica dati senza reload pagina (solo per aggiornare eventuali dipendenze)
      await fetchData()
      refreshDiagnosticAfterSave()
    } catch (err) {
      console.error('[GestioneFormazione] Save tactical settings error:', err)
      setError(err.message || t('errorSavingTacticalSettings'))
      showToast(err.message || t('errorSavingTacticalSettings'), 'error')
    } finally {
      setSavingTacticalSettings(false)
    }
  }

  const handleSelectManualFormation = async (formation, slotPositions) => {
    setUploadingFormation(true)
    setError(null)

    try {
      await doSelectManualFormation(formation, slotPositions)
    } catch (err) {
      console.error('[GestioneFormazione] Manual formation error:', err)
      const { message } = mapErrorToUserMessage(err, t('errorSavingFormation'), lang)
      setError(message)
      showToast(message, 'error')
    } finally {
      setUploadingFormation(false)
    }
  }

  const doSelectManualFormation = async (formation, slotPositions) => {
    try {
      let token = localStorage.getItem('auth_token')
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }
      if (!token) throw new Error(t('sessionExpired'))

      // Quando cambio formazione, mantieni i giocatori nei loro slot_index (0-10)
      // Cambiano solo le posizioni visuali (x, y) e i ruoli (position)
      // Preserva tutti gli slot 0-10 se c'è già una formazione con giocatori
      let preserveSlots = null
      if (layout?.slot_positions && titolari.length > 0) {
        // Tutte le formazioni usano sempre slot 0-10, quindi preserviamo tutti
        preserveSlots = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      }

      // Salva nuovo layout con preservazione intelligente
      const layoutRes = await fetch('/api/supabase/save-formation-layout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          formation: formation,
          slot_positions: slotPositions,
          preserve_slots: preserveSlots // Slot da preservare (mantiene giocatori)
        })
      })

      const layoutData = await safeJsonResponse(layoutRes, t('errorSavingLayout'))

      setShowFormationSelectorModal(false)
      
      // Ricarica dati senza reload pagina
      await fetchData()
      refreshDiagnosticAfterSave()
    } catch (err) {
      console.error('[GestioneFormazione] Manual formation error:', err)
      const { message } = mapErrorToUserMessage(err, t('errorSavingFormation'), lang)
      setError(message)
      showToast(message, 'error')
    } finally {
      setUploadingFormation(false)
    }
  }

  const handleSaveCustomPositions = async () => {
    if (!layout || Object.keys(customPositions).length === 0) {
      setIsEditMode(false)
      setCustomPositions({})
      return
    }
    
    setUploadingFormation(true)
    setError(null)
    
    try {
      // Merge posizioni personalizzate con slot_positions esistenti
      const updatedSlotPositions = completeSlotPositionsClient(layout.slot_positions)
      
      // Raccogli tutti gli slot in attacco per logica relativa P vs SP
      const allAttackSlots = []
      Object.entries(customPositions).forEach(([idx, pos]) => {
        if (pos.y < 40) {
          allAttackSlots.push({ slotIndex: Number(idx), x: pos.x, y: pos.y })
        }
      })
      if (layout?.slot_positions) {
        Object.entries(layout.slot_positions).forEach(([idx, pos]) => {
          if (pos.y < 40 && !customPositions[idx]) {
            allAttackSlots.push({ slotIndex: Number(idx), x: pos.x, y: pos.y })
          }
        })
      }
      
      Object.entries(customPositions).forEach(([slotIndex, position]) => {
        const slotIdx = Number(slotIndex)
        if (updatedSlotPositions[slotIdx]) {
          let x = clampPercent(position.x)
          let y = clampPercent(position.y)
          const mergedRole = position.position || calculatePositionFromCoordinates(
            slotIdx,
            x,
            y,
            allAttackSlots.length > 1 ? allAttackSlots : null
          )
          if (String(mergedRole || '').toUpperCase() === 'PT') {
            const gk = clampGkInGoalMouth(x, y)
            x = gk.x
            y = gk.y
          }
          updatedSlotPositions[slotIdx] = {
            ...updatedSlotPositions[slotIdx],
            x,
            y,
            position: position.position || calculatePositionFromCoordinates(
              slotIdx,
              x,
              y,
              allAttackSlots.length > 1 ? allAttackSlots : null
            )  // Aggiorna position in base a coordinate (con logica relativa)
          }
        }
      })
      
      // Verifica posizioni originali e chiedi conferma per ruoli non originali
      let token = localStorage.getItem('auth_token')
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }
      if (!token) throw new Error(t('sessionExpired'))
      
      const playersOutOfRole = []
      const playersToUpdate = []
      
      // Per ogni slot MODIFICATO, verifica se ruolo è originale
      for (const [slotIndex, customPos] of Object.entries(customPositions)) {
        const slotIdx = Number(slotIndex)
        const playerInSlot = titolari.find(p => p.slot_index === slotIdx)
        const newSlotPos = updatedSlotPositions[slotIdx]
        
        if (playerInSlot && newSlotPos && newSlotPos.position) {
          const newRole = newSlotPos.position
          const originalPositions = Array.isArray(playerInSlot.original_positions) && playerInSlot.original_positions.length > 0
            ? playerInSlot.original_positions
            : (playerInSlot.position ? [{ position: playerInSlot.position, competence: "Alta" }] : [])
          
          // Verifica se nuovo ruolo è tra quelli originali
          const isOriginalRole = originalPositions.some(
            op => op.position && op.position.toUpperCase() === newRole.toUpperCase()
          )
          
          if (!isOriginalRole && originalPositions.length > 0) {
            const originalPosList = originalPositions.map(op => op.position).join(', ')
            playersOutOfRole.push({
              player: playerInSlot,
              newRole: newRole,
              originalPositions: originalPosList
            })
            playersToUpdate.push({
              slotIdx: slotIdx,
              playerId: playerInSlot.id,
              newRole: newRole,
              originalPositions: originalPositions
            })
          }
        }
      }
      
      // Se ci sono giocatori fuori ruolo, mostra alert
      if (playersOutOfRole.length > 0) {
        let alertMessage = t('playersOutOfRoleAlert')
        playersOutOfRole.forEach(({ player, newRole, originalPositions }) => {
          alertMessage += t('playerOutOfRoleLine')
            .replace('${playerName}', player.player_name)
            .replace('${originalPositions}', originalPositions)
            .replace('${newRole}', newRole) + '\n'
        })
        alertMessage += `\n${t('cannotPlayTheseRoles')}\n${t('addCompetenceAndSave')}`
        
        // FIX RC-002: Sostituzione window.confirm con ConfirmModal (feature flag)
        const confirmed = await showConfirmSafe({
          fallback: () => window.confirm(alertMessage),
          modalConfig: {
            title: t('playersOutOfRoleTitle'),
            message: alertMessage,
            variant: 'warning',
            confirmLabel: t('proceedAnyway'),
            cancelLabel: t('cancel')
          },
          setConfirmModal
        })
        
        if (!confirmed) {
          setIsEditMode(false)
          setCustomPositions({})
          setUploadingFormation(false)
          return
        }
        
        // Se conferma, aggiorna original_positions aggiungendo nuovo ruolo con competenza "Intermedia"
        for (const { playerId, newRole, originalPositions } of playersToUpdate) {
          try {
            // Recupera giocatore completo
            const resPlayer = await fetch(`/api/players/${playerId}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            })
            const { player: playerData } = await resPlayer.json()
            
            if (resPlayer.ok && playerData) {
              const currentOriginalPositions = Array.isArray(playerData.original_positions) 
                ? playerData.original_positions 
                : []
              
              // Aggiungi nuovo ruolo se non presente
              const roleExists = currentOriginalPositions.some(
                op => op.position && op.position.toUpperCase() === newRole.toUpperCase()
              )
              
              if (!roleExists) {
                const updatedOriginalPositions = [
                  ...currentOriginalPositions,
                  { position: newRole, competence: "Intermedia" }  // Competenza "Intermedia" per ruolo acquisito
                ]
                
                // Aggiorna original_positions
                await fetch(`/api/players/${playerId}`, {
                  method: 'PATCH',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ original_positions: updatedOriginalPositions })
                })
              }
            }
          } catch (err) {
            console.error(`[handleSaveCustomPositions] Errore aggiornamento original_positions per ${playerId}:`, err)
            // Non bloccare il salvataggio
          }
        }
      }
      
      // 1. Salva il layout: il modulo deve riflettere la disposizione reale dopo personalizzazioni
      const { getFormationNameFromSlotPositions } = await import('../../lib/validateFormationLimits')
      const effectiveFormation = getFormationNameFromSlotPositions(updatedSlotPositions)
      await handleSelectManualFormation(
        effectiveFormation || layout.formation || t('formationCustom'),
        updatedSlotPositions
      )
      
      // 2. Aggiorna position dei giocatori (layout già salvato, API legge posizioni corrette)
      for (const [slotIndex, customPos] of Object.entries(customPositions)) {
        const slotIdx = Number(slotIndex)
        const playerInSlot = titolari.find(p => p.slot_index === slotIdx)
        const newSlotPos = updatedSlotPositions[slotIdx]
        
        if (playerInSlot && newSlotPos && newSlotPos.position) {
          try {
            await fetch('/api/supabase/assign-player-to-slot', {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                slot_index: slotIdx,
                player_id: playerInSlot.id
              })
            })
          } catch (err) {
            console.error(`[handleSaveCustomPositions] Errore aggiornamento position per slot ${slotIdx}:`, err)
          }
        }
      }
      
      setIsEditMode(false)
      setCustomPositions({})
      
      // Ricarica dati finale per garantire sincronizzazione
      await fetchData()
      refreshDiagnosticAfterSave()
      
      showToast(t('positionsSavedSuccessfully'), 'success')
    } catch (err) {
      console.error('[GestioneFormazione] Save custom positions error:', err)
      const { message } = mapErrorToUserMessage(err, t('errorSavingPositions'), lang)
      setError(message)
      showToast(message, 'error')
    } finally {
      setUploadingFormation(false)
    }
  }

  const handleUploadReserve = async () => {
    if (uploadReserveImages.length === 0) return
    if (riserve.length >= MAX_RESERVES) {
      showToast(t('maxReservesReached'), 'error')
      return
    }

    setUploadingReserve(true)
    setError(null)

    try {
      let token = localStorage.getItem('auth_token')
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }
      if (!token) throw new Error(t('sessionExpired'))

      // Carica tutte le immagini e estrai dati (stessa logica di handleUploadPlayerToSlot)
      let playerData = null
      let allExtractedData = {}
      const photoSlots = {} // Traccia quali foto sono state caricate
      const errors = [] // Raccogli errori per mostrare messaggio specifico

      for (const img of uploadReserveImages) {
        const extractRes = await fetch('/api/extract-player', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Accept-Language': lang === 'en' ? 'en' : 'it'
          },
          body: JSON.stringify({ imageDataUrl: img.dataUrl })
        })

        let extractData
        try {
          extractData = await extractRes.json()
        } catch (jsonError) {
          const errorMsg = `${t('errorServer')}: ${extractRes.status} ${extractRes.statusText}`
          console.warn('[UploadReserve] Errore estrazione (JSON invalido):', errorMsg)
          errors.push(errorMsg)
          continue
        }
        if (!extractRes.ok) {
          const { message } = mapErrorToUserMessage(extractData?.error || '', t('errorUnknown'), lang)
          console.warn('[UploadReserve] Errore estrazione:', message)
          errors.push(message)
          continue
        }
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('credits-consumed'))

        if (extractData.player) {
          // Merge dati (prima immagine = dati base)
          if (!playerData) {
            playerData = extractData.player
          } else {
            // Validazione: verifica che nome+età corrispondano (se presenti)
            const currentName = String(extractData.player.player_name || '').trim().toLowerCase()
            const currentAge = extractData.player.age != null ? Number(extractData.player.age) : null
            const existingName = String(playerData.player_name || '').trim().toLowerCase()
            const existingAge = playerData.age != null ? Number(playerData.age) : null
            
            // Se entrambi hanno nome+età, devono corrispondere
            if (currentName && existingName && currentAge && existingAge) {
              if (currentName !== existingName || currentAge !== existingAge) {
                throw new Error(`${t('imagesDifferentPlayers')}: "${playerData.player_name}" (${existingAge}) vs "${extractData.player.player_name}" (${currentAge})`)
              }
            }
            
            // Merge dati aggiuntivi
            // IMPORTANTE: overall_rating viene gestito DOPO il loop per usare il valore più alto tra tutte le foto
            const { overall_rating, ...extractDataWithoutRating } = extractData.player
            playerData = {
              ...playerData,
              ...extractDataWithoutRating,
              // Mantieni dati migliori (escludi overall_rating dal merge qui - viene gestito dopo il loop)
              base_stats: extractData.player.base_stats || playerData.base_stats,
              skills: extractData.player.skills || playerData.skills,
              com_skills: extractData.player.com_skills || playerData.com_skills,
              boosters: extractData.player.boosters || playerData.boosters
            }
          }
          // Salva sempre i dati estratti (inclusa la prima foto) per calcolare Math.max() dopo
          allExtractedData[img.type] = extractData.player
          
          // Traccia foto caricate: card=Statistiche, stats=Abilità, skills=Booster (design unificato)
          if (img.type === 'card') {
            photoSlots.card = true
            if (extractData.player?.base_stats && Object.keys(extractData.player.base_stats || {}).length > 0) {
              photoSlots.statistiche = true
            }
          } else if (img.type === 'stats') {
            photoSlots.abilita = true
          } else if (img.type === 'skills') {
            photoSlots.booster = true
            if (extractData.player?.skills?.length || extractData.player?.com_skills?.length) {
              photoSlots.abilita = true
            }
          } else if (img.type === 'booster') {
            photoSlots.booster = true
          }
        }
      }

      // Se tutte le immagini sono fallite, mostra errore specifico
      if (!playerData || !playerData.player_name) {
        if (errors.length > 0) {
          // Se c'è un errore di quota OpenAI, mostralo chiaramente
          const quotaError = errors.find(e => e.includes('quota') || e.includes('billing'))
          if (quotaError) {
            throw new Error(t('openAQuotaError'))
          }
          // Altrimenti mostra il primo errore specifico
          throw new Error(`${t('errorExtractionDataList')}: ${errors[0]}`)
        }
        throw new Error(t('errorPlayerDataNotExtracted'))
      }

      // FIX: overall_rating - l'overall_rating è presente in tutte e tre le foto (card, statistiche, abilità)
      // Usa il valore più alto tra quelli estratti (per evitare errori dell'AI che estrae valori più bassi)
      const allRatings = Object.values(allExtractedData)
        .map(p => p?.overall_rating)
        .filter(r => r != null && r > 0)
      if (allRatings.length > 0) {
        playerData.overall_rating = Math.max(...allRatings)
      }

      // Validazione duplicati riserve: verifica se stesso giocatore (nome+età) già presente nelle riserve
      const playerName = String(playerData.player_name || '').trim().toLowerCase()
      const playerAge = playerData.age != null ? Number(playerData.age) : null
      
      const duplicateReserve = riserve.find(p => {
        const pName = String(p.player_name || '').trim().toLowerCase()
        const pAge = p.age != null ? Number(p.age) : null
        
        // Match esatto se nome+età corrispondono
        if (playerName && pName && playerAge && pAge) {
          return pName === playerName && pAge === playerAge
        }
        // Fallback: solo nome se età non disponibile
        if (playerName && pName) {
          return pName === playerName
        }
        return false
      })

      if (duplicateReserve) {
        const playerAgeStr = playerAge ? ` (${playerAge} ${t('years')})` : ''
        const confirmMsg = t('duplicateReserveReplaceAlert')
          .replace('${playerName}', playerData.player_name)
          .replace('${playerAge}', playerAgeStr)
        
        // FIX RC-002: Sostituzione window.confirm con ConfirmModal (feature flag)
        const confirmed = await showConfirmSafe({
          fallback: () => window.confirm(confirmMsg),
          modalConfig: {
            title: t('duplicateReserveTitle'),
            message: confirmMsg,
            variant: 'warning',
            confirmLabel: t('replace'),
            cancelLabel: t('cancel')
          },
          setConfirmModal
        })
        
        if (!confirmed) {
          setUploadingReserve(false)
          return
        }
        // Elimina vecchio giocatore riserva
        const deleteRes = await fetch('/api/supabase/delete-player', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ player_id: duplicateReserve.id })
        })
        if (!deleteRes.ok) {
          const deleteData = await deleteRes.json()
          throw new Error(deleteData.error || t('errorDeletingDuplicateReserveReplace'))
        }
      }

      // Dopo estrazione: apri modal posizioni (anche per RISERVE) prima di salvare
      const mainPosition = playerData.position || 'AMF'
      const initialPositions = Array.isArray(playerData.original_positions) && playerData.original_positions.length > 0
        ? playerData.original_positions
        : [{ position: mainPosition, competence: 'Alta' }]
      setSelectedOriginalPositions(initialPositions)
      setExtractedPlayerData({
        ...playerData,
        photo_slots: photoSlots,
        slot_index: null // Riserva
      })
      setPositionModalCtx({
        mode: 'new',
        slotIndex: null,
        photoSlots
      })
      setShowUploadReserveModal(false)
      setUploadReserveImages([])
      setShowPositionSelectionModal(true)
    } catch (err) {
      console.error('[GestioneFormazione] Upload reserve error:', err)
      setError(err.message || t('errorLoadingReserve'))
    } finally {
      setUploadingReserve(false)
    }
  }

  if (loading) {
    return (
      <main style={{ padding: '32px 24px', minHeight: '100vh', textAlign: 'center' }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '16px', color: 'var(--neon-blue)' }} />
        <div>{t('loading')}</div>
      </main>
    )
  }

  // Se non c'è layout, mostra messaggio con opzioni
  const noLayoutContent = !layout || !layout.slot_positions

  // Genera array slot 0-10 con posizioni (solo se layout esiste)
  const normalizedSlotPositions = layout?.slot_positions ? normalizeSlotPositionsDxSx(layout.slot_positions) : null
  const slots = normalizedSlotPositions ? Array.from({ length: 11 }, (_, i) => ({
    slot_index: i,
    position: normalizedSlotPositions[i] || { x: 50, y: 50, position: '?' },
    player: titolari.find(p => p.slot_index === i) || null
  })) : []

  // Calcola collisioni e offset per evitare sovrapposizioni
  const calculateCardOffsets = (slots) => {
    const CARD_WIDTH_PX = 150 // Larghezza approssimativa card in px
    const CARD_HEIGHT_PX = 160 // Altezza approssimativa card in px
    const MIN_DISTANCE_X = 12 // Distanza minima in % per evitare collisioni
    const MIN_DISTANCE_Y = 15 // Distanza minima in % per evitare collisioni
    
    return slots.map((slot, index) => {
      let offsetX = 0
      let offsetY = 0
      let hasNearbyCards = false
      
      // Controlla collisioni con altri slot
      slots.forEach((otherSlot, otherIndex) => {
        if (index === otherIndex) return
        
        const dx = Math.abs(slot.position.x - otherSlot.position.x)
        const dy = Math.abs(slot.position.y - otherSlot.position.y)
        
        // Se sono sulla stessa linea orizzontale (Y simile) e troppo vicini in X
        if (dy < MIN_DISTANCE_Y && dx < MIN_DISTANCE_X) {
          hasNearbyCards = true
          // Sposta leggermente verso l'esterno
          if (slot.position.x < otherSlot.position.x) {
            offsetX -= 1.5 // Sposta a sinistra
          } else {
            offsetX += 1.5 // Sposta a destra
          }
        }
        
        // Se sono sulla stessa linea verticale (X simile) e troppo vicini in Y
        if (dx < MIN_DISTANCE_X && dy < MIN_DISTANCE_Y && dy > 0) {
          hasNearbyCards = true
          if (slot.position.y < otherSlot.position.y) {
            offsetY -= 1.5 // Sposta in alto
          } else {
            offsetY += 1.5 // Sposta in basso
          }
        }
      })
      
      return {
        ...slot,
        offsetX,
        offsetY,
        hasNearbyCards
      }
    })
  }

  const slotsWithOffsets = layout?.slot_positions ? calculateCardOffsets(slots) : []

  return (
    <main data-tour-id="tour-formation-intro" className="p-6 max-w-7xl mx-auto">
      <Suspense fallback={null}>
        <TutorialQueryListener onOpen={() => setShowRosaTutorial(true)} />
      </Suspense>
      
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold neon-text mb-8">
          <Users size={24} color="var(--primary-cyan)" />
          {t('squadManagement')}
        </h1>
      </div>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 10000,
          padding: '16px 20px',
          background: toast.type === 'success'
            ? 'rgba(34, 197, 94, 0.95)'
            : toast.type === 'warning'
              ? 'rgba(245, 158, 11, 0.95)'
              : 'rgba(239, 68, 68, 0.95)',
          border: `2px solid ${toast.type === 'success' ? '#22c55e' : toast.type === 'warning' ? '#f59e0b' : '#ef4444'}`,
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          minWidth: '300px',
          maxWidth: '500px',
          animation: 'slideInRight 0.3s ease-out',
          backdropFilter: 'blur(8px)'
        }}>
          {toast.type === 'success' ? (
            <CheckCircle2 size={20} color="#ffffff" />
          ) : toast.type === 'warning' ? (
            <AlertTriangle size={20} color="#ffffff" />
          ) : (
            <AlertCircle size={20} color="#ffffff" />
          )}
          <span style={{ 
            color: '#ffffff', 
            fontSize: '14px', 
            fontWeight: 600,
            flex: 1
          }}>
            {typeof toast.message === 'string' ? toast.message : (toast.message?.message ?? String(toast.message ?? ''))}
          </span>
          <button
            onClick={() => setToast(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {/* Header */}
      <div data-tour-id="tour-formation-header" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '16px',
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => router.push('/')}
          className="neon-button"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <ArrowLeft size={16} />
          Dashboard
        </button>
        <h1 className="neon-text" style={{ fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: 700, margin: 0 }}>
          {t('swapFormation')}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto', flexWrap: 'wrap' }}>
          <OnboardingFormation onOpenTutorial={() => setShowRosaTutorial(true)} />
          <button
            type="button"
            onClick={() => setShowRosaTutorial(true)}
            className="neon-button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              padding: '8px 16px',
              borderColor: 'var(--neon-purple)',
              color: 'var(--neon-purple)',
              background: 'rgba(168, 85, 247, 0.1)'
            }}
            title={t('tutorialRosaTitle')}
          >
            <BookOpen size={16} />
            {t('tutorialRosaButton')}
          </button>
          {layout?.formation && (
            <div style={{ 
              fontSize: '18px', 
              fontWeight: 600, 
              color: 'var(--neon-blue)'
            }}>
              {layout.formation}
            </div>
          )}
          {/* Compilazione manuale: sempre visibile (seleziona/cambia formazione) */}
          <button
            onClick={() => setShowFormationSelectorModal(true)}
            className="neon-button"
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px',
              fontSize: '14px',
              padding: '8px 16px'
            }}
          >
            <Settings size={16} />
            {layout?.formation ? t('changeFormation') : (t('selectFormation') || t('createFormationBtn'))}
          </button>
          {/* Matita e personalizza: solo se c'è già un layout */}
          {layout?.formation && layout?.slot_positions && Object.keys(layout.slot_positions).length > 0 && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  if (isEditMode) {
                    handleSaveCustomPositions()
                  } else {
                    setIsEditMode(true)
                  }
                }}
                className="neon-button"
                disabled={uploadingFormation}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  padding: '8px 16px',
                  background: isEditMode ? 'rgba(34, 197, 94, 0.2)' : 'rgba(0, 212, 255, 0.1)',
                  borderColor: isEditMode ? 'var(--neon-green)' : 'var(--neon-blue)',
                  opacity: uploadingFormation ? 0.5 : 1,
                  cursor: uploadingFormation ? 'not-allowed' : 'pointer'
                }}
              >
                {isEditMode ? (
                  <>
                    <CheckCircle2 size={16} />
                    {t('saveChanges')}
                  </>
                ) : (
                  <>
                    <Pencil size={16} />
                    {t('customizePositions')}
                  </>
                )}
              </button>
              {isEditMode && (
                <button
                  onClick={() => {
                    setIsEditMode(false)
                    setCustomPositions({})
                    showToast(t('changesCancelled'), 'success')
                  }}
                  className="neon-button"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    padding: '8px 16px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    borderColor: '#ef4444'
                  }}
                >
                  <X size={16} />
                  {t('cancel')}
                </button>
              )}
            </div>
          )}
          <button
            data-tour-id="tour-formation-coaches-link"
            onClick={() => router.push('/allenatori')}
            className="neon-button"
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px',
              fontSize: '14px',
              padding: '8px 16px'
            }}
          >
            <Users size={16} />
            {t('coachesLink')}
          </button>
        </div>
      </div>

      {/* Info Allenatore Attivo */}
      {activeCoach && (
        <div data-tour-id="tour-formation-active-coach" className="neon-card" style={{ 
          marginBottom: '24px',
          padding: '16px', 
          className: 'neon-panel',
          border: '2px solid var(--neon-blue)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <Star size={20} fill="var(--neon-blue)" color="var(--neon-blue)" />
            <div>
              <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '4px' }}>
                {t('coachActiveTitle')}
              </div>
              <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
                {activeCoach.coach_name}
              </div>
              {activeCoach.team && (
                <div style={{ fontSize: '14px', opacity: 0.8 }}>
                  {activeCoach.team}
                </div>
              )}
            </div>
          </div>
          {activeCoach.playing_style_competence && typeof activeCoach.playing_style_competence === 'object' && (
            <div style={{ fontSize: '12px', opacity: 0.7 }}>
              {Object.entries(activeCoach.playing_style_competence)
                .filter(([_, value]) => value != null)
                .slice(0, 3)
                .map(([style, value]) => (
                  <span key={style} style={{ marginRight: '12px' }}>
                    {t(style) || style.replace(/_/g, ' ')}: <strong>{typeof value === 'object' ? '' : value}</strong>
                  </span>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Se non c'è layout, mostra messaggio */}
      {noLayoutContent && (
        <div data-tour-id="tour-formation-upload" className="neon-card" style={{ padding: '48px 24px', textAlign: 'center', marginBottom: '24px' }}>
          <Info size={48} style={{ marginBottom: '16px', opacity: 0.5, color: 'var(--neon-blue)' }} />
          <div style={{ fontSize: '20px', marginBottom: '12px', fontWeight: 600 }}>
            {t('createFormation')}
          </div>
          <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '24px' }}>
            {t('selectFormationDesc')}
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowFormationSelectorModal(true)}
              className="btn primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Settings size={16} />
              {t('createFormationBtn')}
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="error" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} />
          {typeof error === 'string' ? error : (error?.message ?? String(error ?? ''))}
        </div>
      )}

      {/* Campo 2D - Full Width come prima */}
      {!noLayoutContent && (
      <>
        {/* Indicatore Modalità Edit */}
        {isEditMode && (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(251, 191, 36, 0.1)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            borderRadius: '8px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            maxWidth: 'clamp(540px, 45vw, 720px)',
            margin: '0 auto 16px auto'
          }}>
            <Info size={16} color="#fbbf24" />
            <span style={{ fontSize: '14px', color: '#fbbf24' }}>
              {t('editModeActive')}
            </span>
          </div>
        )}

        {/* Campo 2D */}
        <div 
          data-tour-id="tour-formation-field"
          className="neon-card" 
          data-field-container
          style={{ 
        marginBottom: '24px',
        padding: 'clamp(16px, 2vw, 24px)',
        position: 'relative',
        maxWidth: 'clamp(540px, 45vw, 720px)',
        minHeight: 'clamp(292px, 39vh, 422px)',
        aspectRatio: '2/3',
        margin: '0 auto',
        background: `
          linear-gradient(180deg, rgba(5, 8, 21, 0.4) 0%, rgba(10, 14, 39, 0.3) 50%, rgba(5, 8, 21, 0.4) 100%),
          linear-gradient(90deg, rgba(22, 163, 74, 0.08) 0%, rgba(34, 197, 94, 0.12) 50%, rgba(22, 163, 74, 0.08) 100%),
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(34, 197, 94, 0.05) 2px,
            rgba(34, 197, 94, 0.05) 4px
          ),
          linear-gradient(180deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.15) 50%, rgba(16, 185, 129, 0.12) 100%)
        `,
        borderRadius: '16px',
        border: '2px solid rgba(0, 212, 255, 0.3)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 0 60px rgba(34, 197, 94, 0.05)',
        overflow: 'hidden'
      }}>
        {/* Pattern texture erba - ridotto opacità */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            repeating-linear-gradient(
              45deg,
              transparent,
              transparent 10px,
              rgba(34, 197, 94, 0.015) 10px,
              rgba(34, 197, 94, 0.015) 20px
            )
          `,
          pointerEvents: 'none',
          opacity: 0.6
        }} />
        
        {/* Overlay scuro per dissolvenza e contrasto */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(ellipse at center, transparent 0%, rgba(5, 8, 21, 0.3) 100%),
            linear-gradient(180deg, rgba(5, 8, 21, 0.2) 0%, transparent 20%, transparent 80%, rgba(5, 8, 21, 0.2) 100%)
          `,
          pointerEvents: 'none'
        }} />

        {/* Linea centrocampo - più visibile */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          height: '3px',
          background: 'rgba(255, 255, 255, 0.5)',
          transform: 'translateY(-50%)',
          boxShadow: '0 0 12px rgba(255, 255, 255, 0.4)'
        }} />
        
        {/* Cerchio centrocampo - più visibile */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '120px',
          height: '120px',
          border: '3px solid rgba(255, 255, 255, 0.4)',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          boxShadow: '0 0 16px rgba(255, 255, 255, 0.3)'
        }} />
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '8px',
          height: '8px',
          background: 'rgba(255, 255, 255, 0.5)',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          boxShadow: '0 0 8px rgba(255, 255, 255, 0.4)'
        }} />

        {/* Area di rigore superiore - più visibile */}
        <div style={{
          position: 'absolute',
          top: '8%',
          left: '10%',
          right: '10%',
          height: '18%',
          border: '3px solid rgba(255, 255, 255, 0.35)',
          borderBottom: 'none',
          borderRadius: '12px 12px 0 0',
          boxShadow: '0 -2px 10px rgba(255, 255, 255, 0.2)'
        }} />
        <div style={{
          position: 'absolute',
          top: '8%',
          left: '20%',
          right: '20%',
          height: '8%',
          border: '3px solid rgba(255, 255, 255, 0.35)',
          borderBottom: 'none',
          borderRadius: '8px 8px 0 0',
          boxShadow: '0 -2px 8px rgba(255, 255, 255, 0.2)'
        }} />

        {/* Area di rigore inferiore - più visibile */}
        <div style={{
          position: 'absolute',
          bottom: '8%',
          left: '10%',
          right: '10%',
          height: '18%',
          border: '3px solid rgba(255, 255, 255, 0.35)',
          borderTop: 'none',
          borderRadius: '0 0 12px 12px',
          boxShadow: '0 2px 10px rgba(255, 255, 255, 0.2)'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '8%',
          left: '20%',
          right: '20%',
          height: '8%',
          border: '3px solid rgba(255, 255, 255, 0.35)',
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          boxShadow: '0 2px 8px rgba(255, 255, 255, 0.2)'
        }} />

        {/* Linee laterali - più visibili */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: '5%',
          bottom: 0,
          width: '2px',
          background: 'rgba(255, 255, 255, 0.4)',
          boxShadow: '0 0 8px rgba(255, 255, 255, 0.3)'
        }} />
        <div style={{
          position: 'absolute',
          top: 0,
          right: '5%',
          bottom: 0,
          width: '2px',
          background: 'rgba(255, 255, 255, 0.4)',
          boxShadow: '0 0 8px rgba(255, 255, 255, 0.3)'
        }} />

        {/* Linee orizzontali (zone campo) - più visibili */}
        <div style={{
          position: 'absolute',
          top: '25%',
          left: '5%',
          right: '5%',
          height: '1px',
          background: 'rgba(255, 255, 255, 0.25)',
          boxShadow: '0 0 6px rgba(255, 255, 255, 0.15)'
        }} />
        <div style={{
          position: 'absolute',
          top: '75%',
          left: '5%',
          right: '5%',
          height: '1px',
          background: 'rgba(255, 255, 255, 0.25)',
          boxShadow: '0 0 6px rgba(255, 255, 255, 0.15)'
        }} />

        {/* Card giocatori posizionate */}
        {slots.map((slot) => {
          // Applica posizioni personalizzate se in edit mode
          const customPos = customPositions[slot.slot_index]
          const finalSlot = customPos ? {
            ...slot,
            position: {
              ...slot.position,
              x: customPos.x,
              y: customPos.y,
              position: customPos.position || slot.position?.position  // Usa position calcolata se presente
            }
          } : slot
          
          return (
            <SlotCard
              key={slot.slot_index}
              slot={finalSlot}
              onClick={() => handleSlotClick(slot.slot_index)}
              onRemove={slot.player ? () => handleRemoveFromSlot(slot.player.id) : null}
              isEditMode={isEditMode}
              onPositionChange={handlePositionChange}
              customPosition={customPos}  // Passa customPosition per mostrare sigla ruolo
              formatRoleLabel={formatRoleLabel}
              formatRolePlaceholder={formatRolePlaceholder}
            />
          )
        })}
        </div>

        {/* Pannello Impostazioni Tattiche - Collassabile sotto il campo */}
        <TacticalSettingsPanel
          titolari={titolari}
          tacticalSettings={tacticalSettingsForPanel ?? tacticalSettings}
          onSave={handleSaveTacticalSettings}
          saving={savingTacticalSettings}
        />
      </>
      )}

      {/* Riserve (max 12) */}
      <div data-tour-id="tour-formation-reserves" style={{ marginBottom: '24px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h2 style={{ 
            fontSize: '20px', 
            fontWeight: 700,
            color: 'var(--neon-purple)',
            margin: 0
          }}>
            {t('riserve')} ({riserve.length}/{MAX_RESERVES})
          </h2>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {riserve.length >= MAX_RESERVES && (
              <span style={{ fontSize: '13px', color: 'var(--neon-orange)', marginRight: '4px' }}>{t('maxReservesReached')}</span>
            )}
            <button
              data-tour-id="tour-formation-upload"
              onClick={() => riserve.length < MAX_RESERVES && setShowUploadReserveModal(true)}
              className="neon-button"
              disabled={riserve.length >= MAX_RESERVES}
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '8px',
                background: riserve.length >= MAX_RESERVES ? 'rgba(128,128,128,0.2)' : 'rgba(168, 85, 247, 0.2)',
                borderColor: riserve.length >= MAX_RESERVES ? 'rgba(255,255,255,0.3)' : 'var(--neon-purple)',
                color: riserve.length >= MAX_RESERVES ? 'rgba(255,255,255,0.5)' : 'var(--neon-purple)',
                cursor: riserve.length >= MAX_RESERVES ? 'not-allowed' : 'pointer'
              }}
            >
              <Upload size={16} />
              {t('loadReserve')}
            </button>
            <button
              onClick={() => riserve.length < MAX_RESERVES && setShowManualPlayerModal(true)}
              className="neon-button"
              disabled={riserve.length >= MAX_RESERVES}
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '8px',
                background: riserve.length >= MAX_RESERVES ? 'rgba(128,128,128,0.2)' : 'rgba(0, 212, 255, 0.1)',
                borderColor: riserve.length >= MAX_RESERVES ? 'rgba(255,255,255,0.3)' : 'var(--neon-blue)',
                color: riserve.length >= MAX_RESERVES ? 'rgba(255,255,255,0.5)' : 'var(--neon-blue)',
                cursor: riserve.length >= MAX_RESERVES ? 'not-allowed' : 'pointer'
              }}
            >
              <Pencil size={16} />
              {lang === 'en' ? 'Manual' : 'Manuale'}
            </button>
          </div>
        </div>
        {riserve.length > 0 && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(150px, 18vw, 200px), 1fr))',
            gap: 'clamp(12px, 1.5vw, 16px)'
          }}>
            {riserve.map((player) => (
              <ReserveCard 
                key={player.id}
                player={player}
                onClick={() => {
                  if (selectedSlot && showAssignModal) {
                    // Se il modal di assegnazione è aperto, assegna il giocatore
                    handleAssignFromReserve(player.id)
                  } else {
                    // Altrimenti, apri il modal con le statistiche
                    setSelectedReserve(player.id)
                    setShowAssignModal(true)
                  }
                }}
                disabled={false}
                onDelete={() => handleDeleteReserve(player.id)}
              />
            ))}
          </div>
        )}
        {riserve.length === 0 && (
          <div style={{ 
            padding: '24px', 
            textAlign: 'center', 
            background: 'rgba(168, 85, 247, 0.05)',
            borderRadius: '8px',
            border: '1px dashed rgba(168, 85, 247, 0.3)'
          }}>
            <div style={{ fontSize: '14px', opacity: 0.7, marginBottom: '12px' }}>
              {t('noReservesUploadPlayers')}
            </div>
            <button
              onClick={() => setShowUploadReserveModal(true)}
              className="neon-button"
              disabled={riserve.length >= MAX_RESERVES}
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '8px'
              }}
            >
              <Plus size={16} />
              {t('loadFirstReserve')}
            </button>
          </div>
        )}
      </div>

      {/* Modal Assegnazione / Visualizzazione Statistiche */}
      {showAssignModal && (selectedSlot || selectedReserve) && (
        <AssignModal
          slot={selectedSlot}
          currentPlayer={
            selectedReserve 
              ? riserve.find(p => p.id === selectedReserve)
              : slots.find(s => s.slot_index === selectedSlot.slot_index)?.player
          }
          riserve={riserve}
          onAssignFromReserve={handleAssignFromReserve}
          onUploadPhoto={handleUploadPhoto}
          onEditCompetences={(player) => {
            if (!player?.id) return
            const mainPosition = player.position || 'AMF'
            const positions = Array.isArray(player.original_positions) && player.original_positions.length > 0
              ? player.original_positions
              : [{ position: mainPosition, competence: 'Alta' }]
            setSelectedOriginalPositions(positions)
            setExtractedPlayerData({
              ...player,
              slot_index: player.slot_index ?? null
            })
            setPositionModalCtx({ mode: 'edit', playerId: player.id })
            setShowAssignModal(false)
            setSelectedSlot(null)
            setSelectedReserve(null)
            setShowPositionSelectionModal(true)
          }}
          onEditBoosters={(player) => {
            if (!player?.id) return
            setShowAssignModal(false)
            setSelectedSlot(null)
            setSelectedReserve(null)
            openManualBoostersForPlayer(player)
          }}
          onRemove={selectedSlot ? (player => handleRemoveFromSlot(player.id)) : null}
          onDelete={currentPlayer => handleDeletePlayer(currentPlayer.id)}
          onClose={() => {
            setShowAssignModal(false)
            setSelectedSlot(null)
            setSelectedReserve(null)
          }}
          onOpenManualEntry={() => {
            setShowAssignModal(false)
            setShowManualPlayerModal(true)
          }}
          assigning={assigning}
        />
      )}

      {showManualBoostersModal && (
        <ManualBoostersModal
          boosters={manualBoosters}
          setBoosters={setManualBoosters}
          onCancel={() => {
            setShowManualBoostersModal(false)
            setManualBoosters([])
            setManualBoostersPlayerId(null)
          }}
          onSave={saveManualBoostersForPlayer}
          saving={savingManualBoosters}
        />
      )}

      {/* Modal Selezione Formazione Manuale */}
      {showFormationSelectorModal && (
        <FormationSelectorModal
          onSelect={handleSelectManualFormation}
          onClose={() => setShowFormationSelectorModal(false)}
          loading={uploadingFormation}
        />
      )}

      {/* Modal Upload Riserva */}
      {showUploadReserveModal && (
        <UploadPlayerModal
          slot={{ slot_index: null, position: { x: 50, y: 50, position: 'RESERVE' } }}
          images={uploadReserveImages}
          onImagesChange={setUploadReserveImages}
          onUpload={handleUploadReserve}
          onClose={() => {
            setShowUploadReserveModal(false)
            setUploadReserveImages([])
          }}
          uploading={uploadingReserve}
          onOptimizeError={(msg) => {
            setError(msg)
            showToast(msg, 'error')
          }}
        />
      )}

      {/* Modal Inserimento Manuale Giocatore (da riserve: slotIndex=null, da slot vuoto: slotIndex dal selectedSlot) */}
      <ManualPlayerModal
        show={showManualPlayerModal}
        onClose={() => { setShowManualPlayerModal(false); setSelectedSlot(null) }}
        onSaved={async () => { await fetchData(); setShowManualPlayerModal(false); setSelectedSlot(null) }}
        slotIndex={selectedSlot?.slot_index ?? null}
      />

      {/* Modal Upload Giocatore per Slot */}
      {showUploadPlayerModal && selectedSlot && (
        <UploadPlayerModal
          slot={selectedSlot}
          images={uploadImages}
          onImagesChange={setUploadImages}
          onUpload={handleUploadPlayerToSlot}
          onClose={() => {
            setShowUploadPlayerModal(false)
            setUploadImages([])
            setSelectedSlot(null)
          }}
          onSwitchToManual={() => {
            setShowUploadPlayerModal(false)
            setUploadImages([])
            setShowManualPlayerModal(true)
          }}
          uploading={uploadingPlayer}
          onOptimizeError={(msg) => {
            setError(msg)
            showToast(msg, 'error')
          }}
        />
      )}

      {/* Modal Selezione Posizioni Originali */}
      {showMissingDataModal && extractedPlayerData && (
        <MissingDataModal
          missingData={missingData}
          playerData={extractedPlayerData}
          onManualInput={handleManualInput}
          onRetryUpload={handleRetryUpload}
          onSaveAnyway={handleSaveAnyway}
          onCancel={() => {
            setShowMissingDataModal(false)
            setMissingData({ required: [], optional: [] })
            setExtractedPlayerData(null)
          }}
        />
      )}

      {showRosaTutorial && (
        <RosaTutorialModal onClose={() => setShowRosaTutorial(false)} />
      )}

      {showPositionSelectionModal && extractedPlayerData && (
        <PositionSelectionModal
          playerName={extractedPlayerData.player_name}
          overallRating={extractedPlayerData.overall_rating}
          mainPosition={extractedPlayerData.position}
          selectedPositions={selectedOriginalPositions}
          onPositionsChange={setSelectedOriginalPositions}
          onConfirm={handleSavePlayerWithPositions}
          uploading={uploadingPlayer || uploadingReserve}
          onCancel={() => {
            setShowPositionSelectionModal(false)
            setExtractedPlayerData(null)
            setSelectedOriginalPositions([])
            setPositionModalCtx(null)
            setShowUploadPlayerModal(false)
            setUploadImages([])
            setSelectedSlot(null)
          }}
        />
      )}

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(0, 212, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2);
          }
          50% {
            box-shadow: 0 0 30px rgba(0, 212, 255, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3);
          }
        }
        @keyframes field-shimmer {
          0% {
            background-position: 0% 50%;
          }
          100% {
            background-position: 100% 50%;
          }
        }
      `}</style>

      {/* ConfirmModal per duplicato giocatore (qui per scope: duplicateConfirmModal è stato di GestioneFormazionePage) */}
      <DuplicatePlayerConfirmModal state={duplicateConfirmModal} t={t} />

      {/* ConfirmModal generico per sostituire window.confirm */}
      {confirmModal && (
        <ConfirmModal
          show={confirmModal.show}
          title={confirmModal.title}
          message={confirmModal.message}
          details={confirmModal.details}
          confirmLabel={confirmModal.confirmLabel}
          cancelLabel={confirmModal.cancelLabel}
          variant={confirmModal.variant || 'warning'}
          confirmVariant={confirmModal.confirmVariant || 'primary'}
          presentation={confirmModal.presentation || 'center'}
          onConfirm={() => {
            confirmModal.onConfirm?.()
            setConfirmModal(null)
          }}
          onCancel={() => {
            confirmModal.onCancel?.()
            setConfirmModal(null)
          }}
        />
      )}
    </main>
  )
}

// Componente Modal Upload
// Slot Card Component - Badge Minimale (solo nome)
function SlotCard({ slot, onClick, onRemove, isEditMode = false, onPositionChange, customPosition = null, formatRoleLabel, formatRolePlaceholder }) {
  const { t } = useTranslation()
  const { slot_index, position, player, offsetX = 0, offsetY = 0, hasNearbyCards = false } = slot
  const isEmpty = !player
  
  // Usa position da customPosition se presente (durante drag), altrimenti da slot.position
  const rawPosition = customPosition?.position || position?.position || '?'
  // Label coerente IT/EN: evita mix come AMF + TRQ nella stessa schermata.
  const displayPosition = typeof formatRoleLabel === 'function' ? formatRoleLabel(rawPosition) : rawPosition
  const displayPlaceholder = typeof formatRolePlaceholder === 'function' ? formatRolePlaceholder(rawPosition) : displayPosition
  
  const [isDragging, setIsDragging] = React.useState(false)
  const [dragStart, setDragStart] = React.useState(null)
  const [currentOffset, setCurrentOffset] = React.useState({ x: 0, y: 0 })

  // Abbrevia nome se troppo lungo
  const getDisplayName = (name) => {
    if (!name) return ''
    if (name.length <= 12) return name
    // Prendi primo nome o abbrevia
    const parts = name.split(' ')
    if (parts.length > 1) {
      return parts[0] + ' ' + parts[parts.length - 1].charAt(0) + '.'
    }
    return name.substring(0, 10) + '...'
  }

  // Stato completamento profilazione (con fallback su dati reali)
  function getProfileCompletionStatus(photoSlots, p) {
    const ps = photoSlots && typeof photoSlots === 'object' ? photoSlots : {}
    const baseStats = p?.base_stats || {}
    const skills = Array.isArray(p?.skills) ? p.skills : []
    const comSkills = Array.isArray(p?.com_skills) ? p.com_skills : []
    const boosters = Array.isArray(p?.available_boosters) ? p.available_boosters : []
    const hasStatsData = baseStats && Object.keys(baseStats).length > 0
    const hasAbilitaData = skills.length > 0 || comSkills.length > 0
    const hasBoosterData = boosters.length > 0
    const hasCardSection = (ps.card === true || ps.card === 'true' || ps.statistiche === true || ps.statistiche === 'true') || hasStatsData
    const hasSkillsSection = (ps.abilita === true || ps.abilita === 'true') || hasAbilitaData
    const hasBoosterSection = (ps.booster === true || ps.booster === 'true') || hasBoosterData
    const count = [hasCardSection, hasSkillsSection, hasBoosterSection].filter(Boolean).length
    return { hasCardSection, hasSkillsSection, hasBoosterSection, count }
  }

  // Calcola colore bordo basato su completamento profilazione
  function getProfileBorderColor(photoSlots, p) {
    const { count } = getProfileCompletionStatus(photoSlots, p)
    if (count === 3) return 'rgba(34, 197, 94, 0.8)'
    if (count === 2) return 'rgba(251, 191, 36, 0.8)'
    return 'rgba(239, 68, 68, 0.8)'
  }

  // Calcola colore hover (stesso colore, opacità maggiore)
  function getProfileBorderColorHover(photoSlots, p) {
    const baseColor = getProfileBorderColor(photoSlots, p)
    return baseColor.replace('0.8', '1.0').replace('0.6', '1.0')
  }

  // Handler unificato per mouse e touch
  const handlePointerStart = (e) => {
    if (!isEditMode || !player) return
    
    // Previeni scroll su mobile durante drag
    const isTouch = e.type.startsWith('touch')
    // Nota: non chiamare preventDefault su onTouchStart (listener spesso passivo).
    // Usiamo `touch-action: none` sul wrapper per evitare scroll durante drag.
    e.stopPropagation()
    
    const container = e.currentTarget.closest('[data-field-container]')
    if (!container) return
    
    const containerRect = container.getBoundingClientRect()
    
    // Estrai coordinate (mouse o touch)
    const startX = isTouch ? e.touches[0].clientX : e.clientX
    const startY = isTouch ? e.touches[0].clientY : e.clientY
    
    // Importante: offsetX/offsetY è un offset VISIVO anti-collisione.
    // Non deve finire salvato nelle coordinate; quindi lo usiamo solo per il rendering, non come base di persistenza.
    const startPercentX = position.x
    const startPercentY = position.y
    const startVisualPercentX = position.x + (offsetX || 0)
    const startVisualPercentY = position.y + (offsetY || 0)
    
    setIsDragging(true)
    const dragState = { startX, startY, startPercentX, startPercentY, startVisualPercentX, startVisualPercentY, containerRect, isTouch }
    setDragStart(dragState)
    
    let lastOffset = { x: 0, y: 0 }
    
    const handlePointerMove = (moveEvent) => {
      // Estrai coordinate (mouse o touch)
      const moveIsTouch = moveEvent.type.startsWith('touch')
      const currentX = moveIsTouch ? moveEvent.touches[0].clientX : moveEvent.clientX
      const currentY = moveIsTouch ? moveEvent.touches[0].clientY : moveEvent.clientY
      
      const deltaX = currentX - dragState.startX
      const deltaY = currentY - dragState.startY
      
      const percentX = (deltaX / dragState.containerRect.width) * 100
      const percentY = (deltaY / dragState.containerRect.height) * 100
      
      // Persistenza: applica delta alla base (senza offset visivo), clamp su 5..95
      let newX = Math.max(5, Math.min(95, dragState.startPercentX + percentX))
      let newY = Math.max(5, Math.min(95, dragState.startPercentY + percentY))
      if (slot_index === 0) {
        const c = clampPointerForGkSlot(newX, newY)
        newX = c.x
        newY = c.y
      }

      lastOffset = {
        x: newX - dragState.startPercentX,
        y: newY - dragState.startPercentY
      }
      
      setCurrentOffset(lastOffset)
      
      // Previeni scroll su mobile durante drag
      if (moveIsTouch) {
        moveEvent.preventDefault()
      }
    }
    
    const handlePointerEnd = () => {
      if (lastOffset.x !== 0 || lastOffset.y !== 0) {
        const newPosition = {
          x: dragState.startPercentX + lastOffset.x,
          y: dragState.startPercentY + lastOffset.y
        }
        
        if (onPositionChange) {
          onPositionChange(slot_index, newPosition)
        }
      }
      
      setIsDragging(false)
      setDragStart(null)
      setCurrentOffset({ x: 0, y: 0 })
      
      // Rimuovi listener appropriati
      if (dragState.isTouch) {
        document.removeEventListener('touchmove', handlePointerMove)
        document.removeEventListener('touchend', handlePointerEnd)
      } else {
        document.removeEventListener('mousemove', handlePointerMove)
        document.removeEventListener('mouseup', handlePointerEnd)
      }
    }
    
    // Aggiungi listener appropriati
    if (dragState.isTouch) {
      document.addEventListener('touchmove', handlePointerMove, { passive: false })
      document.addEventListener('touchend', handlePointerEnd)
    } else {
      document.addEventListener('mousemove', handlePointerMove)
      document.addEventListener('mouseup', handlePointerEnd)
    }
  }

  // Calcola colori bordo basati su profilazione
  const profileBorderColor = isEmpty 
    ? 'rgba(148, 163, 184, 0.5)'  // Grigio per slot vuoto
    : getProfileBorderColor(player.photo_slots, player)

  const profileBorderColorHover = isEmpty
    ? 'rgba(148, 163, 184, 0.7)'
    : getProfileBorderColorHover(player.photo_slots, player)
  const completion = !isEmpty ? getProfileCompletionStatus(player.photo_slots, player) : null
  const completedSections = completion?.count || 0
  const statusChipColor = completedSections === 3 ? '#22c55e' : '#ef4444'
  const statusItems = completion ? [
    { key: 'stats', icon: BarChart3, ok: completion.hasCardSection, label: t('statsSection') || 'Statistiche' },
    { key: 'skills', icon: Zap, ok: completion.hasSkillsSection, label: t('skillsSection') || 'Abilita' },
    { key: 'boosters', icon: Gift, ok: completion.hasBoosterSection, label: t('boostersSection') || 'Booster' }
  ] : []

  return (
    <div
      onClick={!isEditMode ? onClick : undefined}
      onMouseDown={isEditMode && player ? handlePointerStart : undefined}
      onTouchStart={isEditMode && player ? handlePointerStart : undefined}
      style={{
        position: 'absolute',
        left: `${position.x + (offsetX || 0) + currentOffset.x}%`,
        top: `${position.y + (offsetY || 0) + currentOffset.y}%`,
        transform: 'translate(-50%, -50%)',
        padding: isEmpty ? '6px 12px' : '6px 8px 7px',
        background: isEmpty 
          ? 'rgba(15, 23, 42, 0.85)' 
          : 'linear-gradient(180deg, rgba(11, 41, 94, 0.93) 0%, rgba(8, 25, 66, 0.95) 100%)',
        border: `1.5px solid ${profileBorderColor}`,
        borderRadius: isEmpty ? '20px' : '14px',
        cursor: isEditMode && player ? 'move' : 'pointer',
        transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        whiteSpace: isEmpty ? 'nowrap' : 'normal',
        boxShadow: isEmpty
          ? '0 4px 12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)'
          : '0 6px 18px rgba(0, 212, 255, 0.28), 0 0 18px rgba(8, 145, 178, 0.28)',
        backdropFilter: 'blur(8px)',
        zIndex: isDragging ? 1000 : (hasNearbyCards ? 2 : 1),
        minWidth: isEmpty ? 'auto' : 'clamp(78px, 9.2vw, 116px)',
        maxWidth: isEmpty ? 'clamp(70px, 10vw, 120px)' : 'clamp(96px, 12vw, 138px)',
        opacity: isDragging ? 0.7 : 1,
        userSelect: 'none',
        // Impedisce lo scroll/pinch su touch durante drag (alternativa a preventDefault su touchstart)
        touchAction: isEditMode && player ? 'none' : 'manipulation'
      }}
      onMouseEnter={(e) => {
        if (isDragging) return
        e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.1)'
        e.currentTarget.style.boxShadow = isEmpty
          ? '0 6px 20px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1)'
          : '0 8px 24px rgba(0, 212, 255, 0.45), 0 0 28px rgba(8, 145, 178, 0.45)'
        e.currentTarget.style.zIndex = '100'
        e.currentTarget.style.borderColor = profileBorderColorHover
        e.currentTarget.style.background = isEmpty
          ? 'rgba(15, 23, 42, 0.95)'
          : 'linear-gradient(180deg, rgba(11, 58, 128, 0.96) 0%, rgba(9, 38, 92, 0.98) 100%)'
      }}
      onMouseLeave={(e) => {
        if (isDragging) return
        e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)'
        e.currentTarget.style.boxShadow = isEmpty
          ? '0 4px 12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)'
          : '0 6px 18px rgba(0, 212, 255, 0.28), 0 0 18px rgba(8, 145, 178, 0.28)'
        e.currentTarget.style.zIndex = hasNearbyCards ? '2' : '1'
        e.currentTarget.style.borderColor = profileBorderColor
        e.currentTarget.style.background = isEmpty
          ? 'rgba(15, 23, 42, 0.85)'
          : 'linear-gradient(180deg, rgba(11, 41, 94, 0.93) 0%, rgba(8, 25, 66, 0.95) 100%)'
      }}
    >
      {isEmpty ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: 'clamp(10px, 1.1vw, 12px)',
          fontWeight: 700,
          color: 'rgba(148, 163, 184, 0.95)',
          textShadow: '0 1px 3px rgba(0, 0, 0, 0.7)'
        }}>
          <Plus size={14} />
          <span>{displayPlaceholder}</span>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          width: '100%',
          minWidth: 0
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            gap: '6px'
          }}>
            <div style={{
              fontSize: 'clamp(8px, 0.85vw, 10px)',
              fontWeight: 700,
              color: 'rgba(255, 255, 255, 0.82)',
              textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)',
              letterSpacing: '0.45px',
              textTransform: 'uppercase'
            }}>
              {displayPosition}
            </div>
            <div
              title={`${completedSections}/3 ${t('sectionsCompleted') || 'sezioni completate'}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                padding: '1px 6px',
                borderRadius: '999px',
                fontSize: 'clamp(8px, 0.9vw, 10px)',
                fontWeight: 700,
                color: '#fff',
                background: completedSections === 3 ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.22)',
                border: `1px solid ${statusChipColor}`
              }}
            >
              <span>{completedSections}/3</span>
              {completedSections === 3 ? <CheckCircle2 size={10} color="#22c55e" /> : <AlertCircle size={10} color="#ef4444" />}
            </div>
          </div>

          {/* Nome giocatore */}
          <div style={{
            fontSize: 'clamp(10px, 1.05vw, 13px)',
            fontWeight: 700,
            color: '#ffffff',
            textShadow: '0 2px 6px rgba(0, 0, 0, 0.8), 0 0 12px rgba(59, 130, 246, 0.5)',
            letterSpacing: '0.25px',
            textAlign: 'center',
            width: '100%',
            lineHeight: 1.1
          }}>
            {getDisplayName(player.player_name)}
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            width: '100%'
          }}>
            {statusItems.map(({ key, icon: Icon, ok, label }) => (
              <div
                key={key}
                title={`${label}: ${ok ? (t('profileComplete') || 'ok') : (t('missingDataTitle') || 'manca')}`}
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '999px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1px solid ${ok ? '#22c55e' : '#ef4444'}`,
                  background: ok ? 'rgba(34, 197, 94, 0.22)' : 'rgba(239, 68, 68, 0.2)',
                  boxShadow: ok ? '0 0 8px rgba(34, 197, 94, 0.35)' : '0 0 8px rgba(239, 68, 68, 0.28)'
                }}
              >
                <Icon size={9} color={ok ? '#22c55e' : '#ef4444'} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Reserve Card Component - Design Moderno 2024
function ReserveCard({ player, onClick, disabled, onDelete }) {
  return (
    <div
      style={{
        position: 'relative',
        padding: 'clamp(14px, 1.5vw, 18px)',
        background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.15) 0%, rgba(168, 85, 247, 0.2) 50%, rgba(147, 51, 234, 0.15) 100%)',
        border: `2px solid ${disabled ? 'rgba(168, 85, 247, 0.2)' : 'rgba(147, 51, 234, 0.5)'}`,
        borderRadius: '14px',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        boxShadow: disabled 
          ? '0 4px 12px rgba(0, 0, 0, 0.2)'
          : '0 8px 24px rgba(147, 51, 234, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(8px) saturate(150%)',
        overflow: 'hidden'
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)'
          e.currentTarget.style.boxShadow = '0 16px 40px rgba(147, 51, 234, 0.4), 0 0 60px rgba(168, 85, 247, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
          e.currentTarget.style.borderColor = 'rgba(147, 51, 234, 0.7)'
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(0) scale(1)'
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(147, 51, 234, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
          e.currentTarget.style.borderColor = 'rgba(147, 51, 234, 0.5)'
        }
      }}
    >
      {/* Pattern overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.05) 0%, transparent 50%)',
        pointerEvents: 'none'
      }} />
      
      <div 
        onClick={disabled ? undefined : onClick}
        style={{ position: 'relative', zIndex: 1 }}
      >
        <div style={{ 
          fontSize: 'clamp(14px, 1.5vw, 16px)', 
          fontWeight: 700, 
          marginBottom: '8px', 
          color: '#ffffff',
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.5), 0 0 8px rgba(147, 51, 234, 0.4)',
          lineHeight: '1.3'
        }}>
          {player.player_name}
        </div>
        {player.overall_rating && (
          <div style={{ 
            fontSize: 'clamp(18px, 2vw, 22px)', 
            fontWeight: 800,
            color: '#fbbf24',
            textShadow: '0 2px 6px rgba(0, 0, 0, 0.7), 0 0 12px rgba(251, 191, 36, 0.5)',
            background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.2) 100%)',
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(251, 191, 36, 0.4)',
            display: 'inline-block',
            boxShadow: '0 2px 8px rgba(251, 191, 36, 0.3)'
          }}>
            {player.overall_rating}
          </div>
        )}
      </div>
      
      {/* Bottone Rimuovi Riserva */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(220, 38, 38, 0.4) 100%)',
            border: '1px solid rgba(239, 68, 68, 0.6)',
            color: '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
            zIndex: 2
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.5) 0%, rgba(220, 38, 38, 0.6) 100%)'
            e.currentTarget.style.transform = 'scale(1.15) rotate(90deg)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.6)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(220, 38, 38, 0.4) 100%)'
            e.currentTarget.style.transform = 'scale(1) rotate(0deg)'
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.4)'
          }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}

// Assign Modal Component
function AssignModal({ slot, currentPlayer, riserve, onAssignFromReserve, onUploadPhoto, onEditCompetences, onEditBoosters, onRemove, onDelete, onClose, onOpenManualEntry, assigning }) {
  const { t, lang } = useTranslation()
  const router = useRouter()
  const [expandedSections, setExpandedSections] = React.useState({
    stats: true,
    skills: true,
    boosters: true
  })

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // Estrai dati giocatore
  const baseStats = currentPlayer?.base_stats || {}
  const skills = Array.isArray(currentPlayer?.skills) ? currentPlayer.skills : []
  const comSkills = Array.isArray(currentPlayer?.com_skills) ? currentPlayer.com_skills : []
  const boosters = Array.isArray(currentPlayer?.available_boosters) ? currentPlayer.available_boosters : []
  const photoSlots = currentPlayer?.photo_slots || {}

  // Mostra sempre i dati se presenti (anche se photo_slots non completo)
  const hasStats = baseStats && Object.keys(baseStats).length > 0
  const hasSkills = skills.length > 0 || comSkills.length > 0
  const hasBoosters = boosters && boosters.length > 0

  // Stato sezioni coerente con card nel campo 2D
  const hasCardSection = (photoSlots.card || photoSlots.statistiche) || hasStats
  const hasSkillsSection = photoSlots.abilita || hasSkills
  const hasBoosterSection = photoSlots.booster || hasBoosters
  const completedSections = [hasCardSection, hasSkillsSection, hasBoosterSection].filter(Boolean).length
  const isProfileComplete = completedSections === 3

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '24px'
    }}
    onClick={onClose}
    >
      <div 
        className="neon-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '700px',
          width: '100%',
          maxHeight: 'calc(100vh - 100px)',
          overflowY: 'auto',
          padding: '24px',
          paddingBottom: 'calc(24px + 64px + env(safe-area-inset-bottom, 0px))',
          background: 'rgba(10, 14, 39, 0.95)',
          border: '2px solid var(--neon-blue)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>
            {currentPlayer ? t('details') : t('assignPlayer')}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {currentPlayer && typeof onEditCompetences === 'function' && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEditCompetences(currentPlayer) }}
                className="btn secondary"
                style={{
                  padding: '8px 10px',
                  fontSize: '12px',
                  borderRadius: '8px'
                }}
              >
                {t('editCompetences')}
              </button>
            )}
            {currentPlayer && typeof onEditBoosters === 'function' && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEditBoosters(currentPlayer) }}
                className="btn secondary"
                style={{
                  padding: '8px 10px',
                  fontSize: '12px',
                  borderRadius: '8px'
                }}
              >
                {t('editBoosters')}
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.7)',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '20px', padding: '16px', background: 'rgba(0, 212, 255, 0.1)', borderRadius: '10px', border: '1px solid rgba(0, 212, 255, 0.2)' }}>
          {slot && (
            <div style={{ fontSize: '13px', marginBottom: '8px', opacity: 0.8 }}>
              <strong>{t('slot')} {slot.slot_index}</strong> • {slot.position?.position || '?'}
            </div>
          )}
          {!slot && currentPlayer && (
            <div style={{ fontSize: '13px', marginBottom: '8px', opacity: 0.8 }}>
              <strong>{t('riserve')}</strong> • {currentPlayer.position || '?'}
            </div>
          )}
          {currentPlayer && (
            <>
              <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span>{currentPlayer.player_name}</span>
                {currentPlayer.overall_rating && (
                  <span style={{ 
                    color: '#fbbf24', 
                    fontSize: '20px',
                    fontWeight: 800,
                    textShadow: '0 2px 6px rgba(251, 191, 36, 0.6)'
                  }}>
                    {currentPlayer.overall_rating}
                  </span>
                )}
              </div>
              
              {/* Info aggiuntive: Età, Club, Nazionalità, Stile */}
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '8px', 
                marginBottom: '12px' 
              }}>
                {currentPlayer.age && (
                  <div style={{
                    padding: '4px 10px',
                    background: 'rgba(59, 130, 246, 0.2)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#60a5fa',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <User size={12} />
                    {currentPlayer.age} {t('years')}
                  </div>
                )}
                {(currentPlayer.club_name || currentPlayer.team) && (
                  <div style={{
                    padding: '4px 10px',
                    background: 'rgba(147, 51, 234, 0.2)',
                    border: '1px solid rgba(147, 51, 234, 0.4)',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#a78bfa',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    🏆 {currentPlayer.club_name || currentPlayer.team}
                  </div>
                )}
                {currentPlayer.nationality && (
                  <div style={{
                    padding: '4px 10px',
                    background: 'rgba(34, 197, 94, 0.2)',
                    border: '1px solid rgba(34, 197, 94, 0.4)',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#4ade80',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    🌍 {currentPlayer.nationality}
                  </div>
                )}
                {(currentPlayer.playing_style_name || currentPlayer.role) && (
                  <div style={{
                    padding: '4px 10px',
                    background: 'rgba(251, 191, 36, 0.2)',
                    border: '1px solid rgba(251, 191, 36, 0.4)',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#fbbf24',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    ⚽ {currentPlayer.playing_style_name || currentPlayer.role}
                  </div>
                )}
              </div>
              {/* Indicatore Completezza */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                fontSize: '12px',
                padding: '6px 12px',
                background: isProfileComplete 
                  ? 'rgba(34, 197, 94, 0.15)' 
                  : 'rgba(251, 191, 36, 0.15)',
                borderRadius: '6px',
                border: `1px solid ${isProfileComplete ? 'rgba(34, 197, 94, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`
              }}>
                {isProfileComplete ? (
                  <>
                    <CheckCircle2 size={14} color="var(--neon-green)" />
                    <span style={{ color: 'var(--neon-green)', fontWeight: 600 }}>{t('profileComplete')}</span>
                  </>
                ) : (
                  <>
                    <Info size={14} color="#fbbf24" />
                    <span style={{ color: '#fbbf24', fontWeight: 500 }}>
                      {completedSections}/3 {t('sectionsCompleted')}
                    </span>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {currentPlayer ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Messaggio informativo */}
            {!isProfileComplete && (
              <div style={{
                padding: '12px 16px',
                background: 'rgba(251, 191, 36, 0.1)',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px'
              }}>
                <Info size={16} color="#fbbf24" />
                <span style={{ color: '#fbbf24', fontWeight: 500 }}>
                  {t('partialProfile')} ({completedSections}/3). {t('clickToComplete')}
                </span>
              </div>
            )}
            
            {/* Sezione Statistiche */}
            {hasStats ? (
              <div style={{
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '10px',
                overflow: 'hidden'
              }}>
                <div
                  onClick={() => toggleSection('stats')}
                  style={{
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    background: 'rgba(34, 197, 94, 0.15)',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(34, 197, 94, 0.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(34, 197, 94, 0.15)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <BarChart3 size={20} color="var(--neon-green)" />
                    <span style={{ fontWeight: 600, fontSize: '15px' }}>{t('statsSection')}</span>
                    {photoSlots.statistiche && (
                      <CheckCircle2 size={14} color="var(--neon-green)" style={{ marginLeft: '4px' }} />
                    )}
                    {!photoSlots.statistiche && hasStats && (
                      <span style={{ fontSize: '11px', opacity: 0.7, color: 'rgba(255, 255, 255, 0.6)', fontStyle: 'italic' }}>
                        {t('extractedFromCard')}
                      </span>
                    )}
                  </div>
                  {expandedSections.stats ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
                {expandedSections.stats && (
                  <div style={{ padding: '18px' }}>
                    {baseStats.attacking && Object.keys(baseStats.attacking).length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px', opacity: 0.9, color: 'var(--neon-green)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('attacking')}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', fontSize: '13px' }}>
                          {Object.entries(baseStats.attacking).map(([key, value]) => (
                            <div key={key} style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between',
                              padding: '6px 10px',
                              background: 'rgba(34, 197, 94, 0.05)',
                              borderRadius: '6px',
                              border: '1px solid rgba(34, 197, 94, 0.1)'
                            }}>
                              <span style={{ opacity: 0.85, fontWeight: 500 }}>{t(key) || key.replace(/_/g, ' ')}:</span>
                              <span style={{ fontWeight: 700, color: 'var(--neon-green)', fontSize: '14px' }}>{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {baseStats.defending && Object.keys(baseStats.defending).length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px', opacity: 0.9, color: 'var(--neon-green)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('defending')}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', fontSize: '13px' }}>
                          {Object.entries(baseStats.defending).map(([key, value]) => (
                            <div key={key} style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between',
                              padding: '6px 10px',
                              background: 'rgba(34, 197, 94, 0.05)',
                              borderRadius: '6px',
                              border: '1px solid rgba(34, 197, 94, 0.1)'
                            }}>
                              <span style={{ opacity: 0.85, fontWeight: 500 }}>{t(key) || key.replace(/_/g, ' ')}:</span>
                              <span style={{ fontWeight: 700, color: 'var(--neon-green)', fontSize: '14px' }}>{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {baseStats.athleticism && Object.keys(baseStats.athleticism).length > 0 && (
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px', opacity: 0.9, color: 'var(--neon-green)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('athleticism')}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', fontSize: '13px' }}>
                          {Object.entries(baseStats.athleticism).map(([key, value]) => (
                            <div key={key} style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between',
                              padding: '6px 10px',
                              background: 'rgba(34, 197, 94, 0.05)',
                              borderRadius: '6px',
                              border: '1px solid rgba(34, 197, 94, 0.1)'
                            }}>
                              <span style={{ opacity: 0.85, fontWeight: 500 }}>{t(key) || key.replace(/_/g, ' ')}:</span>
                              <span style={{ fontWeight: 700, color: 'var(--neon-green)', fontSize: '14px' }}>{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                background: 'rgba(100, 100, 100, 0.1)',
                border: '1px dashed rgba(255, 255, 255, 0.2)',
                borderRadius: '10px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                opacity: 0.6
              }}>
                <BarChart3 size={20} color="rgba(255, 255, 255, 0.4)" />
                <span style={{ fontWeight: 500, fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)' }}>
                  {t('statsNotAvailable')}
                </span>
              </div>
            )}

            {/* Sezione Abilità */}
            {hasSkills ? (
              <div style={{
                background: 'rgba(251, 191, 36, 0.1)',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                borderRadius: '10px',
                overflow: 'hidden'
              }}>
                <div
                  onClick={() => toggleSection('skills')}
                  style={{
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    background: 'rgba(251, 191, 36, 0.15)',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(251, 191, 36, 0.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(251, 191, 36, 0.15)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Zap size={20} color="var(--neon-orange)" />
                    <span style={{ fontWeight: 600, fontSize: '15px' }}>{t('skillsSection')}</span>
                    {photoSlots.abilita && (
                      <CheckCircle2 size={14} color="var(--neon-orange)" style={{ marginLeft: '4px' }} />
                    )}
                    {!photoSlots.abilita && hasSkills && (
                      <span style={{ fontSize: '11px', opacity: 0.7, color: 'rgba(255, 255, 255, 0.6)', fontStyle: 'italic' }}>
                        (estratti da card)
                      </span>
                    )}
                  </div>
                  {expandedSections.skills ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
                {expandedSections.skills && (
                  <div style={{ padding: '18px' }}>
                    {skills.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px', opacity: 0.9, color: 'var(--neon-orange)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('skillsLabel')} ({skills.length})</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {skills.map((skill, idx) => (
                            <span key={idx} style={{
                              padding: '6px 12px',
                              background: 'rgba(251, 191, 36, 0.2)',
                              border: '1px solid rgba(251, 191, 36, 0.5)',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#fbbf24',
                              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                              boxShadow: '0 2px 4px rgba(251, 191, 36, 0.2)'
                            }}>
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {comSkills.length > 0 && (
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px', opacity: 0.9, color: 'var(--neon-orange)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>COM SKILLS ({comSkills.length})</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {comSkills.map((skill, idx) => (
                            <span key={idx} style={{
                              padding: '6px 12px',
                              background: 'rgba(251, 191, 36, 0.2)',
                              border: '1px solid rgba(251, 191, 36, 0.5)',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#fbbf24',
                              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                              boxShadow: '0 2px 4px rgba(251, 191, 36, 0.2)'
                            }}>
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                background: 'rgba(100, 100, 100, 0.1)',
                border: '1px dashed rgba(255, 255, 255, 0.2)',
                borderRadius: '10px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                opacity: 0.6
              }}>
                <Zap size={20} color="rgba(255, 255, 255, 0.4)" />
                <span style={{ fontWeight: 500, fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)' }}>
                  {t('skillsSection')} {t('notAvailable')}
                </span>
              </div>
            )}

            {/* Sezione Booster */}
            {hasBoosters ? (
              <div style={{
                background: 'rgba(168, 85, 247, 0.1)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                borderRadius: '10px',
                overflow: 'hidden'
              }}>
                <div
                  onClick={() => toggleSection('boosters')}
                  style={{
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    background: 'rgba(168, 85, 247, 0.15)',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(168, 85, 247, 0.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(168, 85, 247, 0.15)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Gift size={20} color="var(--neon-purple)" />
                    <span style={{ fontWeight: 600, fontSize: '15px' }}>{t('boostersSection')}</span>
                    {photoSlots.booster && (
                      <CheckCircle2 size={14} color="var(--neon-purple)" style={{ marginLeft: '4px' }} />
                    )}
                    {!photoSlots.booster && hasBoosters && (
                      <span style={{ fontSize: '11px', opacity: 0.7, color: 'rgba(255, 255, 255, 0.6)', fontStyle: 'italic' }}>
                        (estratti da card)
                      </span>
                    )}
                  </div>
                  {expandedSections.boosters ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
                {expandedSections.boosters && (
                  <div style={{ padding: '18px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px', opacity: 0.9, color: 'var(--neon-purple)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {t('activeBoosters')} ({boosters.length})
                    </div>
                    {boosters.map((booster, idx) => (
                      <div key={idx} style={{
                        marginBottom: idx < boosters.length - 1 ? '14px' : 0,
                        padding: '14px',
                        background: 'rgba(168, 85, 247, 0.15)',
                        borderRadius: '8px',
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                        boxShadow: '0 2px 8px rgba(168, 85, 247, 0.15)'
                      }}>
                        <div style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--neon-purple)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Gift size={16} />
                          {booster.name || `Booster ${idx + 1}`}
                        </div>
                        {booster.effect && (
                          <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '6px', lineHeight: '1.5', color: 'rgba(255, 255, 255, 0.9)' }}>
                            <strong>Effetto:</strong> {booster.effect}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                background: 'rgba(100, 100, 100, 0.1)',
                border: '1px dashed rgba(255, 255, 255, 0.2)',
                borderRadius: '10px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                opacity: 0.6
              }}>
                <Gift size={20} color="rgba(255, 255, 255, 0.4)" />
                <span style={{ fontWeight: 500, fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)' }}>
                  {t('boostersNotAvailable')}
                </span>
              </div>
            )}

            {/* Azioni */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <button
                onClick={() => router.push(`/giocatore/${currentPlayer.id}`)}
                className="btn primary"
                style={{ 
                  width: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  justifyContent: 'center',
                  padding: '12px'
                }}
              >
                <User size={18} />
                {isProfileComplete ? t('goToPlayerProfile') : `${t('completeProfile')} (${completedSections}/3)`}
              </button>
              {slot && onRemove && currentPlayer && (
                <button
                  onClick={() => {
                    onRemove(currentPlayer)
                    onClose()
                  }}
                  className="neon-button"
                  style={{ 
                    width: '100%', 
                    background: 'rgba(251, 191, 36, 0.2)',
                    borderColor: '#fbbf24',
                    color: '#fbbf24',
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    justifyContent: 'center',
                    marginTop: '8px'
                  }}
                >
                  <Move size={16} />
                  {t('moveToReserves')}
                </button>
              )}
              {onDelete && currentPlayer && (
                <button
                  onClick={() => onDelete(currentPlayer)}
                  className="neon-button"
                  style={{ 
                    width: '100%', 
                    background: 'rgba(220, 38, 38, 0.3)',
                    borderColor: '#dc2626',
                    color: '#dc2626',
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    justifyContent: 'center',
                    marginTop: '8px'
                  }}
                >
                  <X size={16} />
                  {t('deletePermanently')}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => onUploadPhoto()}
                className="btn primary"
                style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
              >
                <Upload size={16} />
                {t('uploadPlayerPhoto')}
              </button>
              <button
                onClick={() => { onOpenManualEntry?.() }}
                className="neon-button"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', borderColor: 'var(--neon-blue)', color: 'var(--neon-blue)' }}
              >
                <Pencil size={14} />
                {lang === 'en' ? 'Manual' : 'Manuale'}
              </button>
            </div>

            {riserve.length > 0 && (
              <>
                <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '12px', marginBottom: '8px' }}>
                  {t('orSelectFromReserves')}:
                </div>
                <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {riserve.map((player) => (
                    <button
                      key={player.id}
                      onClick={() => onAssignFromReserve(player.id)}
                      disabled={assigning}
                      className="neon-button"
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        opacity: assigning ? 0.6 : 1
                      }}
                    >
                      <span>{player.player_name}</span>
                      {player.overall_rating && (
                        <span style={{ fontSize: '12px', opacity: 0.8 }}>{player.overall_rating}</span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Mappa chiave → componente icona Lucide (design unificato con pagina giocatore)
const UPLOAD_MODAL_ICONS = { card: BarChart3, stats: Zap, skills: Gift }

// 🎨 Upload Player Modal - Design unificato (stessi colori/icone della pagina giocatore)
// onSwitchToManual: opzionale; se presente e slot è per il campo (slot_index != null), mostra link per passare a inserimento manuale
function UploadPlayerModal({ slot, images, onImagesChange, onUpload, onClose, uploading, onSwitchToManual, onOptimizeError }) {
  const { t, lang } = useTranslation()
  const labelByKey = {
    card: t('photoStats'),
    stats: t('photoSkills'),
    skills: t('photoBooster')
  }
  const descByKey = {
    card: t('photoStatsDesc'),
    stats: t('photoSkillsDesc'),
    skills: t('photoBoosterDesc')
  }
  const imageTypes = PHOTO_TYPE_KEYS.map(key => ({
    ...getPhotoTypeConfig(key),
    label: labelByKey[key],
    description: descByKey[key],
    Icon: UPLOAD_MODAL_ICONS[key]
  }))

  const handleFileSelect = async (e, type) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) {
      return
    }

    try {
      const optimized = await optimizeImageFile(file)
      const dataUrl = optimized.dataUrl
      const existingIndex = images.findIndex(img => img.type === type)
      
      if (existingIndex >= 0) {
        // Sostituisci immagine esistente
        const newImages = [...images]
        newImages[existingIndex] = { file, dataUrl, type, name: file.name }
        onImagesChange(newImages)
      } else {
        // Aggiungi nuova immagine
        onImagesChange([...images, { file, dataUrl, type, name: file.name }])
      }
    } catch (err) {
      console.error('[UploadPlayerModal] image optimization error:', err)
      const msg = getImageOptimizeUserMessage(err, t)
      if (onOptimizeError) onOptimizeError(msg)
    }
    e.target.value = ''
  }

  const removeImage = (type) => {
    onImagesChange(images.filter(img => img.type !== type))
  }

  const getImageForType = (type) => {
    return images.find(img => img.type === type)
  }

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1001,
        padding: '24px'
      }}
      onClick={() => { if (!uploading) onClose() }}
    >
      <div 
        className="neon-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '600px',
          width: '100%',
          maxHeight: 'calc(100vh - 100px)',
          overflowY: 'auto',
          padding: '24px',
          paddingBottom: 'calc(24px + 64px + env(safe-area-inset-bottom, 0px))',
          background: 'rgba(10, 14, 39, 0.95)',
          border: '2px solid var(--neon-blue)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>
            {slot.slot_index !== null ? `${t('uploadPlayer')} - ${t('slot')} ${slot.slot_index}` : t('loadReserve')}
          </h2>
          <button
            onClick={() => { if (!uploading) onClose() }}
            disabled={uploading}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.7)',
              cursor: uploading ? 'not-allowed' : 'pointer',
              padding: '4px',
              opacity: uploading ? 0.5 : 1
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* 🎨 ENTERPRISE: Step indicator */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '8px', 
          marginBottom: '24px' 
        }}>
          {imageTypes.map((type, idx) => {
            const image = getImageForType(type.key)
            const isComplete = !!image
            return (
              <div key={type.key} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: isComplete ? type.color : 'rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: isComplete ? '#000' : 'rgba(255,255,255,0.5)',
                  border: `2px solid ${isComplete ? type.color : 'rgba(255,255,255,0.2)'}`,
                  transition: 'all 0.3s ease'
                }}>
                  {isComplete ? '✓' : idx + 1}
                </div>
                {idx < imageTypes.length - 1 && (
                  <div style={{
                    width: '40px',
                    height: '2px',
                    background: isComplete ? type.color : 'rgba(255,255,255,0.1)'
                  }} />
                )}
              </div>
            )
          })}
        </div>

        <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '24px', textAlign: 'center' }}>
          {t('uploadPlayerInstructions')}
        </div>

        {/* Design unificato: stesse card della pagina giocatore (icone Lucide, colori condivisi) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          {imageTypes.map(({ key, label, description, color, bgColor, borderColor, required, Icon }) => {
            const image = getImageForType(key)
            return (
              <div key={key} style={{ 
                padding: '16px',
                background: image ? bgColor : 'rgba(0, 212, 255, 0.05)',
                border: `1px solid ${image ? borderColor : 'rgba(0, 212, 255, 0.2)'}`,
                borderRadius: '12px',
                transition: 'all 0.3s ease'
              }}
              >
                {image ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {Icon && <Icon size={24} color={color} style={{ flexShrink: 0 }} />}
                        <span style={{ fontSize: '16px', fontWeight: 700, color: color }}>{label}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeImage(key)
                        }}
                        style={{
                          background: 'rgba(239, 68, 68, 0.2)',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          color: '#ef4444',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 600
                        }}
                      >
                        ✕
                      </button>
                    </div>
                    <img
                      src={image.dataUrl}
                      alt={label}
                      style={{
                        width: '100%',
                        maxHeight: '150px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        marginBottom: '8px'
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', opacity: 0.8 }}>{t('uploadedPhotoLabel')}</span>
                      <span style={{ fontSize: '11px', padding: '2px 8px', background: color, color: '#000', borderRadius: '4px', fontWeight: 700 }}>
                        ✓
                      </span>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {Icon && <Icon size={22} color={color} style={{ flexShrink: 0 }} />}
                        <div>
                          <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px', color: color }}>
                            {label}
                          </div>
                          <div style={{ fontSize: '14px', opacity: 0.8 }}>{description}</div>
                        </div>
                      </div>
                      <div style={{ 
                        fontSize: '18px', 
                        fontWeight: 700, 
                        color: required ? '#ef4444' : color,
                        opacity: 0.5
                      }}>
                        {required ? '!' : '+'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <label style={{
                        flex: '1 1 150px',
                        minHeight: '48px',
                        borderRadius: '10px',
                        border: `2px solid ${borderColor}`,
                        background: bgColor,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        cursor: uploading ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: 700,
                        color
                      }}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileSelect(e, key)}
                          style={{ display: 'none' }}
                          disabled={uploading}
                        />
                        <Upload size={16} color={color} />
                        {t('upload')}
                      </label>
                      <label style={{
                        flex: '1 1 150px',
                        minHeight: '48px',
                        borderRadius: '10px',
                        border: `2px solid ${borderColor}`,
                        background: 'transparent',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        cursor: uploading ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: 700,
                        color
                      }}>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => handleFileSelect(e, key)}
                          style={{ display: 'none' }}
                          disabled={uploading}
                        />
                        <Camera size={16} color={color} />
                        {t('cameraCaptureTitle')}
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* 🎨 ENTERPRISE: Actions con progress indicator */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          justifyContent: 'flex-end',
          alignItems: 'center',
          flexWrap: 'wrap',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          paddingTop: '20px'
        }}>
          <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {slot && slot.slot_index != null && typeof onSwitchToManual === 'function' && (
              <button
                type="button"
                onClick={() => { if (!uploading) onSwitchToManual() }}
                disabled={uploading}
                className="neon-button"
                style={{
                  padding: '8px 14px',
                  borderColor: 'var(--neon-blue)',
                  color: 'var(--neon-blue)',
                  background: 'transparent',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px'
                }}
              >
                <Pencil size={14} />
                {t('manualEntryInstead')}
              </button>
            )}
            <span style={{ fontSize: '13px', opacity: 0.7 }}>
              {images.length === 0 ? (
                t('noPhotosSelected')
              ) : (
                <span style={{ color: 'var(--neon-green)' }}>
                  {images.length} {images.length === 1 ? t('photoSelected') : t('photosSelected')}
                </span>
              )}
            </span>
          </div>
          <button 
            onClick={onClose} 
            className="neon-button"
            disabled={uploading}
            style={{ padding: '12px 24px' }}
          >
            {t('cancel')}
          </button>
          {images.length > 0 && (
            <button 
              onClick={onUpload} 
              className="btn primary"
              disabled={uploading}
              style={{ 
                padding: '12px 24px',
                opacity: uploading ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {uploading ? (
                <>
                  <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  {t('extracting')}
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  {t('savePlayer')}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Formation Selector Modal Component
function FormationSelectorModal({ onSelect, onClose, loading }) {
  const { t } = useTranslation()

  // Normalizza slot_positions per coerenza:
  // - TD deve stare a destra (x alto), TS a sinistra (x basso).
  // Questo evita inversioni nelle formazioni template.
  const normalizeSlotPositions = (slotPositions) => {
    const out = { ...(slotPositions || {}) }
    for (const [k, v] of Object.entries(out)) {
      if (!v) continue
      const x = v.x != null ? Number(v.x) : null
      const pos = String(v.position || '').trim().toUpperCase()
      if (x == null || !Number.isFinite(x)) continue
      if (pos === 'TD' && x < 50) out[k] = { ...v, position: 'TS' }
      if (pos === 'TS' && x > 50) out[k] = { ...v, position: 'TD' }
    }
    return out
  }
  
  // Formazioni ufficiali eFootball con posizioni slot
  const formations = {
    // Moduli con 4 Difensori
    '4-3-3': {
      name: '4-3-3',
      category: 'base',
      baseFormation: '4-3-3',
      slot_positions: {
        0: { x: 50, y: 90, position: 'PT' },
        1: { x: 25, y: 75, position: 'TD' },
        2: { x: 40, y: 75, position: 'DC' },
        3: { x: 60, y: 75, position: 'DC' },
        4: { x: 75, y: 75, position: 'TS' },
        5: { x: 35, y: 50, position: 'MED' },
        6: { x: 50, y: 50, position: 'MED' },
        7: { x: 65, y: 50, position: 'MED' },
        // In eFootball nel 4-3-3 gli esterni sono ali (ESA/EDA), non seconde punte.
        8: { x: 25, y: 25, position: 'ESA' },
        9: { x: 50, y: 25, position: 'CF' },
        10: { x: 75, y: 25, position: 'EDA' }
      }
    },
    '4-2-3-1': {
      name: '4-2-3-1',
      slot_positions: {
        0: { x: 50, y: 90, position: 'PT' },
        1: { x: 25, y: 75, position: 'TD' },
        2: { x: 40, y: 75, position: 'DC' },
        3: { x: 60, y: 75, position: 'DC' },
        4: { x: 75, y: 75, position: 'TS' },
        5: { x: 40, y: 60, position: 'MED' },
        6: { x: 60, y: 60, position: 'MED' },
        7: { x: 30, y: 35, position: 'TRQ' },
        8: { x: 50, y: 35, position: 'TRQ' },
        9: { x: 70, y: 35, position: 'TRQ' },
        10: { x: 50, y: 15, position: 'CF' }
      }
    },
    '4-4-2': {
      name: '4-4-2',
      category: 'base',
      baseFormation: '4-4-2',
      slot_positions: {
        0: { x: 50, y: 90, position: 'PT' },
        1: { x: 25, y: 75, position: 'TD' },
        2: { x: 40, y: 75, position: 'DC' },
        3: { x: 60, y: 75, position: 'DC' },
        4: { x: 75, y: 75, position: 'TS' },
        5: { x: 25, y: 50, position: 'MED' },
        6: { x: 50, y: 50, position: 'MED' },
        7: { x: 75, y: 50, position: 'MED' },
        8: { x: 40, y: 25, position: 'CF' },
        9: { x: 60, y: 25, position: 'CF' },
        10: { x: 50, y: 50, position: 'MED' }
      }
    },
    '4-1-2-3': {
      name: '4-1-2-3',
      category: 'base',
      baseFormation: '4-1-2-3',
      slot_positions: {
        0: { x: 50, y: 90, position: 'PT' },
        1: { x: 25, y: 75, position: 'TD' },
        2: { x: 40, y: 75, position: 'DC' },
        3: { x: 60, y: 75, position: 'DC' },
        4: { x: 75, y: 75, position: 'TS' },
        5: { x: 50, y: 60, position: 'MED' },
        6: { x: 35, y: 45, position: 'MED' },
        7: { x: 65, y: 45, position: 'MED' },
        8: { x: 25, y: 25, position: 'ESA' },
        9: { x: 50, y: 25, position: 'CF' },
        10: { x: 75, y: 25, position: 'EDA' }
      }
    },
    '4-5-1': {
      name: '4-5-1',
      category: 'base',
      baseFormation: '4-5-1',
      slot_positions: {
        0: { x: 50, y: 90, position: 'PT' },
        1: { x: 25, y: 75, position: 'TD' },
        2: { x: 40, y: 75, position: 'DC' },
        3: { x: 60, y: 75, position: 'DC' },
        4: { x: 75, y: 75, position: 'TS' },
        5: { x: 25, y: 50, position: 'MED' },
        6: { x: 40, y: 50, position: 'MED' },
        7: { x: 50, y: 50, position: 'MED' },
        8: { x: 60, y: 50, position: 'MED' },
        9: { x: 75, y: 50, position: 'MED' },
        10: { x: 50, y: 25, position: 'CF' }
      }
    },
    '4-4-1-1': {
      name: '4-4-1-1',
      category: 'base',
      baseFormation: '4-4-1-1',
      slot_positions: {
        0: { x: 50, y: 90, position: 'PT' },
        1: { x: 25, y: 75, position: 'TD' },
        2: { x: 40, y: 75, position: 'DC' },
        3: { x: 60, y: 75, position: 'DC' },
        4: { x: 75, y: 75, position: 'TS' },
        5: { x: 25, y: 50, position: 'MED' },
        6: { x: 50, y: 50, position: 'MED' },
        7: { x: 75, y: 50, position: 'MED' },
        8: { x: 50, y: 35, position: 'TRQ' },
        9: { x: 50, y: 25, position: 'CF' },
        10: { x: 50, y: 50, position: 'MED' }
      }
    },
    '4-2-2-2': {
      name: '4-2-2-2',
      slot_positions: {
        0: { x: 50, y: 90, position: 'PT' },
        1: { x: 25, y: 75, position: 'TD' },
        2: { x: 40, y: 75, position: 'DC' },
        3: { x: 60, y: 75, position: 'DC' },
        4: { x: 75, y: 75, position: 'TS' },
        5: { x: 40, y: 60, position: 'MED' },
        6: { x: 60, y: 60, position: 'MED' },
        7: { x: 30, y: 35, position: 'TRQ' },
        8: { x: 70, y: 35, position: 'TRQ' },
        9: { x: 40, y: 25, position: 'CF' },
        10: { x: 60, y: 25, position: 'CF' }
      }
    },
    // Moduli con 3 Difensori
    '3-5-2': {
      name: '3-5-2',
      category: 'base',
      baseFormation: '3-5-2',
      slot_positions: {
        0: { x: 50, y: 90, position: 'PT' },
        1: { x: 35, y: 75, position: 'DC' },
        2: { x: 50, y: 75, position: 'DC' },
        3: { x: 65, y: 75, position: 'DC' },
        4: { x: 20, y: 50, position: 'TD' },
        5: { x: 40, y: 50, position: 'MED' },
        6: { x: 50, y: 50, position: 'MED' },
        7: { x: 60, y: 50, position: 'MED' },
        8: { x: 80, y: 50, position: 'TS' },
        9: { x: 40, y: 25, position: 'CF' },
        10: { x: 60, y: 25, position: 'CF' }
      }
    },
    '3-4-3': {
      name: '3-4-3',
      category: 'base',
      baseFormation: '3-4-3',
      slot_positions: {
        0: { x: 50, y: 90, position: 'PT' },
        1: { x: 35, y: 75, position: 'DC' },
        2: { x: 50, y: 75, position: 'DC' },
        3: { x: 65, y: 75, position: 'DC' },
        4: { x: 25, y: 50, position: 'TD' },
        5: { x: 40, y: 50, position: 'MED' },
        6: { x: 60, y: 50, position: 'MED' },
        7: { x: 75, y: 50, position: 'TS' },
        8: { x: 25, y: 25, position: 'SP' },
        9: { x: 50, y: 25, position: 'CF' },
        10: { x: 75, y: 25, position: 'SP' }
      }
    },
    '3-1-4-2': {
      name: '3-1-4-2',
      category: 'base',
      baseFormation: '3-1-4-2',
      slot_positions: {
        0: { x: 50, y: 90, position: 'PT' },
        1: { x: 35, y: 75, position: 'DC' },
        2: { x: 50, y: 75, position: 'DC' },
        3: { x: 65, y: 75, position: 'DC' },
        4: { x: 50, y: 60, position: 'MED' },
        5: { x: 25, y: 50, position: 'TD' },
        6: { x: 40, y: 50, position: 'MED' },
        7: { x: 60, y: 50, position: 'MED' },
        8: { x: 75, y: 50, position: 'TS' },
        9: { x: 40, y: 25, position: 'CF' },
        10: { x: 60, y: 25, position: 'CF' }
      }
    },
    '3-4-1-2': {
      name: '3-4-1-2',
      category: 'base',
      baseFormation: '3-4-1-2',
      slot_positions: {
        0: { x: 50, y: 90, position: 'PT' },
        1: { x: 35, y: 75, position: 'DC' },
        2: { x: 50, y: 75, position: 'DC' },
        3: { x: 65, y: 75, position: 'DC' },
        4: { x: 25, y: 50, position: 'TD' },
        5: { x: 40, y: 50, position: 'MED' },
        6: { x: 60, y: 50, position: 'MED' },
        7: { x: 75, y: 50, position: 'TS' },
        8: { x: 50, y: 35, position: 'TRQ' },
        9: { x: 40, y: 25, position: 'CF' },
        10: { x: 60, y: 25, position: 'CF' }
      }
    },
    // Moduli con 5 Difensori
    '5-3-2': {
      name: '5-3-2',
      category: 'base',
      baseFormation: '5-3-2',
      slot_positions: {
        0: { x: 50, y: 90, position: 'PT' },
        1: { x: 20, y: 75, position: 'TD' },
        2: { x: 35, y: 75, position: 'DC' },
        3: { x: 50, y: 75, position: 'DC' },
        4: { x: 65, y: 75, position: 'DC' },
        5: { x: 80, y: 75, position: 'TS' },
        6: { x: 40, y: 50, position: 'MED' },
        7: { x: 50, y: 50, position: 'MED' },
        8: { x: 60, y: 50, position: 'MED' },
        9: { x: 40, y: 25, position: 'CF' },
        10: { x: 60, y: 25, position: 'CF' }
      }
    },
    '5-4-1': {
      name: '5-4-1',
      slot_positions: {
        0: { x: 50, y: 90, position: 'PT' },
        1: { x: 20, y: 75, position: 'TD' },
        2: { x: 35, y: 75, position: 'DC' },
        3: { x: 50, y: 75, position: 'DC' },
        4: { x: 65, y: 75, position: 'DC' },
        5: { x: 80, y: 75, position: 'TS' },
        6: { x: 35, y: 50, position: 'MED' },
        7: { x: 50, y: 50, position: 'MED' },
        8: { x: 65, y: 50, position: 'MED' },
        9: { x: 50, y: 25, position: 'CF' },
        10: { x: 50, y: 50, position: 'MED' }
      }
    },
    '5-2-3': {
      name: '5-2-3',
      category: 'base',
      baseFormation: '5-2-3',
      slot_positions: {
        0: { x: 50, y: 90, position: 'PT' },
        1: { x: 20, y: 75, position: 'TD' },
        2: { x: 35, y: 75, position: 'DC' },
        3: { x: 50, y: 75, position: 'DC' },
        4: { x: 65, y: 75, position: 'DC' },
        5: { x: 80, y: 75, position: 'TS' },
        6: { x: 40, y: 50, position: 'MED' },
        7: { x: 60, y: 50, position: 'MED' },
        8: { x: 25, y: 25, position: 'SP' },
        9: { x: 50, y: 25, position: 'CF' },
        10: { x: 75, y: 25, position: 'SP' }
      }
    },
    // Formazioni mancanti ufficiali eFootball
    '4-2-1-3': {
      name: '4-2-1-3',
      category: 'base',
      baseFormation: '4-2-1-3',
      slot_positions: {
        0: { x: 50, y: 90, position: 'PT' },
        1: { x: 25, y: 75, position: 'TS' },
        2: { x: 40, y: 75, position: 'DC' },
        3: { x: 60, y: 75, position: 'DC' },
        4: { x: 75, y: 75, position: 'TD' },
        5: { x: 50, y: 60, position: 'MED' },
        6: { x: 40, y: 50, position: 'TRQ' },
        7: { x: 60, y: 50, position: 'CC' },
        8: { x: 25, y: 25, position: 'P' },
        9: { x: 50, y: 25, position: 'SP' },
        10: { x: 75, y: 25, position: 'SP' }
      }
    },
    '4-3-2-1': {
      name: '4-3-2-1',
      category: 'base',
      baseFormation: '4-3-2-1',
      slot_positions: {
        0: { x: 50, y: 90, position: 'PT' },
        1: { x: 25, y: 75, position: 'TD' },
        2: { x: 40, y: 75, position: 'DC' },
        3: { x: 60, y: 75, position: 'DC' },
        4: { x: 75, y: 75, position: 'TS' },
        5: { x: 35, y: 50, position: 'MED' },
        6: { x: 50, y: 50, position: 'MED' },
        7: { x: 65, y: 50, position: 'MED' },
        8: { x: 35, y: 30, position: 'TRQ' },
        9: { x: 65, y: 30, position: 'TRQ' },
        10: { x: 50, y: 15, position: 'CF' }
      }
    },
    '4-3-1-2': {
      name: '4-3-1-2',
      category: 'base',
      baseFormation: '4-3-1-2',
      slot_positions: {
        0: { x: 50, y: 90, position: 'PT' },
        1: { x: 25, y: 75, position: 'TD' },
        2: { x: 40, y: 75, position: 'DC' },
        3: { x: 60, y: 75, position: 'DC' },
        4: { x: 75, y: 75, position: 'TS' },
        5: { x: 35, y: 55, position: 'MED' },
        6: { x: 50, y: 55, position: 'MED' },
        7: { x: 65, y: 55, position: 'MED' },
        8: { x: 50, y: 35, position: 'TRQ' },
        9: { x: 40, y: 20, position: 'CF' },
        10: { x: 60, y: 20, position: 'CF' }
      }
    },
    '4-1-4-1': {
      name: '4-1-4-1',
      category: 'base',
      baseFormation: '4-1-4-1',
      slot_positions: {
        0: { x: 50, y: 90, position: 'PT' },
        1: { x: 25, y: 75, position: 'TD' },
        2: { x: 40, y: 75, position: 'DC' },
        3: { x: 60, y: 75, position: 'DC' },
        4: { x: 75, y: 75, position: 'TS' },
        5: { x: 50, y: 60, position: 'MED' },
        6: { x: 25, y: 45, position: 'MED' },
        7: { x: 40, y: 45, position: 'MED' },
        8: { x: 60, y: 45, position: 'MED' },
        9: { x: 75, y: 45, position: 'MED' },
        10: { x: 50, y: 20, position: 'CF' }
      }
    },
    '3-2-4-1': {
      name: '3-2-4-1',
      category: 'base',
      baseFormation: '3-2-4-1',
      slot_positions: {
        0: { x: 50, y: 90, position: 'PT' },
        1: { x: 35, y: 75, position: 'DC' },
        2: { x: 50, y: 75, position: 'DC' },
        3: { x: 65, y: 75, position: 'DC' },
        4: { x: 40, y: 60, position: 'MED' },
        5: { x: 60, y: 60, position: 'MED' },
        6: { x: 25, y: 40, position: 'MED' },
        7: { x: 40, y: 40, position: 'MED' },
        8: { x: 60, y: 40, position: 'MED' },
        9: { x: 75, y: 40, position: 'MED' },
        10: { x: 50, y: 15, position: 'CF' }
      }
    },
    '3-2-3-2': {
      name: '3-2-3-2',
      category: 'base',
      baseFormation: '3-2-3-2',
      slot_positions: {
        0: { x: 50, y: 90, position: 'PT' },
        1: { x: 35, y: 75, position: 'DC' },
        2: { x: 50, y: 75, position: 'DC' },
        3: { x: 65, y: 75, position: 'DC' },
        4: { x: 40, y: 60, position: 'MED' },
        5: { x: 60, y: 60, position: 'MED' },
        6: { x: 30, y: 40, position: 'TRQ' },
        7: { x: 50, y: 40, position: 'TRQ' },
        8: { x: 70, y: 40, position: 'TRQ' },
        9: { x: 40, y: 20, position: 'CF' },
        10: { x: 60, y: 20, position: 'CF' }
      }
    },
    '5-2-2-1': {
      name: '5-2-2-1',
      category: 'base',
      baseFormation: '5-2-2-1',
      slot_positions: {
        0: { x: 50, y: 90, position: 'PT' },
        1: { x: 20, y: 75, position: 'TD' },
        2: { x: 35, y: 75, position: 'DC' },
        3: { x: 50, y: 75, position: 'DC' },
        4: { x: 65, y: 75, position: 'DC' },
        5: { x: 80, y: 75, position: 'TS' },
        6: { x: 40, y: 55, position: 'MED' },
        7: { x: 60, y: 55, position: 'MED' },
        8: { x: 35, y: 35, position: 'TRQ' },
        9: { x: 65, y: 35, position: 'TRQ' },
        10: { x: 50, y: 15, position: 'CF' }
      }
    },
    '5-2-1-2': {
      name: '5-2-1-2',
      category: 'base',
      baseFormation: '5-2-1-2',
      slot_positions: {
        0: { x: 50, y: 90, position: 'PT' },
        1: { x: 20, y: 75, position: 'TD' },
        2: { x: 35, y: 75, position: 'DC' },
        3: { x: 50, y: 75, position: 'DC' },
        4: { x: 65, y: 75, position: 'DC' },
        5: { x: 80, y: 75, position: 'TS' },
        6: { x: 40, y: 55, position: 'MED' },
        7: { x: 60, y: 55, position: 'MED' },
        8: { x: 50, y: 35, position: 'TRQ' },
        9: { x: 40, y: 20, position: 'CF' },
        10: { x: 60, y: 20, position: 'CF' }
      }
    },
    // Variazioni 4-3-3
    '4-3-3-wide': {
      name: '4-3-3 (Largo)',
      category: 'variation',
      baseFormation: '4-3-3',
      variation: 'wide',
      slot_positions: {
        0: { x: 50, y: 90, position: 'PT' },
        1: { x: 20, y: 75, position: 'TD' },
        2: { x: 40, y: 75, position: 'DC' },
        3: { x: 60, y: 75, position: 'DC' },
        4: { x: 80, y: 75, position: 'TS' },
        5: { x: 30, y: 50, position: 'MED' },
        6: { x: 50, y: 50, position: 'MED' },
        7: { x: 70, y: 50, position: 'MED' },
        8: { x: 20, y: 25, position: 'SP' },
        9: { x: 50, y: 25, position: 'CF' },
        10: { x: 80, y: 25, position: 'SP' }
      }
    },
    '4-3-3-compact': {
      name: '4-3-3 (Compatto)',
      category: 'variation',
      baseFormation: '4-3-3',
      variation: 'compact',
      slot_positions: {
        0: { x: 50, y: 90, position: 'PT' },
        1: { x: 25, y: 75, position: 'TD' },
        2: { x: 40, y: 75, position: 'DC' },
        3: { x: 60, y: 75, position: 'DC' },
        4: { x: 75, y: 75, position: 'TS' },
        5: { x: 42, y: 50, position: 'MED' },
        6: { x: 50, y: 50, position: 'MED' },
        7: { x: 58, y: 50, position: 'MED' },
        8: { x: 25, y: 25, position: 'SP' },
        9: { x: 50, y: 25, position: 'CF' },
        10: { x: 75, y: 25, position: 'SP' }
      }
    },
    '4-3-3-offensive': {
      name: '4-3-3 (Offensivo)',
      category: 'variation',
      baseFormation: '4-3-3',
      variation: 'offensive',
      slot_positions: {
        0: { x: 50, y: 90, position: 'PT' },
        1: { x: 25, y: 78, position: 'TD' },
        2: { x: 40, y: 78, position: 'DC' },
        3: { x: 60, y: 78, position: 'DC' },
        4: { x: 75, y: 78, position: 'TS' },
        5: { x: 35, y: 50, position: 'MED' },
        6: { x: 50, y: 50, position: 'MED' },
        7: { x: 65, y: 50, position: 'MED' },
        8: { x: 25, y: 20, position: 'SP' },
        9: { x: 50, y: 20, position: 'CF' },
        10: { x: 75, y: 20, position: 'SP' }
      }
    },
    '4-3-3-defensive': {
      name: '4-3-3 (Difensivo)',
      category: 'variation',
      baseFormation: '4-3-3',
      variation: 'defensive',
      slot_positions: {
        0: { x: 50, y: 90, position: 'PT' },
        1: { x: 25, y: 70, position: 'TD' },
        2: { x: 40, y: 70, position: 'DC' },
        3: { x: 60, y: 70, position: 'DC' },
        4: { x: 75, y: 70, position: 'TS' },
        5: { x: 35, y: 55, position: 'MED' },
        6: { x: 50, y: 55, position: 'MED' },
        7: { x: 65, y: 55, position: 'MED' },
        8: { x: 25, y: 30, position: 'SP' },
        9: { x: 50, y: 30, position: 'CF' },
        10: { x: 75, y: 30, position: 'SP' }
      }
    },
    // Variazioni 4-2-1-3
    '4-2-1-3-compact': {
      name: '4-2-1-3 (Compatto)',
      category: 'variation',
      baseFormation: '4-2-1-3',
      variation: 'compact',
      slot_positions: {
        0: { x: 50, y: 90, position: 'PT' },
        1: { x: 25, y: 75, position: 'TS' },
        2: { x: 40, y: 75, position: 'DC' },
        3: { x: 60, y: 75, position: 'DC' },
        4: { x: 75, y: 75, position: 'TD' },
        5: { x: 50, y: 60, position: 'MED' },
        6: { x: 42, y: 50, position: 'TRQ' },
        7: { x: 58, y: 50, position: 'CC' },
        8: { x: 25, y: 25, position: 'P' },
        9: { x: 50, y: 25, position: 'SP' },
        10: { x: 75, y: 25, position: 'SP' }
      }
    },
    '4-2-1-3-wide': {
      name: '4-2-1-3 (Largo)',
      category: 'variation',
      baseFormation: '4-2-1-3',
      variation: 'wide',
      slot_positions: {
        0: { x: 50, y: 90, position: 'PT' },
        1: { x: 20, y: 75, position: 'TS' },
        2: { x: 40, y: 75, position: 'DC' },
        3: { x: 60, y: 75, position: 'DC' },
        4: { x: 80, y: 75, position: 'TD' },
        5: { x: 50, y: 60, position: 'MED' },
        6: { x: 40, y: 50, position: 'TRQ' },
        7: { x: 60, y: 50, position: 'CC' },
        8: { x: 20, y: 25, position: 'P' },
        9: { x: 50, y: 25, position: 'SP' },
        10: { x: 80, y: 25, position: 'SP' }
      }
    }
  }

  const handleSelect = (formationKey) => {
    const f = formations[formationKey]
    if (!f) return
    const normalized = normalizeSlotPositions(f.slot_positions)
    onSelect(f.name || formationKey, normalized)
  }

  // Helper: raggruppa formazioni per base
  const groupFormationsByBase = React.useMemo(() => {
    const grouped = {}
    Object.entries(formations).forEach(([key, formation]) => {
      const base = formation.baseFormation || formation.name
      if (!grouped[base]) {
        grouped[base] = {
          base: formation.category === 'base' ? formation : null,
          variations: []
        }
      }
      if (formation.category === 'base') {
        grouped[base].base = formation
      } else {
        // Includi chiave per trovare formazione corretta
        grouped[base].variations.push({ ...formation, _key: key })
      }
    })
    return grouped
  }, [])

  // Helper: filtra formazioni per categoria
  const filterFormations = (category) => {
    if (category === 'all') return formations
    return Object.fromEntries(
      Object.entries(formations).filter(([_, f]) => f.category === category)
    )
  }

  const [selectedFormation, setSelectedFormation] = React.useState(null)
  const [activeTab, setActiveTab] = React.useState('base')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [expandedBase, setExpandedBase] = React.useState(null)

  const handleConfirm = () => {
    if (selectedFormation && formations[selectedFormation]) {
      handleSelect(selectedFormation)
    }
  }

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1001,
        padding: '24px'
      }}
      onClick={onClose}
    >
      <div 
        className="neon-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '600px',
          width: '100%',
          maxHeight: 'calc(100vh - 100px)',
          overflowY: 'auto',
          padding: '24px',
          paddingBottom: 'calc(24px + 64px + env(safe-area-inset-bottom, 0px))',
          background: 'rgba(10, 14, 39, 0.95)',
          border: '2px solid var(--neon-blue)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>
            {t('selectFormationTactical')}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.7)',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '20px' }}>
          {t('formationDescription')}
        </div>

        {/* Tab */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid rgba(0, 212, 255, 0.2)' }}>
          <button
            onClick={() => setActiveTab('base')}
            style={{
              padding: '10px 20px',
              background: activeTab === 'base' ? 'rgba(0, 212, 255, 0.2)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'base' ? '2px solid var(--neon-blue)' : '2px solid transparent',
              color: activeTab === 'base' ? 'var(--neon-blue)' : 'rgba(255, 255, 255, 0.7)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
          >
            {t('baseFormations')} ({Object.values(formations).filter(f => f.category === 'base').length})
          </button>
          <button
            onClick={() => setActiveTab('variation')}
            style={{
              padding: '10px 20px',
              background: activeTab === 'variation' ? 'rgba(0, 212, 255, 0.2)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'variation' ? '2px solid var(--neon-blue)' : '2px solid transparent',
              color: activeTab === 'variation' ? 'var(--neon-blue)' : 'rgba(255, 255, 255, 0.7)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
          >
            {t('variations')} ({Object.values(formations).filter(f => f.category === 'variation').length})
          </button>
        </div>

        {/* Ricerca */}
        <input
          type="text"
          placeholder={t('searchFormation')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 16px',
            marginBottom: '20px',
            className: 'neon-panel',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            borderRadius: '8px',
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '14px'
          }}
        />

        {/* Lista formazioni */}
        <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '24px' }}>
          {activeTab === 'base' ? (
            // TAB BASE: Griglia semplice
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: '12px'
            }}>
              {Object.entries(filterFormations('base'))
                .filter(([key, formation]) => {
                  if (!searchQuery) return true
                  return formation.name.toLowerCase().includes(searchQuery.toLowerCase())
                })
                .map(([key, formation]) => {
                  const isSelected = selectedFormation === key
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedFormation(key)}
                      style={{
                        padding: '16px',
                        background: isSelected ? 'rgba(0, 212, 255, 0.2)' : 'rgba(0, 212, 255, 0.05)',
                        border: `2px solid ${isSelected ? 'var(--neon-blue)' : 'rgba(0, 212, 255, 0.3)'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '18px',
                        fontWeight: 700,
                        color: isSelected ? 'var(--neon-blue)' : 'rgba(255, 255, 255, 0.9)',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.target.style.background = 'rgba(0, 212, 255, 0.1)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.target.style.background = 'rgba(0, 212, 255, 0.05)'
                        }
                      }}
                    >
                      {formation.name}
                    </button>
                  )
                })}
            </div>
          ) : (
            // TAB VARIAZIONI: Raggruppate per base
            <div>
              {Object.entries(groupFormationsByBase)
                .filter(([base, group]) => {
                  if (!searchQuery) return group.variations.length > 0
                  const query = searchQuery.toLowerCase()
                  return base.toLowerCase().includes(query) || 
                         group.variations.some(v => v.name.toLowerCase().includes(query))
                })
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([base, group]) => {
                  if (group.variations.length === 0) return null
                  const isExpanded = expandedBase === base
                  const matchingVariations = searchQuery 
                    ? group.variations.filter(v => v.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    : group.variations
                  
                  return (
                    <div key={base} style={{ marginBottom: '16px' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '8px',
                          cursor: 'pointer',
                          padding: '8px',
                          className: 'neon-panel',
                          borderRadius: '4px'
                        }}
                        onClick={() => setExpandedBase(isExpanded ? null : base)}
                      >
                        <span style={{ fontSize: '12px' }}>{isExpanded ? '▼' : '▶'}</span>
                        <strong style={{ fontSize: '16px' }}>{base}</strong>
                        <span style={{ opacity: 0.6, fontSize: '12px' }}>
                          ({matchingVariations.length} {t('variationsCount')})
                        </span>
                      </div>
                      
                      {isExpanded && (
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
                          gap: '8px', 
                          marginLeft: '24px' 
                        }}>
                          {matchingVariations.map(variation => {
                            // Usa chiave salvata nel raggruppamento
                            const key = variation._key || Object.keys(formations).find(k => 
                              formations[k].name === variation.name && 
                              formations[k].baseFormation === variation.baseFormation
                            )
                            const isSelected = selectedFormation === key
                            return (
                              <button
                                key={key}
                                onClick={() => setSelectedFormation(key)}
                                style={{
                                  padding: '12px',
                                  background: isSelected ? 'rgba(0, 212, 255, 0.2)' : 'rgba(0, 212, 255, 0.05)',
                                  border: `2px solid ${isSelected ? 'var(--neon-blue)' : 'rgba(0, 212, 255, 0.3)'}`,
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  fontWeight: 600,
                                  color: isSelected ? 'var(--neon-blue)' : 'rgba(255, 255, 255, 0.9)',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelected) {
                                    e.target.style.background = 'rgba(0, 212, 255, 0.1)'
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected) {
                                    e.target.style.background = 'rgba(0, 212, 255, 0.05)'
                                  }
                                }}
                              >
                                {variation.name}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button 
            onClick={onClose} 
            className="neon-button"
            disabled={loading}
            style={{ padding: '10px 20px' }}
          >
            {t('cancel')}
          </button>
          {selectedFormation && (
            <button 
              onClick={handleConfirm} 
              className="btn primary"
              disabled={loading}
              style={{ 
                padding: '10px 20px',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? t('saving') : t('confirmFormation')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
