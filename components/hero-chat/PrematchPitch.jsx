'use client'

import React from 'react'
import { DEFAULT_SLOT_POSITIONS, completeSlotPositions } from '@/lib/formationDefaultSlots'
import {
  normalizePos, nameKey, asText, roleGroup, displayName, shortInstruction,
  buildZones, claimSlot, findSlotByPlayer, buildSwapArrows, buildMovementArrows,
  formationLabel
} from '@/lib/prematchPitchHelpers'

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

export default function PrematchPitch({
  starters: startersProp = null,
  slotPositions: slotPositionsProp = null,
  formation: formationProp = null,
  playerSuggestions = [],
  individualInstructions = [],
  focusText = '',
  lang = 'it'
}) {
  const hasPropStarters = Array.isArray(startersProp) && startersProp.length > 0
  const [fetchedStarters, setFetchedStarters] = React.useState([])
  const [fetchedSlots, setFetchedSlots] = React.useState(null)
  const [fetchedFormation, setFetchedFormation] = React.useState(null)
  const [loadState, setLoadState] = React.useState(hasPropStarters ? 'ready' : 'loading')
  const [layers, setLayers] = React.useState({ swaps: true, instructions: true, zones: true, moves: true })
  const [selectedSlot, setSelectedSlot] = React.useState(null)

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
          .map((p) => ({
            id: p.id, player_name: p.player_name, position: p.position,
            slot_index: Number(p.slot_index)
          }))
        setFetchedStarters(titolari)
        if (data.layout?.slot_positions) setFetchedSlots(data.layout.slot_positions)
        if (data.layout?.formation) setFetchedFormation(data.layout.formation)
        setLoadState(titolari.length ? 'ready' : 'empty')
      } catch { if (!cancelled) setLoadState('empty') }
    }
    void loadRoster()
    return () => { cancelled = true }
  }, [hasPropStarters])

  const starters = hasPropStarters ? startersProp : fetchedStarters
  const slotPositions = slotPositionsProp || fetchedSlots || DEFAULT_SLOT_POSITIONS
  const formation = formationProp || fetchedFormation || null

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
        outName: null, inName: null,
        instruction: null, instructionText: null, movement: null,
        focus: false,
        roleLabel: slot?.position || DEFAULT_SLOT_POSITIONS[index].position,
        group: roleGroup(slot?.position || DEFAULT_SLOT_POSITIONS[index].position)
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
        slot.group = roleGroup(slot.roleLabel)
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
      slot.instructionText = asText(row?.instruction, lang)
      slot.movement = buildMovementArrows([slot], [row], lang)[0] || null
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

  const zones = React.useMemo(() => buildZones(focusText, lang), [focusText, lang])
  const swapArrows = React.useMemo(() => buildSwapArrows(overlay, playerSuggestions), [overlay, playerSuggestions])
  const moveArrows = React.useMemo(() => buildMovementArrows(overlay, individualInstructions, lang), [overlay, individualInstructions, lang])
  const formationStr = React.useMemo(() => formationLabel(formation, slotPositions, lang), [formation, slotPositions, lang])

  const hasPlayers = overlay.some((s) => s.name || s.inName || s.outName)
  const hasSwaps = swapArrows.length > 0
  const hasInstructions = overlay.some((s) => s.instruction)
  const hasMoves = moveArrows.length > 0
  const hasZones = zones.length > 0
  const hasFocus = overlay.some((s) => s.focus && !s.inName && !s.instruction)

  const toggleLayer = (key) => setLayers((prev) => ({ ...prev, [key]: !prev[key] }))

  return (
    <div className="hc-pitch" aria-label="Campo piano contromisure">
      <div className="hc-pitchHeader">
        <div className="hc-pitchHeaderLeft">
          <span className="hc-pitchHeaderLabel">Contromisure pre-partita</span>
          <span className="hc-pitchHeaderFormation">{formationStr || 'Formazione'}</span>
        </div>
        <div className="hc-pitchHeaderRight">
          {(hasSwaps || hasInstructions || hasMoves || hasZones) && (
            <div className="hc-pitchLayers" role="group" aria-label="Livelli visualizzazione">
              {hasSwaps && (
                <button type="button" onClick={() => toggleLayer('swaps')} className={`hc-pitchLayer${layers.swaps ? ' is-on' : ''}`} aria-pressed={layers.swaps}>Cambi</button>
              )}
              {hasInstructions && (
                <button type="button" onClick={() => toggleLayer('instructions')} className={`hc-pitchLayer${layers.instructions ? ' is-on' : ''}`} aria-pressed={layers.instructions}>Istruzioni</button>
              )}
              {hasMoves && (
                <button type="button" onClick={() => toggleLayer('moves')} className={`hc-pitchLayer${layers.moves ? ' is-on' : ''}`} aria-pressed={layers.moves}>Movimenti</button>
              )}
              {hasZones && (
                <button type="button" onClick={() => toggleLayer('zones')} className={`hc-pitchLayer${layers.zones ? ' is-on' : ''}`} aria-pressed={layers.zones}>Zone</button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="hc-pitchField">
        <svg className="hc-pitchSvg" viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="hcPitchGrass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0e3b1f" />
              <stop offset="50%" stopColor="#0a2e18" />
              <stop offset="100%" stopColor="#08240f" />
            </linearGradient>
            <linearGradient id="hcPitchStripe" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.05)" />
            </linearGradient>
            <radialGradient id="hcPitchVignette" cx="50%" cy="50%" r="65%">
              <stop offset="60%" stopColor="transparent" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.4)" />
            </radialGradient>
          </defs>
          <rect x="0" y="0" width="100" height="140" fill="url(#hcPitchGrass)" />
          {[0, 20, 40, 60, 80, 100].map((x) => (
            <rect key={x} x={x} y="0" width="10" height="140" fill="url(#hcPitchStripe)" opacity="0.5" />
          ))}
          <rect x="0" y="0" width="100" height="140" fill="url(#hcPitchVignette)" />
          {/* Pitch markings */}
          <g fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.4">
            <rect x="2" y="2" width="96" height="136" rx="1" />
            <line x1="2" y1="70" x2="98" y2="70" />
            <circle cx="50" cy="70" r="11" />
            <circle cx="50" cy="70" r="0.8" fill="rgba(255,255,255,0.5)" stroke="none" />
            <rect x="22" y="2" width="56" height="20" />
            <rect x="36" y="2" width="28" height="8" />
            <circle cx="50" cy="14" r="0.8" fill="rgba(255,255,255,0.5)" stroke="none" />
            <path d="M 41 22 A 11 11 0 0 0 59 22" />
            <rect x="22" y="118" width="56" height="20" />
            <rect x="36" y="130" width="28" height="8" />
            <circle cx="50" cy="126" r="0.8" fill="rgba(255,255,255,0.5)" stroke="none" />
            <path d="M 41 118 A 11 11 0 0 1 59 118" />
            <path d="M 2 8 A 4 4 0 0 1 6 12" transform="rotate(-90 2 8)" />
            <path d="M 98 8 A 4 4 0 0 0 94 12" transform="rotate(90 98 8)" />
            <path d="M 2 132 A 4 4 0 0 0 6 128" transform="rotate(90 2 132)" />
            <path d="M 98 132 A 4 4 0 0 1 94 128" transform="rotate(-90 98 132)" />
          </g>
          <g fill="rgba(255,255,255,0.18)" stroke="none">
            <rect x="48" y="0" width="4" height="2" />
            <rect x="48" y="138" width="4" height="2" />
          </g>
        </svg>

        {layers.zones && hasZones && (
          <svg className="hc-pitchZones" viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden="true">
            {zones.map((z) => (
              <ellipse key={z.id} cx={z.cx} cy={z.cy * 1.4} rx={z.rx} ry={z.ry * 1.4} className={`hc-pitchZoneShape ${z.className}`} />
            ))}
          </svg>
        )}

        {(layers.swaps && hasSwaps) || (layers.moves && hasMoves) ? (
          <svg className="hc-pitchArrows" viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <marker id="hcArrowSwap" markerWidth="5" markerHeight="5" refX="4.2" refY="2.5" orient="auto">
                <path d="M0,0 L5,2.5 L0,5 Z" fill="rgba(255,203,5,0.95)" />
              </marker>
              <marker id="hcArrowMove" markerWidth="5" markerHeight="5" refX="4.2" refY="2.5" orient="auto">
                <path d="M0,0 L5,2.5 L0,5 Z" fill="rgba(99,179,237,0.95)" />
              </marker>
            </defs>
            {layers.swaps && swapArrows.map((a) => {
              const dx = a.x2 - a.x1, dy = (a.y2 - a.y1) * 1.4
              const len = Math.sqrt(dx * dx + dy * dy) || 1
              const shrink = 6
              const x1 = a.x1 + (dx / len) * shrink
              const y1 = a.y1 * 1.4 + (dy / len) * shrink
              const x2 = a.x2 - (dx / len) * shrink
              const y2 = a.y2 * 1.4 - (dy / len) * shrink
              const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
              const cx = mx + (dy !== 0 ? 5 : 0), cy = my + (dx !== 0 ? 5 : 0)
              return <path key={a.id} d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`} fill="none" stroke="rgba(255,203,5,0.9)" strokeWidth="0.9" strokeLinecap="round" markerEnd="url(#hcArrowSwap)" />
            })}
            {layers.moves && moveArrows.map((a) => {
              const x2c = Math.max(3, Math.min(97, a.x2))
              const y2c = Math.max(3, Math.min(137, a.y2 * 1.4))
              return (
                <g key={a.id}>
                  <path d={`M ${a.x1} ${a.y1 * 1.4} Q ${a.cx} ${a.cy * 1.4} ${x2c} ${y2c}`} fill="none" stroke="rgba(99,179,237,0.85)" strokeWidth="0.8" strokeDasharray="2 1.5" strokeLinecap="round" markerEnd="url(#hcArrowMove)" />
                </g>
              )
            })}
          </svg>
        ) : null}
        {overlay.map((slot) => {
          const showSwap = !!(slot.outName || slot.inName)
          const name = slot.inName || slot.name
          const isSelected = selectedSlot === slot.index
          const dim = selectedSlot != null && !isSelected
          const showInstr = layers.instructions && slot.instruction
          return (
            <div
              key={slot.index}
              className={`hc-pitchToken hc-pitchToken-${slot.group}${slot.inName ? ' hc-pitchTokenIn' : ''}${slot.outName && !slot.inName ? ' hc-pitchTokenOut' : ''}${slot.focus ? ' hc-pitchTokenFocus' : ''}${isSelected ? ' hc-pitchTokenSelected' : ''}${dim ? ' hc-pitchTokenDim' : ''}${showInstr ? ' hc-pitchTokenInstr' : ''}`}
              style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
              onClick={() => setSelectedSlot((prev) => (prev === slot.index ? null : slot.index))}
              role="button"
              tabIndex={0}
              aria-label={`${slot.roleLabel} ${name || slot.outName || ''}`}
            >
              <span className="hc-pitchTokenCircle">
                <span className="hc-pitchTokenNum">{slot.index === 0 ? 1 : slot.index + 1}</span>
              </span>
              <span className="hc-pitchTokenRole">{slot.roleLabel}</span>
              {showSwap ? (
                <span className="hc-pitchTokenNames">
                  {slot.outName && <span className="hc-pitchTokenOut">{displayName(slot.outName)}</span>}
                  {slot.inName && <span className="hc-pitchTokenInName">{displayName(slot.inName)}</span>}
                </span>
              ) : (
                <span className={`hc-pitchTokenName${name ? '' : ' hc-pitchTokenEmpty'}`}>{name ? displayName(name) : '—'}</span>
              )}
              {showInstr && <span className="hc-pitchTokenBadge">{slot.instruction}</span>}
              {isSelected && slot.instructionText && (
                <span className="hc-pitchTokenTooltip">{slot.instructionText}</span>
              )}
            </div>
          )
        })}
      </div>

      {(hasSwaps || hasInstructions || hasMoves || hasZones || hasFocus) && (
        <div className="hc-pitchLegend" aria-hidden="true">
          {hasZones && zones.map((z) => (
            <span key={z.id} className={`hc-pitchLegendChip hc-pitchLegend-${z.id}`}><span className="hc-pitchLegendDot" />{z.label}</span>
          ))}
          {hasFocus && <span className="hc-pitchLegendChip hc-pitchLegend-focus"><span className="hc-pitchLegendDot" />Ruolo chiave</span>}
          {hasInstructions && <span className="hc-pitchLegendChip hc-pitchLegend-instr"><span className="hc-pitchLegendDot" />Istruzione</span>}
          {hasMoves && <span className="hc-pitchLegendChip hc-pitchLegend-move"><span className="hc-pitchLegendDot" />Movimento</span>}
          {hasSwaps && <span className="hc-pitchLegendChip hc-pitchLegend-swap"><span className="hc-pitchLegendDot" />Cambio</span>}
        </div>
      )}
      {!hasPlayers && loadState === 'loading' && <p className="hc-pitchHint">Carico la tua formazione…</p>}
      {!hasPlayers && loadState !== 'loading' && <p className="hc-pitchHint">Formazione non disponibile — apri la rosa e riprova</p>}
      {hasPlayers && !hasSwaps && !hasInstructions && !hasMoves && !hasZones && <p className="hc-pitchHint">Tua formazione — i consigli del coach evidenzieranno ruoli chiave, cambi e movimenti</p>}
      {hasPlayers && (hasSwaps || hasInstructions || hasMoves || hasZones) && <p className="hc-pitchHint">Tocca un giocatore per leggere l'istruzione individuale</p>}
    </div>
  )
}
