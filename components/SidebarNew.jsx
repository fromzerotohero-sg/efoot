'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'
import {
  BookOpen,
  Brain,
  Gift,
  LayoutGrid,
  Menu,
  User,
  Wallet,
  Users as UsersIcon,
  Sparkles,
  LogOut,
  X,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import SidebarGuideTour from '@/components/SidebarGuideTour'
import LanguageSwitch from '@/components/LanguageSwitch'
import { useSidebar } from '@/components/SidebarContext'

export default function SidebarNew() {
  const { t, lang } = useTranslation()
  const pathname = usePathname()
  const router = useRouter()
  const { isOpen, setIsOpen } = useSidebar()
  const [redirectModal, setRedirectModal] = React.useState({ open: false, url: '' })
  const [accountOpen, setAccountOpen] = React.useState(false)
  const [accountLabel, setAccountLabel] = React.useState('Hero')

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('metalgate_user')
      if (!raw) return
      const parsed = JSON.parse(raw)
      const name = String(parsed?.username || parsed?.email || '').trim()
      if (name) setAccountLabel(name.split('@')[0])
    } catch {
      /* ignore */
    }
  }, [])

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

  // UX V2: navigazione primaria a 3 pilastri. Le vecchie sezioni (contromisure, match,
  // statistiche, upload) restano vive nelle route esistenti e saranno ricollocate sotto Coach.
  // Toni campionati dalla tavola: Coach green, Rosa blue, Carte purple. Gold solo HP.
  const PILLAR_TONES = {
    coach: {
      color: '#28D7FF',
      activeBg: 'linear-gradient(90deg, rgba(40,215,255,.15), rgba(40,215,255,.06))',
      activeBorder: 'rgba(40,215,255,.32)',
      accent: '#28D7FF',
      idleIcon: 'rgba(40, 215, 255, 0.72)'
    },
    rosa: {
      color: '#4FA2FF',
      activeBg: 'linear-gradient(90deg, rgba(79,162,255,.15), rgba(79,162,255,.06))',
      activeBorder: 'rgba(79,162,255,.32)',
      accent: '#4FA2FF',
      idleIcon: 'rgba(79, 162, 255, 0.7)'
    },
    carte: {
      color: '#A78BFA',
      activeBg: 'linear-gradient(90deg, rgba(167,139,250,.15), rgba(167,139,250,.06))',
      activeBorder: 'rgba(167,139,250,.32)',
      accent: '#A78BFA',
      idleIcon: 'rgba(167, 139, 250, 0.7)'
    }
  }

  const pillarItems = [
    { href: '/', icon: LayoutGrid, label: 'Coach', exact: true, tone: 'coach' },
    { href: '/gestione-formazione', icon: UsersIcon, label: lang === 'en' ? 'Squad' : 'Rosa', tone: 'rosa' },
    { href: '/card-advisor-lab', icon: Sparkles, label: lang === 'en' ? 'Cards' : 'Carte', tone: 'carte', badge: 'new' }
  ]

  // Utility (gerarchia visuale ridotta). Mapping verificato su route/componenti reali:
  // - Account → /impostazioni-profilo
  // - Memoria Hero → adapter verso /impostazioni-profilo (la "Nota memoria per il coach" vive li;
  //   non esiste ancora una pagina Memoria Hero dedicata: niente destinazioni fake)
  // - HP → /gestione-profilo ("Dove spendere HP")
  // - Lingua → LanguageSwitch (componente reale)
  // - Guida → /guida
  // - Tornei → link esterno con redirect modal esistente
  const accountItems = [
    { href: '/gestione-profilo', icon: Wallet, label: 'HP', iconColor: '#c9a227' },
    { href: '/impostazioni-profilo', icon: User, label: lang === 'en' ? 'Profile' : 'Profilo' }
  ]

  const otherItems = [
    { href: '/impostazioni-profilo', icon: Brain, label: lang === 'en' ? 'Hero Memory' : 'Memoria Hero' },
    { href: '/guida', icon: BookOpen, label: t('guide') },
    {
      href: 'https://tornei.fromzerotohero.io/',
      icon: Gift,
      label: 'Tornei',
      shortcut: 'tornei',
      badgeText: lang === 'en' ? 'FREE' : 'GRATIS'
    },
    { type: 'tour' },
    { type: 'language' }
  ]

  const getUtilityStyle = (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '7px 12px',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: 500,
    fontFamily: 'inherit',
    background: active ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
    color: active ? 'rgba(244, 246, 247, 0.88)' : 'rgba(244, 246, 247, 0.5)',
    border: '1px solid transparent',
    transition: 'background 0.15s ease, color 0.15s ease',
    cursor: 'pointer',
    textDecoration: 'none',
    width: '100%'
  })

  const handleUtilityMouseEnter = (e) => {
    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
    e.currentTarget.style.color = 'rgba(244, 246, 247, 0.88)'
  }

  const handleUtilityMouseLeave = (e, active) => {
    e.currentTarget.style.background = active ? 'rgba(255, 255, 255, 0.05)' : 'transparent'
    e.currentTarget.style.color = active ? 'rgba(244, 246, 247, 0.88)' : 'rgba(244, 246, 247, 0.5)'
  }

  // Pilastri: stile minimale per tono (reference: bordi sottili, niente glow, niente text-shadow)
  const getNavItemStyle = (item, active) => {
    const tone = PILLAR_TONES[item.tone] || PILLAR_TONES.coach
    return {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      height: '48px',
      padding: '0 12px',
      borderRadius: '10px',
      fontSize: '14px',
      fontWeight: active ? 700 : 650,
      background: active ? tone.activeBg : 'transparent',
      color: active ? tone.color : '#B2C2CE',
      border: `1px solid ${active ? tone.activeBorder : 'transparent'}`,
      boxShadow: active ? 'inset 0 1px rgba(255,255,255,.03)' : 'none',
      position: 'relative',
      overflow: 'hidden',
      transition: 'background 160ms ease, color 160ms ease, border-color 160ms ease',
      cursor: 'pointer',
      textDecoration: 'none'
    }
  }

  const handleNavMouseEnter = (e, item, active) => {
    if (active) return
    const tone = PILLAR_TONES[item.tone] || PILLAR_TONES.coach
    e.currentTarget.style.background = tone.activeBg
    e.currentTarget.style.color = tone.color
    e.currentTarget.style.borderColor = tone.activeBorder
  }

  const handleNavMouseLeave = (e, item, active) => {
    if (active) return
    e.currentTarget.style.background = 'transparent'
    e.currentTarget.style.color = '#B2C2CE'
    e.currentTarget.style.borderColor = 'transparent'
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
            color: isWow ? '#03101d' : (item.variant === 'gold' ? '#1f1300' : 'rgba(244,246,247,0.85)'),
            background: isWow
              ? 'rgba(48, 176, 96, 0.18)'
              : (item.variant === 'gold'
                ? 'rgba(201, 162, 39, 0.22)'
                : 'rgba(48, 176, 96, 0.18)'),
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: 'none'
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
          color: 'rgba(244, 246, 247, 0.72)',
          background: 'rgba(48, 176, 96, 0.16)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: 'none'
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
          fixed top-0 left-0 h-screen
          flex flex-col z-40 transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          pb-20 lg:pb-0
        `}
        style={{
          width: 196,
          background: '#07131E',
          borderRight: '1px solid rgba(104,174,207,.14)',
        }}
      >
        <div className="p-3 border-b border-[rgba(255,255,255,0.06)] flex justify-center items-center relative" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.055)' }}>
          <button
            type="button"
            className="lg:hidden absolute right-3 top-3 flex items-center justify-center w-8 h-8 rounded-lg border border-[rgba(255,255,255,0.08)] bg-transparent text-[rgba(244,246,247,0.65)]"
            onClick={() => setIsOpen(false)}
            aria-label={t('toggleMenu')}
            title={t('toggleMenu')}
          >
            <X size={16} />
          </button>
          <button
            type="button"
            className="hidden lg:flex absolute right-3 top-1/2 -translate-y-1/2 items-center justify-center w-8 h-8 rounded-lg border border-[rgba(255,255,255,0.08)] bg-transparent text-[rgba(244,246,247,0.65)] hover:bg-[rgba(255,255,255,0.05)]"
            onClick={() => setIsOpen(false)}
            aria-label={t('toggleMenu')}
            title={t('toggleMenu')}
          >
            <X size={16} />
          </button>
          <Image
            src="/logo.png"
            alt={t('appName')}
            width={148}
            height={48}
            style={{
              width: 'auto',
              height: '36px',
              maxWidth: '132px',
              objectFit: 'contain'
            }}
            priority
          />
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3" style={{ display: 'flex', flexDirection: 'column' }}>
          {/* 3 pilastri: gerarchia visuale primaria */}
          <div className="space-y-1">
            {pillarItems.map((item) => {
              const Icon = item.icon
              const active = item.exact ? pathname === '/' : isActive(item.href)
              const tone = PILLAR_TONES[item.tone] || PILLAR_TONES.coach
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  style={getNavItemStyle(item, active)}
                  onMouseEnter={(e) => handleNavMouseEnter(e, item, active)}
                  onMouseLeave={(e) => handleNavMouseLeave(e, item, active)}
                >
                  {active ? (
                    <span
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 8,
                        bottom: 8,
                        width: 2,
                        borderRadius: 1,
                        background: tone.accent
                      }}
                    />
                  ) : null}
                  <Icon
                    size={20}
                    style={{ color: active ? tone.color : tone.idleIcon, flexShrink: 0 }}
                  />
                  <span style={{ flex: 1, minWidth: 0 }}>{item.label}</span>
                  {renderNavBadge(item)}
                </Link>
              )
            })}
          </div>

          {/* Account: HP + Profilo, visibili come nella reference. Altro: utility secondarie. */}
          <div style={{ marginTop: 'auto', paddingTop: '12px' }}>
            <div style={{ height: '1px', background: 'rgba(104,174,207,0.14)', margin: '0 4px 10px' }} />
            <button
              type="button"
              onClick={() => setAccountOpen((open) => !open)}
              aria-expanded={accountOpen}
              aria-label={lang === 'en' ? 'Account menu' : 'Menu account'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                minHeight: 52,
                padding: '8px 10px',
                border: '1px solid rgba(104,174,207,0.16)',
                borderRadius: 12,
                background: accountOpen
                  ? 'linear-gradient(180deg, #162C3A, #112331)'
                  : 'linear-gradient(180deg, #112331, #0D1B27)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,.05)',
                color: '#F7FAFC',
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}
            >
              <span style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(40, 215, 255, 0.14)',
                border: '1px solid rgba(40, 215, 255, 0.2)',
                color: '#28D7FF',
                flexShrink: 0
              }}>
                <User size={14} />
              </span>
              <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{accountLabel}</span>
                <span style={{ display: 'block', fontSize: 10, color: '#718695' }}>Hero Coach</span>
              </span>
              {accountOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {accountOpen ? (
              <div style={{ paddingTop: 8 }}>
                <div className="space-y-0.5" style={{ marginBottom: 8 }}>
                  {accountItems.map((item) => {
                    const Icon = item.icon
                    const active = isActive(item.href)
                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        style={{ ...getUtilityStyle(active), fontWeight: 600 }}
                        onMouseEnter={handleUtilityMouseEnter}
                        onMouseLeave={(e) => handleUtilityMouseLeave(e, active)}
                      >
                        <Icon size={16} style={{ flexShrink: 0, ...(item.iconColor ? { color: item.iconColor } : {}) }} />
                        <span style={{ flex: 1, minWidth: 0 }}>{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
                {otherItems.map((item) => {
                  if (item.type === 'tour') {
                    return <SidebarGuideTour key="tour" onClick={() => setIsOpen(false)} />
                  }
                  if (item.type === 'language') {
                    return (
                      <div key="language" style={{ padding: '6px 12px' }}>
                        <LanguageSwitch />
                      </div>
                    )
                  }
                  const Icon = item.icon
                  const active = item.shortcut !== 'tornei' && isActive(item.href)
                  const utilityContent = (
                    <>
                      <Icon size={15} style={{ flexShrink: 0, opacity: 0.8 }} />
                      <span style={{ flex: 1, minWidth: 0 }}>{item.label}</span>
                      {renderNavBadge(item)}
                    </>
                  )
                  if (item.shortcut === 'tornei') {
                    return (
                      <button
                        key="tornei"
                        type="button"
                        onClick={() => {
                          setIsOpen(false)
                          setRedirectModal({ open: true, url: item.href })
                        }}
                        style={getUtilityStyle(false)}
                        onMouseEnter={handleUtilityMouseEnter}
                        onMouseLeave={(e) => handleUtilityMouseLeave(e, false)}
                      >
                        {utilityContent}
                      </button>
                    )
                  }
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      style={getUtilityStyle(active)}
                      onMouseEnter={handleUtilityMouseEnter}
                      onMouseLeave={(e) => handleUtilityMouseLeave(e, active)}
                    >
                      {utilityContent}
                    </Link>
                  )
                })}
                <button
                  onClick={() => {
                    setIsOpen(false)
                    handleLogout()
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 500,
                    background: 'transparent',
                    color: 'rgba(255, 130, 130, 0.75)',
                    border: '1px solid transparent',
                    cursor: 'pointer',
                    width: '100%',
                    marginTop: '6px'
                  }}
                >
                  <LogOut size={15} />
                  <span>{t('logout')}</span>
                </button>
              </div>
            ) : null}

            <div className="lg:hidden" style={{ height: '100px' }} />
          </div>
        </nav>
      </aside>

      {/* Rail compatta tablet (768-1023px): 3 pilastri icona + accesso al drawer utility.
          Tra mobile e desktop niente sidebar larga permanente: il contenuto Rosa mantiene spazio utile. */}
      <nav className="tablet-rail" aria-label={lang === 'en' ? 'Main navigation' : 'Navigazione principale'}>
        {pillarItems.map((item) => {
          const Icon = item.icon
          const active = item.exact ? pathname === '/' : isActive(item.href)
          const tone = PILLAR_TONES[item.tone] || PILLAR_TONES.coach
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              title={item.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                flexShrink: 0,
                color: active ? tone.color : tone.idleIcon,
                background: active ? tone.activeBg : 'transparent',
                border: `1px solid ${active ? tone.activeBorder : 'transparent'}`,
                transition: 'all 0.2s ease'
              }}
            >
              <Icon size={20} />
            </Link>
          )
        })}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label={t('toggleMenu')}
          title={t('toggleMenu')}
          style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            flexShrink: 0,
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: 'rgba(244, 246, 247, 0.7)',
            cursor: 'pointer'
          }}
        >
          <Menu size={20} />
        </button>
      </nav>

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
        .tablet-rail {
          display: none;
        }

        @media (min-width: 768px) and (max-width: 1023px) {
          .tablet-rail {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            position: fixed;
            top: 56px;
            left: 0;
            bottom: 0;
            width: 64px;
            z-index: 35;
            padding: 12px 10px 16px;
            background: #07131E;
            border-right: 1px solid rgba(104, 174, 207, 0.14);
          }
        }

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
