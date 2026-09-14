'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { ArrowLeft, BookOpen } from 'lucide-react'
import RoadmapVisualizer from '@/components/RoadmapVisualizer'
import PageLoading from '@/components/PageLoading'
import { useTranslation } from '@/lib/i18n'

export default function RoadmapPage() {
  const router = useRouter()
  const { lang } = useTranslation()
  
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalPlayers: 0, titolari: 0, riserve: 0 })
  const [recentMatches, setRecentMatches] = useState([])
  const [userProfile, setUserProfile] = useState(null)
  const [gameAnalysisLastCapture, setGameAnalysisLastCapture] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      let token = localStorage.getItem('auth_token')
      
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }

      if (!token) {
        router.push('/login')
        return
      }

      const res = await fetch('/api/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('auth_token')
          router.push('/login')
          return
        }
        throw new Error('Failed to load data')
      }

      const data = await res.json()

      // Calcola statistiche rosa
      const playersList = data.players || []
      const titolari = playersList.filter(p => p.slot_index != null && p.slot_index >= 0 && p.slot_index <= 10).length
      const riserve = playersList.filter(p => p.slot_index == null).length

      setStats({
        totalPlayers: playersList.length,
        titolari,
        riserve
      })

      // Imposta partite recenti
      setRecentMatches(data.matches || [])

      // Imposta profilo utente
      setUserProfile(data.profile || null)

      // Imposta ultima analisi
      setGameAnalysisLastCapture(data.gameAnalysis ? { captured_at: data.gameAnalysis.captured_at } : null)

    } catch (err) {
      console.error('Error loading roadmap data:', err)
    } finally {
      setLoading(false)
    }
  }

  const t = (key, fallback = '') => {
    const translations = {
      it: {
        roadmapPageTitle: 'La tua Roadmap',
        roadmapPageSubtitle: 'Ogni dato conta. Scopri perché.',
        backToDashboard: 'Torna alla Dashboard',
        whyDataMatters: 'Perché i dati sono importanti?',
        dataPhilosophy: 'From Zero to Hero non è un oracolo che indovina. È un coach che impara chi sei. Più dati dai, più i consigli diventano TUOI.',
        stepByStep: 'Passo dopo passo',
        stepByStepDesc: 'Non devi fare tutto subito. Ogni passo sblocca il prossimo livello di consigli. Nessuna fretta, ma ogni dato aiuta.',
         loading: 'Caricamento...',
        roadmapTitle: 'Il tuo percorso da Zero a Hero',
        roadmapSubtitle: 'Ogni passo aggiunge dati. Più dati hai, più i consigli sono tuoi.',
        roadmapRosterTitle: 'Costruisci la tua Rosa',
        roadmapRosterShort: '11 titolari + 5 riserve',
        roadmapRosterDesc: 'Senza i tuoi giocatori, l\'AI non sa chi sei. Carica foto, statistiche e posizioni per ricevere consigli basati sui TUOI giocatori, non generici.',
        roadmapRosterWhy: 'Più dati hai sulla rosa, più l\'AI può dirti "Con Ronaldo in attacco, prova questo stile" invece di "Prova un attaccante veloce".',
        roadmapFirstMatchTitle: 'Gioca e Carica',
        roadmapFirstMatchShort: 'La tua prima partita',
        roadmapFirstMatchDesc: 'Una partita caricata vale più di 1000 parole. L\'AI vede la tua formazione, il risultato, le statistiche.',
        roadmapFirstMatchWhy: 'La prima partita attiva l\'analisi base. L\'AI inizia a capire se preferisci giocare in casa o fuori, se attacchi di più o difendi.',
        roadmapProfileTitle: 'Racconta chi sei',
        roadmapProfileShort: 'Piattaforma, connessione, punto debole',
        roadmapProfileDesc: 'Sei su console o PC? Hai lag? Il tuo punto debole è la difesa? Questi dati filtrano i consigli.',
        roadmapProfileWhy: 'Se giochi con PA1 e dici "difesa", l\'AI suggerisce tattiche diverse che se giochi PA3 e dici "attacco". Personalizzazione reale.',
        roadmapMatchesTitle: 'Costruisci la Storia',
        roadmapMatchesShort: '3-5 partite per pattern',
        roadmapMatchesDesc: 'Con 3 partite l\'AI vede pattern: "Usi sempre il 4-3-3 e perdi contro il 5-3-2". Con 5, i consigli diventano precisi.',
        roadmapMatchesWhy: '3 partite = pattern base (formation usage). 5 partite = pattern avanzati (cosa funziona contro cosa). 10+ = consigli da pro.',
        roadmapAnalysisTitle: 'Analisi eFootball',
        roadmapAnalysisShort: 'Statistiche di gioco',
        roadmapAnalysisDesc: 'Carica lo screenshot delle statistiche eFootball. Possesso palla, passaggi riusciti, tiri in porta.',
        roadmapAnalysisWhy: 'Le statistiche oggettive confermano o smentiscono le tue percezioni. "Penso di passare bene" vs "Hai 65% passaggi riusciti".',
        roadmapPalestraTitle: 'Palestra Coach',
        roadmapPalestraShort: 'Feedback e conversazione',
        roadmapPalestraDesc: 'Racconta all\'AI come è andata. "Ho seguito il tuo consiglio ma ho perso". Questo adatta i consigli futuri.',
        roadmapPalestraWhy: 'Ogni sessione Palestra aumenta del 10% la conoscenza AI. Dopo 4 sessioni, l\'AI ti conosce come un coach reale.',
        roadmapMasteryTitle: 'Maestro',
        roadmapMasteryShort: 'Da Zero a Hero',
        roadmapMasteryDesc: 'Hai 10+ partite, profilo completo, usi la Palestra. L\'AI conosce i tuoi pattern, i tuoi punti deboli, i tuoi punti di forza.',
        roadmapMasteryWhy: 'A questo livello, i consigli sono specifici al 90%. "Nel tuo 4-3-3 con quella connessione, contro il 5-3-2 usa questo approccio".',
        whyImportant: 'Perché è importante:',
        current: 'Attuale',
        continue: 'Continua',
        completed: 'Completato',
        inProgress: 'In corso',
        locked: 'Bloccato'
      },
      en: {
        roadmapPageTitle: 'Your Roadmap',
        roadmapPageSubtitle: 'Every piece of data counts. Discover why.',
        backToDashboard: 'Back to Dashboard',
        whyDataMatters: 'Why does data matter?',
        dataPhilosophy: 'From Zero to Hero is not an oracle that guesses. It is a coach that learns who you are. The more data you give, the more the advice becomes YOURS.',
        stepByStep: 'Step by step',
        stepByStepDesc: 'You don\'t have to do everything at once. Each step unlocks the next level of advice. No rush, but every piece of data helps.',
        loading: 'Loading...',
        roadmapTitle: 'Your path from Zero to Hero',
        roadmapSubtitle: 'Each step adds data. The more data you have, the more the advice is yours.',
        roadmapRosterTitle: 'Build your Squad',
        roadmapRosterShort: '11 starters + 5 reserves',
        roadmapRosterDesc: 'Without your players, the AI doesn\'t know who you are. Upload photos, stats and positions to get advice based on YOUR players, not generic.',
        roadmapRosterWhy: 'The more data you have on the squad, the more the AI can say "With Ronaldo up front, try this style" instead of "Try a fast striker".',
        roadmapFirstMatchTitle: 'Play and Upload',
        roadmapFirstMatchShort: 'Your first match',
        roadmapFirstMatchDesc: 'One uploaded match is worth more than 1000 words. The AI sees your formation, result, stats.',
        roadmapFirstMatchWhy: 'The first match enables basic analysis. The AI starts to understand if you prefer home or away, if you attack or defend more.',
        roadmapProfileTitle: 'Tell us who you are',
        roadmapProfileShort: 'Platform, connection, weak point',
        roadmapProfileDesc: 'Console or PC? Lag? Is your weak point defence? This data filters the advice.',
        roadmapProfileWhy: 'If you play PA1 and say "defence", the AI suggests different tactics than if you play PA3 and say "attack". Real personalisation.',
        roadmapMatchesTitle: 'Build the Story',
        roadmapMatchesShort: '3-5 matches for patterns',
        roadmapMatchesDesc: 'With 3 matches the AI sees patterns: "You always use 4-3-3 and lose to 5-3-2". With 5, advice gets precise.',
        roadmapMatchesWhy: '3 matches = basic pattern (formation usage). 5 matches = advanced patterns (what works vs what). 10+ = pro-level advice.',
        roadmapAnalysisTitle: 'eFootball Analysis',
        roadmapAnalysisShort: 'In-game statistics',
        roadmapAnalysisDesc: 'Upload the eFootball stats screenshot. Possession, completed passes, shots on target.',
        roadmapAnalysisWhy: 'Objective stats confirm or contradict your perceptions. "I think I pass well" vs "You have 65% completed passes".',
        roadmapPalestraTitle: 'Coach Gym',
        roadmapPalestraShort: 'Feedback and conversation',
        roadmapPalestraDesc: 'Tell the AI how it went. "I followed your advice but lost". This adapts future advice.',
        roadmapPalestraWhy: 'Each Gym session increases AI knowledge by 10%. After 4 sessions, the AI knows you like a real coach.',
        roadmapMasteryTitle: 'Mastery',
        roadmapMasteryShort: 'From Zero to Hero',
        roadmapMasteryDesc: 'You have 10+ matches, full profile, you use the Gym. The AI knows your patterns, weak points, strengths.',
        roadmapMasteryWhy: 'At this level, advice is 90% specific. "In your 4-3-3 with that connection, vs 5-3-2 use this approach".',
        whyImportant: 'Why it matters:',
        current: 'Current',
        continue: 'Continue',
        completed: 'Completed',
        inProgress: 'In progress',
        locked: 'Locked'
      }
    }
    return translations[lang]?.[key] || fallback || key
  }

  if (loading) {
    return <PageLoading />
  }

  return (
    <div style={styles.page}>
        <div style={styles.container}>
          {/* Header */}
          <div style={styles.header}>
            <button 
              onClick={() => router.push('/')}
              style={styles.backButton}
            >
              <ArrowLeft size={20} />
              {t('backToDashboard')}
            </button>
            <div style={styles.titleSection}>
              <h1 style={styles.pageTitle}>{t('roadmapPageTitle')}</h1>
              <p style={styles.pageSubtitle}>{t('roadmapPageSubtitle')}</p>
            </div>
          </div>

          {/* Educational Section */}
          <div style={styles.educationSection}>
            <div style={styles.eduCard}>
              <BookOpen size={32} color="#00d4ff" />
              <div style={styles.eduContent}>
                <h3>{t('whyDataMatters')}</h3>
                <p>{t('dataPhilosophy')}</p>
              </div>
            </div>
            <div style={styles.eduCard}>
              <div style={styles.stepIcon}>👣</div>
              <div style={styles.eduContent}>
                <h3>{t('stepByStep')}</h3>
                <p>{t('stepByStepDesc')}</p>
              </div>
            </div>
          </div>

          {/* Roadmap Visualizer */}
          <RoadmapVisualizer
            stats={stats}
            recentMatches={recentMatches}
            userProfile={userProfile}
            gameAnalysisLastCapture={gameAnalysisLastCapture}
            lang={lang}
            t={t}
          />
        </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#0a0a0a',
    paddingTop: '80px',
    paddingBottom: '60px'
  },
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '0 20px'
  },
  header: {
    marginBottom: '32px'
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    backgroundColor: 'transparent',
    color: '#888',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    marginBottom: '24px',
    transition: 'all 0.2s ease'
  },
  titleSection: {
    textAlign: 'center'
  },
  pageTitle: {
    margin: '0 0 8px 0',
    fontSize: '36px',
    fontWeight: 800,
    background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  pageSubtitle: {
    margin: 0,
    fontSize: '18px',
    color: '#888'
  },
  educationSection: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    marginBottom: '32px'
  },
  eduCard: {
    backgroundColor: '#1a1a1a',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '24px',
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start'
  },
  stepIcon: {
    fontSize: '32px',
    lineHeight: 1
  },
  eduContent: {
    flex: 1,
    '& h3': {
      margin: '0 0 8px 0',
      fontSize: '18px',
      fontWeight: 600,
      color: '#fff'
    },
    '& p': {
      margin: 0,
      fontSize: '14px',
      color: '#888',
      lineHeight: 1.6
    }
  }
}
