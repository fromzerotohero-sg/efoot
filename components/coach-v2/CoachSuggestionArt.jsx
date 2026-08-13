'use client'

import React from 'react'

function StatsArt() {
  return (
    <svg viewBox="0 0 260 132" className="artSvg" aria-hidden="true">
      <defs>
        <linearGradient id="statsBg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#111C24" /><stop offset="100%" stopColor="#0A1218" /></linearGradient>
        <linearGradient id="statsLine" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#28D7FF" /><stop offset="100%" stopColor="#4A8DFF" /></linearGradient>
        <linearGradient id="statsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#28D7FF" stopOpacity=".28" /><stop offset="100%" stopColor="#28D7FF" stopOpacity="0" /></linearGradient>
        <filter id="statsGlow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3.2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <rect x="5" y="5" width="250" height="122" rx="22" fill="url(#statsBg)" />
      <rect x="5.5" y="5.5" width="249" height="121" rx="21.5" fill="none" stroke="#FFFFFF" strokeOpacity=".08" />
      <path d="M18 25H242M18 50H242M18 75H242M18 100H242" stroke="#FFFFFF" strokeOpacity=".035" />
      <path d="M49 15V117M92 15V117M135 15V117M178 15V117M221 15V117" stroke="#FFFFFF" strokeOpacity=".025" />
      <g transform="translate(18 18)">
        <rect width="78" height="96" rx="16" fill="#FFFFFF" fillOpacity=".055" stroke="#FFFFFF" strokeOpacity=".07" />
        <path d="M14 67H64M14 49H64M14 31H64" stroke="#FFFFFF" strokeOpacity=".07" />
        <path d="M18 76V55M31 76V63M44 76V42M57 76V50" stroke="#28D7FF" strokeOpacity=".48" strokeWidth="6" strokeLinecap="round" />
        <circle cx="58" cy="23" r="10" fill="#28D7FF" fillOpacity=".11" stroke="#28D7FF" strokeOpacity=".42" />
        <path d="M54 23L57 26L63 18" fill="none" stroke="#62E8B1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="14" y="84" width="32" height="4" rx="2" fill="#FFFFFF" fillOpacity=".16" />
      </g>
      <g transform="translate(106 18)">
        <rect width="136" height="96" rx="16" fill="#FFFFFF" fillOpacity=".045" stroke="#FFFFFF" strokeOpacity=".07" />
        <path d="M14 72 C30 70 34 58 48 61 C64 65 70 42 86 46 C104 50 111 31 124 25 L124 82 L14 82Z" fill="url(#statsFill)" />
        <path d="M14 72 C30 70 34 58 48 61 C64 65 70 42 86 46 C104 50 111 31 124 25" fill="none" stroke="url(#statsLine)" strokeWidth="3" strokeLinecap="round" filter="url(#statsGlow)" />
        <circle cx="14" cy="72" r="3.5" fill="#111C24" stroke="#28D7FF" strokeWidth="2" /><circle cx="48" cy="61" r="3.5" fill="#111C24" stroke="#28D7FF" strokeWidth="2" /><circle cx="86" cy="46" r="3.5" fill="#111C24" stroke="#4A8DFF" strokeWidth="2" /><circle cx="124" cy="25" r="4.5" fill="#111C24" stroke="#62E8B1" strokeWidth="2.2" />
        <rect x="14" y="14" width="44" height="7" rx="3.5" fill="#FFFFFF" fillOpacity=".12" /><rect x="63" y="14" width="22" height="7" rx="3.5" fill="#28D7FF" fillOpacity=".55" /><path d="M20 90H116" stroke="#FFFFFF" strokeOpacity=".08" />
      </g>
      <circle cx="232" cy="112" r="9" fill="#28D7FF" fillOpacity=".12" /><path d="M228 112L231 115L236 108" fill="none" stroke="#62E8B1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MatchArt() {
  return (
    <svg viewBox="0 0 260 132" className="artSvg" aria-hidden="true">
      <defs>
        <linearGradient id="matchBg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#111D1A" /><stop offset="100%" stopColor="#091411" /></linearGradient>
        <radialGradient id="ballHalo" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#62E8B1" stopOpacity=".26" /><stop offset="100%" stopColor="#62E8B1" stopOpacity="0" /></radialGradient>
        <linearGradient id="pulseLine" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#62E8B1" /><stop offset="100%" stopColor="#28D7FF" /></linearGradient>
      </defs>
      <rect x="5" y="5" width="250" height="122" rx="22" fill="url(#matchBg)" /><rect x="5.5" y="5.5" width="249" height="121" rx="21.5" fill="none" stroke="#FFFFFF" strokeOpacity=".08" />
      <path d="M18 66H242M130 18V114" stroke="#FFFFFF" strokeOpacity=".055" /><circle cx="130" cy="66" r="27" fill="none" stroke="#FFFFFF" strokeOpacity=".055" /><path d="M18 37H43V95H18M242 37H217V95H242" fill="none" stroke="#FFFFFF" strokeOpacity=".045" />
      <circle cx="92" cy="66" r="46" fill="url(#ballHalo)" /><circle cx="92" cy="66" r="32" fill="none" stroke="#62E8B1" strokeOpacity=".16" strokeWidth="1.4" /><circle cx="92" cy="66" r="24" fill="#101A17" stroke="#62E8B1" strokeOpacity=".5" strokeWidth="2" /><circle cx="92" cy="66" r="16" fill="#F8FAF9" />
      <path d="M92 52L101 58L99 68L92 74L84 68L83 58Z" fill="none" stroke="#12211D" strokeWidth="1.8" strokeLinejoin="round" /><path d="M83 58L75 62M101 58L109 62M84 68L79 76M99 68L105 76" stroke="#12211D" strokeOpacity=".55" strokeWidth="1.2" />
      <g transform="translate(139 26)"><rect width="93" height="33" rx="12" fill="#FFFFFF" fillOpacity=".055" stroke="#FFFFFF" strokeOpacity=".07" /><circle cx="15" cy="16.5" r="5" fill="#62E8B1" fillOpacity=".85" /><rect x="27" y="11" width="48" height="5" rx="2.5" fill="#FFFFFF" fillOpacity=".17" /><rect x="27" y="20" width="32" height="4" rx="2" fill="#FFFFFF" fillOpacity=".08" /></g>
      <g transform="translate(139 69)"><path d="M0 27 C15 26 19 18 31 19 C44 20 50 8 61 10 C72 12 78 2 91 3" fill="none" stroke="url(#pulseLine)" strokeWidth="3" strokeLinecap="round" /><circle cx="0" cy="27" r="3" fill="#62E8B1" /><circle cx="31" cy="19" r="3" fill="#62E8B1" /><circle cx="61" cy="10" r="3" fill="#28D7FF" /><circle cx="91" cy="3" r="4" fill="#0D1713" stroke="#28D7FF" strokeWidth="2" /></g>
      <path d="M45 31C56 23 66 20 79 20M45 101C56 109 66 112 79 112" fill="none" stroke="#FFFFFF" strokeOpacity=".08" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function TacticsArt() {
  return (
    <svg viewBox="0 0 260 132" className="artSvg" aria-hidden="true">
      <defs><linearGradient id="tacticsBg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#1C1A15" /><stop offset="100%" stopColor="#0F0E0C" /></linearGradient><linearGradient id="goldLine" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#F3C45D" /><stop offset="100%" stopColor="#C99630" /></linearGradient></defs>
      <rect x="5" y="5" width="250" height="122" rx="22" fill="url(#tacticsBg)" /><rect x="5.5" y="5.5" width="249" height="121" rx="21.5" fill="none" stroke="#FFFFFF" strokeOpacity=".08" />
      <g transform="translate(18 15)"><rect width="171" height="102" rx="16" fill="#FFFFFF" fillOpacity=".035" stroke="#F3C45D" strokeOpacity=".18" /><path d="M85.5 0V102M0 51H171" stroke="#F3C45D" strokeOpacity=".12" /><circle cx="85.5" cy="51" r="16" fill="none" stroke="#F3C45D" strokeOpacity=".14" /><path d="M0 29H26V73H0M171 29H145V73H171" fill="none" stroke="#F3C45D" strokeOpacity=".11" />
        <circle cx="42" cy="72" r="7" fill="#F3C45D" /><circle cx="78" cy="61" r="7" fill="#F3C45D" /><circle cx="112" cy="36" r="7" fill="#F3C45D" /><circle cx="136" cy="70" r="7" fill="#F3C45D" /><circle cx="70" cy="31" r="6" fill="#D8D8D3" fillOpacity=".75" /><circle cx="116" cy="78" r="6" fill="#D8D8D3" fillOpacity=".75" />
        <path d="M48 69 C57 63 63 60 71 61" fill="none" stroke="url(#goldLine)" strokeWidth="2.7" strokeLinecap="round" /><path d="M84 56 C94 50 101 44 107 39" fill="none" stroke="url(#goldLine)" strokeWidth="2.7" strokeLinecap="round" strokeDasharray="5 5" /><path d="M85 62 C101 65 114 67 128 69" fill="none" stroke="url(#goldLine)" strokeWidth="2.7" strokeLinecap="round" /><path d="M106 35L113 36L110 43M126 65L136 70L128 76M69 57L78 61L71 67" fill="none" stroke="#F3C45D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <g transform="translate(199 21)"><rect width="40" height="55" rx="12" fill="#FFFFFF" fillOpacity=".055" stroke="#FFFFFF" strokeOpacity=".08" /><rect x="9" y="11" width="22" height="5" rx="2.5" fill="#F3C45D" fillOpacity=".8" /><rect x="9" y="22" width="16" height="4" rx="2" fill="#FFFFFF" fillOpacity=".16" /><rect x="9" y="31" width="22" height="4" rx="2" fill="#FFFFFF" fillOpacity=".1" /><rect x="9" y="40" width="12" height="4" rx="2" fill="#FFFFFF" fillOpacity=".1" /></g>
      <g transform="translate(199 86)"><circle cx="10" cy="10" r="10" fill="#F3C45D" fillOpacity=".12" /><path d="M5 11L9 15L16 6" fill="none" stroke="#F3C45D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><rect x="25" y="6" width="17" height="4" rx="2" fill="#FFFFFF" fillOpacity=".13" /><rect x="25" y="14" width="11" height="4" rx="2" fill="#FFFFFF" fillOpacity=".08" /></g>
    </svg>
  )
}

export default function CoachSuggestionArt({ intent = 'stats' }) {
  if (intent === 'match') return <MatchArt />
  if (intent === 'tactics') return <TacticsArt />
  return <StatsArt />
}
