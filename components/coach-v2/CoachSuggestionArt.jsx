'use client'

import React from 'react'

function StatsArt() {
  return (
    <svg viewBox="0 0 240 116" className="artSvg" aria-hidden="true">
      <defs>
        <linearGradient id="statsArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00A8C8" stopOpacity="0.24" />
          <stop offset="100%" stopColor="#00A8C8" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="statsAccent" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00A8C8" />
          <stop offset="100%" stopColor="#2878E0" />
        </linearGradient>
      </defs>
      <rect x="8" y="10" width="224" height="96" rx="20" fill="#F4FBFC" stroke="rgba(0,168,200,.16)" />
      <path d="M30 84H212M30 62H212M30 40H212" stroke="rgba(29,29,31,.06)" />
      <path d="M48 92V28M88 92V28M128 92V28M168 92V28" stroke="rgba(29,29,31,.045)" />
      <path d="M32 82 C58 78 70 67 88 69 C110 72 116 49 137 52 C158 55 169 34 188 38 C198 40 205 28 212 24 L212 92 L32 92 Z" fill="url(#statsArea)" />
      <path d="M32 82 C58 78 70 67 88 69 C110 72 116 49 137 52 C158 55 169 34 188 38 C198 40 205 28 212 24" fill="none" stroke="url(#statsAccent)" strokeWidth="3" strokeLinecap="round" />
      {[32, 88, 137, 188, 212].map((x, i) => {
        const ys = [82, 69, 52, 38, 24]
        return <circle key={x} cx={x} cy={ys[i]} r="4.5" fill="#FFFFFF" stroke={i > 2 ? '#2878E0' : '#00A8C8'} strokeWidth="2.5" />
      })}
      <rect x="28" y="21" width="42" height="18" rx="9" fill="#FFFFFF" stroke="rgba(0,0,0,.07)" />
      <circle cx="39" cy="30" r="4" fill="#27A76A" />
      <path d="M49 30H61" stroke="#1D1D1F" strokeOpacity=".55" strokeWidth="2" strokeLinecap="round" />
      <rect x="169" y="70" width="40" height="18" rx="9" fill="#FFFFFF" stroke="rgba(0,0,0,.07)" />
      <path d="M178 80L185 73L190 77L199 68" fill="none" stroke="#C99630" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MatchArt() {
  return (
    <svg viewBox="0 0 240 116" className="artSvg" aria-hidden="true">
      <defs>
        <radialGradient id="matchHalo" cx="46%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#27A76A" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#27A76A" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="matchLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#27A76A" />
          <stop offset="100%" stopColor="#00A8C8" />
        </linearGradient>
      </defs>
      <rect x="8" y="10" width="224" height="96" rx="20" fill="#F5FAF7" stroke="rgba(39,167,106,.16)" />
      <circle cx="90" cy="58" r="44" fill="url(#matchHalo)" />
      <circle cx="90" cy="58" r="30" fill="#FFFFFF" stroke="rgba(39,167,106,.18)" strokeWidth="2" />
      <circle cx="90" cy="58" r="18" fill="#FBFBFA" stroke="#27A76A" strokeWidth="2.5" />
      <path d="M90 40L101 48L97 61L90 68L81 61L79 48Z" fill="none" stroke="#1D1D1F" strokeOpacity=".58" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M79 48L68 54M101 48L112 54M81 61L74 73M97 61L106 72" stroke="#1D1D1F" strokeOpacity=".28" strokeWidth="1.4" />
      <path d="M128 79 C145 79 149 66 160 66 C172 66 177 48 191 48 C200 48 205 40 214 38" fill="none" stroke="url(#matchLine)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="128" cy="79" r="3.5" fill="#27A76A" />
      <circle cx="160" cy="66" r="3.5" fill="#27A76A" />
      <circle cx="191" cy="48" r="3.5" fill="#00A8C8" />
      <circle cx="214" cy="38" r="4" fill="#FFFFFF" stroke="#00A8C8" strokeWidth="2" />
      <rect x="136" y="23" width="70" height="15" rx="7.5" fill="#FFFFFF" stroke="rgba(0,0,0,.06)" />
      <rect x="143" y="28" width="25" height="5" rx="2.5" fill="#27A76A" />
      <rect x="173" y="28" width="25" height="5" rx="2.5" fill="#DCE4E0" />
    </svg>
  )
}

function TacticsArt() {
  return (
    <svg viewBox="0 0 240 116" className="artSvg" aria-hidden="true">
      <defs>
        <linearGradient id="boardFill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFF8EA" />
          <stop offset="100%" stopColor="#FFFDF8" />
        </linearGradient>
        <filter id="tacticShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="5" stdDeviation="6" floodColor="#8D6419" floodOpacity="0.12" />
        </filter>
      </defs>
      <rect x="18" y="13" width="204" height="90" rx="18" fill="url(#boardFill)" stroke="rgba(201,150,48,.24)" filter="url(#tacticShadow)" />
      <rect x="43" y="24" width="144" height="68" rx="10" fill="#FFFFFF" stroke="rgba(201,150,48,.22)" />
      <path d="M115 24V92M43 58H187" stroke="rgba(201,150,48,.18)" />
      <circle cx="115" cy="58" r="12" fill="none" stroke="rgba(201,150,48,.22)" />
      <path d="M43 39H62V77H43M187 39H168V77H187" fill="none" stroke="rgba(201,150,48,.18)" />
      <circle cx="73" cy="71" r="7" fill="#1D1D1F" />
      <circle cx="109" cy="66" r="7" fill="#C99630" />
      <circle cx="145" cy="43" r="7" fill="#1D1D1F" />
      <circle cx="164" cy="70" r="7" fill="#C99630" />
      <circle cx="92" cy="43" r="7" fill="#C99630" />
      <path d="M78 68 C87 62 93 60 102 62" fill="none" stroke="#C99630" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M114 61 C124 55 133 49 139 46" fill="none" stroke="#C99630" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="5 5" />
      <path d="M116 66 C133 67 144 68 157 69" fill="none" stroke="#C99630" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M137 42L144 43L141 50M155 65L164 70L157 75M99 58L109 66L99 69" fill="none" stroke="#C99630" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="176" y="18" width="27" height="34" rx="8" fill="#FFFFFF" stroke="rgba(201,150,48,.22)" />
      <path d="M183 28H196M183 34H193M183 40H198" stroke="#C99630" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export default function CoachSuggestionArt({ intent = 'stats' }) {
  if (intent === 'match') return <MatchArt />
  if (intent === 'tactics') return <TacticsArt />
  return <StatsArt />
}
