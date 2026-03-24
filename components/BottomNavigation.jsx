'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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
  const router = useRouter()
  const [statActive, setStatActive] = React.useState(false)

  // Resetta Stat quando cambia pagina o chiudi il modal
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    
    // Se NON c'è il query param, spegni Stat
    if (!window.location.search.includes('openGameAnalysis=1')) {
      setStatActive(false)
    }
    
    // Ascolta quando il modal si chiude
    const onClose = () => setStatActive(false)
    window.addEventListener('close-game-analysis', onClose)
    return () => window.removeEventListener('close-game-analysis', onClose)
  }, [pathname])

  const handleStatClick = () => {
    setStatActive(true) // Illumina subito il tasto Stat
    if (pathname === '/') {
      // Sulla Dashboard: apri modal direttamente
      window.dispatchEvent(new CustomEvent('open-game-analysis'))
    } else {
      // Altra pagina: vai alla Dashboard con parametro
      router.push('/?openGameAnalysis=1')
    }
  }

  // I 4 tasti di navigazione normali
  const navLinks = [
    { href: '/contromisure-pre-partita', icon: Shield, label: lang === 'en' ? 'Counters' : 'Contromisure' },
    { href: '/', icon: LayoutGrid, label: 'Dashboard' },
    { href: '/gestione-formazione', icon: Users, label: lang === 'en' ? 'Squad' : 'Rosa' },
    { href: '/match', icon: Calendar, label: lang === 'en' ? 'Matches' : 'Partite' }
  ]

  const isLinkActive = (href) => {
    // Se Stat è attivo, tutti i link sono spenti
    if (statActive) return false
    if (href === '/') return pathname === '/'
    return pathname?.startsWith(href)
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
        <NavItem 
          href="/contromisure-pre-partita" 
          icon={Shield} 
          label={lang === 'en' ? 'Counters' : 'Contromisure'}
          active={isLinkActive('/contromisure-pre-partita')}
        />
        
        {/* Dashboard */}
        <NavItem 
          href="/" 
          icon={LayoutGrid} 
          label="Dashboard"
          active={isLinkActive('/')}
        />
        
        {/* Stat - Bottone speciale che apre il modal */}
        <button
          type="button"
          onClick={handleStatClick}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation'
          }}
        >
          <NavContent 
            icon={Plus} 
            label={lang === 'en' ? 'Stats' : 'Stat'}
            active={statActive}
          />
        </button>
        
        {/* Rosa */}
        <NavItem 
          href="/gestione-formazione" 
          icon={Users} 
          label={lang === 'en' ? 'Squad' : 'Rosa'}
          active={isLinkActive('/gestione-formazione')}
        />
        
        {/* Partite */}
        <NavItem 
          href="/match" 
          icon={Calendar} 
          label={lang === 'en' ? 'Matches' : 'Partite'}
          active={isLinkActive('/match')}
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

// Componente per i link di navigazione
function NavItem({ href, icon: Icon, label, active }) {
  return (
    <Link
      href={href}
      style={{
        textDecoration: 'none',
        color: 'inherit'
      }}
    >
      <NavContent icon={Icon} label={label} active={active} />
    </Link>
  )
}

// Contenuto del bottone (icona + label)
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
