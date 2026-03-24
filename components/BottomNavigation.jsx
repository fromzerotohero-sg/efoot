'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'
import { useGameAnalysisModalNav, OPEN_GAME_ANALYSIS_MODAL_EVENT } from '@/components/GameAnalysisModalNavContext'
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
  const { isOpen: gameAnalysisModalOpen } = useGameAnalysisModalNav()

  const isActive = (href) => {
    // Rimuovi query params per il check
    const hrefWithoutQuery = href.split('?')[0]
    if (hrefWithoutQuery === '/') return pathname === '/'
    return pathname?.startsWith(hrefWithoutQuery)
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
      label: 'Dashboard'
    },
    {
      href: '/match',
      icon: Calendar,
      label: lang === 'en' ? 'Matches' : 'Partite'
    },
    {
      href: '/gestione-formazione',
      icon: Users,
      label: lang === 'en' ? 'Squad' : 'Rosa'
    },
    // Shortcut: apre il modal "Statistiche di gioco" sulla dashboard (OpenCoachListener in app/page.jsx).
    // Evidenza tab: GameAnalysisModalNavContext (sync con showGameAnalysisModal su /).
    {
      href: '/?openGameAnalysis=1',
      icon: Plus,
      label: lang === 'en' ? 'Stats' : 'Stat'
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
        {navItems.map((item) => {
          const Icon = item.icon
          const isStatShortcut = typeof item.href === 'string' && item.href.includes('openGameAnalysis=1')
          const isDashboard = item.href === '/'
          // Dashboard e Stat condividono la route `/`: il modal analisi è evidenziato su Stat, non su Dashboard
          const active = isStatShortcut
            ? gameAnalysisModalOpen
            : isDashboard
              ? pathname === '/' && !gameAnalysisModalOpen
              : isActive(item.href)

          const inner = (
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

          // Già su /: niente navigazione verso ?openGameAnalysis (evita flash + doppio replace)
          if (isStatShortcut && pathname === '/') {
            return (
              <button
                key={item.label}
                type="button"
                aria-label={item.label}
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent(OPEN_GAME_ANALYSIS_MODAL_EVENT))
                  }
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  margin: 0,
                  cursor: 'pointer',
                  color: 'inherit',
                  font: 'inherit',
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                {inner}
              </button>
            )
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              prefetch={isStatShortcut ? false : undefined}
              scroll={isStatShortcut ? false : undefined}
              style={{
                textDecoration: 'none',
                color: 'inherit'
              }}
            >
              {inner}
            </Link>
          )
        })}
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
