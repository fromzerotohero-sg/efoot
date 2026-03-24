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
  const [gameAnalysisOpen, setGameAnalysisOpen] = React.useState(false)

  // Controlla se il modal è aperto tramite query param o evento
  const isGameAnalysisOpen = () => {
    if (typeof window === 'undefined') return false
    // Controlla query param
    if (window.location.search.includes('openGameAnalysis=1')) return true
    // Controlla stato locale (settato da eventi)
    return gameAnalysisOpen
  }

  // Ascolta quando GameAnalysisModal si apre/chiude
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const onOpen = () => setGameAnalysisOpen(true)
    const onClose = () => setGameAnalysisOpen(false)
    window.addEventListener('open-game-analysis', onOpen)
    window.addEventListener('close-game-analysis', onClose)
    // Controlla query param all'avvio
    if (window.location.search.includes('openGameAnalysis=1')) {
      setGameAnalysisOpen(true)
    }
    return () => {
      window.removeEventListener('open-game-analysis', onOpen)
      window.removeEventListener('close-game-analysis', onClose)
    }
  }, [])

  const isActive = (href) => {
    const modalOpen = isGameAnalysisOpen()
    if (href === '/grafici-comparazione') return modalOpen // Illumina Stat quando modal aperto
    if (href === '/') return pathname === '/' && !modalOpen
    return pathname?.startsWith(href)
  }

  const navItems = [
    {
      href: '/contromisure-pre-partita',
      icon: Shield,
      label: lang === 'en' ? 'Counters' : 'Contromisure'
    },
    {
      href: '/',
      icon: LayoutGrid,
      label: lang === 'en' ? 'Dashboard' : 'Dashboard'
    },
    {
      href: '/grafici-comparazione',
      icon: Plus,
      label: lang === 'en' ? 'Stats' : 'Stat',
      onClick: () => {
        if (typeof window !== 'undefined') {
          // Se siamo sulla Dashboard, apri direttamente il modal
          // Altrimenti naviga alla Dashboard con parametro per aprire il modal
          if (pathname === '/') {
            window.dispatchEvent(new CustomEvent('open-game-analysis'))
          } else {
            router.push('/?openGameAnalysis=1')
          }
        }
      }
    },
    {
      href: '/gestione-formazione',
      icon: Users,
      label: lang === 'en' ? 'Squad' : 'Rosa'
    },
    {
      href: '/match',
      icon: Calendar,
      label: lang === 'en' ? 'Matches' : 'Partite'
    }
  ]

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
        display: 'none' // Nascosto di default, mostrato via CSS su mobile
      }}
    >
      {/* Linea luminosa sopra */}
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
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          
          const content = (
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
                {item.label}
              </span>
            </div>
          )
          
          if (item.onClick) {
            return (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                onTouchStart={item.onClick}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation'
                }}
              >
                {content}
              </button>
            )
          }
          
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                textDecoration: 'none',
                color: 'inherit'
              }}
            >
              {content}
            </Link>
          )
        })}
      </div>
      
      {/* Safe area per iPhone X+ */}
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
