'use client'

import React from 'react'
import { DEFAULT_SLOT_POSITIONS, completeSlotPositions } from '@/lib/formationDefaultSlots'
import { supabase } from '@/lib/supabaseClient'

const POSITION_ALIASES = {
  GK: 'PT',
  PT: 'PT',
  CB: 'DC',
  DC: 'DC',
  RB: 'TD',
  TD: 'TD',
  LB: 'TS',
  TS: 'TS',
  DMF: 'MED',
  MED: 'MED',
  CMF: 'CC',
  CC: 'CC',
  AMF: 'TRQ',
  TRQ: 'TRQ',
  RMF: 'CLD',
  CLD: 'CLD',
  LMF: 'CLS',
  CLS: 'CLS',
  RWF: 'EDA',
  EDA: 'EDA',
  LWF: 'ESA',
  ESA: 'ESA',
  SS: 'SP',
  SP: 'SP',
  CF: 'P',
  P: 'P'
}

function asText(value, lang = 'it') {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim()
  if (typeof value === 'object') {
    return String(value[lang] || value.it || value.en || value.es || '').trim()
  }
  return String(value).trim()
}

function shortName(name) {
  const raw = String(name || '').trim()
  if (!raw) return ''
  const parts = raw.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 11)
  return parts[parts.length - 1].slice(0, 11)
}

function shortInstruction(raw, lang) {
  const text = asText(raw, lang)
  if (!text) return ''
  const key = text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
  const map = {
    ancoraggio: 'Anc',
    anchoring: 'Anc',
    offensivo: 'Off',
    offensive: 'Off',
    difensivo: 'Dif',
    defensive: 'Dif',
    marcatura_stretta: 'MS',
    'marcatura stretta': 'MS',
    marcatura_uomo: 'MU',
    'marcatura a uomo': 'MU',
    contropiede: 'CP',
    linea_bassa: 'LB',
    'linea bassa': 'LB'
  }
  const compact = key.replace(/\s+/g, '_')
  return map[key] || map[compact] || text.slice(0, 8)
}

function normalizePos(value) {
  const raw = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
  if (!raw) return ''
  return POSITION_ALIASES[raw] || raw
}

function nameKey(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function claimSlot(slots, preferredPos, used) {
  const pos = normalizePos(preferredPos)
  if (pos) {
    const exact = slots.find((s) => !used.has(s.index) && normalizePos(s.position) === pos)
    if (exact) {
      used.add(exact.index)
      return exact
    }
  }
  const fallback = slots.find((s) => !used.has(s.index) && s.index !== 0)
  if (fallback) {
    used.add(fallback.index)
    return fallback
  }
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

/**
 * Mini campo read-only: titolari reali + overlay swap/istruzioni.
 */
export default function PrematchPitch({
  playerSuggestions = [],
  individualInstructions = [],
  focusText = '',
  lang = 'it'
}) {
  const [starters, setStarters] = React.useState([])
  const [slotPositions, setSlotPositions] = React.useState(DEFAULT_SLOT_POSITIONS)

  React.useEffect(() => {
    let cancelled = false
    async function loadRoster() {
      if (!supabase) return
      try {
        const { data: auth } = await supabase.auth.getUser()
        const userId = auth?.user?.id
        if (!userId) return

        const [{ data: players }, { data: layout }] = await Promise.all([
          supabase
            .from('players')
            .select('id, player_name, position, slot_index')
            .eq('user_id', userId)
            .not('slot_index', 'is', null)
            .gte('slot_index', 0)
            .lte('slot_index', 10),
          supabase
            .from('formation_layout')
            .select('slot_positions')
            .eq('user_id', userId)
            .maybeSingle()
        ])

        if (cancelled) return
        setStarters(Array.isArray(players) ? players : [])
        if (layout?.slot_positions) {
          setSlotPositions(completeSlotPositions(layout.slot_positions))
        }
      } catch {
        // fallback: default slots without names
      }
    }
    void loadRoster()
    return () => {
      cancelled = true
    }
  }, [])

  const overlay = React.useMemo(() => {
    const positions = completeSlotPositions(slotPositions || DEFAULT_SLOT_POSITIONS)
    const base = Object.entries(positions).map(([idx, slot]) => {
      const index = Number(idx)
      const starter = starters.find((p) => Number(p.slot_index) === index)
      return {
        index,
        x: Number(slot.x) || 50,
        y: Number(slot.y) || 50,
        position: slot.position || DEFAULT_SLOT_POSITIONS[index]?.position || '?',
        playerId: starter?.id || null,
        name: starter?.player_name || null,
        outName: null,
        inName: null,
        instruction: null,
        focus: false,
        roleLabel: slot.position || DEFAULT_SLOT_POSITIONS[index]?.position || '?'
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

      let slot =
        findSlotByPlayer(base, outId, outName) ||
        findSlotByPlayer(base, inId, inName)
      if (slot && usedForSwap.has(slot.index)) slot = null
      if (!slot) {
        const pos = sug.position || sug.slot_role || sug.replace_position
        slot = claimSlot(base, pos, usedForSwap)
      } else {
        usedForSwap.add(slot.index)
      }
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
      let slot =
        findSlotByPlayer(base, row?.player_id, row?.player_name) ||
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
        if ((last && focusBlob.includes(last)) || focusBlob.includes(n)) {
          slot.focus = true
        }
      }
    }

    return base
  }, [starters, slotPositions, playerSuggestions, individualInstructions, focusText, lang])

  const hasPlayers = overlay.some((s) => s.name || s.inName || s.outName)
  const hasOverlay = overlay.some((s) => s.outName || s.inName || s.instruction)

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

        {overlay.map((slot) => {
          const showSwap = !!(slot.outName || slot.inName)
          const displayName = slot.inName || slot.name
          return (
            <div
              key={slot.index}
              className={`hc-pitchSlot${slot.inName ? ' hc-pitchSlotIn' : ''}${slot.outName && !slot.inName ? ' hc-pitchSlotOut' : ''}${slot.focus ? ' hc-pitchSlotFocus' : ''}${slot.instruction ? ' hc-pitchSlotInstr' : ''}`}
              style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
            >
              <span className="hc-pitchRole">{slot.roleLabel}</span>
              {showSwap ? (
                <span className="hc-pitchNames">
                  {slot.outName && (
                    <span className="hc-pitchOut">{shortName(slot.outName)}</span>
                  )}
                  {slot.inName && (
                    <span className="hc-pitchIn">{shortName(slot.inName)}</span>
                  )}
                </span>
              ) : (
                <span className="hc-pitchNames">
                  <span className={displayName ? 'hc-pitchIdle' : 'hc-pitchEmpty'}>
                    {displayName ? shortName(displayName) : '—'}
                  </span>
                </span>
              )}
              {slot.instruction && (
                <span className="hc-pitchBadge">{slot.instruction}</span>
              )}
            </div>
          )
        })}
      </div>
      {!hasPlayers && (
        <p className="hc-pitchHint">Carico la tua formazione…</p>
      )}
      {hasPlayers && !hasOverlay && (
        <p className="hc-pitchHint">Tua formazione — i consigli sotto evidenziano i ruoli chiave</p>
      )}
      <style jsx>{`
        .hc-pitch {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .hc-pitchField {
          position: relative;
          width: 100%;
          aspect-ratio: 3 / 4;
          max-height: 340px;
          margin: 0 auto;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid rgba(61, 220, 151, 0.28);
          background:
            linear-gradient(180deg, rgba(18, 72, 48, 0.95) 0%, rgba(12, 48, 34, 0.98) 100%);
        }

        .hc-pitchTexture,
        .hc-pitchVignette,
        .hc-pitchMid,
        .hc-pitchCircle,
        .hc-pitchDot,
        .hc-pitchBoxTop,
        .hc-pitchBoxBottom,
        .hc-pitchSideL,
        .hc-pitchSideR {
          position: absolute;
          pointer-events: none;
        }

        .hc-pitchTexture {
          inset: 0;
          background: repeating-linear-gradient(
            90deg,
            transparent,
            transparent 18px,
            rgba(255, 255, 255, 0.03) 18px,
            rgba(255, 255, 255, 0.03) 36px
          );
        }

        .hc-pitchVignette {
          inset: 0;
          background:
            radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.35) 100%);
        }

        .hc-pitchMid {
          left: 6%;
          right: 6%;
          top: 50%;
          height: 1px;
          background: rgba(255, 255, 255, 0.35);
        }

        .hc-pitchCircle {
          left: 50%;
          top: 50%;
          width: 22%;
          aspect-ratio: 1;
          transform: translate(-50%, -50%);
          border: 1px solid rgba(255, 255, 255, 0.35);
          border-radius: 50%;
        }

        .hc-pitchDot {
          left: 50%;
          top: 50%;
          width: 5px;
          height: 5px;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.45);
        }

        .hc-pitchBoxTop,
        .hc-pitchBoxBottom {
          left: 28%;
          right: 28%;
          height: 14%;
          border: 1px solid rgba(255, 255, 255, 0.28);
        }

        .hc-pitchBoxTop {
          top: 4%;
          border-top: none;
        }

        .hc-pitchBoxBottom {
          bottom: 4%;
          border-bottom: none;
        }

        .hc-pitchSideL,
        .hc-pitchSideR {
          top: 6%;
          bottom: 6%;
          width: 1px;
          background: rgba(255, 255, 255, 0.22);
        }

        .hc-pitchSideL {
          left: 6%;
        }

        .hc-pitchSideR {
          right: 6%;
        }

        .hc-pitchSlot {
          position: absolute;
          transform: translate(-50%, -50%);
          width: clamp(54px, 14vw, 72px);
          min-height: 44px;
          padding: 4px 4px 6px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.22);
          background: rgba(6, 18, 14, 0.88);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          z-index: 2;
        }

        .hc-pitchSlotFocus {
          border-color: rgba(61, 220, 151, 0.55);
          box-shadow: 0 0 0 1px rgba(61, 220, 151, 0.2);
        }

        .hc-pitchSlotIn {
          border-color: rgba(61, 220, 151, 0.75);
          background: rgba(18, 64, 44, 0.92);
          box-shadow: 0 0 0 1px rgba(61, 220, 151, 0.25);
        }

        .hc-pitchSlotOut {
          border-color: rgba(255, 120, 120, 0.45);
          opacity: 0.85;
        }

        .hc-pitchRole {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.72);
        }

        .hc-pitchNames {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1px;
          width: 100%;
          line-height: 1.15;
        }

        .hc-pitchOut {
          font-size: 9px;
          color: rgba(255, 170, 170, 0.9);
          text-decoration: line-through;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .hc-pitchIn {
          font-size: 10px;
          font-weight: 800;
          color: #9dffc8;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .hc-pitchIdle {
          font-size: 10px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.92);
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .hc-pitchEmpty {
          font-size: 10px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.35);
        }

        .hc-pitchBadge {
          margin-top: 1px;
          padding: 1px 5px;
          border-radius: 999px;
          background: rgba(255, 203, 5, 0.18);
          border: 1px solid rgba(255, 203, 5, 0.45);
          color: #ffe08a;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }

        .hc-pitchHint {
          margin: 0;
          text-align: center;
          font-size: 11px;
          color: var(--text-dim, rgba(255, 255, 255, 0.55));
        }

        @media (max-width: 420px) {
          .hc-pitchField {
            max-height: 300px;
          }

          .hc-pitchSlot {
            width: clamp(48px, 15vw, 60px);
            min-height: 42px;
            padding: 3px;
          }
        }
      `}</style>
    </div>
  )
}
