'use client'

import React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslation, pickLang } from '@/lib/i18n'
import { useGameAnalysisModalNav, CLOSE_GAME_ANALYSIS_MODAL_EVENT } from '@/components/GameAnalysisModalNavContext'
import { MessageSquare, Users, Sparkles } from 'lucide-react'

const TONES = {
  coach: { active: '#006E86', idle: '#64696E', bg: 'rgba(0,110,134,.10)' },
  rosa: { active: '#245DA8', idle: '#64696E', bg: 'rgba(36,93,168,.09)' },
  carte: { active: '#7048B8', idle: '#64696E', bg: 'rgba(112,72,184,.09)' }
}

export default function BottomNavigation() {
  const { lang } = useTranslation()
  const pathname = usePathname()
  const router = useRouter()
  const { isOpen: gameAnalysisModalOpen } = useGameAnalysisModalNav()

  const items = [
    { href: '/', label: 'Coach', icon: MessageSquare, key: 'coach' },
    { href: '/gestione-formazione', label: pickLang(lang, { it: 'Rosa', en: 'Squad', es: 'Plantilla' }), icon: Users, key: 'rosa' },
    { href: '/card-advisor-lab', label: pickLang(lang, { it: 'Carte', en: 'Cards', es: 'Cartas' }), icon: Sparkles, key: 'carte' }
  ]

  const isItemActive = (item) => {
    if (item.key === 'coach') return pathname === '/' && !gameAnalysisModalOpen
    return pathname?.startsWith(item.href)
  }

  const handleNavigate = (item) => {
    if (item.key === 'coach' && pathname === '/' && gameAnalysisModalOpen) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(CLOSE_GAME_ANALYSIS_MODAL_EVENT))
      }
      return
    }
    if (pathname !== item.href) router.push(item.href)
  }

  return (
    <nav className="bottom-nav" aria-label={pickLang(lang, { it: 'Navigazione principale', en: 'Primary navigation', es: 'Navegación principal' })}>
      <div className="inner">
        {items.map((item) => {
          const Icon = item.icon
          const active = isItemActive(item)
          const tone = TONES[item.key]
          return (
            <button
              key={item.key}
              type="button"
              className="navButton"
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              onClick={() => handleNavigate(item)}
            >
              <span className="item" style={{ color: active ? tone.active : tone.idle, background: active ? tone.bg : 'transparent' }}>
                <span className="iconBox" aria-hidden="true"><Icon size={21} strokeWidth={active ? 2.35 : 1.9} /></span>
                <span className="navLabel" style={{ color: active ? tone.active : '#52575C', fontWeight: active ? 850 : 700 }}>{item.label}</span>
                {active ? <span className="activeDot" style={{ background: tone.active }} aria-hidden="true" /> : null}
              </span>
            </button>
          )
        })}
      </div>
      <style jsx>{`
        .bottom-nav{position:fixed;left:0;right:0;bottom:0;z-index:100;display:none;height:calc(76px + env(safe-area-inset-bottom,0px));padding:0 0 env(safe-area-inset-bottom,0px);background:rgba(255,255,255,.98);border-top:1px solid rgba(23,25,28,.10);box-shadow:0 -12px 32px rgba(54,45,34,.08);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);box-sizing:border-box}
        .inner{height:76px;max-width:520px;margin:0 auto;padding:7px 10px 6px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));align-items:stretch;gap:5px;box-sizing:border-box}
        .navButton{appearance:none;-webkit-appearance:none;width:100%;height:100%;min-width:0;margin:0;padding:0;border:0;outline:0;background:transparent;color:inherit;font:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
        .item{position:relative;width:100%;height:100%;min-height:62px;padding:7px 8px 9px;border-radius:18px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;box-sizing:border-box;transition:background .16s ease,color .16s ease,transform .16s ease}
        .iconBox{width:27px;height:27px;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto}
        .navLabel{display:block;min-height:13px;font-size:10.5px;line-height:13px;letter-spacing:-.01em;white-space:nowrap;text-align:center;text-decoration:none;opacity:1}
        .activeDot{position:absolute;left:50%;bottom:4px;width:4px;height:4px;border-radius:999px;transform:translateX(-50%)}
        .navButton:active .item{transform:scale(.97)}
        .navButton:focus-visible .item{outline:2px solid #006E86;outline-offset:-2px}
        @media(max-width:767px){.bottom-nav{display:block}}
        @media(min-width:768px){.bottom-nav{display:none}}
      `}</style>
    </nav>
  )
}
