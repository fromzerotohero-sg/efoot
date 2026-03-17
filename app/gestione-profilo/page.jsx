'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'
import LanguageSwitch from '@/components/LanguageSwitch'
import { ArrowLeft, RefreshCw, Wallet, BarChart3, Award, Calendar, Zap, Camera, User, Trophy, Gift, CheckCircle2, AlertCircle } from 'lucide-react'
import { safeJsonResponse } from '@/lib/fetchHelper'
import Link from 'next/link'
import { resolveAuthToken, buildAuthHeaders } from '@/lib/profileUxHelpers'

export default function GestioneProfiloPage() {
  const { t, lang } = useTranslation()
  const router = useRouter()
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [usage, setUsage] = React.useState(null)
  const [transactions, setTransactions] = React.useState([])
  const [totalAnalyses, setTotalAnalyses] = React.useState(0)
  const [leaderboardMe, setLeaderboardMe] = React.useState({ currentUser: null, history: [] })
  const [prizes, setPrizes] = React.useState([])

  const fetchData = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await resolveAuthToken()
      if (!token) {
        router.push('/login')
        return
      }

      const headers = buildAuthHeaders(token, { json: true })
      const getHeaders = buildAuthHeaders(token)

      const [usageRes, txRes, leaderboardRes, leaderboardMeRes, prizesRes] = await Promise.all([
        fetch('/api/credits/usage', {
          method: 'POST',
          headers,
          body: JSON.stringify({}),
          cache: 'no-store'
        }),
        fetch('/api/credits/transactions', { headers: getHeaders, cache: 'no-store' }),
        fetch('/api/leaderboard', { headers: getHeaders, cache: 'no-store' }),
        fetch('/api/leaderboard/me', { headers: getHeaders, cache: 'no-store' }),
        fetch('/api/user/prizes', { headers: getHeaders, cache: 'no-store' }) // Assuming an endpoint exists or we use supabase direct if permitted
      ])

      const usagePayload = await safeJsonResponse(usageRes, t('errorLoadingUsage'))
      const txPayload = await txRes.json().catch(() => ({}))
      const leaderboardPayload = await leaderboardRes.json().catch(() => ({}))
      const leaderboardMePayload = await leaderboardMeRes.json().catch(() => ({}))
      
      // Prizes might need direct supabase call if no API, but let's try to stick to API if possible or use supabase client as fallback
      // For now, let's assume we can fetch prizes via a new endpoint or just skip if not critical, 
      // BUT the legacy code used direct supabase. Let's try to use the token to fetch prizes if we can, 
      // or if we must use supabase, we need to ensure the session is valid.
      // Since we are "aligning with new code", we should prefer API.
      // However, to be safe and quick, let's use the pattern from the legacy code but with the token if possible?
      // Actually, direct supabase client usage in 'use client' components relies on the browser session.
      // If Metalgate is used, there might NOT be a Supabase session in the browser.
      // So we MUST use an API route for prizes if we want to support Metalgate fully.
      // I'll assume /api/user/prizes exists or I should create it? 
      // The legacy code used: await supabase.from('user_prizes').select(...)
      // I will stick to the legacy logic for prizes for now, but wrap it in a try/catch block that handles the missing session gracefully.
      
      if (usagePayload && !usagePayload.error) setUsage(usagePayload)
      if (txPayload.transactions) setTransactions(Array.isArray(txPayload.transactions) ? txPayload.transactions : [])
      if (Number.isFinite(txPayload.total_analyses)) setTotalAnalyses(txPayload.total_analyses)
      if (leaderboardPayload.currentUser) setLeaderboardMe(prev => ({ ...prev, currentUser: leaderboardPayload.currentUser }))
      if (leaderboardMePayload.history) setLeaderboardMe(prev => ({ ...prev, history: leaderboardMePayload.history || [] }))
      
      // For prizes, we can't easily do direct Supabase calls with a custom Metalgate token.
      // We would need a backend proxy.
      // For now, I'll leave prizes empty or try to fetch from a hypothetical endpoint.
      // If the user really needs prizes, we'd need to create /api/user/prizes.
      // Let's check if it exists. (I saw api/user/prizes in the ls output! It exists!)
      // So I can fetch it.
      const prizesPayload = await prizesRes.json().catch(() => [])
      if (Array.isArray(prizesPayload)) setPrizes(prizesPayload)

    } catch (e) {
      console.error('[GestioneProfilo]', e)
      setError(t('errorLoadingUsage'))
    } finally {
      setLoading(false)
    }
  }, [router, t])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const onLeaderboardUpdated = async () => {
      const token = await resolveAuthToken()
      if (!token) return
      try {
        const headers = buildAuthHeaders(token)
        const [lbRes, meRes] = await Promise.all([
          fetch('/api/leaderboard', { headers, cache: 'no-store' }),
          fetch('/api/leaderboard/me', { headers, cache: 'no-store' })
        ])
        const lb = await lbRes.json().catch(() => ({}))
        const me = await meRes.json().catch(() => ({}))
        if (lb.currentUser) setLeaderboardMe(prev => ({ ...prev, currentUser: lb.currentUser }))
        if (me.history) setLeaderboardMe(prev => ({ ...prev, history: me.history || [] }))
      } catch (_) {}
    }
    window.addEventListener('leaderboard-updated', onLeaderboardUpdated)
    return () => window.removeEventListener('leaderboard-updated', onLeaderboardUpdated)
  }, [])

  const balance = usage?.balance_remaining ?? (usage ? Math.max(0, (usage.credits_included || 0) - (usage.credits_used || 0)) : 0)
  const rankLabel = balance >= 150 ? t('rankPlatinum') : balance >= 80 ? t('rankGold') : balance >= 30 ? t('rankSilver') : t('rankBronze')

  const formatDate = (iso) => {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const transactionTypeKeys = {
    'assistant-chat': 'transactionTypeAssistantChat',
    'extract-player': 'transactionTypeExtractPlayer',
    'extract-coach': 'transactionTypeExtractCoach',
    'extract-match-data': 'transactionTypeExtractMatchData',
    'generate-countermeasures': 'transactionTypeGenerateCountermeasures',
    'extract-formation': 'transactionTypeExtractFormation',
    'analyze-match': 'transactionTypeAnalyzeMatch'
  }
  const getTransactionLabel = (tx) => {
    if (tx.type === 'purchase') return t('acquistoCrediti')
    const key = tx.description && transactionTypeKeys[tx.description]
    if (key) return t(key)
    if (tx.description) return tx.description
    return t('transactionUsage')
  }

  return (
    <main data-tour-id="tour-gestione-profilo-intro" style={{
      padding: 'clamp(12px, 4vw, 24px)',
      minHeight: '100vh',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        paddingBottom: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => router.back()}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center'
            }}
            aria-label={t('back')}
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="neon-text" style={{ margin: 0, fontSize: 'clamp(20px, 4vw, 24px)', fontWeight: 700 }}>
            {t('gestioneProfilo')}
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link
            href="/impostazioni-profilo"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              backgroundColor: 'rgba(0, 212, 255, 0.15)',
              border: '1px solid rgba(0, 212, 255, 0.4)',
              borderRadius: '8px',
              color: '#00d4ff',
              fontSize: '13px',
              fontWeight: '500',
              textDecoration: 'none'
            }}
          >
            <User size={16} />
            {t('editProfileData')}
          </Link>
          <LanguageSwitch />
        </div>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            marginBottom: '16px',
            padding: '12px 16px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '8px',
            color: '#fca5a5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => { setError(null); fetchData() }}
            className="btn"
            style={{ padding: '6px 12px', fontSize: '14px' }}
          >
            {t('retry')}
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 'clamp(32px, 8vw, 48px)', color: 'var(--neon-blue)' }}>
          <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '16px' }}>{t('creditsLoading')}</p>
        </div>
      ) : (
        <>
          {/* Box Crediti residui + Acquista */}
          <div data-tour-id="tour-gestione-profilo-balance" className="card" style={{
            background: 'linear-gradient(135deg, rgba(255,140,0,0.12), rgba(200,100,0,0.06))',
            borderColor: 'rgba(255,165,0,0.4)',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', marginBottom: '4px' }}>{t('creditiResidui').toUpperCase()}</div>
              <div style={{ fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 700, color: '#fff' }}>{balance} {t('heroPoints')}</div>
            </div>
            <button
              onClick={() => window.open('https://home.fromzerotohero.io/dashboard?usage', '_blank')}
              className="btn"
              style={{
                background: 'var(--neon-orange)',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                padding: '12px clamp(16px, 4vw, 24px)',
                fontWeight: 700,
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              {t('acquista')}
            </button>
          </div>

          {/* 4 card: Hero Points, Analisi totali, Rank, Membro dal */}
          <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))',
              gap: '16px'
            }}>
              <div style={{ textAlign: 'center', padding: '12px 8px' }}>
                <Zap size={28} color="var(--neon-blue)" style={{ marginBottom: '8px' }} />
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>{t('heroPoints')}</div>
                <div style={{ fontSize: 'clamp(20px, 4vw, 24px)', fontWeight: 700, color: '#fff' }}>{balance}</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px 8px' }}>
                <BarChart3 size={28} color="var(--neon-blue)" style={{ marginBottom: '8px' }} />
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>{t('analisiTotali')}</div>
                <div style={{ fontSize: 'clamp(20px, 4vw, 24px)', fontWeight: 700, color: '#fff' }}>{totalAnalyses}</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px 8px' }}>
                <Award size={28} color="var(--neon-blue)" style={{ marginBottom: '8px' }} />
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>{t('rankAttuale')}</div>
                <div style={{ fontSize: 'clamp(16px, 3vw, 20px)', fontWeight: 700, color: '#fff' }}>{rankLabel}</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px 8px' }}>
                <Calendar size={28} color="var(--neon-blue)" style={{ marginBottom: '8px' }} />
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>{t('membroDal')}</div>
                <div style={{ fontSize: 'clamp(14px, 2.5vw, 16px)', fontWeight: 600, color: '#fff' }}>—</div>
              </div>
            </div>
          </div>

          {/* Classifica mensile + Risultati + Premi */}
          <section data-tour-id="tour-gestione-profilo-leaderboard" className="card" style={{ padding: '24px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy size={20} color="var(--neon-orange)" />
              {t('classificaMensile')}
            </h2>
            {leaderboardMe.currentUser ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>{t('laTuaPosizione')}</div>
                  <div style={{ fontSize: 'clamp(20px, 4vw, 24px)', fontWeight: 700, color: '#fff' }}>
                    {leaderboardMe.currentUser.rank}° · {leaderboardMe.currentUser.points} {t('puntiCoach')}
                  </div>
                </div>
                <Link
                  href="/classifica"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 16px',
                    backgroundColor: 'rgba(255,165,0,0.2)',
                    border: '1px solid rgba(255,165,0,0.4)',
                    borderRadius: '8px',
                    color: 'var(--neon-orange)',
                    fontSize: '14px',
                    fontWeight: '600',
                    textDecoration: 'none'
                  }}
                >
                  {t('vediClassifica')}
                </Link>
              </div>
            ) : (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', marginBottom: '8px' }}>{t('entraInClassifica')}</p>
                <Link href="/classifica" style={{ color: 'var(--neon-blue)', fontSize: '14px', fontWeight: 600 }}>{t('vediClassifica')}</Link>
              </div>
            )}
            {leaderboardMe.history?.length > 0 && (
              <>
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'rgba(255,255,255,0.9)' }}>{t('risultatiOttenuti')}</div>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {leaderboardMe.history.slice(0, 6).map((h) => {
                  const [y, m] = (h.month || '').split('-')
                  const monthLabel = y && m ? new Date(parseInt(y, 10), parseInt(m, 10) - 1).toLocaleDateString(lang === 'en' ? 'en-GB' : 'it-IT', { month: 'short', year: 'numeric' }) : h.month
                  return (
                    <li key={h.month} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ color: 'rgba(255,255,255,0.9)' }}>{monthLabel}</span>
                      <span style={{ fontWeight: 600, color: 'var(--neon-orange)' }}>{h.rank}° · {h.points} pt</span>
                    </li>
                  )
                  })}
                </ul>
              </>
            )}
          </section>

          {prizes.length > 0 && (
            <section className="card" style={{ padding: '24px', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Gift size={20} color="#22c55e" />
                {t('iMieiPremi')}
              </h2>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {prizes.map((p) => (
                  <li key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div>
                      <span style={{ fontWeight: 600, color: '#fff' }}>{p.month}</span>
                      <span style={{ marginLeft: '8px', color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
                        {p.prize_type === 'coach_free' && t('prizeCoachFree')}
                        {p.prize_type === 'credits' && t('prizeCredits')}
                        {p.prize_type === 'match_ticket' && t('prizeMatchTicket')}
                        {p.prize_type === 'stampa_3d' && t('prizeStampa3d')}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {p.status === 'redeemed' ? (
                        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>{t('riscattato')}</span>
                      ) : (
                        <button type="button" className="btn" style={{ padding: '6px 12px', fontSize: '13px' }}>{t('riscatta')}</button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Attività recente */}
          <section data-tour-id="tour-gestione-profilo-transactions" className="card" style={{ padding: '24px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={20} color="var(--neon-blue)" />
              {t('attivitaRecente')}
            </h2>
            <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
              {transactions.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>{t('noTransactionsYet')}</div>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {transactions.slice(0, 10).map((tx) => (
                    <li
                      key={tx.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        padding: 'clamp(12px, 3vw, 14px) clamp(16px, 4vw, 20px)',
                        borderBottom: '1px solid rgba(255,255,255,0.06)'
                      }}
                    >
                      <div style={{ minWidth: 0, flex: '1' }}>
                        <div style={{ color: 'rgba(255,255,255,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getTransactionLabel(tx)}</div>
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>{formatDate(tx.created_at)}</div>
                      </div>
                      <span style={{ color: tx.amount > 0 ? '#22c55e' : '#ef4444', fontWeight: 600, flexShrink: 0 }}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount} HP
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {transactions.length > 0 && (
                <div style={{ padding: '12px clamp(16px, 4vw, 20px)', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => {}}
                    style={{ background: 'none', border: 'none', color: 'var(--neon-blue)', cursor: 'pointer', fontSize: '14px' }}
                  >
                    {t('vediTutteTransazioni')}
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* 2 CTA cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
            gap: '16px'
          }}>
            <button
              type="button"
              onClick={() => {}}
              className="card"
              style={{
                background: 'rgba(34,197,94,0.08)',
                borderColor: 'rgba(34,197,94,0.4)',
                padding: 'clamp(16px, 4vw, 24px)',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px',
                transition: 'all 0.3s ease'
              }}
            >
              <Wallet size={28} color="#22c55e" style={{ flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, marginBottom: '4px', color: '#fff' }}>{t('acquistaCreditiCard')}</div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>{t('acquistaCreditiSubtitle')}</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => {}}
              className="card"
              style={{
                background: 'rgba(0,212,255,0.06)',
                borderColor: 'rgba(0,212,255,0.3)',
                padding: 'clamp(16px, 4vw, 24px)',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px',
                transition: 'all 0.3s ease'
              }}
            >
              <Camera size={28} color="var(--neon-blue)" style={{ flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, marginBottom: '4px', color: '#fff' }}>{t('personalizzaAvatar')}</div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>{t('personalizzaAvatarSubtitle')}</div>
              </div>
            </button>
          </div>
        </>
      )}
    </main>
  )
}
