'use client'

import React from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { BarChart3, Brain, Shield, Sparkles, Unlock, Users } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { buildAuthHeaders, resolveAuthToken } from '@/lib/profileUxHelpers'

const featureCards = {
  it: [
    {
      icon: BarChart3,
      title: 'Analisi delle partite',
      text: 'Una lettura più chiara delle partite, del contesto e di ciò che conta davvero per migliorare.',
    },
    {
      icon: Users,
      title: 'Gestione rosa e formazione',
      text: 'Uno spazio strutturato per lavorare su giocatori, ruoli, posizione e organizzazione della squadra.',
    },
    {
      icon: Brain,
      title: 'Coach AI',
      text: 'Un supporto costruito per affiancarti con logica, continuità e personalizzazione.',
    },
    {
      icon: Shield,
      title: 'Contromisure e lettura tattica',
      text: 'Indicazioni più utili per preparare le partite e ragionare meglio sulle scelte di gioco.',
    },
  ],
  en: [
    {
      icon: BarChart3,
      title: 'Match analysis',
      text: 'A clearer reading of matches, context and the details that really matter for improvement.',
    },
    {
      icon: Users,
      title: 'Squad and formation management',
      text: 'A structured space to work on players, roles, positioning and squad organisation.',
    },
    {
      icon: Brain,
      title: 'AI Coach',
      text: 'A support layer designed to guide the player with logic, continuity and personalisation.',
    },
    {
      icon: Shield,
      title: 'Countermeasures and tactical reading',
      text: 'More useful direction to prepare matches and reason better about in-game choices.',
    },
  ],
}

export default function AccessPage() {
  const { lang } = useTranslation()
  const router = useRouter()
  const copy = lang === 'en' ? 'en' : 'it'
  const cards = featureCards[copy]

  const [code, setCode] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [message, setMessage] = React.useState(null)

  const handleUnlock = async (event) => {
    event.preventDefault()
    setMessage(null)

    const trimmedCode = code.trim()
    if (!trimmedCode) {
      setMessage({
        type: 'error',
        text: copy === 'en' ? 'Enter the access code you received.' : 'Inserisci il codice di accesso che hai ricevuto.',
      })
      return
    }

    setLoading(true)
    try {
      const token = await resolveAuthToken()
      if (!token) {
        router.replace('/login')
        return
      }

      const response = await fetch('/api/prelaunch/unlock', {
        method: 'POST',
        headers: buildAuthHeaders(token, { json: true }),
        body: JSON.stringify({ code: trimmedCode }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || (copy === 'en' ? 'Unable to unlock access.' : 'Impossibile sbloccare l’accesso.'))
      }

      setMessage({
        type: 'success',
        text: copy === 'en' ? 'Access unlocked. Entering platform...' : 'Accesso sbloccato. Ti sto portando nella piattaforma...',
      })

      setTimeout(() => {
        router.replace('/')
      }, 500)
    } catch (error) {
      setMessage({
        type: 'error',
        text: error?.message || (copy === 'en' ? 'Invalid access code.' : 'Codice di accesso non valido.'),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top, rgba(0, 212, 255, 0.12), transparent 35%), #03050c',
      padding: 'clamp(20px, 4vw, 40px)'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
        gap: '28px',
        alignItems: 'start'
      }}>
        <section style={{
          background: 'linear-gradient(180deg, rgba(9, 13, 28, 0.94) 0%, rgba(5, 8, 20, 0.98) 100%)',
          border: '1px solid rgba(0, 212, 255, 0.18)',
          borderRadius: '24px',
          padding: 'clamp(24px, 4vw, 40px)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.35)'
        }}>
          <div style={{ marginBottom: '24px' }}>
            <Image
              src="/logo.png"
              alt="From Zero to Hero"
              width={280}
              height={120}
              style={{ width: 'min(100%, 280px)', height: 'auto', objectFit: 'contain' }}
              priority
            />
          </div>

          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            borderRadius: '999px',
            background: 'rgba(0, 212, 255, 0.08)',
            border: '1px solid rgba(0, 212, 255, 0.24)',
            color: 'var(--primary-cyan)',
            fontSize: '13px',
            fontWeight: 700,
            marginBottom: '18px'
          }}>
            <Sparkles size={15} />
            {copy === 'en' ? 'Private access before public launch' : 'Accesso privato prima del lancio pubblico'}
          </span>

          <h1 style={{
            fontSize: 'clamp(30px, 5vw, 52px)',
            lineHeight: 1.02,
            fontWeight: 800,
            margin: '0 0 14px',
            color: '#FFFFFF'
          }}>
            {copy === 'en' ? 'Thanks for registering.' : 'Grazie per esserti registrato.'}
          </h1>

          <p style={{
            fontSize: 'clamp(16px, 2.3vw, 18px)',
            lineHeight: 1.65,
            color: 'rgba(255, 255, 255, 0.78)',
            margin: '0 0 14px'
          }}>
            {copy === 'en'
              ? 'Your account has been created successfully. Public access to the platform is not open yet.'
              : 'Il tuo account è stato creato correttamente. L’accesso pubblico alla piattaforma non è ancora aperto.'}
          </p>

          <p style={{
            fontSize: '15px',
            lineHeight: 1.7,
            color: 'rgba(0, 212, 255, 0.78)',
            margin: 0
          }}>
            {copy === 'en'
              ? 'At this stage, full access is reserved for selected partnerships and commercial agreements through dedicated access codes.'
              : 'In questa fase, l’accesso completo è riservato a partnership selezionate e accordi commerciali tramite codici dedicati.'}
          </p>

          <div style={{
            marginTop: '28px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '14px'
          }}>
            {cards.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                style={{
                  padding: '18px',
                  borderRadius: '18px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
              >
                <Icon size={20} color="var(--primary-cyan)" style={{ marginBottom: '12px' }} />
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', marginBottom: '8px' }}>{title}</div>
                <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.55, color: 'rgba(255, 255, 255, 0.68)' }}>{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ display: 'grid', gap: '20px' }}>
          <div style={{
            background: 'linear-gradient(180deg, rgba(9, 13, 28, 0.96) 0%, rgba(5, 8, 20, 0.98) 100%)',
            border: '1px solid rgba(255, 203, 5, 0.22)',
            borderRadius: '24px',
            padding: 'clamp(24px, 4vw, 32px)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              borderRadius: '999px',
              background: 'rgba(255, 203, 5, 0.08)',
              border: '1px solid rgba(255, 203, 5, 0.2)',
              color: '#ffcb05',
              fontSize: '13px',
              fontWeight: 700,
              marginBottom: '18px'
            }}>
              <Unlock size={15} />
              {copy === 'en' ? 'Dedicated access code' : 'Codice di accesso dedicato'}
            </div>

            <h2 style={{ fontSize: '28px', lineHeight: 1.1, fontWeight: 800, margin: '0 0 12px', color: '#FFFFFF' }}>
              {copy === 'en' ? 'Do you already have an access code?' : 'Hai già ricevuto un codice di accesso?'}
            </h2>

            <p style={{ margin: '0 0 22px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.65, fontSize: '15px' }}>
              {copy === 'en'
                ? 'If you received a reserved code, enter it below to unlock the full platform for this session.'
                : 'Se hai ricevuto un codice riservato, inseriscilo qui sotto per sbloccare la piattaforma completa per questa sessione.'}
            </p>

            <form onSubmit={handleUnlock} style={{ display: 'grid', gap: '14px' }}>
              <input
                type="password"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder={copy === 'en' ? 'Enter access code' : 'Inserisci il codice di accesso'}
                autoComplete="off"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '16px 18px',
                  borderRadius: '14px',
                  border: '1px solid rgba(0, 212, 255, 0.22)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  color: '#FFFFFF',
                  fontSize: '15px',
                  outline: 'none'
                }}
              />

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '15px 18px',
                  borderRadius: '14px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #ffcb05 0%, #ff9900 100%)',
                  color: '#050814',
                  fontSize: '15px',
                  fontWeight: 800,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.75 : 1
                }}
              >
                {loading
                  ? (copy === 'en' ? 'Unlocking access...' : 'Sto sbloccando l’accesso...')
                  : (copy === 'en' ? 'Unlock access' : 'Sblocca accesso')}
              </button>
            </form>

            {message && (
              <div style={{
                marginTop: '16px',
                padding: '14px 16px',
                borderRadius: '14px',
                background: message.type === 'success' ? 'rgba(52, 199, 89, 0.12)' : 'rgba(255, 59, 48, 0.12)',
                border: message.type === 'success' ? '1px solid rgba(52, 199, 89, 0.3)' : '1px solid rgba(255, 59, 48, 0.3)',
                color: message.type === 'success' ? '#8BFFB0' : '#FF9D9D',
                fontSize: '14px',
                lineHeight: 1.5
              }}>
                {message.text}
              </div>
            )}

            <p style={{ margin: '16px 0 0', color: 'rgba(255,255,255,0.56)', fontSize: '13px', lineHeight: 1.55 }}>
              {copy === 'en'
                ? 'These early access codes are reserved for selected commercial partners and dedicated collaborations.'
                : 'Questi codici di accesso anticipato sono riservati a partner commerciali selezionati e collaborazioni dedicate.'}
            </p>
          </div>

          <div style={{
            overflow: 'hidden',
            borderRadius: '24px',
            border: '1px solid rgba(0, 212, 255, 0.16)',
            background: 'rgba(5, 8, 20, 0.9)'
          }}>
            <div style={{ position: 'relative', aspectRatio: '1 / 1' }}>
              <Image
                src="/coach.jpg"
                alt={copy === 'en' ? 'Platform vision' : 'Visione della piattaforma'}
                fill
                style={{ objectFit: 'cover' }}
              />
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, rgba(5,8,20,0.08) 0%, rgba(5,8,20,0.82) 100%)'
              }} />
              <div style={{
                position: 'absolute',
                left: '20px',
                right: '20px',
                bottom: '20px',
                padding: '18px',
                borderRadius: '18px',
                background: 'rgba(5, 8, 20, 0.78)',
                border: '1px solid rgba(0, 212, 255, 0.16)',
                backdropFilter: 'blur(10px)'
              }}>
                <div style={{ color: '#FFFFFF', fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>
                  {copy === 'en' ? 'What will you find inside?' : 'Cosa troverai all’interno?'}
                </div>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.72)', lineHeight: 1.6, fontSize: '14px' }}>
                  {copy === 'en'
                    ? 'A platform designed to bring together match reading, squad structure, tactical context and AI support in one serious working environment.'
                    : 'Una piattaforma pensata per unire lettura delle partite, struttura della rosa, contesto tattico e supporto AI in un unico ambiente di lavoro serio.'}
                </p>
              </div>
            </div>
          </div>

          <div style={{
            padding: '24px',
            borderRadius: '24px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '22px', fontWeight: 800, color: '#FFFFFF' }}>
              {copy === 'en' ? 'No code yet?' : 'Non hai ancora un codice?'}
            </h3>
            <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.7, color: 'rgba(255,255,255,0.72)' }}>
              {copy === 'en'
                ? 'Your registration is already valid. Public access will be enabled when the platform officially opens, while reserved codes remain dedicated to selected early commercial access.'
                : 'La tua registrazione è già valida. L’accesso pubblico verrà abilitato all’apertura ufficiale della piattaforma, mentre i codici riservati restano dedicati agli accessi commerciali anticipati selezionati.'}
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
