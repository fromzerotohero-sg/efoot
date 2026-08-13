'use client'

import React from 'react'

const TONES = {
  cyan: { accent: '#009DB8', bright: '#1BCFE8', ink: '#10303A', bg1: '#E8F8FB', bg2: '#FBFEFF' },
  green: { accent: '#218E5E', bright: '#4ED397', ink: '#123126', bg1: '#EAF8F1', bg2: '#FBFEFC' },
  gold: { accent: '#A97418', bright: '#E4AE39', ink: '#3B2A10', bg1: '#FFF4DE', bg2: '#FFFDF8' }
}

function Frame({ tone, children }) {
  const c = TONES[tone]
  return (
    <svg viewBox="0 0 220 150" preserveAspectRatio="xMidYMid slice" className="artSvg" aria-hidden="true">
      <defs>
        <linearGradient id={`hud-bg-${tone}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={c.bg1}/><stop offset="100%" stopColor={c.bg2}/></linearGradient>
        <linearGradient id={`hud-line-${tone}`} x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor={c.accent}/><stop offset="100%" stopColor={c.bright}/></linearGradient>
      </defs>
      <rect width="220" height="150" rx="22" fill={`url(#hud-bg-${tone})`} />
      <path d="M17 20h16M17 20v16M203 20h-16M203 20v16M17 130h16M17 130v-16M203 130h-16M203 130v-16" stroke={c.accent} strokeOpacity=".5" strokeWidth="1.6" />
      {children(c)}
    </svg>
  )
}

function StatsArt() {
  return <Frame tone="cyan">{(c) => <>
    <rect x="39" y="25" width="142" height="100" rx="18" fill="#FFF" stroke={c.ink} strokeOpacity=".09"/>
    <path d="M52 102H168M52 79H168M52 56H168" stroke={c.ink} strokeOpacity=".08"/>
    <path d="M58 105C73 101 79 90 91 93C104 97 111 74 124 77C139 80 146 56 162 48" fill="none" stroke="url(#hud-line-cyan)" strokeWidth="4" strokeLinecap="round"/>
    <path d="M58 105C73 101 79 90 91 93C104 97 111 74 124 77C139 80 146 56 162 48V112H58Z" fill={c.accent} fillOpacity=".08"/>
    {[ [58,105],[91,93],[124,77],[162,48] ].map(([x,y],i)=><circle key={i} cx={x} cy={y} r={i===3?5:3.8} fill="#FFF" stroke={i===3?'#218E5E':c.accent} strokeWidth="2.4"/>)}
    <g transform="translate(72 35)"><circle cx="0" cy="0" r="5" fill="#2F7BE5"/><circle cx="22" cy="9" r="5" fill={c.accent}/><circle cx="45" cy="0" r="5" fill="#2F7BE5"/><path d="M4 2 18 7M27 7 40 2M22 14v13" stroke={c.ink} strokeOpacity=".32" strokeWidth="1.6"/><circle cx="22" cy="31" r="6" fill={c.bright}/></g>
    <circle cx="164" cy="31" r="11" fill={c.accent} fillOpacity=".10"/><path d="m159 31 4 4 7-9" fill="none" stroke={c.accent} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
  </>}</Frame>
}

function MatchArt() {
  return <Frame tone="green">{(c) => <>
    <rect x="34" y="20" width="152" height="110" rx="19" fill="#FFF" stroke={c.ink} strokeOpacity=".09"/>
    <path d="M47 75H173M110 31V119" stroke={c.ink} strokeOpacity=".11"/><circle cx="110" cy="75" r="24" fill="none" stroke={c.ink} strokeOpacity=".11"/>
    <path d="M47 48H68V102H47M173 48H152V102H173" fill="none" stroke={c.ink} strokeOpacity=".09"/>
    <circle cx="96" cy="75" r="31" fill={c.accent} fillOpacity=".08" stroke={c.accent} strokeOpacity=".18"/>
    <circle cx="96" cy="75" r="18" fill="#FFF" stroke={c.accent} strokeWidth="3"/><path d="M96 63l9 6-3 10-6 5-8-5-2-10 10-6Z" fill="none" stroke={c.ink} strokeWidth="1.8"/>
    <path d="M126 104C137 101 141 91 150 94C159 97 165 84 174 84" fill="none" stroke={`url(#hud-line-green)`} strokeWidth="3.5" strokeLinecap="round"/>
    <circle cx="174" cy="84" r="4.5" fill="#FFF" stroke={c.bright} strokeWidth="2.2"/>
    <circle cx="151" cy="43" r="16" fill="#FFF" stroke={c.ink} strokeOpacity=".08"/><path d="M151 31a12 12 0 0 1 11 8" fill="none" stroke={c.bright} strokeWidth="5" strokeLinecap="round"/><path d="M151 31a12 12 0 1 0 11 8" fill="none" stroke={c.accent} strokeOpacity=".18" strokeWidth="5"/>
  </>}</Frame>
}

function TacticsArt() {
  return <Frame tone="gold">{(c) => <>
    <rect x="32" y="20" width="156" height="110" rx="19" fill="#FFF" stroke={c.ink} strokeOpacity=".09"/>
    <path d="M110 31V119M43 75H177" stroke={c.ink} strokeOpacity=".11"/><circle cx="110" cy="75" r="20" fill="none" stroke={c.ink} strokeOpacity=".11"/>
    <path d="M43 49H66V101H43M177 49H154V101H177" fill="none" stroke={c.ink} strokeOpacity=".09"/>
    {[[65,103],[94,92],[120,70],[151,86]].map(([x,y],i)=><g key={i}><circle cx={x} cy={y} r="7.5" fill={c.bright}/><circle cx={x} cy={y} r="11" fill="none" stroke={c.accent} strokeOpacity=".13"/></g>)}
    {[[75,52],[111,43],[145,53]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="6.5" fill="#8F999E"/>)}
    <path d="M72 98C79 94 85 92 89 92M101 87C108 82 114 76 116 72M128 73C137 76 144 81 148 84" fill="none" stroke={c.accent} strokeWidth="3.2" strokeLinecap="round" strokeDasharray="5 4"/>
    <path d="m85 87 10 6-8 8M112 67l10 5-7 9M143 78l11 8-10 7" fill="none" stroke={c.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="156" y="31" width="21" height="34" rx="8" fill={c.bg1} stroke={c.ink} strokeOpacity=".08"/><rect x="162" y="38" width="9" height="4" rx="2" fill={c.bright}/><rect x="162" y="47" width="9" height="3" rx="1.5" fill={c.ink} fillOpacity=".18"/><rect x="162" y="55" width="7" height="3" rx="1.5" fill={c.ink} fillOpacity=".12"/>
  </>}</Frame>
}

export default function CoachSuggestionArt({ intent = 'stats' }) {
  if (intent === 'match') return <MatchArt />
  if (intent === 'tactics') return <TacticsArt />
  return <StatsArt />
}
