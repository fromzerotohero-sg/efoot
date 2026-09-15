'use client'

import React from 'react'
import { buildCardStylePitchPlan } from '@/lib/cardAdvisorStylePitch'

function displayShortName(name) {
  const raw = String(name || '').trim()
  if (!raw) return ''
  const parts = raw.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 10)
  return (parts[parts.length - 1] || parts[0]).slice(0, 10)
}

function curvedPath(from, to, bend = 8) {
  const mx = (from.x + to.x) / 2
  const my = (from.y + to.y) / 2
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy) || 1
  const cx = mx - (dy / len) * bend
  const cy = my + (dx / len) * bend
  return `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`
}

/**
 * Mini pitch that simulates movement + passes from card playing style.
 */
export default function CardAdvisorStylePitch({ card, labels, lang = 'it' }) {
  const uid = React.useId().replace(/:/g, '')
  const plan = React.useMemo(
    () => buildCardStylePitchPlan(card, lang === 'es' ? 'es' : lang === 'en' ? 'en' : 'it'),
    [card, lang]
  )

  if (!card) return null

  const movePath = curvedPath(plan.home, plan.move, plan.styleKey === 'roaming' ? 14 : 7)
  const name = displayShortName(card.name)
  const role = plan.home.role || card.position || '?'
  const styleLabel = card.style && card.style !== 'Profilo da analizzare' ? card.style : null

  return (
    <section className="ca-style-pitch" aria-label={labels.stylePitchTitle}>
      <div className="ca-style-pitch-head">
        <div>
          <span className="ca-style-pitch-kicker">{labels.stylePitchKicker}</span>
          <h3>{labels.stylePitchTitle}</h3>
        </div>
        {styleLabel ? <span className="ca-style-pitch-style">{styleLabel}</span> : null}
      </div>

      <div className="ca-style-pitch-field">
        <svg className="ca-style-pitch-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id={`caGrass-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#124a28" />
              <stop offset="55%" stopColor="#0c3420" />
              <stop offset="100%" stopColor="#082418" />
            </linearGradient>
            <linearGradient id={`caStripe-${uid}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.06)" />
            </linearGradient>
            <marker id={`caPassHead-${uid}`} markerWidth="4" markerHeight="4" refX="3.2" refY="2" orient="auto">
              <path d="M0,0 L4,2 L0,4 z" fill="rgba(251,191,36,0.95)" />
            </marker>
            <marker id={`caMoveHead-${uid}`} markerWidth="4.5" markerHeight="4.5" refX="3.5" refY="2.2" orient="auto">
              <path d="M0,0 L4.5,2.2 L0,4.4 z" fill="#7dd3a8" />
            </marker>
          </defs>

          <rect x="0" y="0" width="100" height="100" fill={`url(#caGrass-${uid})`} rx="3" />
          {[0, 16.6, 33.2, 49.8, 66.4, 83].map((x) => (
            <rect key={x} x={x} y="0" width="8.3" height="100" fill={`url(#caStripe-${uid})`} opacity="0.55" />
          ))}

          <g fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.45">
            <rect x="3" y="3" width="94" height="94" rx="1.2" />
            <line x1="3" y1="50" x2="97" y2="50" />
            <circle cx="50" cy="50" r="9" />
            <circle cx="50" cy="50" r="0.7" fill="rgba(255,255,255,0.55)" stroke="none" />
            <rect x="28" y="3" width="44" height="14" />
            <rect x="38" y="3" width="24" height="6" />
            <path d="M 40 17 A 9 9 0 0 0 60 17" />
            <rect x="28" y="83" width="44" height="14" />
            <rect x="38" y="91" width="24" height="6" />
            <path d="M 40 83 A 9 9 0 0 1 60 83" />
          </g>

          {plan.ghost ? (
            <circle
              className="ca-style-pitch-ghost"
              cx={plan.ghost.x}
              cy={plan.ghost.y}
              r="2.2"
              fill="rgba(255,255,255,0.18)"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="0.35"
              strokeDasharray="1.2 1"
            />
          ) : null}

          {plan.passes.map((pass, index) => (
            <path
              key={`${pass.kind}-${index}`}
              className={`ca-style-pitch-pass ca-style-pitch-pass-${pass.kind}`}
              d={curvedPath(pass.from, pass.to, pass.kind === 'cross' ? 12 : 6)}
              fill="none"
              stroke={pass.kind === 'cross' ? 'rgba(251,191,36,0.9)' : pass.kind === 'switch' ? 'rgba(147,197,253,0.9)' : 'rgba(250,204,21,0.85)'}
              strokeWidth="0.7"
              strokeDasharray="2.2 1.4"
              markerEnd={`url(#caPassHead-${uid})`}
              style={{ animationDelay: `${0.35 + index * 0.35}s` }}
            />
          ))}

          <path
            className="ca-style-pitch-move"
            d={movePath}
            fill="none"
            stroke="#7dd3a8"
            strokeWidth="0.85"
            strokeLinecap="round"
            markerEnd={`url(#caMoveHead-${uid})`}
          />

          {/* Start + end dots */}
          <circle cx={plan.home.x} cy={plan.home.y} r="1.1" fill="rgba(125,211,168,0.55)" />
          <circle cx={plan.move.x} cy={plan.move.y} r="1.3" fill="#7dd3a8" />
        </svg>

        <div
          className="ca-style-pitch-token"
          style={{ left: `${plan.home.x}%`, top: `${plan.home.y}%` }}
        >
          <span className="ca-style-pitch-token-role">{role}</span>
          <span className="ca-style-pitch-token-name">{name || role}</span>
        </div>

        <div
          className="ca-style-pitch-token ca-style-pitch-token-end"
          style={{ left: `${plan.move.x}%`, top: `${plan.move.y}%` }}
          aria-hidden="true"
        >
          <span className="ca-style-pitch-token-role">{role}</span>
        </div>
      </div>

      <p className="ca-style-pitch-caption">{plan.caption}</p>
      <div className="ca-style-pitch-legend" aria-hidden="true">
        <span><i className="ca-leg-move" />{labels.stylePitchMove}</span>
        <span><i className="ca-leg-pass" />{labels.stylePitchPass}</span>
      </div>
    </section>
  )
}
