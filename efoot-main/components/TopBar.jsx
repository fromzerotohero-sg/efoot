'use client'

import React from 'react'
import CreditsBar from '@/components/CreditsBar'
import LanguageSwitch from '@/components/LanguageSwitch'
import GuideTour from '@/components/GuideTour'

export default function TopBar() {
  return (
    <header 
      className="sticky top-0 z-30 h-16 flex items-center"
      style={{
        background: 'linear-gradient(180deg, rgba(5,8,20,0.9) 0%, rgba(5,8,20,0.7) 100%)',
        borderBottom: '1px solid rgba(0, 212, 255, 0.2)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 0 20px rgba(0, 212, 255, 0.5)',
        position: 'relative'
      }}
    >
      <div 
        style={{
          position: 'absolute',
          bottom: '-1px',
          left: '0',
          right: '0',
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.5), transparent)'
        }}
      />
      <div className="h-full px-6 flex items-center justify-end gap-4 w-full relative z-10">
        <GuideTour />
        <CreditsBar />
        <LanguageSwitch />
      </div>
    </header>
  )
}
