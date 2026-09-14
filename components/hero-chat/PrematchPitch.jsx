'use client'

import React from 'react'
import { DEFAULT_SLOT_POSITIONS } from '@/lib/formationDefaultSlots'

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
  if (parts.length === 1) return parts[0].slice(0, 10)
  return parts[parts.length - 1].slice(0, 10)
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
  if (map[key] || map[key.replace(/\s+/g, '_')]) {
    return map[key] || map[key.replace(/\s+/g, '_')]
  }
  return text.slice(0, 8)
}

function normalizePos(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
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

/**
 * Mini campo read-only: slot default + overlay swap/istruzioni.
 * Nessuna interazione — solo lettura del piano contromisure.
 */
export default function PrematchPitch({
  playerSuggestions = [],
  individualInstructions = [],
  lang = 'it'
}) {
  const overlay = React.useMemo(() => {
    const base = Object.entries(DEFAULT_SLOT_POSITIONS).map(([idx, slot]) => ({
      index: Number(idx),
      x: slot.x,
      y: slot.y,
      position: slot.position,
      outName: null,
      inName: null,
      instruction: null,
      roleLabel: slot.position
    }))

    const usedForSwap = new Set()
    const suggestions = Array.isArray(playerSuggestions) ? playerSuggestions : []
    for (const sug of suggestions) {
      if (sug?.action && sug.action !== 'add_to_starting_xi') continue
      const inName = sug.player_name || null
      const outName = sug.replace_player_name || null
      if (!inName && !outName) continue
      const pos = sug.position || sug.slot_role || sug.replace_position
      const slot = claimSlot(base, pos, usedForSwap)
      if (!slot) continue
      slot.outName = outName
      slot.inName = inName
      if (pos) slot.roleLabel = normalizePos(pos) || slot.position
    }

    const usedForInstr = new Set()
    const instructions = Array.isArray(individualInstructions) ? individualInstructions : []
    for (const row of instructions) {
      const badge = shortInstruction(row?.instruction, lang)
      if (!badge) continue
      const byName = String(row?.player_name || '').trim().toLowerCase()
      let slot = null
      if (byName) {
        slot = base.find(
          (s) =>
            !usedForInstr.has(s.index) &&
            ((s.inName && s.inName.toLowerCase() === byName) ||
              (s.outName && s.outName.toLowerCase() === byName))
        )
      }
      if (!slot) {
        slot = claimSlot(base, row?.position || row?.slot_role || row?.slot, usedForInstr)
      } else {
        usedForInstr.add(slot.index)
      }
      if (!slot) continue
      slot.instruction = badge
      if (!slot.inName && row?.player_name) slot.inName = row.player_name
    }

    return base
  }, [playerSuggestions, individualInstructions, lang])

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
          const primary = slot.inName || slot.outName
          return (
            <div
              key={slot.index}
              className={`hc-pitchSlot${slot.inName ? ' hc-pitchSlotIn' : ''}${slot.outName && !slot.inName ? ' hc-pitchSlotOut' : ''}${slot.instruction ? ' hc-pitchSlotInstr' : ''}`}
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
                  <span className="hc-pitchIdle">{primary ? shortName(primary) : '—'}</span>
                </span>
              )}
              {slot.instruction && (
                <span className="hc-pitchBadge">{slot.instruction}</span>
              )}
            </div>
          )
        })}
      </div>
      {!hasOverlay && (
        <p className="hc-pitchHint">Formazione base 4-3-3 — applica i consigli sotto</p>
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
          width: clamp(52px, 14vw, 68px);
          min-height: 44px;
          padding: 4px 4px 6px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.22);
          background: rgba(6, 18, 14, 0.82);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          z-index: 2;
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
          font-weight: 600;
          color: rgba(255, 255, 255, 0.55);
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
            width: clamp(46px, 15vw, 58px);
            min-height: 42px;
            padding: 3px;
          }
        }
      `}</style>
    </div>
  )
}
