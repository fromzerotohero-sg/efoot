'use client'

import React from 'react'
import { Menu, X, ShoppingCart, Home, Radio } from 'lucide-react'
import CreditsBar from '@/components/CreditsBar'
import LanguageSwitch from '@/components/LanguageSwitch'
import { useSidebar } from '@/components/SidebarContext'
import { useTranslation } from '@/lib/i18n'

export default function TopBar() {
  const { isOpen, setIsOpen } = useSidebar()
  const { t } = useTranslation()

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
              background: 'rgba(0, 212, 255, 0.1)',
              border: '1px solid rgba(0, 212, 255, 0.35)',
              color: 'var(--neon-cyan)',
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
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-live-coach'))}
            aria-label={t('liveCoachOpen')}
            title={t('liveCoachTitle')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(255, 215, 100, 0.12)',
              border: '1px solid rgba(255, 215, 100, 0.32)',
              color: '#FFD76A',
              cursor: 'pointer',
              transition: 'all 0.2s',
              flexShrink: 0,
              boxShadow: '0 0 14px rgba(255, 196, 0, 0.12)'
            }}
          >
            <Radio size={18} />
          </button>

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
