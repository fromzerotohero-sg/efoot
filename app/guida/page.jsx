'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import PageLoading from '@/components/PageLoading'
import {
  BookOpen,
  User,
  LayoutDashboard,
  Users,
  Calendar,
  Settings,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Target,
  Zap,
  ChevronDown,
  ChevronUp,
  Compass,
  Shield,
  UserRound,
  Wallet,
  Dumbbell,
  MessageCircle,
  BarChart3
} from 'lucide-react'

export default function GuidaPage() {
  const { t, lang } = useTranslation()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [expandedSections, setExpandedSections] = useState({})

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
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (res.ok) {
          const profileData = await res.json()
          setProfile(profileData)
        }
      } catch (error) {
        console.error('[Guida] Error loading profile:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [router])

  const calculateProfileCompletion = () => {
    if (!profile) return 0
    
    let completed = 0
    const total = 8
    
    if (profile.first_name) completed++
    if (profile.last_name) completed++
    if (profile.team_name) completed++
    if (profile.current_division) completed++
    if (profile.favorite_team) completed++
    if (profile.ai_name) completed++
    if (profile.how_to_remember) completed++
    if (profile.common_problems && profile.common_problems.length > 0) completed++
    
    return Math.round((completed / total) * 100)
  }

  const profileCompletion = calculateProfileCompletion()

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }))
  }

  // Guide per ogni pagina - testi aggiornati
  const pageGuides = [
    {
      id: 'dashboard',
      icon: LayoutDashboard,
      color: 'var(--accent)',
      path: '/',
      title: (lang === 'en' || lang === 'es') ? 'Dashboard' : 'Dashboard',
      description: lang === 'en' 
        ? 'Your command center: AI Knowledge score, weekly goals, squad overview, and quick navigation to all features.'
        : 'Il tuo centro di comando: punteggio AI Knowledge, obiettivi settimanali, panoramica squadra e navigazione rapida a tutte le funzioni.',
      steps: [
        (lang === 'en' || lang === 'es') ? 'Check your AI Knowledge score (0-100%)' : 'Controlla il tuo punteggio AI Knowledge (0-100%)',
        (lang === 'en' || lang === 'es') ? 'Open new card analysis to check releases against your roster' : 'Apri l’analisi carte nuove per valutarle sulla tua rosa',
        (lang === 'en' || lang === 'es') ? 'View weekly goals and track progress' : 'Visualizza obiettivi settimanali e traccia i progressi',
        (lang === 'en' || lang === 'es') ? 'Monitor weekly goals and app progress' : 'Monitora obiettivi settimanali e progressi nell\'app',
        (lang === 'en' || lang === 'es') ? 'Access Mission Center for daily challenges' : 'Accedi al Centro Missioni per sfide giornaliere',
        (lang === 'en' || lang === 'es') ? 'Quick links to add match or manage squad' : 'Link rapidi per aggiungere partita o gestire rosa',
        (lang === 'en' || lang === 'es') ? 'Check the Setup Banner for missing configuration' : 'Controlla il Banner Setup per configurazioni mancanti',
        (lang === 'en' || lang === 'es') ? 'View recent matches and edit details' : 'Visualizza partite recenti e modifica dettagli'
      ]
    },
    {
      id: 'gestione-formazione',
      icon: Users,
      color: 'var(--cards-accent)',
      path: '/gestione-formazione',
      title: (lang === 'en' || lang === 'es') ? 'Squad Management' : 'Gestione Rosa',
      description: lang === 'en'
        ? 'Manage your 11 starters and 12 reserves on the 2D field. Upload players from screenshots and customize tactical settings.'
        : 'Gestisci i tuoi 11 titolari e 12 riserve sul campo 2D. Carica giocatori da screenshot e personalizza impostazioni tattiche.',
      steps: [
        (lang === 'en' || lang === 'es') ? 'View your 2D tactical field' : 'Visualizza il tuo campo tattico 2D',
        (lang === 'en' || lang === 'es') ? 'Click empty slots to assign players' : 'Clicca slot vuoti per assegnare giocatori',
        (lang === 'en' || lang === 'es') ? 'Upload players from screenshots (card/stats/skills)' : 'Carica giocatori da screenshot (card/statistiche/abilità)',
        (lang === 'en' || lang === 'es') ? 'Manage reserves (max 12 players)' : 'Gestisci riserve (max 12 giocatori)',
        (lang === 'en' || lang === 'es') ? 'Customize tactical settings per player' : 'Personalizza impostazioni tattiche per giocatore',
        (lang === 'en' || lang === 'es') ? 'Change formation (14 official eFootball formations)' : 'Cambia formazione (14 formazioni ufficiali eFootball)',
        (lang === 'en' || lang === 'es') ? 'Set your active coach' : 'Imposta il tuo allenatore attivo'
      ]
    },
    {
      id: 'card-advisor',
      icon: Sparkles,
      color: 'var(--accent)',
      path: '/card-advisor-lab',
      title: (lang === 'en' || lang === 'es') ? 'New Card Analysis' : 'Analisi Carte Nuove',
      description: lang === 'en'
        ? 'Evaluate new releases against your real roster, needs and performance data before spending coins.'
        : 'Valuta le nuove uscite sulla tua rosa reale, sulle tue esigenze e sui tuoi dati performance prima di spendere coins.',
      steps: [
        (lang === 'en' || lang === 'es') ? 'Open the latest card releases' : 'Apri le ultime carte uscite',
        (lang === 'en' || lang === 'es') ? 'Compare the card with starters, bench, coach and team style' : 'Confronta la carta con titolari, panchina, coach e stile squadra',
        (lang === 'en' || lang === 'es') ? 'Unlock a clear verdict: sign, skip or rotation' : 'Sblocca un verdetto chiaro: prendi, salta o rotazione',
        (lang === 'en' || lang === 'es') ? 'Use roster and performance context instead of hype or overall only' : 'Usa contesto rosa e performance, non hype o solo overall',
        (lang === 'en' || lang === 'es') ? 'Use it whenever a new pack drops' : 'Usala ogni volta che esce un nuovo pack'
      ]
    },
    {
      id: 'aggiungi-partita',
      icon: Calendar,
      color: '#f59e0b',
      path: '/match/new',
      title: (lang === 'en' || lang === 'es') ? 'Add Match' : 'Aggiungi Partita',
      description: lang === 'en'
        ? '6-step wizard to record match data: Home/Away, player ratings, team stats, attack areas, ball recovery, and opponent formation.'
        : 'Wizard a 6 step per registrare dati partita: Casa/Fuori, pagelle giocatori, statistiche squadra, aree attacco, recuperi palla e formazione avversaria.',
      steps: [
        (lang === 'en' || lang === 'es') ? 'Step 1: Select Home or Away' : 'Step 1: Seleziona Casa o Fuori',
        (lang === 'en' || lang === 'es') ? 'Step 2: Upload player ratings screenshot' : 'Step 2: Carica screenshot pagelle giocatori',
        (lang === 'en' || lang === 'es') ? 'Step 3: Upload team stats screenshot' : 'Step 3: Carica screenshot statistiche squadra',
        (lang === 'en' || lang === 'es') ? 'Step 4: Upload attack areas screenshot' : 'Step 4: Carica screenshot aree attacco',
        (lang === 'en' || lang === 'es') ? 'Step 5: Upload ball recovery zones' : 'Step 5: Carica zone recupero palla',
        (lang === 'en' || lang === 'es') ? 'Step 6: Upload opponent formation' : 'Step 6: Carica formazione avversaria',
        (lang === 'en' || lang === 'es') ? 'Review and save match' : 'Rivedi e salva partita'
      ]
    },
    {
      id: 'contromisure-pre-partita',
      icon: Shield,
      color: '#f59e0b',
      path: '/?openCountermeasures=1',
      title: (lang === 'en' || lang === 'es') ? 'Pre-Match Countermeasures' : 'Contromisure Pre-partita',
      description: lang === 'en'
        ? 'In Hero Chat, upload the opponent formation photo to get a clear setup plan before kickoff.'
        : 'In Hero Chat, carica la foto della formazione avversaria e ricevi il piano da impostare prima del fischio.',
      steps: [
        (lang === 'en' || lang === 'es') ? 'Open Hero Chat and start Pre-match Plan' : 'Apri Hero Chat e avvia Piano pre-partita',
        (lang === 'en' || lang === 'es') ? 'Upload opponent formation screenshot' : 'Carica screenshot formazione avversaria',
        (lang === 'en' || lang === 'es') ? 'Confirm the opponent read' : 'Conferma la lettura avversaria',
        (lang === 'en' || lang === 'es') ? 'Review setup on your pitch' : 'Rivedi il setup sul tuo campo',
        (lang === 'en' || lang === 'es') ? 'Apply the plan before kickoff' : 'Applica il piano prima del fischio'
      ]
    },
    {
      id: 'allenatori',
      icon: UserRound,
      color: 'var(--accent)',
      path: '/allenatori',
      title: (lang === 'en' || lang === 'es') ? 'Coaches' : 'Allenatori',
      description: lang === 'en'
        ? 'Manage your coaches: upload photos, set active coach, and view tactical competences.'
        : 'Gestisci i tuoi allenatori: carica foto, imposta allenatore attivo e visualizza competenze tattiche.',
      steps: [
        (lang === 'en' || lang === 'es') ? 'Upload coach screenshot (main photo)' : 'Carica screenshot allenatore (foto principale)',
        (lang === 'en' || lang === 'es') ? 'Optionally upload connection style photo' : 'Opzionalmente carica foto stile connessione',
        (lang === 'en' || lang === 'es') ? 'AI extracts name, team and competences' : 'L\'AI estrae nome, squadra e competenze',
        (lang === 'en' || lang === 'es') ? 'Set coach as active (star icon)' : 'Imposta allenatore come attivo (icona stella)',
        (lang === 'en' || lang === 'es') ? 'View coach details and tactical style' : 'Visualizza dettagli allenatore e stile tattico'
      ]
    },
    {
      id: 'acquisto-crediti',
      icon: Wallet,
      color: '#f59e0b',
      path: 'https://home.fromzerotohero.io/dashboard?usage',
      external: true,
      title: (lang === 'en' || lang === 'es') ? 'Purchase Hero Points' : 'Acquista Hero Points',
      description: lang === 'en'
        ? 'Buy Hero Points to use AI features: match analysis, player extraction, chat with coach, and more.'
        : 'Acquista Hero Points per usare funzionalità AI: analisi partite, estrazione giocatori, chat con coach e altro.',
      steps: [
        (lang === 'en' || lang === 'es') ? 'Click to open purchase page' : 'Clicca per aprire pagina acquisto',
        (lang === 'en' || lang === 'es') ? 'Choose Hero Points package' : 'Scegli pacchetto Hero Points',
        (lang === 'en' || lang === 'es') ? 'Complete payment securely' : 'Completa pagamento in sicurezza',
        (lang === 'en' || lang === 'es') ? 'Credits added instantly' : 'Crediti aggiunti istantaneamente',
        (lang === 'en' || lang === 'es') ? 'Start using AI features' : 'Inizia a usare funzionalità AI'
      ]
    }
  ]

  if (loading) {
    return <PageLoading />
  }

  return (
    <div data-tour-id="tour-guida-intro" style={{
      minHeight: '100vh',
      background: 'var(--bg-darker)',
      padding: '24px',
      paddingBottom: '100px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => router.push('/')}
              style={{
                background: 'rgba(0, 212, 255, 0.1)',
                border: '1px solid var(--accent)',
                borderRadius: '8px',
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--accent)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 212, 255, 0.2)'
                e.currentTarget.style.boxShadow = 'var(--glow-blue)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 212, 255, 0.1)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <ArrowLeft size={18} />
              <span>{t('back')}</span>
            </button>
            <div>
              <h1 style={{
                fontSize: '32px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <BookOpen size={32} />
                {(lang === 'en' || lang === 'es') ? 'Complete Guide' : 'Guida Completa'}
              </h1>
              <p style={{
                fontSize: '16px',
                opacity: 0.8,
                color: 'var(--text-main)'
              }}>
                {(lang === 'en' || lang === 'es') ? 'Discover how to make the most of the platform' : 'Scopri come usare al meglio la piattaforma'}
              </p>
            </div>
          </div>
        </div>

        {/* Hero Section - Completa Profilo */}
        <div data-tour-id="tour-guida-profile-hero" className="neon-card" style={{
          padding: '32px',
          marginBottom: '32px',
          background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(168, 85, 247, 0.1))',
          border: '2px solid var(--accent)',
          boxShadow: 'var(--glow-blue)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '20px'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--glow-blue)'
            }}>
              <Target size={32} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: 700,
                color: 'var(--text-main)',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {(lang === 'en' || lang === 'es') ? 'Complete Your Profile' : 'Completa il Tuo Profilo'}
                {profileCompletion === 100 && <CheckCircle2 size={24} color="var(--accent)" />}
              </h2>
              <p style={{
                fontSize: '16px',
                opacity: 0.9,
                color: 'var(--text-main)'
              }}>
                {(lang === 'en' || lang === 'es') ? 'The more you complete your profile, the better the AI can help you!' : 'Più completi il profilo, più l\'AI può aiutarti!'}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <span style={{
                fontSize: '14px',
                opacity: 0.8,
                color: 'var(--text-main)'
              }}>
                {(lang === 'en' || lang === 'es') ? 'Profile Completion' : 'Completamento Profilo'}
              </span>
              <span style={{
                fontSize: '18px',
                fontWeight: 700,
                color: profileCompletion === 100 ? 'var(--accent)' : '#f59e0b'
              }}>
                {profileCompletion}%
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '12px',
              background: 'var(--surface-3)',
              borderRadius: '6px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${profileCompletion}%`,
                height: '100%',
                background: profileCompletion === 100
                  ? 'linear-gradient(90deg, var(--accent), var(--accent))'
                  : 'linear-gradient(90deg, #f59e0b, var(--neon-pink))',
                borderRadius: '6px',
                transition: 'width 0.5s ease'
              }} />
            </div>
          </div>

          <button
            onClick={() => router.push('/impostazioni-profilo')}
            className="btn primary"
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '16px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              background: profileCompletion === 100
                ? 'linear-gradient(135deg, var(--accent), var(--accent))'
                : 'linear-gradient(135deg, #f59e0b, var(--neon-pink))',
              border: 'none',
              boxShadow: profileCompletion === 100 ? 'var(--glow-blue)' : 'var(--glow-orange)',
              borderRadius: '8px',
              color: 'var(--text-main)',
              cursor: 'pointer'
            }}
          >
            <Settings size={20} />
            {profileCompletion === 100
              ? ((lang === 'en' || lang === 'es') ? 'Profile Complete' : 'Profilo Completo')
              : ((lang === 'en' || lang === 'es') ? 'Complete Your Profile' : 'Completa il Profilo')}
            <ArrowRight size={20} />
          </button>
        </div>

        {/* Hero Section - AI Assistant */}
        <div data-tour-id="tour-guida-brain-hero" className="neon-card" style={{
          padding: '32px',
          marginBottom: '32px',
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(236, 72, 153, 0.1))',
          border: '2px solid var(--cards-accent)',
          boxShadow: 'var(--glow-purple)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '20px'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--cards-accent), var(--neon-pink))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--glow-purple)'
            }}>
              <MessageCircle size={32} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: 700,
                color: 'var(--text-main)',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Sparkles size={24} color="var(--cards-accent)" />
                {(lang === 'en' || lang === 'es') ? 'AI Assistant' : 'Assistente AI'}
              </h2>
              <p style={{
                fontSize: '16px',
                opacity: 0.9,
                color: 'var(--text-main)',
                lineHeight: '1.6'
              }}>
                {lang === 'en' 
                  ? 'Your personal tactical advisor available 24/7. Ask about formations, player suggestions, match analysis, or how to use any feature.'
                  : 'Il tuo consulente tattico personale disponibile 24/7. Chiedi informazioni su formazioni, suggerimenti giocatori, analisi partite o come usare qualsiasi funzione.'}
              </p>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            marginTop: '20px'
          }}>
            <div style={{
              padding: '16px',
              background: 'rgba(168, 85, 247, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(168, 85, 247, 0.3)'
            }}>
              <Zap size={20} color="var(--cards-accent)" style={{ marginBottom: '8px' }} />
              <div style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--cards-accent)',
                marginBottom: '4px'
              }}>
                {(lang === 'en' || lang === 'es') ? 'Personal Guide' : 'Guida Personale'}
              </div>
              <div style={{
                fontSize: '12px',
                opacity: 0.8,
                color: 'var(--text-main)'
              }}>
                {(lang === 'en' || lang === 'es') ? 'Accompanies you every step' : 'Ti accompagna in ogni passo'}
              </div>
            </div>
            <div style={{
              padding: '16px',
              background: 'rgba(236, 72, 153, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(236, 72, 153, 0.3)'
            }}>
              <Target size={20} color="var(--neon-pink)" style={{ marginBottom: '8px' }} />
              <div style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--neon-pink)',
                marginBottom: '4px'
              }}>
                {(lang === 'en' || lang === 'es') ? 'Tactical Advice' : 'Consigli Tattici'}
              </div>
              <div style={{
                fontSize: '12px',
                opacity: 0.8,
                color: 'var(--text-main)'
              }}>
                {(lang === 'en' || lang === 'es') ? 'Based on your squad and matches' : 'Basati sulla tua rosa e partite'}
              </div>
            </div>
            <div style={{
              padding: '16px',
              background: 'rgba(0, 212, 255, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(0, 212, 255, 0.3)'
            }}>
              <BarChart3 size={20} color="var(--accent)" style={{ marginBottom: '8px' }} />
              <div style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--accent)',
                marginBottom: '4px'
              }}>
                {(lang === 'en' || lang === 'es') ? 'Match Analysis' : 'Analisi Partite'}
              </div>
              <div style={{
                fontSize: '12px',
                opacity: 0.8,
                color: 'var(--text-main)'
              }}>
                {(lang === 'en' || lang === 'es') ? 'Insights on your performance' : 'Insight sulle tue prestazioni'}
              </div>
            </div>
          </div>
        </div>

        {/* Hero Section - Show me how Tour */}
        <div className="neon-card" style={{
          padding: '32px',
          marginBottom: '32px',
          background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(34, 197, 94, 0.1))',
          border: '2px solid var(--accent)',
          boxShadow: '0 0 24px rgba(0, 245, 255, 0.2)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '20px'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent), var(--accent))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(0, 245, 255, 0.4)'
            }}>
              <Compass size={32} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: 700,
                color: 'var(--text-main)',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Sparkles size={24} color="var(--accent)" />
                {(lang === 'en' || lang === 'es') ? 'Interactive Tour' : 'Tour Interattivo'}
              </h2>
              <p style={{
                fontSize: '16px',
                opacity: 0.9,
                color: 'var(--text-main)',
                lineHeight: '1.6'
              }}>
                {lang === 'en'
                  ? 'Step-by-step guide on every page! Click the compass button in the top right for a guided walkthrough.'
                  : 'Guida passo-passo su ogni pagina! Clicca il pulsante bussola in alto a destra per un tour guidato.'}
              </p>
            </div>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            marginTop: '20px'
          }}>
            <div style={{
              padding: '16px',
              background: 'rgba(0, 245, 255, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(0, 245, 255, 0.3)'
            }}>
              <Compass size={20} color="var(--accent)" style={{ marginBottom: '8px' }} />
              <div style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--accent)',
                marginBottom: '4px'
              }}>
                {(lang === 'en' || lang === 'es') ? 'Contextual Tours' : 'Tour Contestuali'}
              </div>
              <div style={{
                fontSize: '12px',
                opacity: 0.8,
                color: 'var(--text-main)'
              }}>
                {(lang === 'en' || lang === 'es') ? 'Different tour for each page' : 'Un tour diverso per ogni pagina'}
              </div>
            </div>
            <div style={{
              padding: '16px',
              background: 'rgba(0, 212, 255, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(0, 212, 255, 0.3)'
            }}>
              <Zap size={20} color="var(--accent)" style={{ marginBottom: '8px' }} />
              <div style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--accent)',
                marginBottom: '4px'
              }}>
                {(lang === 'en' || lang === 'es') ? 'Interactive Steps' : 'Step Interattivi'}
              </div>
              <div style={{
                fontSize: '12px',
                opacity: 0.8,
                color: 'var(--text-main)'
              }}>
                {(lang === 'en' || lang === 'es') ? 'Click highlighted elements' : 'Clicca elementi evidenziati'}
              </div>
            </div>
          </div>
        </div>

        {/* Guide per Pagina */}
        <div data-tour-id="tour-guida-pages" style={{
          marginBottom: '32px'
        }}>
          <h2 style={{
            fontSize: '28px',
            fontWeight: 700,
            color: 'var(--text-main)',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <BookOpen size={28} color="var(--accent)" />
            {(lang === 'en' || lang === 'es') ? 'Page Guides' : 'Guide per Pagina'}
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
            gap: 'clamp(16px, 4vw, 24px)'
          }}>
            {pageGuides.map((guide) => {
              const Icon = guide.icon
              const isExpanded = expandedSections[guide.id]

              return (
                <div
                  key={guide.id}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  className="neon-card"
                  style={{
                    padding: 'clamp(16px, 4vw, 24px)',
                    border: `2px solid ${guide.color}`,
                    background: `rgba(${guide.color === 'var(--accent)' ? '0, 212, 255' : guide.color === 'var(--cards-accent)' ? '168, 85, 247' : guide.color === '#f59e0b' ? '255, 107, 53' : '0, 245, 255'}, 0.05)`,
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    minHeight: '44px',
                    boxSizing: 'border-box',
                    borderRadius: '12px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = `0 0 20px ${guide.color}40`
                    e.currentTarget.style.transform = 'translateY(-4px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                  onClick={() => toggleSection(guide.id)}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 'clamp(12px, 3vw, 16px)',
                    marginBottom: '16px'
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: guide.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: `0 0 15px ${guide.color}40`
                    }}>
                      <Icon size={24} color="white" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{
                        fontSize: 'clamp(18px, 4vw, 20px)',
                        fontWeight: 700,
                        color: 'var(--text-main)',
                        marginBottom: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px'
                      }}>
                        <span>{guide.title}</span>
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </h3>
                      <p style={{
                        fontSize: '14px',
                        opacity: 0.8,
                        color: 'var(--text-main)',
                        lineHeight: '1.5'
                      }}>
                        {guide.description}
                      </p>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{
                      marginTop: '20px',
                      paddingTop: '20px',
                      borderTop: `1px solid ${guide.color}40`
                    }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: guide.color,
                        marginBottom: '12px'
                      }}>
                        {(lang === 'en' || lang === 'es') ? 'Steps' : 'Step'}
                      </div>
                      <ul style={{
                        listStyle: 'none',
                        padding: 0,
                        margin: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}>
                        {guide.steps.map((step, idx) => (
                          <li
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '12px',
                              padding: '12px',
                              background: 'var(--surface-2)',
                              borderRadius: '8px',
                              border: `1px solid ${guide.color}20`
                            }}
                          >
                            <div style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: guide.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              fontSize: '12px',
                              fontWeight: 700,
                              color: 'var(--text-main)'
                            }}>
                              {idx + 1}
                            </div>
                            <span style={{
                              fontSize: '14px',
                              color: 'var(--text-main)',
                              lineHeight: '1.6',
                              flex: 1
                            }}>
                              {step}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (guide.external || guide.path.startsWith('http')) {
                            window.open(guide.path, '_blank')
                          } else {
                            router.push(guide.path)
                          }
                        }}
                        style={{
                          marginTop: '16px',
                          width: '100%',
                          padding: 'clamp(12px, 3vw, 14px)',
                          minHeight: '44px',
                          background: guide.color,
                          border: 'none',
                          borderRadius: '8px',
                          color: 'var(--text-main)',
                          fontSize: 'clamp(13px, 3vw, 14px)',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          transition: 'all 0.2s',
                          boxSizing: 'border-box'
                        }}
                      >
                        {guide.external || guide.path.startsWith('http') 
                          ? ((lang === 'en' || lang === 'es') ? 'Open Purchase Page' : 'Apri Pagina Acquisto')
                          : ((lang === 'en' || lang === 'es') ? 'Go to Page' : 'Vai alla Pagina')}
                        <ArrowRight size={16} />
                      </button>
                      {guide.id === 'gestione-formazione' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push('/gestione-formazione?tutorial=1')
                          }}
                          style={{
                            marginTop: '12px',
                            width: '100%',
                            padding: '12px',
                            background: 'rgba(168, 85, 247, 0.2)',
                            border: '1px solid var(--cards-accent)',
                            borderRadius: '8px',
                            color: 'var(--cards-accent)',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'all 0.2s'
                          }}
                        >
                          <BookOpen size={16} />
                          {(lang === 'en' || lang === 'es') ? 'Roster Tutorial' : 'Tutorial Rosa'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer CTA */}
        <div data-tour-id="tour-guida-footer" className="neon-card" style={{
          padding: '32px',
          textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(168, 85, 247, 0.1))',
          border: '2px solid var(--accent)',
          boxShadow: 'var(--glow-blue)'
        }}>
          <MessageCircle size={48} color="var(--accent)" style={{
            marginBottom: '16px'
          }} />
          <h3 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: 'var(--text-main)',
            marginBottom: '12px'
          }}>
            {(lang === 'en' || lang === 'es') ? 'Questions?' : 'Domande?'}
          </h3>
          <p style={{
            fontSize: '16px',
            opacity: 0.9,
            color: 'var(--text-main)',
            marginBottom: '24px',
            lineHeight: '1.6'
          }}>
            {lang === 'en' 
              ? 'Use the AI Assistant or the Interactive Tour on any page.'
              : 'Usa l\'Assistente AI o il Tour Interattivo su qualsiasi pagina.'}
          </p>
        </div>
      </div>
    </div>
  )
}
