'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslation, pickLang } from '@/lib/i18n'
import {
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

  // Navigazione primaria a 3 pilastri; i workflow operativi vivono dentro Hero.
  // Tono UNICO per tutti i pilastri: verde accent quando attiva, neutro a riposo.
  const PILLAR_TONES = {
    coach: {
      color: 'var(--accent)',
      activeBg: 'var(--accent-bg)',
      activeBorder: 'var(--accent-border)',
      accent: 'var(--accent)',
      idleIcon: 'var(--text-dim)'
    },
    rosa: {
      color: 'var(--accent)',
      activeBg: 'var(--accent-bg)',
      activeBorder: 'var(--accent-border)',
      accent: 'var(--accent)',
      idleIcon: 'var(--text-dim)'
    },
    carte: {
      color: 'var(--accent)',
      activeBg: 'var(--accent-bg)',
      activeBorder: 'var(--accent-border)',
      accent: 'var(--accent)',
      idleIcon: 'var(--text-dim)'
    }
  }

  const pillarItems = [
    { href: '/', icon: LayoutGrid, label: 'Coach', exact: true, tone: 'coach' },
    { href: '/gestione-formazione', icon: UsersIcon, label: pickLang(lang, { it: 'Rosa', en: 'Squad', es: 'Plantilla' }), tone: 'rosa' },
    { href: '/card-advisor-lab', icon: Sparkles, label: pickLang(lang, { it: 'Carte', en: 'Cards', es: 'Cartas' }), tone: 'carte', badge: 'new' }
  ]

  // Utility (gerarchia visuale ridotta). Mapping verificato su route/componenti reali:
  // - Account → /impostazioni-profilo
  // - Memoria Hero → adapter verso /impostazioni-profilo (la "Nota memoria per il coach" vive li;
  //   non esiste ancora una pagina Memoria Hero dedicata: niente destinazioni fake)
  // - HP → /impostazioni-profilo (sezione Hero Points: saldo, costi, acquisto)
  // - Lingua → LanguageSwitch (componente reale)
  // - Tornei → link esterno con redirect modal esistente
  const accountItems = [
    { href: '/impostazioni-profilo', icon: Wallet, label: 'HP', iconColor: 'var(--gold-text)' },
    { href: '/impostazioni-profilo', icon: User, label: pickLang(lang, { it: 'Profilo', en: 'Profile', es: 'Perfil' }) }
  ]

  const otherItems = [
    { href: '/impostazioni-profilo', icon: Brain, label: pickLang(lang, { it: 'Memoria Hero', en: 'Hero Memory', es: 'Memoria Hero' }) },
    {
      href: 'https://tornei.fromzerotohero.io/',
      icon: Gift,
      label: 'Tornei',
      shortcut: 'tornei',
      badgeText: pickLang(lang, { it: 'GRATIS', en: 'FREE', es: 'GRATIS' })
    },
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
    background: active ? 'var(--surface-2)' : 'transparent',
    color: active ? 'var(--text-main)' : 'var(--text-dim)',
    border: '1px solid transparent',
    transition: 'background 0.15s ease, color 0.15s ease',
    cursor: 'pointer',
    textDecoration: 'none',
    width: '100%'
  })

  const handleUtilityMouseEnter = (e) => {
    e.currentTarget.style.background = 'var(--surface-2)'
    e.currentTarget.style.color = 'var(--text-main)'
  }

  const handleUtilityMouseLeave = (e, active) => {
    e.currentTarget.style.background = active ? 'var(--surface-2)' : 'transparent'
    e.currentTarget.style.color = active ? 'var(--text-main)' : 'var(--text-dim)'
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
      color: active ? 'var(--text-main)' : 'var(--text-dim)',
      border: `1px solid ${active ? tone.activeBorder : 'transparent'}`,
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
    e.currentTarget.style.color = 'var(--text-main)'
    e.currentTarget.style.borderColor = tone.activeBorder
  }

  const handleNavMouseLeave = (e, item, active) => {
    if (active) return
    e.currentTarget.style.background = 'transparent'
    e.currentTarget.style.color = 'var(--text-dim)'
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
            color: isWow ? '#03101d' : (item.variant === 'gold' ? 'var(--gold-ink)' : 'var(--text-main)'),
            background: isWow
              ? 'var(--accent-bg)'
              : (item.variant === 'gold'
                ? 'var(--gold-bg)'
                : 'var(--accent-bg)'),
            border: '1px solid var(--border-soft)',
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
        aria-label={pickLang(lang, { it: 'Novità', en: 'New', es: 'Nuevo' })}
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
          color: 'var(--accent)',
          background: 'var(--accent-bg)',
          border: '1px solid var(--accent-border)',
          boxShadow: 'none'
        }}
      >
        {pickLang(lang, { it: 'NOVITÀ', en: 'NEW', es: 'NUEVO' })}
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
          background: 'var(--sidebar-bg)',
          backdropFilter: 'blur(24px)',
          borderRight: '1px solid var(--border-softer)',
        }}
      >
        <div className="p-3 flex justify-center items-center relative" style={{ borderBottom: '1px solid var(--border-softer)' }}>
          <button
            type="button"
            className="sb-close sb-close-mobile" style={{ position: 'absolute', right: 12, top: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border-soft)', background: 'transparent', color: 'var(--text-dim)' }}
            onClick={() => setIsOpen(false)}
            aria-label={t('toggleMenu')}
            title={t('toggleMenu')}
          >
            <X size={16} />
          </button>
          <button
            type="button"
            className="sb-close sb-close-desktop" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border-soft)', background: 'transparent', color: 'var(--text-dim)' }}
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
            <div style={{ height: '1px', background: 'var(--border-soft)', margin: '0 4px 10px' }} />
            <button
              type="button"
              onClick={() => setAccountOpen((open) => !open)}
              aria-expanded={accountOpen}
              aria-label={pickLang(lang, { it: 'Menu account', en: 'Account menu', es: 'Menú de cuenta' })}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                minHeight: 52,
                padding: '8px 10px',
                border: '1px solid var(--border-soft)',
                borderRadius: 14,
                background: accountOpen ? 'var(--surface-2)' : 'var(--surface-2)',
                color: 'var(--text-main)',
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
                background: 'var(--accent-bg)',
                border: '1px solid var(--accent-border)',
                color: 'var(--accent)',
                flexShrink: 0
              }}>
                <User size={14} />
              </span>
              <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{accountLabel}</span>
                <span style={{ display: 'block', fontSize: 10, color: 'var(--text-dim)' }}>Hero Coach</span>
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
                    color: 'var(--danger-text)',
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
      <nav className="tablet-rail" aria-label={pickLang(lang, { it: 'Navigazione principale', en: 'Main navigation', es: 'Navegación principal' })}>
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
            background: 'var(--surface-2)',
            border: '1px solid var(--border-soft)',
            color: 'var(--text-dim)',
            cursor: 'pointer'
          }}
        >
          <Menu size={20} />
        </button>
      </nav>

      {redirectModal.open && (
        <div className="redirect-overlay" role="dialog" aria-modal="true" aria-label={pickLang(lang, { it: 'Link esterno', en: 'External link', es: 'Enlace externo' })} onClick={() => setRedirectModal({ open: false, url: '' })}>
          <div className="redirect-card" onClick={(e) => e.stopPropagation()}>
            <div className="redirect-glow" aria-hidden="true">
              <Gift size={34} />
            </div>
            <h3>{pickLang(lang, { it: 'Stai per uscire dall\'app', en: 'You are leaving the app', es: 'Vas a salir de la app' })}</h3>
            <p>
              {pickLang(lang, {
                it: 'Verrai indirizzato a FZTH Tornei, la piattaforma gratuita per tornei.',
                en: 'You will be redirected to FZTH Tornei, the free tournament platform.',
                es: 'Serás redirigido a FZTH Tornei, la plataforma gratuita de torneos.'
              })}
            </p>
            <p className="redirect-sub">
              {pickLang(lang, {
                it: 'Metti alla prova ciò che hai imparato e diventa un Hero ufficiale.',
                en: 'Test what you have learned and become an official Hero.',
                es: 'Pon a prueba lo que has aprendido y conviértete en un Hero oficial.'
              })}
            </p>
            <div className="redirect-actions">
              <a
                className="redirect-primary"
                href={redirectModal.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {pickLang(lang, { it: 'Vai a FZTH Tornei', en: 'Go to FZTH Tornei', es: 'Ir a FZTH Tornei' })}
              </a>
              <button
                className="redirect-secondary"
                type="button"
                onClick={() => setRedirectModal({ open: false, url: '' })}
              >
                {pickLang(lang, { it: 'Resta qui', en: 'Stay here', es: 'Quédate aquí' })}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .sb-close-desktop {
          display: none !important;
        }

        @media (min-width: 1024px) {
          .sb-close-mobile {
            display: none !important;
          }

          .sb-close-desktop {
            display: flex !important;
          }
        }

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
            background: var(--sidebar-bg);
            border-right: 1px solid var(--border-softer);
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
          border: 1px solid var(--accent-border);
          border-radius: 24px;
          background:
            radial-gradient(circle at 50% 0%, var(--accent-bg), transparent 42%),
            var(--surface);
          box-shadow: 0 24px 90px rgba(0,0,0,0.58), 0 0 54px color-mix(in srgb, var(--accent) 15%, transparent);
          color: var(--text-main);
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
          color: var(--accent-ink);
          background: linear-gradient(135deg, var(--accent), var(--accent-strong));
          box-shadow: 0 0 30px color-mix(in srgb, var(--accent) 35%, transparent);
          animation: redirect-pulse 2s ease-in-out infinite;
        }

        .redirect-card h3 {
          margin: 0 0 10px;
          font-size: clamp(1.3rem, 5vw, 1.7rem);
          letter-spacing: -0.04em;
          color: var(--text-main);
        }

        .redirect-card p {
          margin: 0 0 6px;
          color: var(--text-main);
          line-height: 1.48;
          font-size: 0.94rem;
        }

        .redirect-sub {
          color: var(--accent);
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
          color: var(--accent-ink);
          background: linear-gradient(135deg, var(--accent), var(--accent-strong));
          box-shadow: 0 0 22px color-mix(in srgb, var(--accent) 32%, transparent);
        }

        .redirect-primary:hover {
          transform: translateY(-2px) scale(1.02);
          filter: brightness(1.08);
          box-shadow: 0 0 30px color-mix(in srgb, var(--accent) 45%, transparent);
        }

        .redirect-secondary {
          border: 1px solid var(--border-strong);
          background: var(--surface-2);
          color: var(--text-secondary);
        }

        .redirect-secondary:hover {
          background: var(--surface-3);
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
