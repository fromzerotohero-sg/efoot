'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart } from 'lucide-react'
import CreditsBar from '@/components/CreditsBar'
import LanguageSwitch from '@/components/LanguageSwitch'
import GuideTour from '@/components/GuideTour'

export default function TopBar() {
  const router = useRouter()

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
        
        {/* Icona Carrello per acquisto crediti */}
        <button
          onClick={() => window.open('https://home.fromzerotohero.io/dashboard?usage', '_blank')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: 'rgba(0, 212, 255, 0.1)',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            color: 'var(--neon-cyan)',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 212, 255, 0.2)'
            e.currentTarget.style.boxShadow = '0 0 10px rgba(0, 212, 255, 0.3)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0, 212, 255, 0.1)'
            e.currentTarget.style.boxShadow = 'none'
          }}
          title="Acquista Hero Points"
        >
          <ShoppingCart size={18} />
        </button>
        
        <LanguageSwitch />
      </div>
    </header>
  )
}
