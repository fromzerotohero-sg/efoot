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
    // Non è una pagina: apre il modal "Analisi partita" sulla dashboard (vedi OpenCoachListener in app/page.jsx).
    // active è sempre false; l’URL query viene ripulita dopo apertura/chiusura modal così ogni tap funziona.
    {
      href: '/?openGameAnalysis=1',
      icon: Plus,
      label: lang === 'en' ? 'Stats' : 'Stat'
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
          // Stat/Stats: shortcut al modal analisi su /, non una route → mai evidenziato come tab corrente
          const active = item.label === 'Stat' || item.label === 'Stats' 
            ? false 
            : isActive(item.href)
          
          return (
            <Link
              key={item.label}
              href={item.href}
              style={{
                textDecoration: 'none',
                color: 'inherit'
              }}
            >
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
