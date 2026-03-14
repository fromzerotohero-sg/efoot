'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import { Trophy, Zap, ChevronDown, ChevronUp, Target } from 'lucide-react'
import { safeJsonResponse } from '@/lib/fetchHelper'
import { getCurrentMonth } from '@/lib/leaderboardHelper'

export default function ClassificaPage() {
  const { t, lang } = useTranslation()
  const router = useRouter()
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [data, setData] = React.useState({ month: '', rankings: [], currentUser: null, daysLeftInMonth: null })
  const [showBreakdown, setShowBreakdown] = React.useState(false)

  // Leaderboard sempre aggiornata: fetch con URL univoco (no cache), refetch su visibility e su evento dopo save profilo
  const fetchLeaderboard = React.useCallback(async (signal) => {
    setLoading(true)
    setError(null)
    try {
      let token = localStorage.getItem('auth_token')
      
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }

      const headers = { 'Content-Type': 'application/json' }
      if (token) headers.Authorization = `Bearer ${token}`

      const params = new URLSearchParams({
        month: getCurrentMonth(),
        _: String(Date.now()),
        t: String(Date.now())
      })
      const res = await fetch('/api/leaderboard?' + params, {
        headers: {
          ...headers,
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache'
        },
        cache: 'no-store',
        ...(signal && { signal })
      })
      const payload = await safeJsonResponse(res, t('errorLoadingLeaderboard'))
      if (payload?.error) {
        setError(payload.error)
        return
      }
      if (signal?.aborted) return
      setData({
        month: payload.month || '',
        rankings: payload.rankings || [],
        currentUser: payload.currentUser || null,
        daysLeftInMonth: payload.daysLeftInMonth ?? null
      })
    } catch (e) {
      if (e?.name === 'AbortError') return
      console.error('[Classifica]', e)
      setError(t('errorLoadingLeaderboard'))
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [t])

  React.useEffect(() => {
    const ac = new AbortController()
    fetchLeaderboard(ac.signal)
    return () => ac.abort()
  }, [fetchLeaderboard])

  React.useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchLeaderboard()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [fetchLeaderboard])

  // Refetch quando il profilo (es. nickname) viene salvato da un'altra pagina/stesso tab
  React.useEffect(() => {
    const onLeaderboardUpdated = () => fetchLeaderboard()
    window.addEventListener('leaderboard-updated', onLeaderboardUpdated)
    return () => window.removeEventListener('leaderboard-updated', onLeaderboardUpdated)
  }, [fetchLeaderboard])

  function formatMonth(ym) {
    if (!ym) return ''
    const [y, m] = ym.split('-')
    const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1)
    return d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'it-IT', { month: 'long', year: 'numeric' })
  }

  const currentUser = data.currentUser
  const rankingsRaw = data.rankings || []
  // Se l'API restituisce la tua posizione ma la lista è vuota (es. snapshot non sincronizzato), mostra almeno te
  const rankings = rankingsRaw.length > 0
    ? rankingsRaw
    : currentUser
      ? [{ rank: currentUser.rank, nickname: t('you'), points: currentUser.points }]
      : []

  return (
    <main data-tour-id="tour-classifica-intro" className="p-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold neon-text mb-8">
          <Trophy size={24} color="var(--primary-orange)" />
          {t('classificaMensile')}
        </h1>
        <p className="text-sm text-[rgba(0, 212, 255, 0.7)]">
          {t('fromZeroToHero')}
        </p>
      </div>

      {error && (
        <div role="alert" style={{
          marginBottom: '16px',
          padding: '12px 16px',
          background: 'rgba(255, 59, 48, 0.1)',
          border: '1px solid rgba(255, 59, 48, 0.3)',
          borderRadius: '8px',
          color: '#FF3B30',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <span>{error}</span>
          <button type="button" onClick={() => { setError(null); fetchLeaderboard(null) }} className="neon-button" style={{ padding: '6px 12px', fontSize: '14px' }}>
            {t('retry')}
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 24px', color: 'var(--primary-cyan)' }}>
          <div style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }} aria-hidden="true">
            <Trophy size={40} />
          </div>
          <p style={{ marginTop: '16px', fontSize: '16px', color: 'rgba(0, 212, 255, 0.7)' }}>{t('creditsLoading')}</p>
        </div>
      ) : (
        <>
          {/* Countdown + Hero */}
          <div className="neon-card" style={{
            background: 'rgba(5, 8, 20, 0.8)',
            borderColor: 'rgba(0, 212, 255, 0.3)',
            marginBottom: '24px',
            padding: '24px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '13px', color: 'rgba(0, 212, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              {t('fromZeroToHero')} · {formatMonth(data.month)}
            </div>
            {data.daysLeftInMonth != null && (
              <div style={{ fontSize: '36px', fontWeight: 700, color: '#FFFFFF', marginBottom: '8px' }}>
                {data.daysLeftInMonth} {t('giorniAllaFineMese')}
              </div>
            )}
            <p style={{ margin: 0, fontSize: '15px', color: 'rgba(0, 212, 255, 0.7)' }}>
              {t('comeSalireHint')}
            </p>
          </div>

          {/* La tua posizione */}
          {currentUser && (
            <div data-tour-id="tour-classifica-your-position" className="neon-card" style={{
              background: 'rgba(0, 217, 255, 0.08)',
              borderColor: 'var(--border-cyan)',
              marginBottom: '24px',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: 'var(--primary-cyan)',
                  color: '#000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: 700
                }}>
                  {currentUser.rank}
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: 'rgba(0, 212, 255, 0.5)', textTransform: 'uppercase' }}>{t('laTuaPosizione')}</div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: '#FFFFFF' }}>
                    {currentUser.points} {t('puntiCoach')}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBreakdown(!showBreakdown)}
                className="neon-button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  fontSize: '14px'
                }}
              >
                {t('breakdownPunti')}
                {showBreakdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
          )}

          {currentUser && showBreakdown && currentUser.pointsBreakdown && (
            <div className="neon-card" style={{ marginBottom: '24px', padding: '16px', className: 'neon-panel', borderColor: 'rgba(0, 212, 255, 0.15)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
                {[
                  { key: 'matches', label: t('daPartite') },
                  { key: 'usage_ia', label: t('daUtilizzoIA') },
                  { key: 'profile', label: t('daProfilo') }
                ].map(({ key, label }) => (
                  <div key={key} style={{ textAlign: 'center', padding: '10px', background: 'rgba(5, 8, 20, 0.8)', borderRadius: '6px' }}>
                    <div style={{ fontSize: '12px', color: 'rgba(0, 212, 255, 0.5)' }}>{label}</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary-cyan)' }}>
                      {Number(currentUser.pointsBreakdown[key]) || 0}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabella classifica */}
          <section data-tour-id="tour-classifica-rankings" className="neon-card" style={{ padding: '0', marginBottom: '24px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0, 212, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={20} color="var(--primary-orange)" />
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#FFFFFF' }}>{t('classifica')}</h2>
              </div>
              {rankings.length > 0 && (
                <span style={{ fontSize: '13px', color: 'rgba(0, 212, 255, 0.5)' }}>
                  {rankings.length} {rankings.length === 1 ? t('leaderboardParticipant') : t('leaderboardParticipants')}
                </span>
              )}
            </div>
            {rankings.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: 'rgba(0, 212, 255, 0.7)', fontSize: '15px' }}>
                {t('nonInClassifica')}
                <p style={{ marginTop: '12px', fontSize: '14px', color: 'rgba(0, 212, 255, 0.5)' }}>{t('entraInClassifica')}</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '280px' }}>
                  <thead>
                    <tr style={{ className: 'neon-panel' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: 'rgba(0, 212, 255, 0.5)', textTransform: 'uppercase', fontWeight: 600 }} scope="col">{t('posizione')}</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: 'rgba(0, 212, 255, 0.5)', textTransform: 'uppercase', fontWeight: 600 }}>{t('nickname')}</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', color: 'rgba(0, 212, 255, 0.5)', textTransform: 'uppercase', fontWeight: 600 }}>{t('punti')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.map((row, idx) => {
                      const isYou = currentUser && row.rank === currentUser.rank && row.points === currentUser.points
                      return (
                        <tr
                          key={`${row.rank}-${(row.nickname || '').slice(0, 20)}-${row.points}`}
                          style={{
                            borderBottom: '1px solid rgba(0, 212, 255, 0.15)',
                            background: isYou ? 'rgba(0, 217, 255, 0.08)' : (idx % 2 === 1 ? 'rgba(0, 212, 255, 0.05)' : 'transparent')
                          }}
                        >
                          <td style={{ padding: '12px 16px', fontWeight: 700, color: isYou ? 'var(--primary-cyan)' : '#FFFFFF', fontSize: '16px' }}>
                            {row.rank <= 3 && <span style={{ marginRight: '6px' }}>{['🥇', '🥈', '🥉'][row.rank - 1]}</span>}
                            {row.rank}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#FFFFFF', fontWeight: isYou ? 600 : 400 }}>{row.nickname || '—'}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--primary-orange)' }}>{row.points}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* CTA Come salire */}
          <Link
            href="/"
            className="neon-card"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '20px',
              textDecoration: 'none',
              background: 'rgba(52, 199, 89, 0.08)',
              borderColor: 'rgba(52, 199, 89, 0.3)',
              color: '#FFFFFF'
            }}
          >
            <Zap size={24} color="#34C759" />
            <div>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>{t('comeSalire')}</div>
              <div style={{ fontSize: '14px', color: 'rgba(0, 212, 255, 0.7)' }}>{t('comeSalireHint')}</div>
            </div>
          </Link>
        </>
      )}
    </main>
  )
}
