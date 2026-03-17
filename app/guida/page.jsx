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
  Zap,
  ChevronDown,
  ChevronUp,
  Compass,
  Play,
  Users,
  Calendar,
  Trophy,
  Target,
  BarChart3,
  Shield,
  MessageCircle,
  Lightbulb,
  HelpCircle
} from 'lucide-react'

// Hero Icon Component con animazione
function AIHeroIcon({ className }) {
  return (
    <div className={`relative ${className}`}>
      {/* Cerchi concentrici animati */}
      <div className="absolute inset-0 rounded-full border-2 border-cyan-400/30 animate-ping" style={{ animationDuration: '2s' }} />
      <div className="absolute inset-2 rounded-full border border-cyan-400/50 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
      
      {/* Icona centrale */}
      <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/50 animate-pulse">
        <svg 
          viewBox="0 0 24 24" 
          className="w-12 h-12 text-white"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          {/* Avatar stilizzato AI */}
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
          {/* Aura AI */}
          <circle cx="12" cy="12" r="10" strokeDasharray="4 4" className="animate-spin" style={{ animationDuration: '10s' }} />
        </svg>
      </div>
      
      {/* Particelle decorative */}
      <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full animate-bounce" style={{ animationDuration: '1.5s' }} />
      <div className="absolute -bottom-1 -left-2 w-3 h-3 bg-cyan-400 rounded-full animate-bounce" style={{ animationDuration: '1.8s', animationDelay: '0.3s' }} />
    </div>
  )
}

// Step Progress Component
function StepCard({ number, title, description, icon: Icon, isActive, isCompleted, onClick }) {
  return (
    <div 
      onClick={onClick}
      className={`
        relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-500
        ${isCompleted ? 'border-green-400/50 bg-green-400/10' : ''}
        ${isActive ? 'border-cyan-400 shadow-lg shadow-cyan-400/30 scale-105' : 'border-white/10 bg-white/5'}
        ${!isActive && !isCompleted ? 'opacity-70 hover:opacity-100' : ''}
      `}
    >
      {/* Numero step */}
      <div className={`
        absolute -top-4 -left-2 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
        ${isCompleted ? 'bg-green-400 text-black' : ''}
        ${isActive ? 'bg-cyan-400 text-black animate-pulse' : 'bg-white/20 text-white'}
      `}>
        {isCompleted ? <CheckCircle2 size={16} /> : number}
      </div>
      
      <div className="flex items-start gap-4 mt-2">
        <div className={`
          p-3 rounded-xl transition-all duration-300
          ${isActive ? 'bg-cyan-400/20 text-cyan-400' : 'bg-white/10 text-white/60'}
        `}>
          <Icon size={24} />
        </div>
        <div className="flex-1">
          <h3 className={`font-bold text-lg mb-1 ${isActive ? 'text-cyan-400' : 'text-white'}`}>{title}</h3>
          <p className="text-sm text-white/60">{description}</p>
        </div>
      </div>
      
      {/* Barra progresso animata */}
      {isActive && (
        <div className="mt-4 h-1 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 animate-[loading_2s_ease-in-out_infinite]" style={{ width: '60%' }} />
        </div>
      )}
    </div>
  )
}

// Expandable Section Component
function ExpandableCard({ title, description, children, icon: Icon, isExpanded, onToggle }) {
  return (
    <div className={`
      rounded-2xl border border-white/10 overflow-hidden transition-all duration-500
      ${isExpanded ? 'bg-white/10 shadow-lg shadow-cyan-500/10' : 'bg-white/5 hover:bg-white/8'}
    `}>
      <button
        onClick={onToggle}
        className="w-full p-6 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-4">
          <div className={`
            p-3 rounded-xl transition-all duration-300
            ${isExpanded ? 'bg-cyan-400/20 text-cyan-400' : 'bg-white/10 text-white/70'}
          `}>
            <Icon size={24} />
          </div>
          <div>
            <h3 className="font-bold text-lg text-white">{title}</h3>
            {!isExpanded && <p className="text-sm text-white/50 line-clamp-1">{description}</p>}
          </div>
        </div>
        <div className={`
          transition-transform duration-300
          ${isExpanded ? 'rotate-180 text-cyan-400' : 'text-white/50'}
        `}>
          <ChevronDown size={24} />
        </div>
      </button>
      
      <div className={`
        overflow-hidden transition-all duration-500
        ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}
      `}>
        <div className="p-6 pt-0 border-t border-white/10">
          <p className="text-white/70 mb-4 leading-relaxed">{description}</p>
          {children}
        </div>
      </div>
    </div>
  )
}

export default function GuidaPage() {
  const { t, lang } = useTranslation()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [expandedSection, setExpandedSection] = useState('basics')
  const [activeStep, setActiveStep] = useState(1)
  
  // Steps del percorso
  const journeySteps = [
    {
      number: 1,
      title: lang === 'en' ? 'Complete Your Profile' : 'Completa il Profilo',
      description: lang === 'en' ? 'Add your gaming preferences so AI can help you better' : 'Aggiungi le tue preferenze di gioco per ricevere aiuto personalizzato',
      icon: Target
    },
    {
      number: 2,
      title: lang === 'en' ? 'Upload Your Squad' : 'Carica la tua Rosa',
      description: lang === 'en' ? 'Add your 11 starters and reserves to the 2D field' : 'Aggiungi i 11 titolari e le riserve sul campo 2D',
      icon: Users
    },
    {
      number: 3,
      title: lang === 'en' ? 'Record Matches' : 'Registra le Partite',
      description: lang === 'en' ? 'Upload match screenshots to track your performance' : 'Carica screenshot delle partite per tracciare le tue prestazioni',
      icon: Calendar
    },
    {
      number: 4,
      title: lang === 'en' ? 'Get AI Insights' : 'Ottieni Consigli AI',
      description: lang === 'en' ? 'Receive personalized tactical advice and analysis' : 'Ricevi consigli tattici e analisi personalizzate',
      icon: Sparkles
    }
  ]
  
  // Sezioni espandibili
  const guideSections = [
    {
      id: 'basics',
      title: lang === 'en' ? 'Getting Started' : 'Iniziare',
      description: lang === 'en' 
        ? 'Learn the basics of the platform: how to navigate, upload screenshots, and use the AI assistant.' 
        : 'Impara le basi della piattaforma: come navigare, caricare screenshot e usare l\'assistente AI.',
      icon: Play,
      content: [
        { title: lang === 'en' ? 'Dashboard Overview' : 'Panoramica Dashboard', desc: lang === 'en' ? 'Your command center for everything' : 'Il tuo centro di comando per tutto' },
        { title: lang === 'en' ? 'Using the AI Assistant' : 'Usare l\'Assistente AI', desc: lang === 'en' ? 'Chat with your personal coach 24/7' : 'Chatta con il tuo coach personale 24/7' },
        { title: lang === 'en' ? 'Managing Your Squad' : 'Gestire la Rosa', desc: lang === 'en' ? 'Upload and organize players' : 'Carica e organizza i giocatori' }
      ]
    },
    {
      id: 'matches',
      title: lang === 'en' ? 'Recording Matches' : 'Registrare Partite',
      description: lang === 'en'
        ? 'Step-by-step guide to uploading match data and getting AI analysis.'
        : 'Guida passo passo per caricare i dati delle partite e ricevere analisi AI.',
      icon: Calendar,
      content: [
        { title: lang === 'en' ? 'The 6-Step Wizard' : 'Il Wizard a 6 Step', desc: lang === 'en' ? 'Upload ratings, stats, and more' : 'Carica pagelle, statistiche e altro' },
        { title: lang === 'en' ? 'Home vs Away' : 'Casa vs Trasferta', desc: lang === 'en' ? 'How to identify your team' : 'Come identificare la tua squadra' },
        { title: lang === 'en' ? 'Viewing Match Details' : 'Visualizzare Dettagli', desc: lang === 'en' ? 'Deep dive into your performance' : 'Analisi approfondita delle tue prestazioni' }
      ]
    },
    {
      id: 'tactics',
      title: lang === 'en' ? 'Tactical Tools' : 'Strumenti Tattici',
      description: lang === 'en'
        ? 'Master the tactical features: countermeasures, formation analysis, and coaching.'
        : 'Padroneggia le funzionalità tattiche: contromisure, analisi formazione e coaching.',
      icon: Shield,
      content: [
        { title: lang === 'en' ? 'Pre-Match Countermeasures' : 'Contromisure Pre-partita', desc: lang === 'en' ? 'Analyze opponent formations' : 'Analizza le formazioni avversarie' },
        { title: lang === 'en' ? 'Coach Management' : 'Gestione Allenatori', desc: lang === 'en' ? 'Set your active coach and style' : 'Imposta allenatore attivo e stile' },
        { title: lang === 'en' ? 'Tactical Settings' : 'Impostazioni Tattiche', desc: lang === 'en' ? 'Customize individual instructions' : 'Personalizza istruzioni individuali' }
      ]
    },
    {
      id: 'progress',
      title: lang === 'en' ? 'Tracking Progress' : 'Tracciare i Progressi',
      description: lang === 'en'
        ? 'Understand leaderboards, weekly goals, and how to improve your game.'
        : 'Comprendi classifiche, obiettivi settimanali e come migliorare il tuo gioco.',
      icon: BarChart3,
      content: [
        { title: lang === 'en' ? 'Monthly Leaderboard' : 'Classifica Mensile', desc: lang === 'en' ? 'Compete and earn points' : 'Competi e guadagna punti' },
        { title: lang === 'en' ? 'Weekly Goals' : 'Obiettivi Settimanali', desc: lang === 'en' ? 'Complete tasks for rewards' : 'Completa task per ricompense' },
        { title: lang === 'en' ? 'Game Analysis' : 'Analisi di Gioco', desc: lang === 'en' ? 'Track your statistics over time' : 'Traccia le tue statistiche nel tempo' }
      ]
    }
  ]
  
  // FAQ
  const faqs = [
    {
      q: lang === 'en' ? 'How do I upload a player screenshot?' : 'Come carico uno screenshot di un giocatore?',
      a: lang === 'en' 
        ? 'Go to "Your Squad", click on an empty slot on the 2D field, then select "Upload Photo". You can upload up to 3 photos per player for better extraction.'
        : 'Vai su "La tua rosa", clicca su uno slot vuoto sul campo 2D, poi seleziona "Carica Foto". Puoi caricare fino a 3 foto per giocatore per un\'estrazione migliore.'
    },
    {
      q: lang === 'en' ? 'What screenshots do I need for a match?' : 'Quali screenshot servono per una partita?',
      a: lang === 'en'
        ? 'The wizard guides you through 6 steps: Home/Away, Player Ratings, Team Stats, Attack Areas, Ball Recovery, and Opponent Formation. You can skip steps if you don\'t have the screenshot.'
        : 'Il wizard ti guida attraverso 6 step: Casa/Fuori, Pagelle Giocatori, Statistiche Squadra, Aree Attacco, Recuperi Palla e Formazione Avversaria. Puoi saltare gli step se non hai lo screenshot.'
    },
    {
      q: lang === 'en' ? 'How does the AI assistant help me?' : 'Come mi aiuta l\'assistente AI?',
      a: lang === 'en'
        ? 'The AI analyzes your matches, identifies patterns, and gives personalized tactical advice. The more data you provide (matches, profile, squad), the better the recommendations.'
        : 'L\'AI analizza le tue partite, identifica pattern e dà consigli tattici personalizzati. Più dati fornisci (partite, profilo, rosa), migliori saranno le raccomandazioni.'
    },
    {
      q: lang === 'en' ? 'What are Hero Points?' : 'Cosa sono gli Hero Points?',
      a: lang === 'en'
        ? 'Hero Points are your credits for using AI features. Uploading screenshots and getting analysis consumes points. You earn points by completing weekly goals and ranking high on the leaderboard.'
        : 'Gli Hero Points sono i tuoi crediti per usare le funzionalità AI. Caricare screenshot e ricevere analisi consuma punti. Guadagni punti completando obiettivi settimanali e posizionandoti in alto in classifica.'
    }
  ]

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-cyan-400 text-xl animate-pulse">
          {lang === 'en' ? 'Loading...' : 'Caricamento...'}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="p-6">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>{lang === 'en' ? 'Back' : 'Indietro'}</span>
        </button>
      </div>

      {/* Hero Section */}
      <div className="px-6 pb-12 text-center">
        <AIHeroIcon className="mx-auto mb-6" />
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          {lang === 'en' ? 'How can we help you?' : 'Come possiamo aiutarti?'}
        </h1>
        <p className="text-white/60 text-lg max-w-2xl mx-auto">
          {lang === 'en' 
            ? 'Master the platform step by step. From uploading your first player to getting AI-powered tactical insights.'
            : 'Padroneggia la piattaforma passo dopo passo. Dal caricare il tuo primo giocatore a ricevere consigli tattici AI.'}
        </p>
      </div>

      {/* Progress Banner */}
      {profile && (
        <div className="px-6 mb-12">
          <div 
            onClick={() => router.push('/impostazioni-profilo')}
            className="max-w-3xl mx-auto p-6 rounded-2xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 cursor-pointer hover:border-cyan-400/50 transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Target className="text-cyan-400" size={24} />
                <span className="font-bold text-white">
                  {lang === 'en' ? 'Your Profile Progress' : 'Progresso Profilo'}
                </span>
              </div>
              <span className="text-2xl font-bold text-cyan-400">{profileCompletion}%</span>
            </div>
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-1000 group-hover:shadow-lg group-hover:shadow-cyan-400/30"
                style={{ width: `${profileCompletion}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-white/60">
              {profileCompletion === 100 
                ? (lang === 'en' ? 'Profile complete! AI knows you well.' : 'Profilo completo! L\'AI ti conosce bene.')
                : (lang === 'en' ? 'Complete your profile for better AI recommendations' : 'Completa il profilo per ricevere consigli AI migliori')}
            </p>
          </div>
        </div>
      )}

      {/* Journey Steps */}
      <div className="px-6 mb-16">
        <h2 className="text-2xl font-bold text-white text-center mb-8">
          {lang === 'en' ? 'Your Journey' : 'Il tuo Percorso'}
        </h2>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {journeySteps.map((step) => (
            <StepCard
              key={step.number}
              {...step}
              isActive={activeStep === step.number}
              isCompleted={profile ? (step.number === 1 && profileCompletion >= 50) || (step.number < activeStep) : false}
              onClick={() => setActiveStep(step.number)}
            />
          ))}
        </div>
      </div>

      {/* Detailed Guide Sections */}
      <div className="px-6 mb-16">
        <h2 className="text-2xl font-bold text-white text-center mb-8">
          {lang === 'en' ? 'Detailed Guides' : 'Guide Dettagliate'}
        </h2>
        <div className="max-w-3xl mx-auto space-y-4">
          {guideSections.map((section) => (
            <ExpandableCard
              key={section.id}
              {...section}
              isExpanded={expandedSection === section.id}
              onToggle={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
            >
              <div className="space-y-3 mt-4">
                {section.content.map((item, idx) => (
                  <div 
                    key={idx}
                    className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-white group-hover:text-cyan-400 transition-colors">
                          {item.title}
                        </h4>
                        <p className="text-sm text-white/50">{item.desc}</p>
                      </div>
                      <ArrowRight size={18} className="text-white/30 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            </ExpandableCard>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="px-6 mb-16">
        <h2 className="text-2xl font-bold text-white text-center mb-8">
          {lang === 'en' ? 'Frequently Asked Questions' : 'Domande Frequenti'}
        </h2>
        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq, idx) => (
            <details 
              key={idx}
              className="group rounded-xl bg-white/5 border border-white/10 overflow-hidden"
            >
              <summary className="flex items-center justify-between p-5 cursor-pointer list-none hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <HelpCircle size={20} className="text-cyan-400" />
                  <span className="font-medium text-white">{faq.q}</span>
                </div>
                <ChevronDown 
                  size={20} 
                  className="text-white/50 group-open:rotate-180 transition-transform" 
                />
              </summary>
              <div className="px-5 pb-5 pl-12">
                <p className="text-white/70 leading-relaxed">{faq.a}</p>
              </div>
            </details>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="px-6">
        <div className="max-w-2xl mx-auto text-center p-8 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-400/20">
          <MessageCircle size={40} className="text-cyan-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-white mb-3">
            {lang === 'en' ? 'Still have questions?' : 'Hai ancora domande?'}
          </h3>
          <p className="text-white/60 mb-6">
            {lang === 'en' 
              ? 'Chat with your AI assistant anytime. It knows your squad and can give personalized help.'
              : 'Chatta con il tuo assistente AI in qualsiasi momento. Conosce la tua rosa e può darti aiuto personalizzato.'}
          </p>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('open-assistant-chat'))
              }
            }}
            className="px-8 py-4 bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-bold rounded-xl hover:shadow-lg hover:shadow-cyan-400/30 transition-all hover:scale-105"
          >
            {lang === 'en' ? 'Open AI Assistant' : 'Apri Assistente AI'}
          </button>
        </div>
      </div>

      {/* Spacer */}
      <div className="h-20" />

      {/* Stili per animazioni */}
      <style jsx>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  )
}
