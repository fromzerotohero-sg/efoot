'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'
import {
  BookOpen,
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
        { href: '/guida', icon: BookOpen, label: t('guide') }
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
        { href: '/gestione-profilo', icon: Wallet, label: lang === 'en' ? 'Analysis cost' : 'Costo analisi' }
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
    const activeColor = isGold ? '#ffcb05' : '#00d4ff'
    const borderColor = isGold ? 'rgba(255, 203, 5, 0.48)' : 'rgba(0, 212, 255, 0.4)'
    const idleBorder = isGold ? 'rgba(255, 203, 5, 0.18)' : 'transparent'
    const activeBg = isGold
      ? 'linear-gradient(145deg, rgba(255, 203, 5, 0.18) 0%, rgba(168, 85, 247, 0.10) 100%)'
      : 'linear-gradient(145deg, rgba(0, 212, 255, 0.15) 0%, rgba(0, 161, 166, 0.1) 100%)'

    return {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '10px 14px',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: isGold ? 700 : 600,
      background: active ? activeBg : (isGold ? 'rgba(255, 203, 5, 0.06)' : 'transparent'),
      color: active ? activeColor : (isGold ? 'rgba(255, 255, 255, 0.72)' : 'rgba(255, 255, 255, 0.62)'),
      border: `1px solid ${active ? borderColor : idleBorder}`,
      boxShadow: active
        ? (isGold ? '0 0 20px rgba(255, 203, 5, 0.16)' : '0 0 20px rgba(0, 212, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)')
        : 'none',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
      textDecoration: 'none',
      textShadow: active ? `0 0 10px ${isGold ? 'rgba(255, 203, 5, 0.45)' : 'rgba(0, 212, 255, 0.5)'}` : 'none'
    }
  }

  const handleNavMouseEnter = (e, item, active) => {
    if (active) return
    const isGold = item.variant === 'gold'
    e.currentTarget.style.background = isGold ? 'rgba(255, 203, 5, 0.10)' : 'rgba(0, 212, 255, 0.08)'
    e.currentTarget.style.color = isGold ? '#ffcb05' : '#00d4ff'
    e.currentTarget.style.borderColor = isGold ? 'rgba(255, 203, 5, 0.34)' : 'rgba(0, 212, 255, 0.25)'
  }

  const handleNavMouseLeave = (e, item, active) => {
    if (active) return
    const isGold = item.variant === 'gold'
    e.currentTarget.style.background = isGold ? 'rgba(255, 203, 5, 0.06)' : 'transparent'
    e.currentTarget.style.color = isGold ? 'rgba(255, 255, 255, 0.72)' : 'rgba(255, 255, 255, 0.62)'
    e.currentTarget.style.borderColor = isGold ? 'rgba(255, 203, 5, 0.18)' : 'transparent'
  }

  const renderNavBadge = (item) => {
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
                            filter: active || item.variant === 'gold'
                              ? `drop-shadow(0 0 5px ${item.variant === 'gold' ? 'rgba(255, 203, 5, 0.75)' : 'rgba(0, 212, 255, 0.8)'})`
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
    </>
  )
}
