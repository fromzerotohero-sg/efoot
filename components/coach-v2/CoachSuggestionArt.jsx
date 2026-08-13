'use client'

import React from 'react'

export default function CoachSuggestionArt({ intent = 'analyze' }) {
  if (intent === 'stats') {
    return (
      <svg viewBox="0 0 160 88" className="artSvg" aria-hidden="true">
        <rect x="28" y="48" width="18" height="24" rx="4" fill="#00A8C8" fillOpacity="0.28" />
        <rect x="54" y="34" width="18" height="38" rx="4" fill="#00A8C8" fillOpacity="0.55" />
        <rect x="80" y="22" width="18" height="50" rx="4" fill="#00A8C8" />
        <rect x="106" y="30" width="18" height="42" rx="4" fill="#2878E0" fillOpacity="0.7" />
        <path d="M32 70 H128" stroke="#1D1D1F" strokeOpacity="0.12" />
      </svg>
    )
  }

  if (intent === 'match') {
    return (
      <svg viewBox="0 0 160 88" className="artSvg" aria-hidden="true">
        <circle cx="80" cy="44" r="26" fill="#F7FBF8" stroke="#27A76A" strokeWidth="2" />
        <path
          d="M80 18 C92 28 96 44 80 70 C64 44 68 28 80 18 Z"
          fill="none"
          stroke="#1D1D1F"
          strokeOpacity="0.45"
          strokeWidth="1.2"
        />
        <path d="M58 32 H102 M58 56 H102" fill="none" stroke="#1D1D1F" strokeOpacity="0.28" />
        <circle cx="80" cy="44" r="6" fill="none" stroke="#27A76A" strokeOpacity="0.55" />
      </svg>
    )
  }

  if (intent === 'tactics') {
    return (
      <svg viewBox="0 0 160 88" className="artSvg" aria-hidden="true">
        <rect x="22" y="14" width="116" height="60" rx="8" fill="none" stroke="#C99630" strokeOpacity="0.45" />
        <path d="M80 14 V74 M22 44 H138" stroke="#C99630" strokeOpacity="0.22" />
        <circle cx="46" cy="58" r="5" fill="#C99630" />
        <circle cx="80" cy="48" r="5" fill="#1D1D1F" fillOpacity="0.75" />
        <circle cx="114" cy="28" r="5" fill="#C99630" />
        <path d="M51 54 L75 50" stroke="#C99630" strokeWidth="1.6" />
        <path d="M85 44 L109 32" stroke="#C99630" strokeWidth="1.6" />
        <path d="M107 30 L116 26 L111 36" fill="none" stroke="#C99630" strokeWidth="1.5" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 160 88" className="artSvg" aria-hidden="true">
      <ellipse cx="80" cy="46" rx="52" ry="28" fill="#00A8C8" fillOpacity="0.08" stroke="#00A8C8" strokeOpacity="0.28" />
      <circle cx="80" cy="24" r="4.5" fill="#00A8C8" />
      <circle cx="50" cy="42" r="4.5" fill="#2878E0" />
      <circle cx="110" cy="42" r="4.5" fill="#2878E0" />
      <circle cx="60" cy="64" r="4.5" fill="#1D1D1F" fillOpacity="0.7" />
      <circle cx="100" cy="64" r="4.5" fill="#1D1D1F" fillOpacity="0.7" />
      <path
        d="M80 24 L50 42 L60 64 L100 64 L110 42 Z"
        fill="none"
        stroke="#00A8C8"
        strokeOpacity="0.55"
        strokeWidth="1.4"
      />
    </svg>
  )
}
