'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'
import { 
  Shield,
  LayoutGrid,
  Plus,
  Users,
  Calendar
} from 'lucide-react'

export default function BottomNavigation() {
  const { t, lang } = useTranslation()
  const pathname = usePathname()

  const isActive = (href) => {
    if (href === '/') return pathname === '/'
    return pathname?.startsWith(href)
  }

  const handleStatClick = (e) => {
    e.preventDefault()
    // Apre il modal GameAnalysis sulla Dashboard
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-game-analysis'))
    }
  }

  return (
    <nav 
      className="bottom-nav"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'linear-gradient(180deg, rgba(5,8,20,0.98) 0%, rgba(3,5,12,1) 100%)',
        borderTop: '1px solid rgba(0, 212, 255, 0.2)',
        backdropFilter: 'blur(20px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        display: 'none'
      }}
    >
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.5), transparent)'
      }} />
      
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: '64px',
        maxWidth: '500px',
        margin: '0 auto'
      }}>
        {/* Contromisure */}
        <NavLink 
          href="/contromisure-pre-partita"
          icon={Shield}
          label={lang === 'en' ? 'Counters' : 'Contromisure'}
          active={isActive('/contromisure-pre-partita')}
        />
        
        {/* Dashboard */}
        <NavLink 
          href="/"
          icon={LayoutGrid}
          label="Dashboard"
          active={isActive('/')}
        />
        
        {/* Stat - Apre il modal */}
        <Link
          href="/"
          onClick={handleStatClick}
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <NavContent 
            icon={Plus}
            label={lang === 'en' ? 'Stats' : 'Stat'}
            active={false}
          />
        </Link>
        
        {/* Rosa */}
        <NavLink 
          href="/gestione-formazione"
          icon={Users}
          label={lang === 'en' ? 'Squad' : 'Rosa'}
          active={isActive('/gestione-formazione')}
        />
        
        {/* Partite */}
        <NavLink 
          href="/match"
          icon={Calendar}
          label={lang === 'en' ? 'Matches' : 'Partite'}
          active={isActive('/match')}
        />
      </div>
      
      <style jsx>{`
        @media (max-width: 1024px) {
          .bottom-nav {
            display: block !important;
          }
        }
        
        @media (min-width: 1025px) {
          .bottom-nav {
            display: none !important;
          }
        }
      `}</style>
    </nav>
  )
}

// Componente Link standard
function NavLink({ href, icon, label, active }) {
  return (
    <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
      <NavContent icon={icon} label={label} active={active} />
    </Link>
  )
}

// Contenuto visivo dei tasti
function NavContent({ icon: Icon, label, active }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '4px',
      padding: '8px 12px',
      borderRadius: '12px',
      transition: 'all 0.2s',
      background: active ? 'rgba(0, 212, 255, 0.15)' : 'transparent',
      color: active ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.5)',
      minWidth: '60px'
    }}>
      <Icon size={22} strokeWidth={active ? 2.5 : 2} />
      <span style={{
        fontSize: '11px',
        fontWeight: active ? 600 : 500,
        whiteSpace: 'nowrap'
      }}>
        {label}
      </span>
    </div>
  )
}
