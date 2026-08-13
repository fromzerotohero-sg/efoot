'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'
import { useGameAnalysisModalNav, CLOSE_GAME_ANALYSIS_MODAL_EVENT } from '@/components/GameAnalysisModalNavContext'
import { MessageSquare, Users, Sparkles } from 'lucide-react'

const TONES = {
  coach: { active: '#007C96', idle: '#6B7075', bg: 'rgba(0,124,150,.09)' },
  rosa: { active: '#2764BA', idle: '#6B7075', bg: 'rgba(39,100,186,.08)' },
  carte: { active: '#7E55C7', idle: '#6B7075', bg: 'rgba(126,85,199,.08)' }
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
        <span className="iconBox"><Icon size={22} strokeWidth={active ? 2.3 : 1.8} /></span>
        <span className="label" style={{ fontWeight: active ? 800 : 650 }}>{item.label}</span>
        {active ? <span className="activeDot" style={{ background: tone.active }} /> : null}
      </span>
    )
  }

  return (
    <nav className="bottom-nav" aria-label={lang === 'en' ? 'Primary navigation' : 'Navigazione principale'}>
      <div className="inner">
        {items.map((item) => {
          const isCoach = item.key === 'coach'
          if (isCoach && pathname === '/' && gameAnalysisModalOpen) {
            return <button key={item.key} type="button" className="tap" aria-label={item.label} onClick={() => typeof window !== 'undefined' && window.dispatchEvent(new CustomEvent(CLOSE_GAME_ANALYSIS_MODAL_EVENT))}>{content(item)}</button>
          }
          return <Link key={item.key} href={item.href} className="tap" style={{ textDecoration: 'none', color: 'inherit' }}>{content(item)}</Link>
        })}
      </div>
      <style jsx>{`
        .bottom-nav{position:fixed;left:0;right:0;bottom:0;z-index:100;display:none;background:rgba(255,255,255,.97);border-top:1px solid rgba(23,25,28,.08);backdrop-filter:blur(22px);box-shadow:0 -10px 30px rgba(54,45,34,.07);padding-bottom:env(safe-area-inset-bottom,0px)}
        .inner{height:72px;max-width:520px;margin:0 auto;padding:6px 10px 5px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));align-items:center;gap:4px}
        .tap{width:100%;padding:0;margin:0;border:0;background:none;color:inherit;font:inherit;text-decoration:none!important;cursor:pointer;-webkit-tap-highlight-color:transparent}
        .item{position:relative;width:100%;min-height:56px;padding:5px 7px 7px;border-radius:17px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;transition:background .16s ease,color .16s ease,transform .16s ease}
        .iconBox{width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center}
        .label{display:block;color:currentColor!important;font-size:10px;line-height:1.05;letter-spacing:-.01em;white-space:nowrap;text-decoration:none!important}
        .activeDot{position:absolute;left:50%;bottom:3px;width:4px;height:4px;border-radius:999px;transform:translateX(-50%)}
        .tap:active .item{transform:scale(.97)}
        @media(max-width:767px){.bottom-nav{display:block}}
        @media(min-width:768px){.bottom-nav{display:none}}
      `}</style>
      <style jsx global>{`
        @media(max-width:767px){
          .bottom-nav a,.bottom-nav a:link,.bottom-nav a:visited,.bottom-nav a:hover,.bottom-nav a:active{text-decoration:none!important;text-decoration-line:none!important;border-bottom:0!important}
        }
      `}</style>
    </nav>
  )
}
