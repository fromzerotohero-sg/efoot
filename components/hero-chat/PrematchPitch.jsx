'use client'

import React from 'react'
import { DEFAULT_SLOT_POSITIONS, completeSlotPositions } from '@/lib/formationDefaultSlots'
import {
  normalizePos, nameKey, asText, displayName, shortInstruction,
  claimSlot, findSlotByPlayer, formationLabel
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
        instruction: null, instructionText: null, actionReason: null,
        focus: false,
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
      slot.actionReason = asText(sug.reason || sug.application_hint, lang)
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
      slot.instructionText = asText(row?.instruction, lang)
      slot.actionReason = asText(row?.reason, lang)
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

  const formationStr = React.useMemo(() => formationLabel(formation, slotPositions, lang), [formation, slotPositions, lang])

  const hasPlayers = overlay.some((s) => s.name || s.inName || s.outName)
  const actions = React.useMemo(() => {
    const rows = []
    for (const slot of overlay) {
      if (slot.inName || slot.outName) {
        rows.push({
          slotIndex: slot.index,
          kind: 'swap',
          kicker: 'Cambio consigliato',
          title: slot.inName && slot.outName
            ? `${displayName(slot.inName)} per ${displayName(slot.outName)}`
            : displayName(slot.inName || slot.outName),
          detail: slot.actionReason
        })
      }
    }
    for (const slot of overlay) {
      if (!slot.instruction || rows.some((row) => row.slotIndex === slot.index)) continue
      rows.push({
        slotIndex: slot.index,
        kind: 'instruction',
        kicker: `Istruzione · ${displayName(slot.name) || slot.roleLabel}`,
        title: slot.instructionText || slot.instruction,
        detail: slot.actionReason
      })
    }
    return rows.slice(0, 3).map((row, index) => ({ ...row, number: index + 1 }))
  }, [overlay])

  const actionBySlot = React.useMemo(
    () => new Map(actions.map((action) => [action.slotIndex, action])),
    [actions]
  )

  return (
    <div className="hc-pitch" aria-label="Campo piano contromisure">
      <div className="hc-pitchHeader">
        <div className="hc-pitchHeaderLeft">
          <span className="hc-pitchHeaderLabel">Piano visuale</span>
          <span className="hc-pitchHeaderFormation">{formationStr || 'La tua formazione'}</span>
        </div>
        {actions.length > 0 && <span className="hc-pitchHeaderCount">{actions.length} priorità</span>}
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

        {overlay.map((slot) => {
          const name = slot.inName || slot.name
          const action = actionBySlot.get(slot.index)
          return (
            <div
              key={slot.index}
              className={`hc-pitchToken${action ? ' hc-pitchTokenAction' : ''}`}
              style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
              aria-label={`${slot.roleLabel} ${name || slot.outName || ''}`}
            >
              <span className="hc-pitchTokenCircle">
                <span className="hc-pitchTokenRole">{slot.roleLabel}</span>
                {action && <span className="hc-pitchTokenActionNum">{action.number}</span>}
              </span>
              <span className={`hc-pitchTokenName${name ? '' : ' hc-pitchTokenEmpty'}`}>
                {name ? displayName(name) : '—'}
              </span>
            </div>
          )
        })}
      </div>

      {actions.length > 0 && (
        <div className="hc-pitchActions">
          {actions.map((action) => (
            <div key={`${action.kind}-${action.slotIndex}`} className="hc-pitchAction">
              <span className="hc-pitchActionNum">{action.number}</span>
              <span className="hc-pitchActionCopy">
                <span className="hc-pitchActionKicker">{action.kicker}</span>
                <strong className="hc-pitchActionTitle">{action.title}</strong>
                {action.detail && <span className="hc-pitchActionDetail">{action.detail}</span>}
              </span>
            </div>
          ))}
        </div>
      )}
      {!hasPlayers && loadState === 'loading' && <p className="hc-pitchHint">Carico la tua formazione…</p>}
      {!hasPlayers && loadState !== 'loading' && <p className="hc-pitchHint">Formazione non disponibile — apri la rosa e riprova</p>}
      {hasPlayers && actions.length === 0 && <p className="hc-pitchHint">Nessuna modifica alla formazione consigliata.</p>}
    </div>
  )
}
