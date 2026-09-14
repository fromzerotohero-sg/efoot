'use client'

import React from 'react'
import { DEFAULT_SLOT_POSITIONS, completeSlotPositions } from '@/lib/formationDefaultSlots'
import {
  normalizePos, nameKey, asText, displayName, shortInstruction,
  claimSlot, findSlotByPlayer, formationLabel
} from '@/lib/prematchPitchHelpers'
import { instructionLabel } from '@/lib/prematchCustomerPlan'

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
  teamStyle = null,
  attackLine = null,
  defenseLine = null,
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
        outName: null,
        inName: null,
        instruction: null,
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
      if (inName) slot.name = inName
      if (sug.position || sug.replace_position || sug.slot_role) {
        slot.roleLabel = normalizePos(sug.position || sug.replace_position || sug.slot_role) || slot.position
      }
      slot.focus = true
    }

    const usedForInstr = new Set()
    const instructions = Array.isArray(individualInstructions) ? individualInstructions : []
    for (const row of instructions) {
      const label = row?.instruction_label
        || instructionLabel(row?.instruction, lang)
        || shortInstruction(row?.instruction, lang)
      if (!label) continue
      let slot = findSlotByPlayer(base, row?.player_id, row?.player_name) ||
        claimSlot(base, row?.position || row?.slot_role, usedForInstr)
      if (slot && !usedForInstr.has(slot.index)) usedForInstr.add(slot.index)
      if (!slot) continue
      slot.instruction = label
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

  const formationStr = React.useMemo(
    () => formationLabel(formation, slotPositions, lang),
    [formation, slotPositions, lang]
  )

  const hasPlayers = overlay.some((s) => s.name || s.inName || s.outName)
  const styleLabel = asText(teamStyle, lang)

  return (
    <div className="hc-pitch" aria-label="Campo piano contromisure">
      <div className="hc-pitchHeader">
        <div className="hc-pitchHeaderLeft">
          <span className="hc-pitchHeaderLabel">Setup</span>
          <span className="hc-pitchHeaderFormation">{formationStr || 'La tua formazione'}</span>
        </div>
        {styleLabel ? <span className="hc-pitchStyleChip">{styleLabel}</span> : null}
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
          </g>
        </svg>
        {(attackLine || defenseLine) ? (
          <svg
            className="hc-pitchTacticalLines"
            viewBox="0 0 100 140"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <marker id="hcPitchAttackArrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                <path d="M0,0 L5,2.5 L0,5 z" fill="#ffcb05" />
              </marker>
            </defs>
            {attackLine ? (
              <path
                className="hc-pitchAttackLine"
                d="M50 82 C44 68 32 52 22 32"
                markerEnd="url(#hcPitchAttackArrow)"
              />
            ) : null}
            {defenseLine ? (
              <path className="hc-pitchDefenseLine" d="M20 104 C38 107 62 107 80 104" />
            ) : null}
          </svg>
        ) : null}
        {attackLine ? (
          <span className="hc-pitchLineTag hc-pitchLineTagAttack" aria-hidden="true">
            Attacco
          </span>
        ) : null}
        {defenseLine ? (
          <span className="hc-pitchLineTag hc-pitchLineTagDefense" aria-hidden="true">
            Difesa
          </span>
        ) : null}

        {overlay.map((slot) => {
          const hasSwap = Boolean(slot.inName || (slot.outName && slot.outName !== slot.name))
          const tokenClass = [
            'hc-pitchToken',
            hasSwap || slot.instruction ? 'hc-pitchTokenAction' : '',
            slot.focus ? 'hc-pitchTokenFocus' : ''
          ].filter(Boolean).join(' ')
          return (
            <div
              key={slot.index}
              className={tokenClass}
              style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
              aria-label={`${slot.roleLabel} ${slot.name || slot.outName || ''}`}
            >
              <span className="hc-pitchTokenCircle">
                <span className="hc-pitchTokenRole">{slot.roleLabel}</span>
              </span>
              {hasSwap ? (
                <span className="hc-pitchTokenNames">
                  {slot.outName ? (
                    <span className="hc-pitchTokenOut">{displayName(slot.outName)}</span>
                  ) : null}
                  <span className="hc-pitchTokenInName">
                    {displayName(slot.inName || slot.name) || '—'}
                  </span>
                </span>
              ) : (
                <span className={`hc-pitchTokenName${slot.name ? '' : ' hc-pitchTokenEmpty'}`}>
                  {slot.name ? displayName(slot.name) : '—'}
                </span>
              )}
              {slot.instruction ? (
                <span className="hc-pitchTokenBadge">{slot.instruction}</span>
              ) : null}
            </div>
          )
        })}
      </div>

      {!hasPlayers && loadState === 'loading' && <p className="hc-pitchHint">Carico la tua formazione…</p>}
      {!hasPlayers && loadState !== 'loading' && (
        <p className="hc-pitchHint">Formazione non disponibile — apri la rosa e riprova</p>
      )}
    </div>
  )
}
