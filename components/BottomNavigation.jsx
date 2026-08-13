'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'
import { useGameAnalysisModalNav, CLOSE_GAME_ANALYSIS_MODAL_EVENT } from '@/components/GameAnalysisModalNavContext'
import {
  LayoutGrid,
  Users,
  Sparkles
} from 'lucide-react'

const CARDS_ACCENT = {
  idleColor: '#d4b84a',
  activeColor: '#ffe566',
  idleBg: 'linear-gradient(135deg, rgba(255, 203, 5, 0.14), rgba(255, 180, 0, 0.08))',
  activeBg: 'linear-gradient(135deg, rgba(255, 203, 5, 0.28), rgba(255, 180, 0, 0.16))',
  idleBorder: 'rgba(255, 203, 5, 0.28)',
  activeBorder: 'rgba(255, 215, 0, 0.5)',
  idleGlow: '0 0 12px rgba(255, 203, 5, 0.2)',
  activeGlow: '0 0 20px rgba(255, 203, 5, 0.35), 0 0 32px rgba(255, 180, 0, 0.2)'
}

export default function BottomNavigation() {
  const { lang } = useTranslation()
  const pathname = usePathname()
  const { isOpen: gameAnalysisModalOpen } = useGameAnalysisModalNav()

  // UX V2: massimo 3 ingressi (Coach / Rosa / Carte).
  // Contromisure, Partite e Statistiche NON sono cancellate: restano vive nelle route
  // e nei componenti attuali, e saranno ricollocate sotto Coach nelle slice successive.
  const navItems = [
    {
      href: '/',
      icon: LayoutGrid,
      label: 'Coach',
      pillar: 'coach'
    },
    {
      href: '/gestione-formazione',
      icon: Users,
      label: lang === 'en' ? 'Squad' : 'Rosa'
    },
    {
      href: '/card-advisor-lab',
      icon: Sparkles,
      label: lang === 'en' ? 'Cards' : 'Carte',
      accent: 'cards'
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
          const isCoach = item.pillar === 'coach'
          // Coach e il modal analisi condividono la route `/`: modal aperto = Coach non attivo
          const active = isCoach
            ? pathname === '/' && !gameAnalysisModalOpen
            : pathname?.startsWith(item.href)

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
                style={isCardsAccent ? { filter: 'drop-shadow(0 0 8px rgba(255, 203, 5, 0.55))' } : undefined}
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

          // Tap su Coach con modal analisi aperto su `/`: chiude il modal (comportamento preesistente)
          if (isCoach && pathname === '/' && gameAnalysisModalOpen) {
            return (
              <button
                key={item.label}
                type="button"
                aria-label={item.label}
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent(CLOSE_GAME_ANALYSIS_MODAL_EVENT))
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
        @media (max-width: 767px) {
          .bottom-nav {
            display: block !important;
          }
        }

        @media (min-width: 768px) {
          .bottom-nav {
            display: none !important;
          }
        }
      `}</style>
    </nav>
  )
}
