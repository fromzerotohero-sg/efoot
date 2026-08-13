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

// UX V2 reference: Coach cyan/green, Rosa blue, Carte purple. Gold riservato a HP/premium.
const TAB_TONES = {
  coach: {
    idleColor: 'rgba(247, 250, 252, 0.42)',
    activeColor: '#26d9ff'
  },
  rosa: {
    idleColor: 'rgba(247, 250, 252, 0.42)',
    activeColor: '#4ea1ff'
  },
  carte: {
    idleColor: 'rgba(247, 250, 252, 0.42)',
    activeColor: '#a987ff'
  }
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
      pillar: 'coach',
      tone: 'coach'
    },
    {
      href: '/gestione-formazione',
      icon: Users,
      label: lang === 'en' ? 'Squad' : 'Rosa',
      tone: 'rosa'
    },
    {
      href: '/card-advisor-lab',
      icon: Sparkles,
      label: lang === 'en' ? 'Cards' : 'Carte',
      tone: 'carte'
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
        background: '#07111b',
        borderTop: '1px solid rgba(132, 181, 212, 0.16)',
        backdropFilter: 'blur(20px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        display: 'none'
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: '60px',
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

          const tone = TAB_TONES[item.tone] || TAB_TONES.coach
          const inner = (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              padding: '6px 10px',
              borderRadius: '0',
              transition: 'color 0.15s',
              background: 'transparent',
              color: active ? tone.activeColor : tone.idleColor,
              border: 'none',
              minWidth: '56px'
            }}>
              <Icon
                size={20}
                strokeWidth={active ? 2.35 : 1.8}
              />
              <span style={{
                fontSize: '10px',
                fontWeight: active ? 700 : 500,
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
