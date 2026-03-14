'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import {
  BookOpen,
  Brain,
  User,
  LayoutDashboard,
  Users,
  Calendar,
  Trophy,
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
  Dumbbell
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
          router.push('/login')
          return
        }

        const res = await fetch('/api/user/profile', {
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
          throw new Error('Failed to load profile')
        }

        const profileData = await res.json()
        setProfile(profileData)
      } catch (error) {
        console.error('[Guida] Error loading profile:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [router])

  // Calcola completamento profilo
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

  // Guide per ogni pagina
  const pageGuides = [
    {
      id: 'dashboard',
      icon: LayoutDashboard,
      color: 'var(--neon-blue)',
      path: '/',
      title: t('guideDashboardTitle'),
      description: t('guideDashboardDesc'),
      steps: [
        t('guideDashboardStep1'),
        t('guideDashboardStepBanner'),
        t('guideDashboardStepObiettivi'),
        t('guideDashboardStepClassifica'),
        t('guideDashboardStep3'),
        t('guideDashboardStepStatistiche'),
        t('guideDashboardStep4')
      ]
    },
    {
      id: 'gestione-formazione',
      icon: Users,
      color: 'var(--neon-purple)',
      path: '/gestione-formazione',
      title: t('guideFormationTitle'),
      description: t('guideFormationDesc'),
      steps: [
        t('guideFormationStep1'),
        t('guideFormationStep2'),
        t('guideFormationStep3'),
        t('guideFormationStep4'),
        t('guideFormationStep5')
      ]
    },
    {
      id: 'aggiungi-partita',
      icon: Calendar,
      color: 'var(--neon-orange)',
      path: '/match/new',
      title: t('guideAddMatchTitle'),
      description: t('guideAddMatchDesc'),
      steps: [
        t('guideAddMatchStep1'),
        t('guideAddMatchStep2'),
        t('guideAddMatchStep3'),
        t('guideAddMatchStep4'),
        t('guideAddMatchStep5'),
        t('guideAddMatchStep6')
      ]
    },
    {
      id: 'dettaglio-partita',
      icon: Trophy,
      color: 'var(--neon-pink)',
      path: '/',
      title: t('guideMatchDetailTitle'),
      description: t('guideMatchDetailDesc'),
      steps: [
        t('guideMatchDetailStep1'),
        t('guideMatchDetailStep2'),
        t('guideMatchDetailStep3'),
        t('guideMatchDetailStep4')
      ]
    },
    {
      id: 'dettaglio-giocatore',
      icon: User,
      color: 'var(--neon-cyan)',
      path: '/gestione-formazione',
      title: t('guidePlayerDetailTitle'),
      description: t('guidePlayerDetailDesc'),
      steps: [
        t('guidePlayerDetailStep1'),
        t('guidePlayerDetailStep2'),
        t('guidePlayerDetailStep3')
      ]
    },
    {
      id: 'impostazioni-profilo',
      icon: Settings,
      color: 'var(--neon-blue)',
      path: '/impostazioni-profilo',
      title: t('guideProfileTitle'),
      description: t('guideProfileDesc'),
      steps: [
        t('guideProfileStep1'),
        t('guideProfileStep2'),
        t('guideProfileStep3'),
        t('guideProfileStep4')
      ]
    },
    {
      id: 'palestra-coach',
      icon: Dumbbell,
      color: 'var(--neon-orange)',
      path: '/',
      title: t('guidePalestraCoachTitle'),
      description: t('guidePalestraCoachDesc'),
      steps: [
        t('guidePalestraCoachStep1'),
        t('guidePalestraCoachStep2'),
        t('guidePalestraCoachStep3')
      ]
    },
    {
      id: 'contromisure-pre-partita',
      icon: Shield,
      color: 'var(--neon-orange)',
      path: '/contromisure-pre-partita',
      title: t('guideCountermeasuresTitle'),
      description: t('guideCountermeasuresDesc'),
      steps: [
        t('guideCountermeasuresStep1'),
        t('guideCountermeasuresStep2'),
        t('guideCountermeasuresStep3'),
        t('guideCountermeasuresStep4')
      ]
    },
    {
      id: 'allenatori',
      icon: UserRound,
      color: 'var(--neon-cyan)',
      path: '/allenatori',
      title: t('guideCoachesTitle'),
      description: t('guideCoachesDesc'),
      steps: [
        t('guideCoachesStep1'),
        t('guideCoachesStep2'),
        t('guideCoachesStep3')
      ]
    },
    {
      id: 'classifica',
      icon: Trophy,
      color: 'var(--neon-orange)',
      path: '/classifica',
      title: t('guideClassificaTitle'),
      description: t('guideClassificaDesc'),
      steps: [
        t('guideClassificaStep1'),
        t('guideClassificaStep2'),
        t('guideClassificaStep3')
      ]
    },
    {
      id: 'gestione-profilo',
      icon: Wallet,
      color: 'var(--neon-orange)',
      path: '/gestione-profilo',
      title: t('guideGestioneProfiloTitle'),
      description: t('guideGestioneProfiloDesc'),
      steps: [
        t('guideGestioneProfiloStep1'),
        t('guideGestioneProfiloStep2'),
        t('guideGestioneProfiloStep3')
      ]
    }
  ]

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-darker)'
      }}>
        <div style={{
          textAlign: 'center',
          color: 'var(--neon-blue)',
          fontSize: '18px'
        }}>
          {t('loading')}
        </div>
      </div>
    )
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
                border: '1px solid var(--neon-blue)',
                borderRadius: '8px',
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--neon-blue)',
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
                background: 'linear-gradient(135deg, var(--neon-blue), var(--neon-purple))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <BookOpen size={32} />
                {t('guideTitle')}
              </h1>
              <p style={{
                fontSize: '16px',
                opacity: 0.8,
                color: 'white'
              }}>
                {t('guideSubtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Hero Section - Completa Profilo */}
        <div data-tour-id="tour-guida-profile-hero" className="neon-card" style={{
          padding: '32px',
          marginBottom: '32px',
          background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(168, 85, 247, 0.1))',
          border: '2px solid var(--neon-blue)',
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
              background: 'linear-gradient(135deg, var(--neon-blue), var(--neon-purple))',
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
                color: 'white',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {t('guideCompleteProfileTitle')}
                {profileCompletion === 100 && <CheckCircle2 size={24} color="var(--neon-blue)" />}
              </h2>
              <p style={{
                fontSize: '16px',
                opacity: 0.9,
                color: 'white'
              }}>
                {t('guideCompleteProfileDesc')}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <span style={{
                fontSize: '14px',
                opacity: 0.8,
                color: 'white'
              }}>
                {t('guideProfileProgress')}
              </span>
              <span style={{
                fontSize: '18px',
                fontWeight: 700,
                color: profileCompletion === 100 ? 'var(--neon-blue)' : 'var(--neon-orange)'
              }}>
                {profileCompletion}%
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '12px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              overflow: 'hidden',
              position: 'relative'
            }}>
              <div style={{
                width: `${profileCompletion}%`,
                height: '100%',
                background: profileCompletion === 100
                  ? 'linear-gradient(90deg, var(--neon-blue), var(--neon-cyan))'
                  : 'linear-gradient(90deg, var(--neon-orange), var(--neon-pink))',
                borderRadius: '6px',
                transition: 'width 0.5s ease',
                boxShadow: profileCompletion === 100 ? 'var(--glow-blue)' : 'var(--glow-orange)'
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
                ? 'linear-gradient(135deg, var(--neon-blue), var(--neon-cyan))'
                : 'linear-gradient(135deg, var(--neon-orange), var(--neon-pink))',
              border: 'none',
              boxShadow: profileCompletion === 100 ? 'var(--glow-blue)' : 'var(--glow-orange)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            <Settings size={20} />
            {profileCompletion === 100
              ? t('guideProfileComplete')
              : t('guideCompleteProfileButton')
            }
            <ArrowRight size={20} />
          </button>
        </div>

        {/* Hero Section - Usa il Cervello AI */}
        <div data-tour-id="tour-guida-brain-hero" className="neon-card" style={{
          padding: '32px',
          marginBottom: '32px',
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(236, 72, 153, 0.1))',
          border: '2px solid var(--neon-purple)',
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
              background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-pink))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--glow-purple)',
              animation: 'pulse 2s infinite'
            }}>
              <Brain size={32} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: 700,
                color: 'white',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Sparkles size={24} color="var(--neon-purple)" />
                {t('guideUseBrainTitle')}
              </h2>
              <p style={{
                fontSize: '16px',
                opacity: 0.9,
                color: 'white',
                lineHeight: '1.6'
              }}>
                {t('guideUseBrainDesc')}
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
              <Zap size={20} color="var(--neon-purple)" style={{ marginBottom: '8px' }} />
              <div style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--neon-purple)',
                marginBottom: '4px'
              }}>
                {t('guideBrainFeature1')}
              </div>
              <div style={{
                fontSize: '12px',
                opacity: 0.8,
                color: 'white'
              }}>
                {t('guideBrainFeature1Desc')}
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
                {t('guideBrainFeature2')}
              </div>
              <div style={{
                fontSize: '12px',
                opacity: 0.8,
                color: 'white'
              }}>
                {t('guideBrainFeature2Desc')}
              </div>
            </div>
            <div style={{
              padding: '16px',
              background: 'rgba(0, 212, 255, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(0, 212, 255, 0.3)'
            }}>
              <Sparkles size={20} color="var(--neon-blue)" style={{ marginBottom: '8px' }} />
              <div style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--neon-blue)',
                marginBottom: '4px'
              }}>
                {t('guideBrainFeature3')}
              </div>
              <div style={{
                fontSize: '12px',
                opacity: 0.8,
                color: 'white'
              }}>
                {t('guideBrainFeature3Desc')}
              </div>
            </div>
          </div>
        </div>

        {/* Hero Section - Mostrami come (Tour interattivo) */}
        <div className="neon-card" style={{
          padding: '32px',
          marginBottom: '32px',
          background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(34, 197, 94, 0.1))',
          border: '2px solid var(--neon-cyan)',
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
              background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-blue))',
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
                color: 'white',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Sparkles size={24} color="var(--neon-cyan)" />
                {t('guideShowMeHowTitle')}
              </h2>
              <p style={{
                fontSize: '16px',
                opacity: 0.9,
                color: 'white',
                lineHeight: '1.6'
              }}>
                {t('guideShowMeHowDesc')}
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
              <Compass size={20} color="var(--neon-cyan)" style={{ marginBottom: '8px' }} />
              <div style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--neon-cyan)',
                marginBottom: '4px'
              }}>
                {t('guideShowMeHowFeature1')}
              </div>
              <div style={{
                fontSize: '12px',
                opacity: 0.8,
                color: 'white'
              }}>
                {t('guideShowMeHowFeature1Desc')}
              </div>
            </div>
            <div style={{
              padding: '16px',
              background: 'rgba(0, 212, 255, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(0, 212, 255, 0.3)'
            }}>
              <Zap size={20} color="var(--neon-blue)" style={{ marginBottom: '8px' }} />
              <div style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--neon-blue)',
                marginBottom: '4px'
              }}>
                {t('guideShowMeHowFeature2')}
              </div>
              <div style={{
                fontSize: '12px',
                opacity: 0.8,
                color: 'white'
              }}>
                {t('guideShowMeHowFeature2Desc')}
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
            color: 'white',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <BookOpen size={28} color="var(--neon-blue)" />
            {t('guidePagesTitle')}
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
                  aria-label={isExpanded ? `${t('collapseGuideCard')}: ${guide.title}` : `${t('expandGuideCard')}: ${guide.title}`}
                  className="neon-card"
                  style={{
                    padding: 'clamp(16px, 4vw, 24px)',
                    border: `2px solid ${guide.color}`,
                    background: `rgba(${guide.color === 'var(--neon-blue)' ? '0, 212, 255' : guide.color === 'var(--neon-purple)' ? '168, 85, 247' : guide.color === 'var(--neon-orange)' ? '255, 107, 53' : guide.color === 'var(--neon-pink)' ? '236, 72, 153' : '0, 245, 255'}, 0.05)`,
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    minHeight: '44px',
                    boxSizing: 'border-box'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = `0 0 20px ${guide.color.replace('var(--', '').replace(')', '')}40, 0 0 40px ${guide.color.replace('var(--', '').replace(')', '')}20`
                    e.currentTarget.style.transform = 'translateY(-4px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                  onClick={() => toggleSection(guide.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSection(guide.id) } }}
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
                        color: 'white',
                        marginBottom: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px'
                      }}>
                        <span>{guide.title}</span>
                        {isExpanded ? <ChevronUp size={20} aria-hidden /> : <ChevronDown size={20} aria-hidden />}
                      </h3>
                      <p style={{
                        fontSize: '14px',
                        opacity: 0.8,
                        color: 'white',
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
                        {t('guideSteps')}
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
                              background: 'rgba(255, 255, 255, 0.05)',
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
                              color: 'white'
                            }}>
                              {idx + 1}
                            </div>
                            <span style={{
                              fontSize: '14px',
                              color: 'white',
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
                          router.push(guide.path)
                        }}
                        style={{
                          marginTop: '16px',
                          width: '100%',
                          padding: 'clamp(12px, 3vw, 14px)',
                          minHeight: '44px',
                          background: guide.color,
                          border: 'none',
                          borderRadius: '8px',
                          color: 'white',
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
                        aria-label={`${t('guideGoToPage')}: ${guide.title}`}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.02)'
                          e.currentTarget.style.boxShadow = `0 0 20px ${guide.color}60`
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)'
                          e.currentTarget.style.boxShadow = 'none'
                        }}
                      >
                        {t('guideGoToPage')}
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
                            border: '1px solid var(--neon-purple)',
                            borderRadius: '8px',
                            color: 'var(--neon-purple)',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(168, 85, 247, 0.3)'
                            e.currentTarget.style.boxShadow = '0 0 15px rgba(168, 85, 247, 0.4)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(168, 85, 247, 0.2)'
                            e.currentTarget.style.boxShadow = 'none'
                          }}
                        >
                          <BookOpen size={16} />
                          {t('tutorialRosaButton')}
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
          border: '2px solid var(--neon-blue)',
          boxShadow: 'var(--glow-blue)'
        }}>
          <Brain size={48} color="var(--neon-blue)" style={{
            marginBottom: '16px',
            animation: 'pulse 2s infinite'
          }} />
          <h3 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: 'white',
            marginBottom: '12px'
          }}>
            {t('guideFooterTitle')}
          </h3>
          <p style={{
            fontSize: '16px',
            opacity: 0.9,
            color: 'white',
            marginBottom: '24px',
            lineHeight: '1.6'
          }}>
            {t('guideFooterDesc')}
          </p>
        </div>
      </div>

    </div>
  )
}
