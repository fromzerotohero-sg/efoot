'use client'

import React from 'react'

export default function CoachSuggestionArt({ intent = 'rosa' }) {
  if (intent === 'match') {
    return (
      <svg viewBox="0 0 160 88" className="artSvg" aria-hidden="true">
        <defs>
          <radialGradient id="matchGlow" cx="50%" cy="48%" r="48%">
            <stop offset="0%" stopColor="#27A76A" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#27A76A" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="160" height="88" fill="url(#matchGlow)" />
        <circle cx="80" cy="44" r="30" fill="none" stroke="#27A76A" strokeOpacity="0.16" strokeWidth="1.5" />
        <circle cx="80" cy="44" r="22" fill="none" stroke="#27A76A" strokeOpacity="0.28" strokeWidth="1.5" />
        <circle cx="80" cy="44" r="16" fill="#F7FBF8" stroke="#27A76A" strokeWidth="1.8" />
        <path
          d="M80 28 L88 34 L86 44 L80 50 L74 44 L72 34 Z"
          fill="none"
          stroke="#1D1D1F"
          strokeOpacity="0.55"
          strokeWidth="1.2"
        />
        <path d="M72 34 H88 M74 44 H86" fill="none" stroke="#1D1D1F" strokeOpacity="0.35" strokeWidth="1" />
        <circle cx="118" cy="28" r="3" fill="#27A76A" fillOpacity="0.7" />
        <circle cx="42" cy="58" r="2.5" fill="#00A8C8" fillOpacity="0.45" />
      </svg>
    )
  }

  if (intent === 'tactics') {
    return (
      <svg viewBox="0 0 160 88" className="artSvg" aria-hidden="true">
        <defs>
          <linearGradient id="goldWash" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#C99630" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#C99630" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect x="18" y="12" width="124" height="64" rx="8" fill="url(#goldWash)" stroke="#C99630" strokeOpacity="0.35" />
        <path d="M80 12 V76 M18 44 H142" stroke="#C99630" strokeOpacity="0.22" strokeWidth="1" />
        <circle cx="48" cy="58" r="4" fill="#C99630" />
        <circle cx="80" cy="50" r="4" fill="#1D1D1F" fillOpacity="0.72" />
        <circle cx="112" cy="28" r="4" fill="#C99630" />
        <path d="M52 54 L76 50" stroke="#C99630" strokeWidth="1.6" markerEnd="url(#arr)" />
        <path d="M84 46 L108 32" stroke="#C99630" strokeWidth="1.6" />
        <path d="M106 30 L114 26 L110 36" fill="none" stroke="#C99630" strokeWidth="1.5" />
        <rect x="122" y="16" width="14" height="18" rx="2" fill="#FCFAF7" stroke="#C99630" strokeOpacity="0.55" />
        <path d="M125 21 H133 M125 25 H131" stroke="#C99630" strokeOpacity="0.7" strokeWidth="1" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 160 88" className="artSvg" aria-hidden="true">
      <defs>
        <linearGradient id="rosaWash" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00A8C8" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#2878E0" stopOpacity="0.08" />
        </linearGradient>
      </defs>
      <ellipse cx="80" cy="46" rx="54" ry="30" fill="url(#rosaWash)" stroke="#00A8C8" strokeOpacity="0.28" />
      <path d="M80 16 V76 M26 46 H134" stroke="#2878E0" strokeOpacity="0.2" />
      <circle cx="80" cy="46" r="8" fill="none" stroke="#00A8C8" strokeOpacity="0.45" />
      <circle cx="80" cy="22" r="4.5" fill="#00A8C8" />
      <circle cx="48" cy="40" r="4.5" fill="#2878E0" />
      <circle cx="112" cy="40" r="4.5" fill="#2878E0" />
      <circle cx="58" cy="64" r="4.5" fill="#1D1D1F" fillOpacity="0.7" />
      <circle cx="102" cy="64" r="4.5" fill="#1D1D1F" fillOpacity="0.7" />
      <path
        d="M80 26 L48 40 L58 64 L102 64 L112 40 Z"
        fill="none"
        stroke="#00A8C8"
        strokeOpacity="0.45"
        strokeWidth="1.2"
      />
    </svg>
  )
}
