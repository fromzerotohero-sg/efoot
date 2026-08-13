'use client'

import React from 'react'

const TONES = {
  cyan: { accent: '#00A7C4', bright: '#18CBE6', ink: '#10303A', bg1: '#E9F9FC', bg2: '#F8FDFE' },
  green: { accent: '#269966', bright: '#54D79D', ink: '#123126', bg1: '#ECF9F2', bg2: '#FAFEFC' },
  gold: { accent: '#B27C1F', bright: '#E7B64C', ink: '#3B2A10', bg1: '#FFF5E2', bg2: '#FFFDF8' }
}

function Frame({ tone, children }) {
  const c = TONES[tone]
  return (
    <svg viewBox="0 0 220 150" preserveAspectRatio="xMidYMid meet" className="artSvg" aria-hidden="true">
      <defs>
        <linearGradient id={`hud-bg-${tone}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={c.bg1} />
          <stop offset="100%" stopColor={c.bg2} />
        </linearGradient>
        <linearGradient id={`hud-line-${tone}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={c.accent} />
          <stop offset="100%" stopColor={c.bright} />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="216" height="146" rx="22" fill={`url(#hud-bg-${tone})`} />
      <rect x="2.5" y="2.5" width="215" height="145" rx="21.5" fill="none" stroke={c.ink} strokeOpacity=".08" />
      <path d="M18 20h18M18 20v18M202 20h-18M202 20v18M18 130h18M18 130v-18M202 130h-18M202 130v-18" stroke={c.accent} strokeOpacity=".55" strokeWidth="1.6" />
      {children(c)}
    </svg>
  )
}

function StatsArt() {
  return (
    <Frame tone="cyan">
      {(c) => (
        <>
          <g transform="translate(18 25)">
            <rect width="78" height="98" rx="17" fill="#FFFFFF" stroke={c.ink} strokeOpacity=".09" />
            <path d="M12 49H66M39 12V86" stroke={c.ink} strokeOpacity=".11" />
            <circle cx="39" cy="49" r="15" fill="none" stroke={c.ink} strokeOpacity=".12" />
            {[ [20,73],[33,67],[48,73],[59,63],[24,42],[42,48],[57,35],[39,24] ].map(([x,y],i)=><circle key={i} cx={x} cy={y} r={i===7?5:4.2} fill={i<4?c.accent:'#2F7BE5'} />)}
          </g>
          <g transform="translate(112 28)">
            <rect width="88" height="35" rx="12" fill="#FFFFFF" stroke={c.ink} strokeOpacity=".08" />
            <circle cx="17" cy="17.5" r="9" fill="none" stroke={c.accent} strokeOpacity=".24" strokeWidth="5" />
            <path d="M17 8.5a9 9 0 0 1 8 5" fill="none" stroke={c.bright} strokeWidth="5" strokeLinecap="round" />
            <rect x="34" y="11" width="39" height="5" rx="2.5" fill={c.ink} fillOpacity=".18" />
            <rect x="34" y="21" width="27" height="4" rx="2" fill={c.accent} fillOpacity=".55" />
          </g>
          <g transform="translate(111 77)">
            <path d="M2 43C18 39 22 31 34 33C48 36 52 22 64 24C75 26 81 12 89 8" fill="none" stroke={`url(#hud-line-cyan)`} strokeWidth="4" strokeLinecap="round" />
            {[ [2,43],[34,33],[64,24],[89,8] ].map(([x,y],i)=><circle key={i} cx={x} cy={y} r={i===3?5:3.8} fill="#FFFFFF" stroke={i===3?'#269966':c.accent} strokeWidth="2.5" />)}
            <path d="M5 55H86" stroke={c.ink} strokeOpacity=".12" strokeWidth="1.5" />
          </g>
        </>
      )}
    </Frame>
  )
}

function MatchArt() {
  return (
    <Frame tone="green">
      {(c) => (
        <>
          <g transform="translate(18 21)">
            <rect width="116" height="108" rx="19" fill="#FFFFFF" stroke={c.ink} strokeOpacity=".09" />
            <path d="M10 54H106M58 10V98" stroke={c.ink} strokeOpacity=".12" />
            <circle cx="58" cy="54" r="21" fill="none" stroke={c.ink} strokeOpacity=".12" />
            <path d="M10 31H28V77H10M106 31H88V77H106" fill="none" stroke={c.ink} strokeOpacity=".10" />
            <circle cx="58" cy="54" r="29" fill={c.accent} fillOpacity=".08" stroke={c.accent} strokeOpacity=".2" />
            <circle cx="58" cy="54" r="16" fill="#FFFFFF" stroke={c.accent} strokeWidth="2.8" />
            <path d="M58 43l8 5-2 9-6 5-7-5-2-9 9-5Z" fill="none" stroke={c.ink} strokeWidth="1.8" />
          </g>
          <g transform="translate(148 30)">
            <circle cx="22" cy="22" r="20" fill="#FFFFFF" stroke={c.ink} strokeOpacity=".08" />
            <circle cx="22" cy="22" r="13" fill="none" stroke={c.accent} strokeOpacity=".2" strokeWidth="5" />
            <path d="M22 9a13 13 0 0 1 12 8" fill="none" stroke={c.bright} strokeWidth="5" strokeLinecap="round" />
          </g>
          <g transform="translate(145 83)">
            <path d="M2 34C14 31 18 24 28 26C39 29 43 18 52 19C61 20 65 11 73 7" fill="none" stroke={`url(#hud-line-green)`} strokeWidth="3.5" strokeLinecap="round" />
            <circle cx="2" cy="34" r="3.5" fill={c.accent}/><circle cx="28" cy="26" r="3.5" fill={c.accent}/><circle cx="52" cy="19" r="3.5" fill={c.bright}/><circle cx="73" cy="7" r="4.5" fill="#FFFFFF" stroke={c.accent} strokeWidth="2"/>
          </g>
        </>
      )}
    </Frame>
  )
}

function TacticsArt() {
  return (
    <Frame tone="gold">
      {(c) => (
        <>
          <g transform="translate(17 20)">
            <rect width="148" height="110" rx="19" fill="#FFFFFF" stroke={c.ink} strokeOpacity=".09" />
            <path d="M74 9V101M9 55H139" stroke={c.ink} strokeOpacity=".11" />
            <circle cx="74" cy="55" r="18" fill="none" stroke={c.ink} strokeOpacity=".11" />
            <path d="M9 31H30V79H9M139 31H118V79H139" fill="none" stroke={c.ink} strokeOpacity=".09" />
            {[[31,85],[61,76],[88,55],[119,69]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="7" fill={c.bright} stroke="#FFFFFF" strokeWidth="2" />)}
            {[[45,39],[83,30],[116,38]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="6.5" fill="#94A0A5" />)}
            <path d="M38 81C47 77 53 75 56 76M68 72C76 67 82 61 84 57M96 57C106 59 113 63 117 66" fill="none" stroke={c.accent} strokeWidth="3" strokeLinecap="round" strokeDasharray="5 4" />
            <path d="m52 71 10 6-8 8M80 52l10 5-6 9M112 60l10 7-9 7" fill="none" stroke={c.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <g transform="translate(178 31)">
            <rect width="27" height="59" rx="10" fill="#FFFFFF" stroke={c.ink} strokeOpacity=".08" />
            <rect x="7" y="11" width="13" height="5" rx="2.5" fill={c.bright} />
            <rect x="7" y="23" width="12" height="4" rx="2" fill={c.ink} fillOpacity=".18" />
            <rect x="7" y="33" width="13" height="4" rx="2" fill={c.ink} fillOpacity=".12" />
            <rect x="7" y="43" width="9" height="4" rx="2" fill={c.ink} fillOpacity=".12" />
          </g>
          <circle cx="191" cy="112" r="11" fill={c.bright} fillOpacity=".16" />
          <path d="M185 112l4 4 8-9" fill="none" stroke={c.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </Frame>
  )
}

export default function CoachSuggestionArt({ intent = 'stats' }) {
  if (intent === 'match') return <MatchArt />
  if (intent === 'tactics') return <TacticsArt />
  return <StatsArt />
}
