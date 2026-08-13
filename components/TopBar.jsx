'use client'

import React from 'react'
import Link from 'next/link'
import { Menu, X, ShoppingCart, Home, User } from 'lucide-react'
import CreditsBar from '@/components/CreditsBar'
import { InstallAppPromptButton } from '@/components/InstallAppPrompt'
import LanguageSwitch from '@/components/LanguageSwitch'
import { useSidebar } from '@/components/SidebarContext'
import { useTranslation } from '@/lib/i18n'

const HOME_DASHBOARD_URL = 'https://home.fromzerotohero.io/dashboard'

const avatarStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  color: 'rgba(244, 246, 247, 0.75)',
  cursor: 'pointer',
  transition: 'all 0.2s',
  flexShrink: 0,
  textDecoration: 'none'
}

export default function TopBar({ showInstallPrompt = true }) {
  const { t } = useTranslation()
  const { isOpen, toggleSidebar } = useSidebar()

  return (
    <header
      className="sticky top-0 z-30 h-16 flex items-center"
      style={{
        background: 'rgba(9, 16, 22, 0.92)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
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
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), transparent)'
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
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: 'rgba(244, 246, 247, 0.82)',
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
            aria-label="Vai alla dashboard From Zero to Hero"
            title="Command Center"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: 'rgba(244, 246, 247, 0.75)',
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
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: 'rgba(244, 246, 247, 0.75)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              flexShrink: 0
            }}
            title="Acquista Hero Points"
          >
            <ShoppingCart size={18} />
          </button>

          {/* Language Switch - solo tablet/desktop (su mobile resta nel drawer utility) */}
          <div className="topbar-desktop-utility" style={{ flexShrink: 0 }}>
            <LanguageSwitch />
          </div>

          {/* Avatar/account trigger: desktop → pagina Account; mobile → drawer utility */}
          <div className="topbar-avatar-desktop">
            <Link href="/impostazioni-profilo" aria-label="Account" title="Account" style={avatarStyle}>
              <User size={18} />
            </Link>
          </div>
          <button
            type="button"
            className="topbar-avatar-mobile"
            onClick={toggleSidebar}
            aria-label="Account"
            title="Account"
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
