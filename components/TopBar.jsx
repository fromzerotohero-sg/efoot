'use client'

import React from 'react'
import Link from 'next/link'
import { Menu, X, ShoppingCart, Home, User } from 'lucide-react'
import CreditsBar from '@/components/CreditsBar'
import { InstallAppPromptButton } from '@/components/InstallAppPrompt'
import LanguageSwitch from '@/components/LanguageSwitch'
import ThemeToggle from '@/components/ThemeToggle'
import { useSidebar } from '@/components/SidebarContext'
import { useTranslation, pickLang } from '@/lib/i18n'

const HOME_DASHBOARD_URL = 'https://home.fromzerotohero.io/dashboard'

const avatarStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  background: 'var(--surface-2)',
  border: '1px solid var(--border-soft)',
  color: 'var(--text-main)',
  cursor: 'pointer',
  transition: 'all 0.2s',
  flexShrink: 0,
  textDecoration: 'none'
}

export default function TopBar({ showInstallPrompt = true }) {
  const { t, lang } = useTranslation()
  const { isOpen, toggleSidebar } = useSidebar()
  const homeLabel = pickLang(lang, { it: 'Vai alla dashboard From Zero to Hero', en: 'Go to the From Zero to Hero dashboard', es: 'Ir al panel de From Zero to Hero' })
  const cartLabel = pickLang(lang, { it: 'Acquista Hero Points', en: 'Buy Hero Points', es: 'Comprar Hero Points' })
  const accountLabel = pickLang(lang, { it: 'Account', en: 'Account', es: 'Cuenta' })

  return (
    <header
      className="sticky top-0 z-30 h-16 flex items-center"
      style={{
        background: 'var(--topbar-bg)',
        borderBottom: '1px solid var(--border-softer)',
        backdropFilter: 'blur(20px)',
        position: 'relative'
      }}
    >
      <div
        style={{
          position: 'absolute',
          bottom: '-1px',
          left: '0',
          right: '0',
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08), transparent)'
        }}
      />
      <div
        className="topbar-inner h-full px-3 lg:px-6 flex items-center w-full relative z-10"
        style={{
          justifyContent: 'space-between',
          gap: '8px'
        }}
      >
        {/* LEFT SECTION - Menu (tablet/desktop) + Logo (mobile) + Home */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {/* Menu: drawer utility. Nascosto su mobile: li il drawer si apre dall'avatar. */}
          <button
            type="button"
            className="topbar-menu-toggle"
            onClick={toggleSidebar}
            aria-label={t('toggleMenu')}
            title={t('toggleMenu')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'var(--surface-2)',
              border: '1px solid var(--border-soft)',
              color: 'var(--text-main)',
              boxShadow: 'none',
              flexShrink: 0
            }}
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Logo mobile: target UX V2 = Logo | Hero Points | Avatar */}
          <Link
            href="/"
            className="topbar-logo-mobile"
            aria-label="Coach"
            style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}
          >
            <img
              src="/logo.png"
              alt={t('appName')}
              style={{ height: '30px', width: 'auto', display: 'block' }}
            />
          </Link>

          {/* Home → Command Center (stessa scheda, ecosistema FZTH) - solo tablet/desktop */}
          <button
            type="button"
            className="topbar-desktop-utility"
            onClick={() => {
              window.location.assign(HOME_DASHBOARD_URL)
            }}
            aria-label={homeLabel}
            title={homeLabel}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'var(--surface-2)',
              border: '1px solid var(--border-soft)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              flexShrink: 0
            }}
          >
            <Home size={18} />
          </button>
        </div>

        {/* CENTER SECTION - vuoto */}
        <div style={{ flex: 1 }} />

        {/* RIGHT SECTION - utility: HP sempre visibili, il resto solo tablet/desktop */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexShrink: 0,
          justifyContent: 'flex-end'
        }}>
          {/* Guard S0: nascosto su staging/preview, dove InstallAppPrompt non e montato */}
          {showInstallPrompt && <InstallAppPromptButton />}

          {/* Hero Points: utility compatta sempre raggiungibile */}
          <CreditsBar />

          {/* Icona Carrello - solo tablet/desktop */}
          <button
            type="button"
            className="topbar-desktop-utility"
            onClick={() => window.open('https://home.fromzerotohero.io/dashboard?usage', '_blank')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'var(--surface-2)',
              border: '1px solid var(--border-soft)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              flexShrink: 0
            }}
            aria-label={cartLabel}
            title={cartLabel}
          >
            <ShoppingCart size={18} />
          </button>

          <ThemeToggle />

          <div style={{ flexShrink: 0 }}>
            <LanguageSwitch />
          </div>

          {/* Avatar/account trigger: desktop → pagina Account; mobile → drawer utility */}
          <div className="topbar-avatar-desktop">
            <Link href="/impostazioni-profilo" aria-label={accountLabel} title={accountLabel} style={avatarStyle}>
              <User size={18} />
            </Link>
          </div>
          <button
            type="button"
            className="topbar-avatar-mobile"
            onClick={toggleSidebar}
            aria-label={accountLabel}
            title={accountLabel}
            style={avatarStyle}
          >
            <User size={18} />
          </button>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 1023px) {
          header {
            height: 56px !important;
          }
        }

        .topbar-avatar-mobile {
          display: none !important;
        }

        @media (max-width: 767px) {
          .topbar-menu-toggle,
          .topbar-desktop-utility,
          .topbar-avatar-desktop {
            display: none !important;
          }
          .topbar-avatar-mobile {
            display: flex !important;
          }
          .topbar-inner {
            gap: 6px !important;
            padding-left: 10px !important;
            padding-right: 10px !important;
          }
        }

        @media (min-width: 768px) {
          .topbar-logo-mobile {
            display: none !important;
          }
        }
      `}</style>
    </header>
  )
}
