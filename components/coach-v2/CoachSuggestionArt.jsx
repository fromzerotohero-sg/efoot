'use client'

import React from 'react'

function Frame({ children, tone = 'cyan' }) {
  const stroke = tone === 'green' ? '#5EE8AD' : tone === 'gold' ? '#F1BD55' : '#2BD9FF'
  return (
    <svg viewBox="0 0 280 150" className="artSvg" aria-hidden="true">
      <defs>
        <linearGradient id={`bg-${tone}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#101B23" />
          <stop offset="100%" stopColor="#071015" />
        </linearGradient>
        <radialGradient id={`halo-${tone}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={stroke} stopOpacity=".20" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`line-${tone}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={stroke} />
          <stop offset="100%" stopColor={tone === 'gold' ? '#FFE6A5' : '#5C8DFF'} />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="274" height="144" rx="23" fill={`url(#bg-${tone})`} />
      <rect x="3.5" y="3.5" width="273" height="143" rx="22.5" fill="none" stroke="#fff" strokeOpacity=".07" />
      <path d="M16 31H264M16 75H264M16 119H264" stroke="#fff" strokeOpacity=".027" />
      <path d="M57 14V136M111 14V136M165 14V136M219 14V136" stroke="#fff" strokeOpacity=".02" />
      <path d="M18 18h14M18 18v14M262 18h-14M262 18v14M18 132h14M18 132v-14M262 132h-14M262 132v-14" stroke={stroke} strokeOpacity=".30" strokeWidth="1.2" />
      {children({ stroke, tone })}
    </svg>
  )
}

function StatsArt() {
  return (
    <Frame tone="cyan">
      {({ stroke }) => (
        <>
          <g transform="translate(19 18)">
            <rect width="102" height="114" rx="18" fill="#fff" fillOpacity=".035" stroke="#fff" strokeOpacity=".055" />
            <path d="M14 57H88M51 12V102" stroke="#fff" strokeOpacity=".075" />
            <circle cx="51" cy="57" r="18" fill="none" stroke="#fff" strokeOpacity=".075" />
            <path d="M14 28H31V86H14M88 28H71V86H88" fill="none" stroke="#fff" strokeOpacity=".055" />
            {[[27,82],[37,70],[51,89],[64,68],[76,78],[29,44],[52,54],[74,38],[52,25]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r={i===8?4.8:4} fill={i<5?'#2BD9FF':'#5C8DFF'} fillOpacity={i===8?1:.78} />)}
            <ellipse cx="52" cy="55" rx="37" ry="43" fill="url(#halo-cyan)" opacity=".65" />
            <path d="M20 95c14-8 23-9 33-2 10 7 20 5 31-7" fill="none" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeDasharray="4 5" />
          </g>
          <g transform="translate(137 20)">
            <rect width="124" height="48" rx="15" fill="#fff" fillOpacity=".038" stroke="#fff" strokeOpacity=".055" />
            <circle cx="23" cy="24" r="12" fill="none" stroke={stroke} strokeOpacity=".28" strokeWidth="5" />
            <path d="M23 12a12 12 0 0 1 11 8" fill="none" stroke={stroke} strokeWidth="5" strokeLinecap="round" className="artPulse" />
            <rect x="45" y="14" width="55" height="6" rx="3" fill="#fff" fillOpacity=".13" />
            <rect x="45" y="27" width="37" height="5" rx="2.5" fill={stroke} fillOpacity=".42" />
          </g>
          <g transform="translate(137 78)">
            <path d="M0 42C17 38 22 28 36 31C51 34 59 17 74 20C91 24 99 8 122 5" fill="none" stroke="url(#line-cyan)" strokeWidth="3.3" strokeLinecap="round" />
            <path d="M0 42C17 38 22 28 36 31C51 34 59 17 74 20C91 24 99 8 122 5V49H0Z" fill="url(#halo-cyan)" opacity=".5" />
            {[ [0,42],[36,31],[74,20],[122,5] ].map(([x,y],i)=><circle key={i} cx={x} cy={y} r={i===3?4.5:3.2} fill="#071015" stroke={i===3?'#5EE8AD':stroke} strokeWidth="2" />)}
            <path d="M7 52H113" stroke="#fff" strokeOpacity=".065" />
          </g>
        </>
      )}
    </Frame>
  )
}

function MatchArt() {
  return (
    <Frame tone="green">
      {({ stroke }) => (
        <>
          <g transform="translate(16 16)">
            <rect width="150" height="118" rx="20" fill="#071411" stroke="#5EE8AD" strokeOpacity=".12" />
            <path d="M11 59H139M75 10V108" stroke="#d8ffe9" strokeOpacity=".08" />
            <circle cx="75" cy="59" r="24" fill="none" stroke="#d8ffe9" strokeOpacity=".08" />
            <path d="M11 34H34V84H11M139 34H116V84H139" fill="none" stroke="#d8ffe9" strokeOpacity=".06" />
            <circle cx="75" cy="59" r="42" fill="url(#halo-green)" className="artPulse" />
            <circle cx="75" cy="59" r="28" fill="#0c1b17" stroke={stroke} strokeOpacity=".42" strokeWidth="2" />
            <circle cx="75" cy="59" r="17" fill="#f4f7f6" />
            <path d="M75 45l9 6-3 11-6 5-8-5-2-11 10-6Z" fill="none" stroke="#10211b" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M65 51l-9 5M84 51l9 5M67 62l-6 9M81 62l7 9" stroke="#10211b" strokeOpacity=".55" strokeWidth="1.2" />
          </g>
          <g transform="translate(179 20)">
            <rect width="82" height="35" rx="13" fill="#fff" fillOpacity=".04" stroke="#fff" strokeOpacity=".06" />
            <circle cx="16" cy="17.5" r="5" fill={stroke} />
            <rect x="28" y="11" width="39" height="5" rx="2.5" fill="#fff" fillOpacity=".15" />
            <rect x="28" y="21" width="28" height="4" rx="2" fill="#fff" fillOpacity=".07" />
          </g>
          <g transform="translate(178 74)">
            <path d="M2 40C15 38 20 27 31 30C43 34 50 18 61 20C72 22 77 8 85 8" fill="none" stroke="url(#line-green)" strokeWidth="3" strokeLinecap="round" />
            <circle cx="2" cy="40" r="3" fill={stroke} /><circle cx="31" cy="30" r="3" fill={stroke} /><circle cx="61" cy="20" r="3" fill="#2BD9FF" /><circle cx="85" cy="8" r="4" fill="#071015" stroke="#2BD9FF" strokeWidth="2" />
            <rect x="3" y="52" width="24" height="5" rx="2.5" fill="#fff" fillOpacity=".10" />
            <rect x="32" y="52" width="17" height="5" rx="2.5" fill={stroke} fillOpacity=".36" />
          </g>
        </>
      )}
    </Frame>
  )
}

function TacticsArt() {
  return (
    <Frame tone="gold">
      {({ stroke }) => (
        <>
          <g transform="translate(16 15)">
            <rect width="194" height="120" rx="19" fill="#15130f" stroke={stroke} strokeOpacity=".15" />
            <path d="M97 0V120M0 60H194" stroke={stroke} strokeOpacity=".09" />
            <circle cx="97" cy="60" r="20" fill="none" stroke={stroke} strokeOpacity=".10" />
            <path d="M0 34H31V86H0M194 34H163V86H194" fill="none" stroke={stroke} strokeOpacity=".08" />
            {[[40,91],[75,83],[108,61],[151,72]].map(([x,y],i)=><g key={i}><circle cx={x} cy={y} r="8" fill={stroke} fillOpacity=".94"/><circle cx={x} cy={y} r="13" fill="none" stroke={stroke} strokeOpacity=".12"/></g>)}
            {[[57,43],[101,31],[145,42],[151,102]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="7" fill="#d5d7d5" fillOpacity=".62" />)}
            <path d="M47 87C57 82 65 80 68 82M83 78C93 73 100 66 103 61M116 62C128 64 139 68 144 70" fill="none" stroke={stroke} strokeWidth="2.8" strokeLinecap="round" strokeDasharray="5 5" />
            <path d="m63 76 12 7-9 9M98 55l11 6-7 10M139 64l12 8-10 8" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M48 91C64 101 78 104 94 103" fill="none" stroke="#2BD9FF" strokeOpacity=".65" strokeWidth="2" strokeLinecap="round" />
          </g>
          <g transform="translate(220 22)">
            <rect width="42" height="62" rx="13" fill="#fff" fillOpacity=".04" stroke="#fff" strokeOpacity=".06" />
            <rect x="9" y="12" width="24" height="5" rx="2.5" fill={stroke} fillOpacity=".8" />
            <rect x="9" y="24" width="18" height="4" rx="2" fill="#fff" fillOpacity=".13" />
            <rect x="9" y="34" width="24" height="4" rx="2" fill="#fff" fillOpacity=".09" />
            <rect x="9" y="44" width="14" height="4" rx="2" fill="#fff" fillOpacity=".09" />
          </g>
          <g transform="translate(224 101)"><circle cx="9" cy="9" r="9" fill={stroke} fillOpacity=".13" className="artPulse" /><path d="M5 9l3 3 6-7" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></g>
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
