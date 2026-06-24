'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'
import {
  BookOpen,
  Gift,
  LayoutGrid,
  User,
  Wallet,
  Users as UsersIcon,
  Calendar,
  BarChart3,
  Shield,
  Sparkles,
  LogOut,
  Upload,
  X
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import SidebarGuideTour from '@/components/SidebarGuideTour'
import { useSidebar } from '@/components/SidebarContext'
import {
  useGameAnalysisModalNav,
  OPEN_GAME_ANALYSIS_MODAL_EVENT
} from '@/components/GameAnalysisModalNavContext'

export default function SidebarNew() {
  const { t, lang } = useTranslation()
  const pathname = usePathname()
  const router = useRouter()
  const { isOpen, setIsOpen } = useSidebar()
  const { isOpen: gameAnalysisModalOpen } = useGameAnalysisModalNav()
  const [redirectModal, setRedirectModal] = React.useState({ open: false, url: '' })

  const handleLogout = () => {
    fetch('/api/prelaunch/logout', { method: 'POST' }).catch(() => {})
    localStorage.removeItem('auth_token')
    localStorage.removeItem('metalgate_user')
    try {
      sessionStorage.removeItem('dashboard_coach_mode_modal_seen_session_v1')
    } catch {}
    router.push('/login')
  }

  const isActive = (href) => {
    if (href === '/') return pathname === '/'
    return pathname?.startsWith(href)
  }

  const navSections = [
    {
      title: lang === 'en' ? 'START' : 'INIZIA',
      items: [
        { href: '/', icon: LayoutGrid, label: t('dashboard'), isActive: () => pathname === '/' },
        { href: '/guida', icon: BookOpen, label: t('guide') },
        {
          href: 'https://tornei.fromzerotohero.io/',
          icon: Gift,
          label: 'WOW',
          variant: 'wow',
          shortcut: 'tornei',
          badgeText: lang === 'en' ? 'FREE' : 'GRATIS',
          isActive: () => false
        }
      ]
    },
    {
      title: lang === 'en' ? 'YOUR CLUB' : 'IL TUO CLUB',
      items: [
        { href: '/impostazioni-profilo', icon: User, label: t('profile') },
        { href: '/gestione-formazione', icon: UsersIcon, label: t('yourSquad') },
        {
          href: '/?openGameAnalysis=1',
          icon: Upload,
          label: lang === 'en' ? 'Upload game stats' : 'Carica statistiche',
          shortcut: 'gameAnalysis'
        }
      ]
    },
    {
      title: lang === 'en' ? 'BEFORE THE MATCH' : 'PRIMA DEL MATCH',
      items: [
        { href: '/contromisure-pre-partita', icon: Shield, label: t('countermeasures') },
        {
          href: '/card-advisor-lab',
          icon: Sparkles,
          label: lang === 'en' ? 'Card analysis' : 'Analisi carte',
          variant: 'gold',
          badge: 'new',
          isActive: () => isActive('/card-advisor-lab')
        }
      ]
    },
    {
      title: lang === 'en' ? 'AFTER THE MATCH' : 'DOPO IL MATCH',
      items: [
        { href: '/match', icon: Calendar, label: t('matchHistory') },
        { href: '/grafici-comparazione', icon: BarChart3, label: t('charts') }
      ]
    },
    {
      title: lang === 'en' ? 'SUPPORT' : 'ASSISTENZA',
      items: [
        { type: 'tour' },
        { href: '/gestione-profilo', icon: Wallet, label: lang === 'en' ? 'Where to spend HP' : 'Dove spendere HP' }
      ]
    }
  ]

  const getItemActive = (item) => {
    if (item.shortcut === 'gameAnalysis') return gameAnalysisModalOpen
    if (item.isActive) return item.isActive()
    return isActive(item.href)
  }

  const getNavItemStyle = (item, active) => {
    const isGold = item.variant === 'gold'
    const isWow = item.variant === 'wow'
    const activeColor = isWow ? '#22d3ee' : (isGold ? '#ffcb05' : '#00d4ff')
    const borderColor = isWow
      ? 'rgba(34, 211, 238, 0.55)'
      : (isGold ? 'rgba(255, 203, 5, 0.48)' : 'rgba(0, 212, 255, 0.4)')
    const idleBorder = isWow
      ? 'rgba(34, 211, 238, 0.22)'
      : (isGold ? 'rgba(255, 203, 5, 0.18)' : 'transparent')
    const activeBg = isWow
      ? 'linear-gradient(145deg, rgba(34, 211, 238, 0.18) 0%, rgba(168, 85, 247, 0.12) 100%)'
      : (isGold
        ? 'linear-gradient(145deg, rgba(255, 203, 5, 0.18) 0%, rgba(168, 85, 247, 0.10) 100%)'
        : 'linear-gradient(145deg, rgba(0, 212, 255, 0.15) 0%, rgba(0, 161, 166, 0.1) 100%)')

    return {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '10px 14px',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: isGold || isWow ? 700 : 600,
      background: active ? activeBg : (isWow ? 'rgba(34, 211, 238, 0.05)' : (isGold ? 'rgba(255, 203, 5, 0.06)' : 'transparent')),
      color: active ? activeColor : (isWow ? 'rgba(34, 211, 238, 0.8)' : (isGold ? 'rgba(255, 255, 255, 0.72)' : 'rgba(255, 255, 255, 0.62)')),
      border: `1px solid ${active ? borderColor : idleBorder}`,
      boxShadow: active
        ? (isWow
          ? '0 0 20px rgba(34, 211, 238, 0.2), 0 0 32px rgba(168, 85, 247, 0.12)'
          : (isGold ? '0 0 20px rgba(255, 203, 5, 0.16)' : '0 0 20px rgba(0, 212, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'))
        : (isWow && !active ? '0 0 12px rgba(34, 211, 238, 0.15), 0 0 24px rgba(168, 85, 247, 0.08)' : 'none'),
      transition: 'all 0.3s ease',
      cursor: 'pointer',
      textDecoration: 'none',
      textShadow: active ? `0 0 10px ${isWow ? 'rgba(34, 211, 238, 0.5)' : (isGold ? 'rgba(255, 203, 5, 0.45)' : 'rgba(0, 212, 255, 0.5)')}` : 'none',
      animation: isWow && !active ? 'wow-pulse 2.2s ease-in-out infinite' : undefined
    }
  }

  const handleNavMouseEnter = (e, item, active) => {
    if (active) return
    const isGold = item.variant === 'gold'
    const isWow = item.variant === 'wow'
    e.currentTarget.style.background = isWow
      ? 'rgba(34, 211, 238, 0.10)'
      : (isGold ? 'rgba(255, 203, 5, 0.10)' : 'rgba(0, 212, 255, 0.08)')
    e.currentTarget.style.color = isWow ? '#22d3ee' : (isGold ? '#ffcb05' : '#00d4ff')
    e.currentTarget.style.borderColor = isWow
      ? 'rgba(34, 211, 238, 0.38)'
      : (isGold ? 'rgba(255, 203, 5, 0.34)' : 'rgba(0, 212, 255, 0.25)')
  }

  const handleNavMouseLeave = (e, item, active) => {
    if (active) return
    const isGold = item.variant === 'gold'
    const isWow = item.variant === 'wow'
    e.currentTarget.style.background = isWow
      ? 'rgba(34, 211, 238, 0.05)'
      : (isGold ? 'rgba(255, 203, 5, 0.06)' : 'transparent')
    e.currentTarget.style.color = isWow
      ? 'rgba(34, 211, 238, 0.8)'
      : (isGold ? 'rgba(255, 255, 255, 0.72)' : 'rgba(255, 255, 255, 0.62)')
    e.currentTarget.style.borderColor = isWow
      ? 'rgba(34, 211, 238, 0.22)'
      : (isGold ? 'rgba(255, 203, 5, 0.18)' : 'transparent')
  }

  const renderNavBadge = (item) => {
    if (item.badgeText) {
      const isWow = item.variant === 'wow'
      return (
        <span
          aria-label={item.badgeText}
          style={{
            flexShrink: 0,
            marginLeft: 'auto',
            padding: '2px 7px',
            borderRadius: '999px',
            fontSize: '9px',
            fontWeight: 900,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            lineHeight: 1.2,
            color: isWow ? '#03101d' : (item.variant === 'gold' ? '#1f1300' : '#FFFFFF'),
            background: isWow
              ? 'linear-gradient(135deg, #22d3ee 0%, #a78bfa 100%)'
              : (item.variant === 'gold'
                ? 'linear-gradient(135deg, #fef3c7 0%, #facc15 100%)'
                : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'),
            border: isWow
              ? '1px solid rgba(34, 211, 238, 0.55)'
              : '1px solid rgba(255, 203, 5, 0.55)',
            boxShadow: isWow
              ? '0 0 10px rgba(34, 211, 238, 0.35), 0 0 18px rgba(168, 85, 247, 0.18)'
              : '0 0 10px rgba(255, 203, 5, 0.30)'
          }}
        >
          {item.badgeText}
        </span>
      )
    }

    if (item.badge !== 'new') return null
    return (
      <span
        aria-label={lang === 'en' ? 'New' : 'Novità'}
        style={{
          flexShrink: 0,
          marginLeft: 'auto',
          padding: '2px 7px',
          borderRadius: '999px',
          fontSize: '9px',
          fontWeight: 800,
          letterSpacing: '0.6px',
          textTransform: 'uppercase',
          lineHeight: 1.2,
          color: '#FFFFFF',
          background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
          border: '1px solid rgba(134, 239, 172, 0.55)',
          boxShadow: '0 0 10px rgba(34, 197, 94, 0.35)'
        }}
      >
        {lang === 'en' ? 'NEW' : 'NOVITÀ'}
      </span>
    )
  }

  return (
    <>
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
          style={{ backdropFilter: 'blur(4px)' }}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-screen w-64
          bg-gradient-to-b from-[rgba(13,20,40,0.95)] to-[rgba(5,12,25,0.98)]
          border-r border-[rgba(0,212,255,0.2)]
          flex flex-col z-40 transition-transform duration-300 ease-in-out
          shadow-[0_0_40px_rgba(0,161,166,0.15)]
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          pb-20 lg:pb-0
        `}
        style={{
          backdropFilter: 'blur(20px)',
          boxShadow: '0 0 20px rgba(0, 212, 255, 0.5)'
        }}
      >
        <div className="p-4 border-b border-[rgba(0,212,255,0.15)] flex justify-center items-center relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[rgba(0,212,255,0.5)] to-transparent" />
          <button
            type="button"
            className="lg:hidden absolute right-3 top-3 flex items-center justify-center w-9 h-9 rounded-lg border border-[rgba(0,212,255,0.35)] bg-[rgba(0,212,255,0.08)] text-[#00d4ff]"
            onClick={() => setIsOpen(false)}
            aria-label={t('toggleMenu')}
            title={t('toggleMenu')}
          >
            <X size={18} />
          </button>
          <button
            type="button"
            className="hidden lg:flex absolute right-3 top-1/2 -translate-y-1/2 items-center justify-center w-9 h-9 rounded-lg border border-[rgba(0,212,255,0.35)] bg-[rgba(0,212,255,0.08)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.16)]"
            onClick={() => setIsOpen(false)}
            aria-label={t('toggleMenu')}
            title={t('toggleMenu')}
          >
            <X size={18} />
          </button>
          <Image
            src="/logo.png"
            alt={t('appName')}
            width={240}
            height={80}
            style={{
              width: '100%',
              height: 'auto',
              maxWidth: '220px',
              objectFit: 'contain',
              filter: 'drop-shadow(0 0 10px rgba(0, 212, 255, 0.3))'
            }}
            priority
          />
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-5">
            {navSections.map((section) => (
              <div key={section.title}>
                <div
                  style={{
                    padding: '0 12px 7px',
                    fontSize: '10px',
                    fontWeight: 900,
                    letterSpacing: '1.5px',
                    color: 'rgba(0, 212, 255, 0.58)',
                    textTransform: 'uppercase'
                  }}
                >
                  {section.title}
                </div>

                <div className="space-y-1">
                  {section.items.map((item) => {
                    if (item.type === 'tour') {
                      return <SidebarGuideTour key="tour" onClick={() => setIsOpen(false)} />
                    }

                    const Icon = item.icon
                    const active = getItemActive(item)
                    const isGameAnalysisShortcut = item.shortcut === 'gameAnalysis'
                    const navKey = item.shortcut || item.href

                    const navContent = (
                      <>
                        <Icon
                          size={18}
                          style={{
                            filter: active || item.variant === 'gold' || item.variant === 'wow'
                              ? `drop-shadow(0 0 5px ${item.variant === 'gold' ? 'rgba(255, 203, 5, 0.75)' : item.variant === 'wow' ? 'rgba(34, 211, 238, 0.75)' : 'rgba(0, 212, 255, 0.8)'})`
                              : 'none'
                          }}
                        />
                        <span style={{ flex: 1, minWidth: 0 }}>{item.label}</span>
                        {renderNavBadge(item)}
                      </>
                    )

                    if (isGameAnalysisShortcut && pathname === '/') {
                      return (
                        <button
                          key={navKey}
                          type="button"
                          onClick={() => {
                            setIsOpen(false)
                            if (typeof window !== 'undefined') {
                              window.dispatchEvent(new CustomEvent(OPEN_GAME_ANALYSIS_MODAL_EVENT))
                            }
                          }}
                          style={{
                            ...getNavItemStyle(item, active),
                            width: '100%',
                            font: 'inherit'
                          }}
                          onMouseEnter={(e) => handleNavMouseEnter(e, item, active)}
                          onMouseLeave={(e) => handleNavMouseLeave(e, item, active)}
                        >
                          {navContent}
                        </button>
                      )
                    }

                    if (item.shortcut === 'tornei') {
                      return (
                        <button
                          key={navKey}
                          type="button"
                          onClick={() => {
                            setIsOpen(false)
                            setRedirectModal({ open: true, url: item.href })
                          }}
                          style={{
                            ...getNavItemStyle(item, active),
                            width: '100%',
                            font: 'inherit'
                          }}
                          onMouseEnter={(e) => handleNavMouseEnter(e, item, active)}
                          onMouseLeave={(e) => handleNavMouseLeave(e, item, active)}
                        >
                          {navContent}
                        </button>
                      )
                    }

                    return (
                      <Link
                        key={navKey}
                        href={item.href}
                        prefetch={isGameAnalysisShortcut ? false : undefined}
                        onClick={() => setIsOpen(false)}
                        style={getNavItemStyle(item, active)}
                        onMouseEnter={(e) => handleNavMouseEnter(e, item, active)}
                        onMouseLeave={(e) => handleNavMouseLeave(e, item, active)}
                      >
                        {navContent}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}

            <div
              style={{
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.3), transparent)',
                margin: '16px 0'
              }}
            />

            <button
              onClick={() => {
                setIsOpen(false)
                handleLogout()
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 600,
                background: 'rgba(255, 80, 80, 0.15)',
                color: '#ff6b6b',
                border: '1px solid rgba(255, 80, 80, 0.4)',
                boxShadow: '0 0 10px rgba(255, 80, 80, 0.1)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                textDecoration: 'none',
                width: '100%',
                marginTop: '8px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 80, 80, 0.25)'
                e.currentTarget.style.borderColor = 'rgba(255, 80, 80, 0.6)'
                e.currentTarget.style.color = '#ff8585'
                e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 80, 80, 0.2)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 80, 80, 0.15)'
                e.currentTarget.style.borderColor = 'rgba(255, 80, 80, 0.4)'
                e.currentTarget.style.color = '#ff6b6b'
                e.currentTarget.style.boxShadow = '0 0 10px rgba(255, 80, 80, 0.1)'
              }}
            >
              <LogOut size={18} style={{ filter: 'drop-shadow(0 0 3px rgba(255, 80, 80, 0.5))' }} />
              <span style={{ textShadow: '0 0 5px rgba(255, 80, 80, 0.3)' }}>{t('logout')}</span>
            </button>

            <div className="lg:hidden" style={{ height: '100px' }} />
          </div>
        </nav>
      </aside>

      {redirectModal.open && (
        <div className="redirect-overlay" role="dialog" aria-modal="true" aria-label={lang === 'en' ? 'External link' : 'Link esterno'} onClick={() => setRedirectModal({ open: false, url: '' })}>
          <div className="redirect-card" onClick={(e) => e.stopPropagation()}>
            <div className="redirect-glow" aria-hidden="true">
              <Gift size={34} />
            </div>
            <h3>{lang === 'en' ? 'You are leaving the app' : 'Stai per uscire dall\'app'}</h3>
            <p>
              {lang === 'en'
                ? 'You will be redirected to FZTH Tornei, the free tournament platform.'
                : 'Verrai indirizzato a FZTH Tornei, la piattaforma gratuita per tornei.'}
            </p>
            <p className="redirect-sub">
              {lang === 'en'
                ? 'Test what you have learned and become an official Hero.'
                : 'Metti alla prova ciò che hai imparato e diventa un Hero ufficiale.'}
            </p>
            <div className="redirect-actions">
              <a
                className="redirect-primary"
                href={redirectModal.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {lang === 'en' ? 'Go to FZTH Tornei' : 'Vai a FZTH Tornei'}
              </a>
              <button
                className="redirect-secondary"
                type="button"
                onClick={() => setRedirectModal({ open: false, url: '' })}
              >
                {lang === 'en' ? 'Stay here' : 'Resta qui'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .redirect-overlay {
          position: fixed;
          inset: 0;
          z-index: 10070;
          display: grid;
          place-items: center;
          padding: 18px;
          background: rgba(0, 0, 0, 0.72);
          backdrop-filter: blur(6px);
          overflow-y: auto;
          animation: redirect-fade-in 0.2s ease both;
        }

        .redirect-card {
          position: relative;
          width: min(400px, 94vw);
          padding: clamp(24px, 5vw, 34px);
          border: 1px solid rgba(34, 211, 238, 0.35);
          border-radius: 24px;
          background:
            radial-gradient(circle at 50% 0%, rgba(34, 211, 238, 0.12), transparent 42%),
            linear-gradient(145deg, rgba(8, 16, 34, 0.98), rgba(2, 6, 23, 0.98));
          box-shadow: 0 24px 90px rgba(0,0,0,0.58), 0 0 54px rgba(34, 211, 238, 0.15);
          color: #fff;
          text-align: center;
          overflow: hidden;
          animation: redirect-slide-in 0.3s cubic-bezier(0.18, 0.78, 0.28, 1) both;
        }

        .redirect-glow {
          width: 76px;
          height: 76px;
          margin: 0 auto 16px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          color: #03101d;
          background: linear-gradient(135deg, #22d3ee, #a78bfa 48%, #7c3aed);
          box-shadow: 0 0 30px rgba(34, 211, 238, 0.35), 0 0 50px rgba(168, 85, 247, 0.2);
          animation: redirect-pulse 2s ease-in-out infinite;
        }

        .redirect-card h3 {
          margin: 0 0 10px;
          font-size: clamp(1.3rem, 5vw, 1.7rem);
          letter-spacing: -0.04em;
          color: #fff;
        }

        .redirect-card p {
          margin: 0 0 6px;
          color: rgba(226, 232, 240, 0.82);
          line-height: 1.48;
          font-size: 0.94rem;
        }

        .redirect-sub {
          color: rgba(34, 211, 238, 0.7);
          font-size: 0.85rem;
        }

        .redirect-actions {
          display: grid;
          gap: 10px;
          margin-top: 22px;
        }

        .redirect-primary, .redirect-secondary {
          min-height: 48px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 20px;
          font-weight: 950;
          text-decoration: none;
          cursor: pointer;
          transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
        }

        .redirect-primary {
          color: #03101d;
          background: linear-gradient(135deg, #22d3ee, #a78bfa 52%, #7c3aed);
          box-shadow: 0 0 22px rgba(34, 211, 238, 0.32), 0 0 40px rgba(168, 85, 247, 0.18);
        }

        .redirect-primary:hover {
          transform: translateY(-2px) scale(1.02);
          filter: brightness(1.08);
          box-shadow: 0 0 30px rgba(34, 211, 238, 0.45), 0 0 55px rgba(168, 85, 247, 0.25);
        }

        .redirect-secondary {
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.78);
        }

        .redirect-secondary:hover {
          background: rgba(255, 255, 255, 0.12);
        }

        @keyframes redirect-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes redirect-slide-in {
          from { opacity: 0; transform: translateY(18px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes redirect-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }

        @keyframes wow-pulse {
          0%, 100% {
            box-shadow: 0 0 12px rgba(34, 211, 238, 0.15), 0 0 24px rgba(168, 85, 247, 0.08);
            border-color: rgba(34, 211, 238, 0.22);
          }
          50% {
            box-shadow: 0 0 22px rgba(34, 211, 238, 0.35), 0 0 44px rgba(168, 85, 247, 0.18);
            border-color: rgba(34, 211, 238, 0.42);
          }
        }
      `}</style>
    </>
  )
}
