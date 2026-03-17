'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Users,
  Calendar,
  Trophy,
  Target,
  BarChart3,
  Shield,
  MessageCircle,
  HelpCircle,
  ChevronDown,
  Zap,
  Play,
  Lightbulb
} from 'lucide-react'

export default function GuidaPage() {
  const { t, lang } = useTranslation()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [expandedSection, setExpandedSection] = useState(null)

  useEffect(() => {
    const loadProfile = async () => {
      try {
        let token = localStorage.getItem('auth_token')
        if (!token && supabase) {
          const { data: session } = await supabase.auth.getSession()
          token = session?.session?.access_token
        }
        if (!token) {
          setLoading(false)
          return
        }
        const res = await fetch('/api/user/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          const profileData = await res.json()
          setProfile(profileData)
        }
      } catch (error) {
        console.error('[Guida] Error:', error)
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [])

  const profileCompletion = profile ? Math.round(
    ((profile.first_name ? 1 : 0) +
     (profile.last_name ? 1 : 0) +
     (profile.team_name ? 1 : 0) +
     (profile.current_division ? 1 : 0) +
     (profile.favorite_team ? 1 : 0) +
     (profile.ai_name ? 1 : 0) +
     (profile.how_to_remember ? 1 : 0) +
     (profile.common_problems?.length > 0 ? 1 : 0)) / 8 * 100
  ) : 0

  const steps = [
    { num: 1, title: lang === 'en' ? 'Complete Profile' : 'Completa Profilo', desc: lang === 'en' ? 'Add your gaming preferences' : 'Aggiungi preferenze di gioco', icon: Target, done: profileCompletion >= 50 },
    { num: 2, title: lang === 'en' ? 'Upload Squad' : 'Carica Rosa', desc: lang === 'en' ? 'Add your 11 players' : 'Aggiungi i tuoi 11 giocatori', icon: Users, done: false },
    { num: 3, title: lang === 'en' ? 'Record Matches' : 'Registra Partite', desc: lang === 'en' ? 'Upload match screenshots' : 'Carica screenshot partite', icon: Calendar, done: false },
    { num: 4, title: lang === 'en' ? 'Get AI Insights' : 'Consigli AI', desc: lang === 'en' ? 'Receive tactical advice' : 'Ricevi consigli tattici', icon: Sparkles, done: false },
  ]

  const sections = [
    {
      id: 'start',
      title: lang === 'en' ? 'Getting Started' : 'Per Iniziare',
      icon: Play,
      items: [
        { title: lang === 'en' ? 'Dashboard Overview' : 'Panoramica Dashboard', desc: lang === 'en' ? 'Your command center' : 'Il tuo centro di comando' },
        { title: lang === 'en' ? 'Using AI Assistant' : 'Usare Assistente AI', desc: lang === 'en' ? 'Chat with your coach' : 'Chatta con il tuo coach' },
        { title: lang === 'en' ? 'Managing Squad' : 'Gestire la Rosa', desc: lang === 'en' ? 'Upload players' : 'Carica giocatori' },
      ]
    },
    {
      id: 'matches',
      title: lang === 'en' ? 'Matches' : 'Partite',
      icon: Calendar,
      items: [
        { title: lang === 'en' ? '6-Step Wizard' : 'Wizard 6 Step', desc: lang === 'en' ? 'Upload match data' : 'Carica dati partita' },
        { title: lang === 'en' ? 'Home vs Away' : 'Casa vs Trasferta', desc: lang === 'en' ? 'Identify your team' : 'Identifica la tua squadra' },
        { title: lang === 'en' ? 'Match Details' : 'Dettagli Partita', desc: lang === 'en' ? 'Deep performance analysis' : 'Analisi approfondita' },
      ]
    },
    {
      id: 'tactics',
      title: lang === 'en' ? 'Tactics' : 'Tattiche',
      icon: Shield,
      items: [
        { title: lang === 'en' ? 'Countermeasures' : 'Contromisure', desc: lang === 'en' ? 'Analyze opponents' : 'Analizza avversari' },
        { title: lang === 'en' ? 'Coach Management' : 'Gestione Allenatori', desc: lang === 'en' ? 'Set active coach' : 'Imposta allenatore' },
        { title: lang === 'en' ? 'Tactical Settings' : 'Impostazioni Tattiche', desc: lang === 'en' ? 'Customize instructions' : 'Personalizza istruzioni' },
      ]
    },
  ]

  const faqs = [
    { q: lang === 'en' ? 'How do I upload a player?' : 'Come carico un giocatore?', a: lang === 'en' ? 'Go to Your Squad, click an empty slot, select Upload Photo.' : 'Vai su La tua rosa, clicca uno slot vuoto, seleziona Carica Foto.' },
    { q: lang === 'en' ? 'What screenshots for a match?' : 'Quali screenshot per una partita?', a: lang === 'en' ? 'Wizard guides you: Home/Away, Ratings, Stats, Attack, Recovery, Formation.' : 'Il wizard ti guida: Casa/Fuori, Pagelle, Statistiche, Attacco, Recuperi, Formazione.' },
    { q: lang === 'en' ? 'How does AI help me?' : 'Come mi aiuta l\'AI?', a: lang === 'en' ? 'Analyzes matches, finds patterns, gives tactical advice.' : 'Analizza partite, trova pattern, dà consigli tattici.' },
  ]

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--neon-cyan)', fontSize: '18px' }}>{t('loading')}</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', padding: '24px', paddingBottom: '100px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <button
          onClick={() => router.push('/')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--neon-cyan)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          <ArrowLeft size={20} />
          {lang === 'en' ? 'Back' : 'Indietro'}
        </button>
      </div>

      {/* Hero - Icona AI semplice da Lucide */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <div style={{
          width: '80px',
          height: '80px',
          margin: '0 auto 24px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-blue))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 40px rgba(0, 212, 255, 0.4)'
        }}>
          <Sparkles size={40} color="white" />
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: 'white', marginBottom: '12px' }}>
          {lang === 'en' ? 'How can we help?' : 'Come possiamo aiutarti?'}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '16px', maxWidth: '500px', margin: '0 auto' }}>
          {lang === 'en' ? 'Master the platform step by step' : 'Padroneggia la piattaforma passo dopo passo'}
        </p>
      </div>

      {/* Progress */}
      {profile && (
        <div
          onClick={() => router.push('/impostazioni-profilo')}
          style={{
            maxWidth: '600px',
            margin: '0 auto 48px',
            padding: '20px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(0,212,255,0.1), rgba(0,128,255,0.1))',
            border: '1px solid rgba(0,212,255,0.3)',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Target color="var(--neon-cyan)" size={24} />
              <span style={{ fontWeight: 'bold', color: 'white' }}>{lang === 'en' ? 'Profile Progress' : 'Progresso Profilo'}</span>
            </div>
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--neon-cyan)' }}>{profileCompletion}%</span>
          </div>
          <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${profileCompletion}%`,
              background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-blue))',
              borderRadius: '4px',
              transition: 'width 0.5s'
            }} />
          </div>
        </div>
      )}

      {/* Steps */}
      <div style={{ maxWidth: '800px', margin: '0 auto 48px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '24px', textAlign: 'center' }}>
          {lang === 'en' ? 'Your Journey' : 'Il tuo Percorso'}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          {steps.map((step) => (
            <div
              key={step.num}
              style={{
                padding: '20px',
                borderRadius: '16px',
                background: step.done ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)',
                border: `2px solid ${step.done ? 'rgba(34,197,94,0.5)' : 'rgba(0,212,255,0.2)'}`,
                position: 'relative'
              }}
            >
              <div style={{
                position: 'absolute',
                top: '-12px',
                left: '16px',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: step.done ? '#22c55e' : 'var(--neon-cyan)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 'bold',
                color: step.done ? 'white' : 'black'
              }}>
                {step.done ? <CheckCircle2 size={14} /> : step.num}
              </div>
              <step.icon size={28} color={step.done ? '#22c55e' : 'var(--neon-cyan)'} style={{ marginBottom: '12px' }} />
              <h3 style={{ fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>{step.title}</h3>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sections */}
      <div style={{ maxWidth: '800px', margin: '0 auto 48px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '24px', textAlign: 'center' }}>
          {lang === 'en' ? 'Detailed Guides' : 'Guide Dettagliate'}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sections.map((section) => (
            <div
              key={section.id}
              style={{
                borderRadius: '12px',
                background: expandedSection === section.id ? 'rgba(0,212,255,0.1)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${expandedSection === section.id ? 'rgba(0,212,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
                overflow: 'hidden'
              }}
            >
              <button
                onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'white'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <section.icon size={24} color={expandedSection === section.id ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.6)'} />
                  <span style={{ fontWeight: 'bold' }}>{section.title}</span>
                </div>
                <ChevronDown
                  size={20}
                  color="rgba(255,255,255,0.5)"
                  style={{ transform: expandedSection === section.id ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
                />
              </button>
              {expandedSection === section.id && (
                <div style={{ padding: '0 20px 20px' }}>
                  {section.items.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px',
                        marginTop: '8px',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.05)',
                        cursor: 'pointer'
                      }}
                    >
                      <h4 style={{ fontWeight: '600', color: 'white', marginBottom: '2px' }}>{item.title}</h4>
                      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>{item.desc}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div style={{ maxWidth: '800px', margin: '0 auto 48px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '24px', textAlign: 'center' }}>
          {lang === 'en' ? 'FAQ' : 'Domande Frequenti'}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {faqs.map((faq, idx) => (
            <details key={idx} style={{ borderRadius: '12px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
              <summary style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', color: 'white', fontWeight: '500' }}>
                <HelpCircle size={18} color="var(--neon-cyan)" />
                {faq.q}
              </summary>
              <div style={{ padding: '0 20px 16px 52px', color: 'rgba(255,255,255,0.7)' }}>
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center', padding: '32px', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(0,212,255,0.1), rgba(138,43,226,0.1))', border: '1px solid rgba(0,212,255,0.2)' }}>
        <MessageCircle size={32} color="var(--neon-cyan)" style={{ marginBottom: '12px' }} />
        <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
          {lang === 'en' ? 'Still have questions?' : 'Hai ancora domande?'}
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '20px' }}>
          {lang === 'en' ? 'Chat with your AI assistant anytime' : 'Chatta con il tuo assistente AI in qualsiasi momento'}
        </p>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-assistant-chat'))}
          style={{
            padding: '14px 28px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-blue))',
            border: 'none',
            color: 'black',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          {lang === 'en' ? 'Open AI Assistant' : 'Apri Assistente AI'}
        </button>
      </div>
    </div>
  )
}
