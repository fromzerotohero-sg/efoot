'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'
import { useGameAnalysisModalNav, OPEN_GAME_ANALYSIS_MODAL_EVENT, CLOSE_GAME_ANALYSIS_MODAL_EVENT } from '@/components/GameAnalysisModalNavContext'
import { 
  Shield,
  LayoutGrid,
  Plus,
  Users,
  Calendar,
  CreditCard
} from 'lucide-react'

const CARDS_ACCENT = {
  idleColor: '#d4b84a',
  activeColor: '#ffe566',
  idleBg: 'linear-gradient(135deg, rgba(255, 203, 5, 0.12), rgba(168, 85, 247, 0.08))',
  activeBg: 'linear-gradient(135deg, rgba(255, 203, 5, 0.26), rgba(168, 85, 247, 0.18))',
  idleBorder: 'rgba(255, 203, 5, 0.22)',
  activeBorder: 'rgba(255, 203, 5, 0.42)',
  idleGlow: '0 0 12px rgba(255, 203, 5, 0.14)',
  activeGlow: '0 0 20px rgba(255, 203, 5, 0.28), 0 0 28px rgba(168, 85, 247, 0.16)'
}

export default function BottomNavigation() {
  const { t, lang } = useTranslation()
  const pathname = usePathname()
  const router = useRouter()
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
      href: '/card-advisor-lab',
      icon: CreditCard,
      label: lang === 'en' ? 'Cards' : 'Carte',
      accent: 'cards'
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
          const isCardAdvisorShortcut = item.href === '/card-advisor-lab'
          const isDashboard = item.href === '/'
          // Dashboard e Stat condividono la route `/`: il modal analisi è evidenziato su Stat, non su Dashboard
          const active = isStatShortcut
            ? gameAnalysisModalOpen
            : isCardAdvisorShortcut
              ? pathname?.startsWith('/card-advisor-lab')
              : isDashboard
                ? pathname === '/' && !gameAnalysisModalOpen
              : isActive(item.href)

          const isCardsAccent = item.accent === 'cards'
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
              background: isCardsAccent
                ? (active ? CARDS_ACCENT.activeBg : CARDS_ACCENT.idleBg)
                : (active ? 'rgba(0, 212, 255, 0.15)' : 'transparent'),
              color: isCardsAccent
                ? (active ? CARDS_ACCENT.activeColor : CARDS_ACCENT.idleColor)
                : (active ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.5)'),
              border: isCardsAccent
                ? `1px solid ${active ? CARDS_ACCENT.activeBorder : CARDS_ACCENT.idleBorder}`
                : '1px solid transparent',
              boxShadow: isCardsAccent
                ? (active ? CARDS_ACCENT.activeGlow : CARDS_ACCENT.idleGlow)
                : 'none',
              minWidth: '60px'
            }}>
              <Icon
                size={22}
                strokeWidth={active || isCardsAccent ? 2.5 : 2}
                style={isCardsAccent ? { filter: 'drop-shadow(0 0 6px rgba(255, 203, 5, 0.45))' } : undefined}
              />
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
          if ((isStatShortcut || isCardAdvisorShortcut) && pathname === '/') {
            return (
              <button
                key={item.label}
                type="button"
                aria-label={item.label}
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    if (isStatShortcut) {
                      window.dispatchEvent(new CustomEvent(OPEN_GAME_ANALYSIS_MODAL_EVENT))
                    } else {
                      router.push('/card-advisor-lab')
                    }
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
              onClick={
                isDashboard && pathname === '/' && gameAnalysisModalOpen
                  ? (e) => {
                      e.preventDefault()
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent(CLOSE_GAME_ANALYSIS_MODAL_EVENT))
                      }
                    }
                  : undefined
              }
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
