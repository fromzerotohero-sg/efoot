'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'
import { 
  LayoutDashboard, 
  Users, 
  Target,
  BarChart3,
  UserCircle,
  Shield,
  BookOpen,
  LogOut,
  Menu,
  X,
  Zap
} from 'lucide-react'

export default function Sidebar() {
  const { t } = useTranslation()
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = React.useState(false)

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('metalgate_user')
    router.push('/login')
  }

  const navItems = [
    {
      href: '/',
      icon: LayoutDashboard,
      label: t('dashboard') || 'Dashboard',
      exact: true
    },
    {
      href: '/gestione-formazione',
      icon: Users,
      label: t('squadManagement') || 'Gestione Squadra',
    },
    {
      href: '/match/new',
      icon: Target,
      label: t('newMatch') || 'Nuova Partita',
    },
    {
      href: '/grafici-comparazione',
      icon: BarChart3,
      label: t('chartsAndComparison') || 'Grafici',
    },
    {
      href: '/contromisure-pre-partita',
      icon: Shield,
      label: t('countermeasures') || 'Contromisure',
    },
    {
      href: '/allenatori',
      icon: Zap,
      label: t('coaches') || 'Allenatori',
    },
    {
      href: '/impostazioni-profilo',
      icon: UserCircle,
      label: t('profile') || 'Profilo',
    },
    {
      href: '/guida',
      icon: BookOpen,
      label: t('guide') || 'Guida',
    }
  ]

  const isActive = (href, exact = false) => {
    if (exact) return pathname === href
    return pathname?.startsWith(href)
  }

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-[var(--bg-elevated)] border border-[rgba(0, 212, 255, 0.3)] text-[#FFFFFF]"
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-screen w-64 bg-[rgba(5, 8, 20, 0.8)] border-r border-[rgba(0, 212, 255, 0.3)]
          flex flex-col z-40 transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo/Brand */}
        <div className="p-6 border-b border-[rgba(0, 212, 255, 0.3)]">
          <h1 className="text-xl font-semibold text-[#FFFFFF] flex items-center gap-2">
            <Zap size={24} color="var(--primary-cyan)" />
            FrowningCupcake
          </h1>
          <p className="text-xs text-[rgba(0, 212, 255, 0.5)] mt-1">
            {t('fromZeroToHero') || 'From Zero to Hero'}
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href, item.exact)
              
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                      transition-all duration-150
                      ${active 
                        ? 'bg-[rgba(0,217,255,0.1)] text-[var(--primary-cyan)] border-l-2 border-[var(--primary-cyan)]' 
                        : 'text-[rgba(0, 212, 255, 0.7)] hover:bg-[rgba(0, 212, 255, 0.05)] hover:text-[#FFFFFF]'
                      }
                    `}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Bottom section - Logout */}
        <div className="p-3 border-t border-[rgba(0, 212, 255, 0.3)]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
              text-[rgba(0, 212, 255, 0.7)] hover:bg-[rgba(0, 212, 255, 0.05)] hover:text-[var(--primary-orange)]
              transition-all duration-150"
          >
            <LogOut size={18} />
            <span>{t('logout') || 'Logout'}</span>
          </button>
        </div>
      </aside>
    </>
  )
}
