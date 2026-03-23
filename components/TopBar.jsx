'use client'

import React from 'react'
import { Menu, X, ShoppingCart, House } from 'lucide-react'
import CreditsBar from '@/components/CreditsBar'
import LanguageSwitch from '@/components/LanguageSwitch'
import GuideTour from '@/components/GuideTour'
import { useSidebar } from '@/components/SidebarContext'

export default function TopBar() {
  const { isOpen, setIsOpen } = useSidebar()

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
      <div className="topbar-inner h-full px-4 lg:px-6 flex items-center justify-between lg:justify-end gap-2 lg:gap-4 w-full relative z-10">
        {/* Hamburger - mobile only, dentro TopBar (niente overlay sui contenuti) */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="lg:hidden"
          aria-label="Menu"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'rgba(0, 212, 255, 0.1)',
            border: '1px solid rgba(0, 212, 255, 0.35)',
            color: 'var(--neon-cyan)',
            flexShrink: 0
          }}
        >
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        {/* Home icon: riporta alla home principale FromZeroToHero */}
        <button
          type="button"
          onClick={() => window.open('https://home.fromzerotohero.io/', '_self')}
          className="mobile-icon-btn lg:absolute lg:left-6"
          aria-label="Vai alla Home FromZeroToHero"
          title="Vai alla Home"
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
            transition: 'all 0.2s',
            flexShrink: 0
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 212, 255, 0.2)'
            e.currentTarget.style.boxShadow = '0 0 10px rgba(0, 212, 255, 0.3)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0, 212, 255, 0.1)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          <House size={18} />
        </button>
        
        {/* GuideTour - spostato a destra su mobile */}
        <div className="lg:order-1" style={{ flexShrink: 0 }}>
          <GuideTour />
        </div>
        
        {/* CreditsBar - visibile su desktop, nascosto su mobile (è già nella bottom nav) */}
        <div className="hidden lg:block">
          <CreditsBar />
        </div>
        
        {/* Icona Carrello - sempre visibile */}
        <button
          onClick={() => window.open('https://home.fromzerotohero.io/dashboard?usage', '_blank')}
          className="mobile-icon-btn"
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
        
        {/* Language Switch - visibile su desktop, nascosto su mobile */}
        <div className="hidden lg:block">
          <LanguageSwitch />
        </div>
      </div>
      
      <style jsx>{`
        @media (max-width: 1023px) {
          header {
            height: 56px !important;
          }
        }
      `}</style>
    </header>
  )
}
