'use client'

import React from 'react'
import { Menu, X, ShoppingCart, Home } from 'lucide-react'
import CreditsBar from '@/components/CreditsBar'
import { InstallAppPromptButton } from '@/components/InstallAppPrompt'
import LanguageSwitch from '@/components/LanguageSwitch'
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
      <div 
        className="topbar-inner h-full px-3 lg:px-6 flex items-center w-full relative z-10"
        style={{
          justifyContent: 'space-between',
          gap: '8px'
        }}
      >
        {/* LEFT SECTION - Menu, Home, GuideTour */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {/* Hamburger - mobile only */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden"
            aria-label="Menu"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(255, 203, 5, 0.22), rgba(0, 212, 255, 0.12))',
              border: '1px solid rgba(255, 203, 5, 0.55)',
              color: '#ffcb05',
              boxShadow: '0 0 16px rgba(255, 203, 5, 0.22), inset 0 1px 0 rgba(255,255,255,0.12)',
              flexShrink: 0
            }}
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Home icon */}
          <button
            type="button"
            onClick={() => window.open('https://fromzerotohero.io/', '_self')}
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
          >
            <Home size={18} />
          </button>

        </div>

        {/* CENTER SECTION - vuoto su mobile */}
        <div style={{ flex: 1 }} />

        {/* RIGHT SECTION - GuideTour desktop, Credits, Carrello, LanguageSwitch */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          flexShrink: 0,
          justifyContent: 'flex-end'
        }}>
          <InstallAppPromptButton />

          {/* CreditsBar - desktop only */}
          <div className="hidden lg:block">
            <CreditsBar />
          </div>
          
          {/* Icona Carrello */}
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
              transition: 'all 0.2s',
              flexShrink: 0
            }}
            title="Acquista Hero Points"
          >
            <ShoppingCart size={18} />
          </button>
          
          {/* Language Switch */}
          <div style={{ flexShrink: 0 }}>
            <LanguageSwitch />
          </div>
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
