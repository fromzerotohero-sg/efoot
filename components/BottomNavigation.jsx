'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'
import { useGameAnalysisModalNav, CLOSE_GAME_ANALYSIS_MODAL_EVENT } from '@/components/GameAnalysisModalNavContext'
import { MessageSquare, Users, Sparkles } from 'lucide-react'

const TONES = {
  coach: { active: '#039FBD', idle: '#8D9297', bg: 'rgba(3,159,189,.09)' },
  rosa: { active: '#2F7BE5', idle: '#8D9297', bg: 'rgba(47,123,229,.08)' },
  carte: { active: '#9A72E8', idle: '#8D9297', bg: 'rgba(154,114,232,.08)' }
}

export default function BottomNavigation() {
  const { lang } = useTranslation()
  const pathname = usePathname()
  const { isOpen: gameAnalysisModalOpen } = useGameAnalysisModalNav()
  const items = [
    { href: '/', label: 'Coach', icon: MessageSquare, key: 'coach' },
    { href: '/gestione-formazione', label: lang === 'en' ? 'Squad' : 'Rosa', icon: Users, key: 'rosa' },
    { href: '/card-advisor-lab', label: lang === 'en' ? 'Cards' : 'Carte', icon: Sparkles, key: 'carte' }
  ]

  const content = (item) => {
    const Icon = item.icon
    const isCoach = item.key === 'coach'
    const active = isCoach ? pathname === '/' && !gameAnalysisModalOpen : pathname?.startsWith(item.href)
    const tone = TONES[item.key]
    return (
      <span className="item" style={{ color: active ? tone.active : tone.idle, background: active ? tone.bg : 'transparent' }}>
        {active ? <span className="activeLine" style={{ background: tone.active }} /> : null}
        <span className="iconBox"><Icon size={21} strokeWidth={active ? 2.3 : 1.7} /></span>
        <span className="label" style={{ fontWeight: active ? 800 : 600 }}>{item.label}</span>
      </span>
    )
  }

  return (
    <nav className="bottom-nav">
      <div className="inner">
        {items.map((item) => {
          const isCoach = item.key === 'coach'
          if (isCoach && pathname === '/' && gameAnalysisModalOpen) {
            return <button key={item.key} type="button" className="tap" aria-label={item.label} onClick={() => typeof window !== 'undefined' && window.dispatchEvent(new CustomEvent(CLOSE_GAME_ANALYSIS_MODAL_EVENT))}>{content(item)}</button>
          }
          return <Link key={item.key} href={item.href} className="tap">{content(item)}</Link>
        })}
      </div>
      <style jsx>{`
        .bottom-nav{position:fixed;left:0;right:0;bottom:0;z-index:100;display:none;background:rgba(255,255,255,.93);border-top:1px solid rgba(23,25,28,.08);backdrop-filter:blur(22px);box-shadow:0 -12px 32px rgba(54,45,34,.07);padding-bottom:env(safe-area-inset-bottom,0px)}
        .inner{height:68px;max-width:500px;margin:0 auto;padding:5px 12px;display:flex;align-items:center;justify-content:space-around}
        .tap{padding:0;margin:0;border:0;background:none;color:inherit;font:inherit;text-decoration:none;cursor:pointer;-webkit-tap-highlight-color:transparent}
        .item{position:relative;min-width:74px;min-height:52px;padding:5px 12px;border-radius:17px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}
        .activeLine{position:absolute;top:3px;width:18px;height:2px;border-radius:99px}
        .iconBox{width:27px;height:27px;display:inline-flex;align-items:center;justify-content:center}
        .label{font-size:10px;letter-spacing:-.01em;white-space:nowrap}
        @media(max-width:767px){.bottom-nav{display:block}}
        @media(min-width:768px){.bottom-nav{display:none}}
      `}</style>
    </nav>
  )
}
