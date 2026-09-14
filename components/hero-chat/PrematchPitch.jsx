'use client'

import React from 'react'
import { DEFAULT_SLOT_POSITIONS, completeSlotPositions } from '@/lib/formationDefaultSlots'

const POSITION_ALIASES = {
  GK: 'PT', PT: 'PT',
  CB: 'DC', DC: 'DC',
  RB: 'TD', TD: 'TD',
  LB: 'TS', TS: 'TS',
  DMF: 'MED', MED: 'MED',
  CMF: 'CC', CC: 'CC',
  AMF: 'TRQ', TRQ: 'TRQ',
  RMF: 'CLD', CLD: 'CLD',
  LMF: 'CLS', CLS: 'CLS',
  RWF: 'EDA', EDA: 'EDA',
  LWF: 'ESA', ESA: 'ESA',
  SS: 'SP', SP: 'SP',
  CF: 'P', P: 'P'
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
  } catch {
    return null
  }
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
  const raw = String(value || '').trim().toUpperCase().replace(/\s+/g, '')
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

function findMentionedSlots(slots, text) {
  const blob = nameKey(text)
  if (!blob) return []
  const found = []
  const used = new Set()
  for (const slot of slots) {
    const full = nameKey(slot.name || slot.inName)
    if (!full || full.length < 3) continue
    const last = full.split(' ').pop()
    const tokens = [full, last].filter((t) => t && t.length >= 3)
    let hitAt = -1
    for (const token of tokens) {
      const idx = blob.indexOf(token)
      if (idx >= 0 && (hitAt < 0 || idx < hitAt)) hitAt = idx
    }
    if (hitAt >= 0 && !used.has(slot.index)) {
      used.add(slot.index)
      found.push({ slot, at: hitAt })
    }
  }
  return found.sort((a, b) => a.at - b.at).map((row) => row.slot)
}

function buildZones(text, lang) {
  const blob = nameKey(text)
  if (!blob) return []
  const zones = []
  const labels = {
    center: { it: 'Chiudi centro', en: 'Hold center', es: 'Cierra centro' },
    wings: { it: 'Apri fasce', en: 'Use wings', es: 'Abre bandas' },
    depth: { it: 'Profondità', en: 'Depth runs', es: 'Profundidad' }
  }
  if (/(trq|tra le linee|centrale|centro|ancoragg|scherm)/.test(blob)) {
    zones.push({ id: 'center', className: 'hc-pitchZoneCenter', label: asText(labels.center, lang) })
  }
  if (/(fasce|corsie|ampiezza|estern|lato|wing|nedved|beckham|cld|cls|eda|esa)/.test(blob)) {
    zones.push({ id: 'wings', className: 'hc-pitchZoneWings', label: asText(labels.wings, lang) })
  }
  if (/(profondit|vertical|dietro i terzin|attacca lo spazio|depth)/.test(blob)) {
    zones.push({ id: 'depth', className: 'hc-pitchZoneDepth', label: asText(labels.depth, lang) })
  }
  return zones.slice(0, 3)
}

function buildMovementArrows(slots, text, playerSuggestions) {
  const arrows = []
  const seen = new Set()

  const pushArrow = (from, to, kind) => {
    if (!from || !to || from.index === to.index) return
    const key = `${from.index}->${to.index}:${kind}`
    if (seen.has(key)) return
    seen.add(key)
    arrows.push({
      id: key,
      kind,
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y
    })
  }

  const mentioned = findMentionedSlots(slots, text)
  for (let i = 0; i < mentioned.length - 1 && arrows.length < 3; i++) {
    pushArrow(mentioned[i], mentioned[i + 1], i === 0 ? 'build' : 'attack')
  }

  const suggestions = Array.isArray(playerSuggestions) ? playerSuggestions : []
  for (const sug of suggestions) {
    if (arrows.length >= 4) break
    const outSlot = findSlotByPlayer(slots, sug.replace_player_id || sug.out_player_id, sug.replace_player_name || sug.out_player_name)
    const inSlot = findSlotByPlayer(slots, sug.player_id || sug.in_player_id, sug.player_name || sug.in_player_name)
    if (outSlot && inSlot && outSlot.index !== inSlot.index) {
      pushArrow(outSlot, inSlot, 'swap')
    }
  }

  // Fallback: se testo parla di ampiezza ma poche frecce, collega MED/CC al lato più citato
  if (arrows.length === 0 && mentioned.length >= 1) {
    const pivot = slots.find((s) => ['MED', 'CC', 'DMF', 'CMF'].includes(normalizePos(s.position))) || slots.find((s) => s.index === 6)
    if (pivot && mentioned[0] && pivot.index !== mentioned[0].index) {
      pushArrow(pivot, mentioned[0], 'build')
    }
  }

  return arrows.slice(0, 4)
}

/**
 * Mini campo read-only: titolari + zone + frecce di gioco dal piano.
 */
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
    if (hasPropStarters) {
      setLoadState('ready')
      return undefined
    }

    let cancelled = false
    async function loadRoster() {
      setLoadState('loading')
      try {
        const token = await resolveAuthToken()
        if (!token) {
          if (!cancelled) setLoadState('empty')
          return
        }

        const res = await fetch(`/api/dashboard?t=${Date.now()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache'
          },
          cache: 'no-store'
        })
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) {
          setLoadState('empty')
          return
        }

        const players = Array.isArray(data.players) ? data.players : []
        const titolari = players
          .filter((p) => p?.id && p?.player_name && p.slot_index != null && p.slot_index !== '')
          .filter((p) => {
            const n = Number(p.slot_index)
            return Number.isFinite(n) && n >= 0 && n <= 10
          })
          .map((p) => ({
            id: p.id,
            player_name: p.player_name,
            position: p.position,
            slot_index: Number(p.slot_index)
          }))

        setFetchedStarters(titolari)
        if (data.layout?.slot_positions) setFetchedSlots(data.layout.slot_positions)
        setLoadState(titolari.length ? 'ready' : 'empty')
      } catch {
        if (!cancelled) setLoadState('empty')
      }
    }
    void loadRoster()
    return () => {
      cancelled = true
    }
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

  const zones = React.useMemo(() => buildZones(focusText, lang), [focusText, lang])
  const arrows = React.useMemo(
    () => buildMovementArrows(overlay, focusText, playerSuggestions),
    [overlay, focusText, playerSuggestions]
  )

  const hasPlayers = overlay.some((s) => s.name || s.inName || s.outName)
  const hasOverlay = overlay.some((s) => s.outName || s.inName || s.instruction)
  const hasVisuals = zones.length > 0 || arrows.length > 0

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

        {zones.map((zone) => (
          <div key={zone.id} className={`hc-pitchZone ${zone.className}`} aria-hidden="true">
            <span>{zone.label}</span>
          </div>
        ))}

        {arrows.length > 0 && (
          <svg className="hc-pitchArrows" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <marker id="hcArrowBuild" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                <path d="M0,0 L5,2.5 L0,5 Z" fill="rgba(125, 211, 252, 0.95)" />
              </marker>
              <marker id="hcArrowAttack" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                <path d="M0,0 L5,2.5 L0,5 Z" fill="rgba(61, 220, 151, 0.95)" />
              </marker>
              <marker id="hcArrowSwap" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                <path d="M0,0 L5,2.5 L0,5 Z" fill="rgba(255, 203, 5, 0.95)" />
              </marker>
            </defs>
            {arrows.map((arrow) => {
              const dx = arrow.x2 - arrow.x1
              const dy = arrow.y2 - arrow.y1
              const len = Math.sqrt(dx * dx + dy * dy) || 1
              const shrink = 6
              const x1 = arrow.x1 + (dx / len) * shrink
              const y1 = arrow.y1 + (dy / len) * shrink
              const x2 = arrow.x2 - (dx / len) * shrink
              const y2 = arrow.y2 - (dy / len) * shrink
              const stroke =
                arrow.kind === 'attack'
                  ? 'rgba(61, 220, 151, 0.9)'
                  : arrow.kind === 'swap'
                    ? 'rgba(255, 203, 5, 0.9)'
                    : 'rgba(125, 211, 252, 0.9)'
              const marker =
                arrow.kind === 'attack'
                  ? 'url(#hcArrowAttack)'
                  : arrow.kind === 'swap'
                    ? 'url(#hcArrowSwap)'
                    : 'url(#hcArrowBuild)'
              return (
                <path
                  key={arrow.id}
                  d={`M ${x1} ${y1} Q ${(x1 + x2) / 2} ${(y1 + y2) / 2 - 4} ${x2} ${y2}`}
                  fill="none"
                  stroke={stroke}
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  markerEnd={marker}
                  className="hc-pitchArrowPath"
                />
              )
            })}
          </svg>
        )}

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

      {hasVisuals && (
        <div className="hc-pitchLegend" aria-hidden="true">
          {zones.map((zone) => (
            <span key={`z-${zone.id}`} className={`hc-pitchLegendChip hc-pitchLegend-${zone.id}`}>
              {zone.label}
            </span>
          ))}
          {arrows.some((a) => a.kind === 'build') && (
            <span className="hc-pitchLegendChip hc-pitchLegend-build">Uscita</span>
          )}
          {arrows.some((a) => a.kind === 'attack') && (
            <span className="hc-pitchLegendChip hc-pitchLegend-attack">Attacco</span>
          )}
          {arrows.some((a) => a.kind === 'swap') && (
            <span className="hc-pitchLegendChip hc-pitchLegend-swap">Cambio</span>
          )}
        </div>
      )}

      {!hasPlayers && loadState === 'loading' && (
        <p className="hc-pitchHint">Carico la tua formazione…</p>
      )}
      {!hasPlayers && loadState !== 'loading' && (
        <p className="hc-pitchHint">Formazione non disponibile — apri la rosa e riprova</p>
      )}
      {hasPlayers && !hasOverlay && !hasVisuals && (
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

        .hc-pitchSideL { left: 6%; }
        .hc-pitchSideR { right: 6%; }

        .hc-pitchZone {
          position: absolute;
          pointer-events: none;
          z-index: 1;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 8px;
        }

        .hc-pitchZone span {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 4px 8px;
          border-radius: 999px;
          backdrop-filter: blur(2px);
        }

        .hc-pitchZoneCenter {
          left: 28%;
          right: 28%;
          top: 34%;
          bottom: 34%;
          border: 1.5px dashed rgba(255, 203, 5, 0.55);
          border-radius: 16px;
          background: rgba(255, 203, 5, 0.10);
        }

        .hc-pitchZoneCenter span {
          color: #ffe08a;
          background: rgba(20, 16, 4, 0.55);
          border: 1px solid rgba(255, 203, 5, 0.4);
        }

        .hc-pitchZoneWings {
          inset: 18% 4% 28% 4%;
          border: 1.5px dashed rgba(125, 211, 252, 0.45);
          border-radius: 14px;
          background:
            linear-gradient(90deg, rgba(125, 211, 252, 0.14), transparent 28%, transparent 72%, rgba(125, 211, 252, 0.14));
        }

        .hc-pitchZoneWings span {
          color: #bae6fd;
          background: rgba(4, 16, 28, 0.55);
          border: 1px solid rgba(125, 211, 252, 0.4);
        }

        .hc-pitchZoneDepth {
          left: 18%;
          right: 18%;
          top: 6%;
          height: 24%;
          border: 1.5px dashed rgba(61, 220, 151, 0.5);
          border-radius: 14px;
          background: rgba(61, 220, 151, 0.12);
        }

        .hc-pitchZoneDepth span {
          color: #9dffc8;
          background: rgba(4, 28, 16, 0.55);
          border: 1px solid rgba(61, 220, 151, 0.4);
        }

        .hc-pitchArrows {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 2;
          pointer-events: none;
          overflow: visible;
        }

        .hc-pitchArrowPath {
          filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.35));
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
          z-index: 3;
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

        .hc-pitchLegend {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          justify-content: center;
        }

        .hc-pitchLegendChip {
          min-height: 28px;
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          border: 1px solid transparent;
        }

        .hc-pitchLegend-center {
          color: #ffe08a;
          background: rgba(255, 203, 5, 0.12);
          border-color: rgba(255, 203, 5, 0.35);
        }

        .hc-pitchLegend-wings,
        .hc-pitchLegend-build {
          color: #bae6fd;
          background: rgba(125, 211, 252, 0.12);
          border-color: rgba(125, 211, 252, 0.35);
        }

        .hc-pitchLegend-depth,
        .hc-pitchLegend-attack {
          color: #9dffc8;
          background: rgba(61, 220, 151, 0.12);
          border-color: rgba(61, 220, 151, 0.35);
        }

        .hc-pitchLegend-swap {
          color: #ffe08a;
          background: rgba(255, 203, 5, 0.12);
          border-color: rgba(255, 203, 5, 0.35);
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
