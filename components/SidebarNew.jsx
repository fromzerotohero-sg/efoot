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
  LogOut,
  Menu,
  X,
  MessageSquare
} from 'lucide-react'
import SidebarGuideTour from '@/components/SidebarGuideTour'
import { useSidebar } from '@/components/SidebarContext'

export default function SidebarNew() {
  const { t } = useTranslation()
  const pathname = usePathname()
  const router = useRouter()
  const { isOpen, setIsOpen } = useSidebar()
  const [expandedMenus, setExpandedMenus] = React.useState({ home: true, profile: false, matches: false })

  const handleLogout = () => {
    fetch('/api/prelaunch/logout', { method: 'POST' }).catch(() => {})
    localStorage.removeItem('auth_token')
    localStorage.removeItem('metalgate_user')
    router.push('/login')
  }

  const isActive = (href) => {
    if (href === '/') return pathname === '/'
    return pathname?.startsWith(href)
  }

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
          style={{ backdropFilter: 'blur(4px)' }}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-screen w-64 
          bg-gradient-to-b from-[rgba(13,20,40,0.95)] to-[rgba(5,12,25,0.98)]
          border-r border-[rgba(0,212,255,0.2)]
          flex flex-col z-40 transition-transform duration-300 ease-in-out
          shadow-[0_0_40px_rgba(0,161,166,0.15)]
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          pb-20 lg:pb-0
        `}
        style={{
          backdropFilter: 'blur(20px)',
          boxShadow: '0 0 20px rgba(0, 212, 255, 0.5)'
        }}
      >
        {/* Logo/Brand */}
        <div className="p-4 border-b border-[rgba(0,212,255,0.15)] flex justify-center items-center relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[rgba(0,212,255,0.5)] to-transparent" />
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

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-2">
            {/* Guida */}
            <Link
              href="/guida"
              onClick={() => setIsOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 600,
                background: isActive('/guida') 
                  ? 'linear-gradient(145deg, rgba(0, 212, 255, 0.15) 0%, rgba(0, 161, 166, 0.1) 100%)' 
                  : 'transparent',
                color: isActive('/guida') ? '#00d4ff' : 'rgba(255, 255, 255, 0.6)',
                border: isActive('/guida') 
                  ? '1px solid rgba(0, 212, 255, 0.4)' 
                  : '1px solid transparent',
                boxShadow: isActive('/guida') 
                  ? '0 0 20px rgba(0, 212, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)' 
                  : 'none',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                textDecoration: 'none',
                textShadow: isActive('/guida') ? '0 0 10px rgba(0, 212, 255, 0.5)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActive('/guida')) {
                  e.currentTarget.style.background = 'rgba(0, 212, 255, 0.08)'
                  e.currentTarget.style.color = '#00d4ff'
                  e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.25)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive('/guida')) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'
                  e.currentTarget.style.borderColor = 'transparent'
                }
              }}
            >
              <BookOpen size={18} style={{ filter: isActive('/guida') ? 'drop-shadow(0 0 5px rgba(0, 212, 255, 0.8))' : 'none' }} />
              <span>{t('guide')}</span>
            </Link>

            {/* Dashboard */}
            <Link
              href="/"
              onClick={() => setIsOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 600,
                background: (isActive('/') && pathname === '/') 
                  ? 'linear-gradient(145deg, rgba(0, 212, 255, 0.15) 0%, rgba(0, 161, 166, 0.1) 100%)' 
                  : 'transparent',
                color: (isActive('/') && pathname === '/') ? '#00d4ff' : 'rgba(255, 255, 255, 0.6)',
                border: (isActive('/') && pathname === '/') 
                  ? '1px solid rgba(0, 212, 255, 0.4)' 
                  : '1px solid transparent',
                boxShadow: (isActive('/') && pathname === '/') 
                  ? '0 0 20px rgba(0, 212, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)' 
                  : 'none',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                textDecoration: 'none',
                textShadow: (isActive('/') && pathname === '/') ? '0 0 10px rgba(0, 212, 255, 0.5)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (!(isActive('/') && pathname === '/')) {
                  e.currentTarget.style.background = 'rgba(0, 212, 255, 0.08)'
                  e.currentTarget.style.color = '#00d4ff'
                  e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.25)'
                }
              }}
              onMouseLeave={(e) => {
                if (!(isActive('/') && pathname === '/')) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'
                  e.currentTarget.style.borderColor = 'transparent'
                }
              }}
            >
              <LayoutGrid size={18} style={{ filter: (isActive('/') && pathname === '/') ? 'drop-shadow(0 0 5px rgba(0, 212, 255, 0.8))' : 'none' }} />
              <span>{t('dashboard')}</span>
            </Link>

            {/* Coach AI */}
            <Link
              href="/assistant"
              onClick={() => setIsOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 600,
                background: isActive('/assistant') 
                  ? 'linear-gradient(145deg, rgba(0, 212, 255, 0.15) 0%, rgba(0, 161, 166, 0.1) 100%)' 
                  : 'transparent',
                color: isActive('/assistant') ? '#00d4ff' : 'rgba(255, 255, 255, 0.6)',
                border: isActive('/assistant') 
                  ? '1px solid rgba(0, 212, 255, 0.4)' 
                  : '1px solid transparent',
                boxShadow: isActive('/assistant') 
                  ? '0 0 20px rgba(0, 212, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)' 
                  : 'none',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                textDecoration: 'none',
                textShadow: isActive('/assistant') ? '0 0 10px rgba(0, 212, 255, 0.5)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActive('/assistant')) {
                  e.currentTarget.style.background = 'rgba(0, 212, 255, 0.08)'
                  e.currentTarget.style.color = '#00d4ff'
                  e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.25)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive('/assistant')) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'
                  e.currentTarget.style.borderColor = 'transparent'
                }
              }}
            >
              <MessageSquare size={18} style={{ filter: isActive('/assistant') ? 'drop-shadow(0 0 5px rgba(0, 212, 255, 0.8))' : 'none' }} />
              <span>{t('coachAI')}</span>
            </Link>

            {/* Profilo */}
            <Link
              href="/impostazioni-profilo"
              onClick={() => setIsOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 600,
                background: isActive('/impostazioni-profilo') 
                  ? 'linear-gradient(145deg, rgba(0, 212, 255, 0.15) 0%, rgba(0, 161, 166, 0.1) 100%)' 
                  : 'transparent',
                color: isActive('/impostazioni-profilo') ? '#00d4ff' : 'rgba(255, 255, 255, 0.6)',
                border: isActive('/impostazioni-profilo') 
                  ? '1px solid rgba(0, 212, 255, 0.4)' 
                  : '1px solid transparent',
                boxShadow: isActive('/impostazioni-profilo') 
                  ? '0 0 20px rgba(0, 212, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)' 
                  : 'none',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                textDecoration: 'none',
                textShadow: isActive('/impostazioni-profilo') ? '0 0 10px rgba(0, 212, 255, 0.5)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActive('/impostazioni-profilo')) {
                  e.currentTarget.style.background = 'rgba(0, 212, 255, 0.08)'
                  e.currentTarget.style.color = '#00d4ff'
                  e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.25)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive('/impostazioni-profilo')) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'
                  e.currentTarget.style.borderColor = 'transparent'
                }
              }}
            >
              <User size={18} style={{ filter: isActive('/impostazioni-profilo') ? 'drop-shadow(0 0 5px rgba(0, 212, 255, 0.8))' : 'none' }} />
              <span>{t('profile')}</span>
            </Link>

            {/* Hero Points / Gestione profilo */}
            <Link
              href="/gestione-profilo"
              onClick={() => setIsOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 600,
                background: isActive('/gestione-profilo')
                  ? 'linear-gradient(145deg, rgba(0, 212, 255, 0.15) 0%, rgba(0, 161, 166, 0.1) 100%)'
                  : 'transparent',
                color: isActive('/gestione-profilo') ? '#00d4ff' : 'rgba(255, 255, 255, 0.6)',
                border: isActive('/gestione-profilo')
                  ? '1px solid rgba(0, 212, 255, 0.4)'
                  : '1px solid transparent',
                boxShadow: isActive('/gestione-profilo')
                  ? '0 0 20px rgba(0, 212, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                  : 'none',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                textDecoration: 'none',
                textShadow: isActive('/gestione-profilo') ? '0 0 10px rgba(0, 212, 255, 0.5)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActive('/gestione-profilo')) {
                  e.currentTarget.style.background = 'rgba(0, 212, 255, 0.08)'
                  e.currentTarget.style.color = '#00d4ff'
                  e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.25)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive('/gestione-profilo')) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'
                  e.currentTarget.style.borderColor = 'transparent'
                }
              }}
            >
              <Wallet size={18} style={{ filter: isActive('/gestione-profilo') ? 'drop-shadow(0 0 5px rgba(0, 212, 255, 0.8))' : 'none' }} />
              <span>{t('gestioneProfilo')}</span>
            </Link>

            {/* La tua squadra */}
            <Link
              href="/gestione-formazione"
              onClick={() => setIsOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 600,
                background: isActive('/gestione-formazione') 
                  ? 'linear-gradient(145deg, rgba(0, 212, 255, 0.15) 0%, rgba(0, 161, 166, 0.1) 100%)' 
                  : 'transparent',
                color: isActive('/gestione-formazione') ? '#00d4ff' : 'rgba(255, 255, 255, 0.6)',
                border: isActive('/gestione-formazione') 
                  ? '1px solid rgba(0, 212, 255, 0.4)' 
                  : '1px solid transparent',
                boxShadow: isActive('/gestione-formazione') 
                  ? '0 0 20px rgba(0, 212, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)' 
                  : 'none',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                textDecoration: 'none',
                textShadow: isActive('/gestione-formazione') ? '0 0 10px rgba(0, 212, 255, 0.5)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActive('/gestione-formazione')) {
                  e.currentTarget.style.background = 'rgba(0, 212, 255, 0.08)'
                  e.currentTarget.style.color = '#00d4ff'
                  e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.25)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive('/gestione-formazione')) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'
                  e.currentTarget.style.borderColor = 'transparent'
                }
              }}
            >
              <UsersIcon size={18} style={{ filter: isActive('/gestione-formazione') ? 'drop-shadow(0 0 5px rgba(0, 212, 255, 0.8))' : 'none' }} />
              <span>{t('yourSquad')}</span>
            </Link>

            {/* Cronologia Partite */}
            <Link
              href="/match"
              onClick={() => setIsOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 600,
                background: isActive('/match') 
                  ? 'linear-gradient(145deg, rgba(0, 212, 255, 0.15) 0%, rgba(0, 161, 166, 0.1) 100%)' 
                  : 'transparent',
                color: isActive('/match') ? '#00d4ff' : 'rgba(255, 255, 255, 0.6)',
                border: isActive('/match') 
                  ? '1px solid rgba(0, 212, 255, 0.4)' 
                  : '1px solid transparent',
                boxShadow: isActive('/match') 
                  ? '0 0 20px rgba(0, 212, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)' 
                  : 'none',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                textDecoration: 'none',
                textShadow: isActive('/match') ? '0 0 10px rgba(0, 212, 255, 0.5)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActive('/match')) {
                  e.currentTarget.style.background = 'rgba(0, 212, 255, 0.08)'
                  e.currentTarget.style.color = '#00d4ff'
                  e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.25)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive('/match')) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'
                  e.currentTarget.style.borderColor = 'transparent'
                }
              }}
            >
              <Calendar size={18} style={{ filter: isActive('/match') ? 'drop-shadow(0 0 5px rgba(0, 212, 255, 0.8))' : 'none' }} />
              <span>{t('matchHistory')}</span>
            </Link>

            {/* Grafici e Comparazione */}
            <Link
              href="/grafici-comparazione"
              onClick={() => setIsOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 600,
                background: isActive('/grafici-comparazione') 
                  ? 'linear-gradient(145deg, rgba(0, 212, 255, 0.15) 0%, rgba(0, 161, 166, 0.1) 100%)' 
                  : 'transparent',
                color: isActive('/grafici-comparazione') ? '#00d4ff' : 'rgba(255, 255, 255, 0.6)',
                border: isActive('/grafici-comparazione') 
                  ? '1px solid rgba(0, 212, 255, 0.4)' 
                  : '1px solid transparent',
                boxShadow: isActive('/grafici-comparazione') 
                  ? '0 0 20px rgba(0, 212, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)' 
                  : 'none',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                textDecoration: 'none',
                textShadow: isActive('/grafici-comparazione') ? '0 0 10px rgba(0, 212, 255, 0.5)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActive('/grafici-comparazione')) {
                  e.currentTarget.style.background = 'rgba(0, 212, 255, 0.08)'
                  e.currentTarget.style.color = '#00d4ff'
                  e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.25)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive('/grafici-comparazione')) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'
                  e.currentTarget.style.borderColor = 'transparent'
                }
              }}
            >
              <BarChart3 size={18} style={{ filter: isActive('/grafici-comparazione') ? 'drop-shadow(0 0 5px rgba(0, 212, 255, 0.8))' : 'none' }} />
              <span>{t('charts')}</span>
            </Link>

            {/* Contromisure */}
            <Link
              href="/contromisure-pre-partita"
              onClick={() => setIsOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 600,
                background: isActive('/contromisure-pre-partita') 
                  ? 'linear-gradient(145deg, rgba(0, 212, 255, 0.15) 0%, rgba(0, 161, 166, 0.1) 100%)' 
                  : 'transparent',
                color: isActive('/contromisure-pre-partita') ? '#00d4ff' : 'rgba(255, 255, 255, 0.6)',
                border: isActive('/contromisure-pre-partita') 
                  ? '1px solid rgba(0, 212, 255, 0.4)' 
                  : '1px solid transparent',
                boxShadow: isActive('/contromisure-pre-partita') 
                  ? '0 0 20px rgba(0, 212, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)' 
                  : 'none',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                textDecoration: 'none',
                textShadow: isActive('/contromisure-pre-partita') ? '0 0 10px rgba(0, 212, 255, 0.5)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActive('/contromisure-pre-partita')) {
                  e.currentTarget.style.background = 'rgba(0, 212, 255, 0.08)'
                  e.currentTarget.style.color = '#00d4ff'
                  e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.25)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive('/contromisure-pre-partita')) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'
                  e.currentTarget.style.borderColor = 'transparent'
                }
              }}
            >
              <Shield size={18} style={{ filter: isActive('/contromisure-pre-partita') ? 'drop-shadow(0 0 5px rgba(0, 212, 255, 0.8))' : 'none' }} />
              <span>{t('countermeasures')}</span>
            </Link>

            {/* Guida Tour - Mostrami come */}
            <SidebarGuideTour onClick={() => setIsOpen(false)} />

            {/* Divider */}
            <div style={{ 
              height: '1px', 
              background: 'linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.3), transparent)',
              margin: '16px 0' 
            }} />

            {/* Logout - Visibile su tutti i device */}
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
            
            {/* Spazio extra per mobile */}
            <div className="lg:hidden" style={{ height: '100px' }} />
          </div>
        </nav>

        {/* Bottom section - Logout - Solo Desktop */}
        <div className="hidden lg:block p-4 border-t border-[rgba(0,212,255,0.15)] bg-[rgba(5,8,20,0.8)]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg transition-all duration-300 group"
            style={{ 
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'rgba(255, 255, 255, 0.5)',
              fontWeight: 500,
              fontSize: '14px',
              letterSpacing: '0.3px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 212, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.3)';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
              e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 212, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <LogOut size={16} style={{ 
              transition: 'all 0.3s ease',
              opacity: 0.6,
              display: 'flex',
              alignItems: 'center',
              marginTop: '1px'
            }} className="group-hover:opacity-100" />
            <span>{t('logout')}</span>
          </button>
        </div>
      </aside>
    </>
  )
}
