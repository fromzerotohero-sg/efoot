'use client'

import React from 'react'
import { DEFAULT_SLOT_POSITIONS, completeSlotPositions } from '@/lib/formationDefaultSlots'

const POSITION_ALIASES = {
  GK: 'PT', PT: 'PT', CB: 'DC', DC: 'DC', RB: 'TD', TD: 'TD', LB: 'TS', TS: 'TS',
  DMF: 'MED', MED: 'MED', CMF: 'CC', CC: 'CC', AMF: 'TRQ', TRQ: 'TRQ',
  RMF: 'CLD', CLD: 'CLD', LMF: 'CLS', CLS: 'CLS', RWF: 'EDA', EDA: 'EDA',
  LWF: 'ESA', ESA: 'ESA', SS: 'SP', SP: 'SP', CF: 'P', P: 'P'
}

async function resolveAuthToken() {
  if (typeof window === 'undefined') return null
  let token = localStorage.getItem('auth_token')
  if (token) return token
  try {
    const { supabase } = await import('@/lib/supabaseClient')
    if (!supabase) return null
    const { data } = await supabase.auth.getSession()
    return data?.session?.access_token || null
  } catch { return null }
}

function asText(value, lang = 'it') {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim()
  if (typeof value === 'object') return String(value[lang] || value.it || value.en || value.es || '').trim()
  return String(value).trim()
}

function shortInstruction(raw, lang) {
  const text = asText(raw, lang)
  if (!text) return ''
  const key = text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
  const map = {
    ancoraggio: 'Anc', anchoring: 'Anc', offensivo: 'Off', offensive: 'Off',
    difensivo: 'Dif', defensive: 'Dif', marcatura_stretta: 'MS',
    'marcatura stretta': 'MS', marcatura_uomo: 'MU', 'marcatura a uomo': 'MU',
    contropiede: 'CP', linea_bassa: 'LB', 'linea bassa': 'LB'
  }
  const compact = key.replace(/\s+/g, '_')
  return map[key] || map[compact] || text.slice(0, 8)
}

function normalizePos(value) {
  const raw = String(value || '').trim().toUpperCase().replace(/\s+/g, '')
  if (!raw) return ''
  return POSITION_ALIASES[raw] || raw
}

function nameKey(value) {
  return String(value || '')
    .toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ').trim()
}

function claimSlot(slots, preferredPos, used) {
  const pos = normalizePos(preferredPos)
  if (pos) {
    const exact = slots.find((s) => !used.has(s.index) && normalizePos(s.position) === pos)
    if (exact) { used.add(exact.index); return exact }
  }
  const fallback = slots.find((s) => !used.has(s.index) && s.index !== 0)
  if (fallback) { used.add(fallback.index); return fallback }
  return null
}

function findSlotByPlayer(slots, playerId, playerName) {
  if (playerId) {
    const byId = slots.find((s) => s.playerId && s.playerId === playerId)
    if (byId) return byId
  }
  const key = nameKey(playerName)
  if (!key) return null
  return slots.find((s) => {
    const candidates = [s.name, s.inName, s.outName].filter(Boolean).map(nameKey)
    return candidates.some((c) => c === key || c.includes(key) || key.includes(c))
  }) || null
}

function displayName(name) {
  const raw = String(name || '').trim()
  if (!raw) return ''
  const parts = raw.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0]
  return parts.slice(1).join(' ') || parts[0]
}

function buildZone(text, lang) {
  const blob = nameKey(text)
  if (!blob) return null
  const labels = {
    center: { it: 'Chiudi il centro', en: 'Hold the center', es: 'Cierra el centro' },
    wings: { it: 'Apri le fasce', en: 'Use the wings', es: 'Abre las bandas' },
    depth: { it: 'Attacca la profondità', en: 'Attack depth', es: 'Ataca la profundidad' }
  }
  if (/(profondit|vertical|dietro i terzin|attacca lo spazio|depth)/.test(blob))
    return { id: 'depth', className: 'hc-pitchZoneDepth', label: asText(labels.depth, lang) }
  if (/(fasce|corsie|ampiezza|estern|lato|wing)/.test(blob))
    return { id: 'wings', className: 'hc-pitchZoneWings', label: asText(labels.wings, lang) }
  if (/(trq|tra le linee|centrale|centro|ancoragg|scherm)/.test(blob))
    return { id: 'center', className: 'hc-pitchZoneCenter', label: asText(labels.center, lang) }
  return null
}

function buildSwapArrows(slots, playerSuggestions) {
  const arrows = []
  const seen = new Set()
  const suggestions = Array.isArray(playerSuggestions) ? playerSuggestions : []
  for (const sug of suggestions) {
    if (sug?.action && sug.action !== 'add_to_starting_xi') continue
    const outSlot = findSlotByPlayer(slots, sug.replace_player_id || sug.out_player_id, sug.replace_player_name || sug.out_player_name)
    const inSlot = findSlotByPlayer(slots, sug.player_id || sug.in_player_id, sug.player_name || sug.in_player_name)
    if (!outSlot || !inSlot || outSlot.index === inSlot.index) continue
    const key = `${outSlot.index}->${inSlot.index}`
    if (seen.has(key)) continue
    seen.add(key)
    arrows.push({ id: key, x1: outSlot.x, y1: outSlot.y, x2: inSlot.x, y2: inSlot.y })
  }
  return arrows
}

export default function PrematchPitch({
  starters: startersProp = null,
  slotPositions: slotPositionsProp = null,
  playerSuggestions = [],
  individualInstructions = [],
  focusText = '',
  lang = 'it'
}) {
  const hasPropStarters = Array.isArray(startersProp) && startersProp.length > 0
  const [fetchedStarters, setFetchedStarters] = React.useState([])
  const [fetchedSlots, setFetchedSlots] = React.useState(null)
  const [loadState, setLoadState] = React.useState(hasPropStarters ? 'ready' : 'loading')

  React.useEffect(() => {
    if (hasPropStarters) { setLoadState('ready'); return undefined }
    let cancelled = false
    async function loadRoster() {
      setLoadState('loading')
      try {
        const token = await resolveAuthToken()
        if (!token) { if (!cancelled) setLoadState('empty'); return }
        const res = await fetch(`/api/dashboard?t=${Date.now()}`, {
          headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache' },
          cache: 'no-store'
        })
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) { setLoadState('empty'); return }
        const players = Array.isArray(data.players) ? data.players : []
        const titolari = players
          .filter((p) => p?.id && p?.player_name && p.slot_index != null && p.slot_index !== '')
          .filter((p) => { const n = Number(p.slot_index); return Number.isFinite(n) && n >= 0 && n <= 10 })
          .map((p) => ({ id: p.id, player_name: p.player_name, position: p.position, slot_index: Number(p.slot_index) }))
        setFetchedStarters(titolari)
        if (data.layout?.slot_positions) setFetchedSlots(data.layout.slot_positions)
        setLoadState(titolari.length ? 'ready' : 'empty')
      } catch { if (!cancelled) setLoadState('empty') }
    }
    void loadRoster()
    return () => { cancelled = true }
  }, [hasPropStarters])

  const starters = hasPropStarters ? startersProp : fetchedStarters
  const slotPositions = slotPositionsProp || fetchedSlots || DEFAULT_SLOT_POSITIONS

  const overlay = React.useMemo(() => {
    const positions = completeSlotPositions(slotPositions || DEFAULT_SLOT_POSITIONS)
    const base = Object.keys(DEFAULT_SLOT_POSITIONS).map((key) => {
      const index = Number(key)
      const slot = positions[index] || positions[String(index)] || DEFAULT_SLOT_POSITIONS[index]
      const starter = (starters || []).find((p) => Number(p.slot_index) === index)
      return {
        index,
        x: Number(slot?.x) || DEFAULT_SLOT_POSITIONS[index].x,
        y: Number(slot?.y) || DEFAULT_SLOT_POSITIONS[index].y,
        position: slot?.position || DEFAULT_SLOT_POSITIONS[index].position,
        playerId: starter?.id || null,
        name: starter?.player_name || null,
        outName: null, inName: null, instruction: null, focus: false,
        roleLabel: slot?.position || DEFAULT_SLOT_POSITIONS[index].position
      }
    })

    const usedForSwap = new Set()
    const suggestions = Array.isArray(playerSuggestions) ? playerSuggestions : []
    for (const sug of suggestions) {
      if (sug?.action && sug.action !== 'add_to_starting_xi') continue
      const inName = sug.player_name || sug.in_player_name || null
      const outName = sug.replace_player_name || sug.out_player_name || null
      const inId = sug.player_id || sug.in_player_id || null
      const outId = sug.replace_player_id || sug.out_player_id || null
      if (!inName && !outName && !inId && !outId) continue
      let slot = findSlotByPlayer(base, outId, outName) || findSlotByPlayer(base, inId, inName)
      if (slot && usedForSwap.has(slot.index)) slot = null
      if (!slot) {
        const pos = sug.position || sug.slot_role || sug.replace_position
        slot = claimSlot(base, pos, usedForSwap)
      } else { usedForSwap.add(slot.index) }
      if (!slot) continue
      slot.outName = outName || slot.name
      slot.inName = inName
      if (inName) slot.name = inName
      if (sug.position || sug.replace_position || sug.slot_role) {
        slot.roleLabel = normalizePos(sug.position || sug.replace_position || sug.slot_role) || slot.position
      }
      slot.focus = true
    }

    const usedForInstr = new Set()
    const instructions = Array.isArray(individualInstructions) ? individualInstructions : []
    for (const row of instructions) {
      const badge = shortInstruction(row?.instruction, lang)
      if (!badge) continue
      let slot = findSlotByPlayer(base, row?.player_id, row?.player_name) ||
        claimSlot(base, row?.position || row?.slot_role, usedForInstr)
      if (slot && !usedForInstr.has(slot.index)) usedForInstr.add(slot.index)
      if (!slot) continue
      slot.instruction = badge
      slot.focus = true
      if (!slot.name && row?.player_name) slot.name = row.player_name
    }

    const focusBlob = nameKey(focusText)
    if (focusBlob) {
      for (const slot of base) {
        const n = nameKey(slot.name || slot.inName)
        if (!n || n.length < 4) continue
        const last = n.split(' ').pop()
        if ((last && focusBlob.includes(last)) || focusBlob.includes(n)) slot.focus = true
      }
    }
    return base
  }, [starters, slotPositions, playerSuggestions, individualInstructions, focusText, lang])

  const zone = React.useMemo(() => buildZone(focusText, lang), [focusText, lang])
  const swapArrows = React.useMemo(() => buildSwapArrows(overlay, playerSuggestions), [overlay, playerSuggestions])

  const hasPlayers = overlay.some((s) => s.name || s.inName || s.outName)
  const hasSwaps = swapArrows.length > 0
  const hasInstructions = overlay.some((s) => s.instruction)
  const hasFocus = overlay.some((s) => s.focus && !s.inName && !s.instruction)

  return (
    <div className="hc-pitch" aria-label="Campo piano contromisure">
      <div className="hc-pitchField">
        <div className="hc-pitchTexture" aria-hidden="true" />
        <div className="hc-pitchVignette" aria-hidden="true" />
        <div className="hc-pitchMid" aria-hidden="true" />
        <div className="hc-pitchCircle" aria-hidden="true" />
        <div className="hc-pitchDot" aria-hidden="true" />
        <div className="hc-pitchBoxTop" aria-hidden="true" />
        <div className="hc-pitchBoxBottom" aria-hidden="true" />
        <div className="hc-pitchSideL" aria-hidden="true" />
        <div className="hc-pitchSideR" aria-hidden="true" />
        {zone && <div className={`hc-pitchZone ${zone.className}`} aria-hidden="true" />}
        {hasSwaps && (
          <svg className="hc-pitchArrows" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <marker id="hcArrowSwap" markerWidth="4" markerHeight="4" refX="3.5" refY="2" orient="auto">
                <path d="M0,0 L4,2 L0,4 Z" fill="rgba(255, 203, 5, 0.95)" />
              </marker>
            </defs>
            {swapArrows.map((arrow) => {
              const dx = arrow.x2 - arrow.x1, dy = arrow.y2 - arrow.y1
              const len = Math.sqrt(dx * dx + dy * dy) || 1
              const shrink = 7
              const x1 = arrow.x1 + (dx / len) * shrink, y1 = arrow.y1 + (dy / len) * shrink
              const x2 = arrow.x2 - (dx / len) * shrink, y2 = arrow.y2 - (dy / len) * shrink
              return <path key={arrow.id} d={`M ${x1} ${y1} L ${x2} ${y2}`} fill="none" stroke="rgba(255, 203, 5, 0.85)" strokeWidth="1.2" strokeLinecap="round" markerEnd="url(#hcArrowSwap)" />
            })}
          </svg>
        )}
        {overlay.map((slot) => {
          const showSwap = !!(slot.outName || slot.inName)
          const name = slot.inName || slot.name
          return (
            <div key={slot.index} className={`hc-pitchSlot${slot.inName ? ' hc-pitchSlotIn' : ''}${slot.outName && !slot.inName ? ' hc-pitchSlotOut' : ''}${slot.focus ? ' hc-pitchSlotFocus' : ''}${slot.instruction ? ' hc-pitchSlotInstr' : ''}`} style={{ left: `${slot.x}%`, top: `${slot.y}%` }}>
              <span className="hc-pitchRole">{slot.roleLabel}</span>
              {showSwap ? (
                <div className="hc-pitchNames">
                  {slot.outName && <span className="hc-pitchOut">{displayName(slot.outName)}</span>}
                  {slot.inName && <span className="hc-pitchIn">{displayName(slot.inName)}</span>}
                </div>
              ) : (
                <div className="hc-pitchNames">
                  <span className={name ? 'hc-pitchName' : 'hc-pitchEmpty'}>{name ? displayName(name) : '—'}</span>
                </div>
              )}
              {slot.instruction && <span className="hc-pitchBadge">{slot.instruction}</span>}
            </div>
          )
        })}
      </div>
      {(zone || hasSwaps || hasInstructions || hasFocus) && (
        <div className="hc-pitchLegend" aria-hidden="true">
          {zone && <span className={`hc-pitchLegendChip hc-pitchLegend-${zone.id}`}><span className="hc-pitchLegendDot" />{zone.label}</span>}
          {hasFocus && <span className="hc-pitchLegendChip hc-pitchLegend-focus"><span className="hc-pitchLegendDot" />Ruolo chiave</span>}
          {hasInstructions && <span className="hc-pitchLegendChip hc-pitchLegend-instr"><span className="hc-pitchLegendDot" />Istruzione</span>}
          {hasSwaps && <span className="hc-pitchLegendChip hc-pitchLegend-swap"><span className="hc-pitchLegendDot" />Cambio</span>}
        </div>
      )}
      {!hasPlayers && loadState === 'loading' && <p className="hc-pitchHint">Carico la tua formazione…</p>}
      {!hasPlayers && loadState !== 'loading' && <p className="hc-pitchHint">Formazione non disponibile — apri la rosa e riprova</p>}
      {hasPlayers && !hasSwaps && !hasInstructions && !zone && <p className="hc-pitchHint">Tua formazione — i consigli sotto evidenziano i ruoli chiave</p>}
    </div>
  )
}
