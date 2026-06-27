'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'
import { supabase } from '@/lib/supabaseClient'
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Target,
  Trash2,
  Trophy,
  X
} from 'lucide-react'
import ConfirmModal from '@/components/ConfirmModal'

function getResultTone(result) {
  const value = typeof result === 'string' ? result.trim() : ''
  const numeric = value.match(/^(\d+)-(\d+)$/)

  if (numeric) {
    const scored = parseInt(numeric[1], 10)
    const conceded = parseInt(numeric[2], 10)
    if (scored > conceded) return { label: 'win', color: '#86efac', bg: 'rgba(34,197,94,0.16)', border: 'rgba(34,197,94,0.36)' }
    if (scored < conceded) return { label: 'loss', color: '#fca5a5', bg: 'rgba(239,68,68,0.16)', border: 'rgba(239,68,68,0.36)' }
  }

  const upper = value.toUpperCase()
  if (upper.includes('VITTORIA') || upper.includes('WIN')) {
    return { label: 'win', color: '#86efac', bg: 'rgba(34,197,94,0.16)', border: 'rgba(34,197,94,0.36)' }
  }
  if (upper.includes('SCONFITTA') || upper.includes('LOSS')) {
    return { label: 'loss', color: '#fca5a5', bg: 'rgba(239,68,68,0.16)', border: 'rgba(239,68,68,0.36)' }
  }

  return { label: 'draw', color: '#facc15', bg: 'rgba(250,204,21,0.14)', border: 'rgba(250,204,21,0.34)' }
}

const MATCH_LIST_PAGE_SIZE = 10

export default function MatchHistoryPage() {
  const { t, lang } = useTranslation()
  const router = useRouter()
  const isItalian = lang !== 'en'

  const copy = {
    title: t('matchHistory') || (isItalian ? 'Cronologia Partite' : 'Match History'),
    subtitle: isItalian
      ? 'Rivedi le partite salvate, completa quelle mancanti e tieni ordinata la memoria del Coach.'
      : 'Review saved matches, complete missing data and keep the Coach memory organized.',
    addMatch: t('addMatch') || (isItalian ? 'Aggiungi Partita' : 'Add Match'),
    savedMatches: isItalian ? 'partite salvate' : 'saved matches',
    complete: isItalian ? 'Complete' : 'Complete',
    partial: isItalian ? 'Da completare' : 'To complete',
    completeLong: isItalian ? 'Analisi completa' : 'Complete analysis',
    partialLong: isItalian ? 'Mancano ancora dati' : 'Still missing data',
    opponent: t('opponent') || (isItalian ? 'Avversario' : 'Opponent'),
    unknownOpponent: t('unknownOpponent') || (isItalian ? 'Avversario sconosciuto' : 'Unknown opponent'),
    opponentPlaceholder: isItalian ? 'Scrivi nome avversario' : 'Write opponent name',
    editOpponent: isItalian ? 'Modifica nome' : 'Edit name',
    saveName: isItalian ? 'Salva nome' : 'Save name',
    cancel: t('cancel') || (isItalian ? 'Annulla' : 'Cancel'),
    details: isItalian ? 'Apri analisi' : 'Open analysis',
    result: t('result') || (isItalian ? 'Risultato' : 'Score'),
    quality: isItalian ? 'Qualita lettura' : 'Read quality',
    emptyTitle: isItalian ? 'Nessuna partita ancora salvata' : 'No saved matches yet',
    emptyBody: isItalian
      ? 'Carica la prima partita: il Coach usera questi dati per pattern, dashboard e consigli.'
      : 'Upload the first match: the Coach will use it for patterns, dashboard and advice.',
    loadError: isItalian ? 'Non riesco a caricare la cronologia partite.' : 'Could not load match history.',
    saveOpponentError: isItalian ? 'Non riesco a salvare il nome avversario.' : 'Could not save opponent name.',
    deleteTitle: t('confirm') || (isItalian ? 'Conferma' : 'Confirm'),
    deleteMessage: t('confirmDeleteMatch') || (isItalian ? 'Vuoi eliminare questa partita?' : 'Delete this match?'),
    deleteMatch: t('deleteMatch') || (isItalian ? 'Elimina partita' : 'Delete match'),
    showMoreMatches: (count) => (
      t('showMoreMatches', { count }) || (isItalian ? `Mostra altre ${count} partite...` : `Show ${count} more matches...`)
    ),
    showingMatches: (shown, total) => (
      isItalian ? `${shown} di ${total} partite visibili` : `${shown} of ${total} matches shown`
    )
  }

  const [matches, setMatches] = useState([])
  const [matchSummary, setMatchSummary] = useState(null)
  const [hasMoreMatches, setHasMoreMatches] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [editingOpponentId, setEditingOpponentId] = useState(null)
  const [editingOpponentName, setEditingOpponentName] = useState('')
  const [savingOpponentName, setSavingOpponentName] = useState(false)
  const [confirmModal, setConfirmModal] = useState(null)
  const [deletingMatchId, setDeletingMatchId] = useState(null)

  const summary = useMemo(() => {
    if (matchSummary) return matchSummary

    const complete = matches.filter((match) => match.data_completeness === 'complete').length
    return {
      total: matches.length,
      complete,
      partial: Math.max(matches.length - complete, 0)
    }
  }, [matches, matchSummary])

  const remainingMatches = Math.max((summary.total || 0) - matches.length, 0)
  const nextBatchSize = Math.min(MATCH_LIST_PAGE_SIZE, remainingMatches)

  const fetchMatchPage = async ({ offset = 0, append = false } = {}) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }
    setError(null)

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

      const res = await fetch(
        `/api/matches?limit=${MATCH_LIST_PAGE_SIZE}&offset=${offset}&t=${Date.now()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store'
        }
      )

      if (!res.ok) throw new Error('Failed to fetch match history')

      const data = await res.json()
      const nextMatches = Array.isArray(data) ? data : (data.matches || [])

      setMatches((prev) => (append ? [...prev, ...nextMatches] : nextMatches))
      setMatchSummary(Array.isArray(data) ? null : (data.summary ?? null))
      setHasMoreMatches(Array.isArray(data) ? false : Boolean(data.pagination?.hasMore))
    } catch (err) {
      console.error('Error fetching matches:', err)
      setError(copy.loadError)
    } finally {
      if (append) {
        setLoadingMore(false)
      } else {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    fetchMatchPage({ offset: 0, append: false })
  }, [router, copy.loadError])

  const handleLoadMoreMatches = () => {
    if (loadingMore || !hasMoreMatches) return
    fetchMatchPage({ offset: matches.length, append: true })
  }

  useEffect(() => {
    if (!matchSummary) return
    setHasMoreMatches(matches.length < matchSummary.total)
  }, [matches.length, matchSummary])

  const startEditingOpponent = (match, e) => {
    e?.stopPropagation()
    setEditingOpponentId(match.id)
    setEditingOpponentName(match.opponent_name || '')
    setError(null)
  }

  const cancelEditingOpponent = (e) => {
    e?.stopPropagation()
    setEditingOpponentId(null)
    setEditingOpponentName('')
  }

  const handleSaveOpponentName = async (matchId, e) => {
    e?.stopPropagation()

    setSavingOpponentName(true)
    setError(null)

    try {
      let token = localStorage.getItem('auth_token')

      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }

      if (!token) throw new Error('Session expired')

      const nextName = editingOpponentName.trim()
      const res = await fetch('/api/supabase/update-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ match_id: matchId, opponent_name: nextName })
      })

      if (!res.ok) throw new Error(copy.saveOpponentError)

      setMatches((prev) => prev.map((match) => (
        match.id === matchId ? { ...match, opponent_name: nextName || null } : match
      )))
      setEditingOpponentId(null)
      setEditingOpponentName('')
    } catch (err) {
      console.error('Error saving opponent:', err)
      setError(copy.saveOpponentError)
    } finally {
      setSavingOpponentName(false)
    }
  }

  const handleDeleteMatch = async (matchId, e) => {
    e.stopPropagation()

    setConfirmModal({
      show: true,
      title: copy.deleteTitle,
      message: copy.deleteMessage,
      onConfirm: async () => {
        setConfirmModal(null)
        setDeletingMatchId(matchId)

        try {
          let token = localStorage.getItem('auth_token')
          if (!token && supabase) {
            const { data: session } = await supabase.auth.getSession()
            token = session?.session?.access_token
          }

          if (!token) throw new Error(t('sessionExpired'))

          const res = await fetch(`/api/supabase/delete-match?match_id=${matchId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          })

          if (!res.ok) throw new Error('Failed to delete')

          setMatches((prev) => {
            const deletedMatch = prev.find((match) => match.id === matchId)
            const nextMatches = prev.filter((match) => match.id !== matchId)

            setMatchSummary((currentSummary) => {
              if (!currentSummary) return currentSummary

              const wasComplete = deletedMatch?.data_completeness === 'complete'
              return {
                total: Math.max(currentSummary.total - 1, 0),
                complete: Math.max(currentSummary.complete - (wasComplete ? 1 : 0), 0),
                partial: Math.max(currentSummary.partial - (wasComplete ? 0 : 1), 0)
              }
            })

            return nextMatches
          })
        } catch (err) {
          console.error('Delete match error:', err)
        } finally {
          setDeletingMatchId(null)
        }
      },
      onCancel: () => setConfirmModal(null)
    })
  }

  return (
    <main className="match-history-page">
      <section className="history-hero">
        <div className="hero-copy">
          <div className="hero-kicker">
            <Trophy size={18} />
            {copy.title}
          </div>
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>
        </div>

        <div className="hero-actions">
          <div className="hero-stats" aria-label={copy.quality}>
            <div>
              <span>{summary.total}</span>
              <small>{copy.savedMatches}</small>
            </div>
            <div>
              <span>{summary.complete}</span>
              <small>{copy.complete}</small>
            </div>
            <div>
              <span>{summary.partial}</span>
              <small>{copy.partial}</small>
            </div>
          </div>

          <button className="primary-cta" onClick={() => router.push('/match/new')}>
            <Plus size={18} />
            {copy.addMatch}
          </button>
        </div>
      </section>

      {error && (
        <div className="history-error" role="alert">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="history-loading">
          <RefreshCw size={30} className="spin" />
          <span>{t('loading') || 'Loading...'}</span>
        </div>
      ) : matches.length === 0 ? (
        <section className="empty-state">
          <div className="empty-icon"><Target size={42} /></div>
          <h2>{copy.emptyTitle}</h2>
          <p>{copy.emptyBody}</p>
          <button className="primary-cta compact" onClick={() => router.push('/match/new')}>
            <Plus size={18} />
            {copy.addMatch}
          </button>
        </section>
      ) : (
        <section className="match-grid" aria-label={copy.title}>
          {matches.map((match, index) => {
            const matchDate = match.match_date ? new Date(match.match_date) : null
            const dateStr = matchDate
              ? matchDate.toLocaleDateString(isItalian ? 'it-IT' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })
              : t('dateNotAvailable')
            const timeStr = matchDate
              ? matchDate.toLocaleTimeString(isItalian ? 'it-IT' : 'en-US', { hour: '2-digit', minute: '2-digit' })
              : ''
            const displayResult = match.result || 'N/A'
            const displayOpponent = match.opponent_name || copy.unknownOpponent
            const isComplete = match.data_completeness === 'complete'
            const completionCount = Math.max(0, Math.min(5, match.photos_uploaded || 0))
            const completionPercent = (completionCount / 5) * 100
            const resultTone = getResultTone(displayResult)
            const isEditing = editingOpponentId === match.id

            return (
              <article
                key={match.id}
                className="match-card"
                onClick={() => {
                  if (!isEditing) router.push(`/match/${match.id}`)
                }}
              >
                <div className="card-glow" />

                <div className="card-main">
                  <div className="match-rank">
                    <span>{String(index + 1).padStart(2, '0')}</span>
                  </div>

                  <div className="match-content">
                    <div className="match-topline">
                      <div className="date-pill">
                        <Calendar size={15} />
                        <span>{dateStr}</span>
                        {timeStr && (
                          <>
                            <Clock size={14} />
                            <span>{timeStr}</span>
                          </>
                        )}
                      </div>

                      <div className={`completion-pill ${isComplete ? 'complete' : 'partial'}`}>
                        {isComplete ? <CheckCircle2 size={15} /> : <BarChart3 size={15} />}
                        {isComplete ? copy.completeLong : `${completionCount}/5`}
                      </div>
                    </div>

                    <div className="match-body">
                      <div className="opponent-area" onClick={(e) => e.stopPropagation()}>
                        <div className="field-label">{copy.opponent}</div>
                        {isEditing ? (
                          <div className="opponent-editor">
                            <input
                              type="text"
                              value={editingOpponentName}
                              onChange={(e) => setEditingOpponentName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveOpponentName(match.id, e)
                                if (e.key === 'Escape') cancelEditingOpponent(e)
                              }}
                              placeholder={copy.opponentPlaceholder}
                              maxLength={255}
                              autoFocus
                              disabled={savingOpponentName}
                            />
                            <button
                              className="icon-action save"
                              onClick={(e) => handleSaveOpponentName(match.id, e)}
                              disabled={savingOpponentName}
                              title={copy.saveName}
                            >
                              {savingOpponentName ? <RefreshCw size={16} className="spin" /> : <Save size={16} />}
                            </button>
                            <button
                              className="icon-action"
                              onClick={cancelEditingOpponent}
                              disabled={savingOpponentName}
                              title={copy.cancel}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <button className="opponent-display" onClick={(e) => startEditingOpponent(match, e)}>
                            <span>{displayOpponent}</span>
                            <Pencil size={15} />
                          </button>
                        )}
                      </div>

                      <div className="score-area">
                        <div className="field-label">{copy.result}</div>
                        <div
                          className="score-pill"
                          style={{
                            color: resultTone.color,
                            background: resultTone.bg,
                            borderColor: resultTone.border
                          }}
                        >
                          {displayResult}
                        </div>
                      </div>

                      <div className="quality-area">
                        <div className="field-label">{copy.quality}</div>
                        <div className="progress-row">
                          <div className="progress-track">
                            <span style={{ width: `${completionPercent}%` }} />
                          </div>
                          <strong>{completionCount}/5</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="details-button" onClick={() => router.push(`/match/${match.id}`)} title={copy.details}>
                    <span>{copy.details}</span>
                    <ArrowRight size={17} />
                  </button>
                  <button
                    className="delete-button"
                    onClick={(e) => handleDeleteMatch(match.id, e)}
                    disabled={deletingMatchId === match.id}
                    title={copy.deleteMatch}
                  >
                    {deletingMatchId === match.id ? <RefreshCw size={17} className="spin" /> : <Trash2 size={17} />}
                  </button>
                </div>
              </article>
            )
          })}
        </section>
      )}

      {!loading && matches.length > 0 && summary.total > 0 && (
        <div className="match-list-footer">
          <p className="match-list-meta">
            {copy.showingMatches(matches.length, summary.total)}
          </p>

          {hasMoreMatches && (
            <button
              type="button"
              className="load-more-button"
              onClick={handleLoadMoreMatches}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <>
                  <RefreshCw size={18} className="spin" />
                  {t('loading') || (isItalian ? 'Caricamento...' : 'Loading...')}
                </>
              ) : (
                <>
                  <ChevronDown size={18} />
                  {copy.showMoreMatches(nextBatchSize)}
                </>
              )}
            </button>
          )}
        </div>
      )}

      {confirmModal && (
        <ConfirmModal
          show={confirmModal.show}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel={t('delete')}
          cancelLabel={t('cancel')}
          variant="danger"
          onConfirm={confirmModal.onConfirm}
          onCancel={confirmModal.onCancel}
        />
      )}

      <style jsx>{`
        .match-history-page {
          min-height: 100vh;
          max-width: 1180px;
          margin: 0 auto;
          padding: clamp(16px, 3vw, 32px);
        }

        .history-hero,
        .match-card,
        .empty-state,
        .history-error,
        .history-loading {
          border: 1px solid rgba(0, 212, 255, 0.22);
          background:
            radial-gradient(circle at top left, rgba(0, 212, 255, 0.14), transparent 36%),
            linear-gradient(145deg, rgba(5, 12, 25, 0.92), rgba(2, 4, 10, 0.96));
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.36), inset 0 1px 0 rgba(255,255,255,0.06);
          backdrop-filter: blur(16px);
        }

        .history-hero {
          display: grid;
          grid-template-columns: minmax(0, 1.3fr) minmax(280px, 0.7fr);
          gap: 22px;
          align-items: stretch;
          border-radius: 22px;
          padding: clamp(22px, 4vw, 34px);
          margin-bottom: 18px;
          overflow: hidden;
          position: relative;
        }

        .history-hero:before {
          content: '';
          position: absolute;
          inset: -30% -10% auto auto;
          width: 420px;
          height: 420px;
          background: radial-gradient(circle, rgba(255, 203, 5, 0.17), transparent 66%);
          pointer-events: none;
        }

        .hero-copy,
        .hero-actions {
          position: relative;
          z-index: 1;
        }

        .hero-kicker {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(255, 203, 5, 0.1);
          border: 1px solid rgba(255, 203, 5, 0.26);
          color: #fde68a;
          font-size: 13px;
          font-weight: 900;
          margin-bottom: 16px;
        }

        h1 {
          margin: 0;
          color: #fff;
          font-size: clamp(30px, 5vw, 48px);
          line-height: 0.98;
          letter-spacing: -1.2px;
          font-weight: 950;
        }

        .hero-copy p {
          max-width: 680px;
          margin: 14px 0 0;
          color: rgba(255,255,255,0.72);
          font-size: clamp(15px, 2vw, 17px);
          line-height: 1.55;
        }

        .hero-actions {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .hero-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .hero-stats div {
          min-height: 86px;
          border-radius: 16px;
          padding: 14px;
          background: rgba(255,255,255,0.055);
          border: 1px solid rgba(255,255,255,0.1);
        }

        .hero-stats span {
          display: block;
          color: #fff;
          font-size: 26px;
          font-weight: 950;
        }

        .hero-stats small {
          display: block;
          margin-top: 4px;
          color: rgba(255,255,255,0.62);
          font-size: 12px;
          line-height: 1.25;
          font-weight: 800;
        }

        .primary-cta {
          min-height: 54px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          border: 1px solid rgba(255, 203, 5, 0.58);
          border-radius: 15px;
          background: linear-gradient(135deg, #ffcb05, #ff8c00);
          color: #111827;
          font-size: 15px;
          font-weight: 950;
          cursor: pointer;
          box-shadow: 0 14px 34px rgba(255, 149, 0, 0.26), inset 0 1px 0 rgba(255,255,255,0.45);
          transition: transform 180ms ease, box-shadow 180ms ease;
        }

        .primary-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 42px rgba(255, 149, 0, 0.34), inset 0 1px 0 rgba(255,255,255,0.52);
        }

        .primary-cta.compact {
          width: auto;
          padding: 0 22px;
        }

        .match-list-footer {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          margin-top: 18px;
          padding: 8px 0 12px;
        }

        .match-list-meta {
          margin: 0;
          color: rgba(255,255,255,0.58);
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.2px;
        }

        .load-more-button {
          min-height: 50px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 0 22px;
          border-radius: 14px;
          border: 1px solid rgba(0, 212, 255, 0.34);
          background: rgba(0, 212, 255, 0.08);
          color: #7dd3fc;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
          transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
        }

        .load-more-button:hover:not(:disabled) {
          transform: translateY(-1px);
          background: rgba(0, 212, 255, 0.14);
          border-color: rgba(0, 212, 255, 0.48);
        }

        .load-more-button:disabled {
          opacity: 0.72;
          cursor: wait;
        }

        .history-error {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
          border-color: rgba(239, 68, 68, 0.38);
          color: #fca5a5;
          border-radius: 14px;
          padding: 14px 16px;
        }

        .history-loading,
        .empty-state {
          min-height: 260px;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
          text-align: center;
          color: rgba(255,255,255,0.78);
        }

        .empty-state {
          padding: 42px 22px;
        }

        .empty-icon {
          width: 82px;
          height: 82px;
          border-radius: 24px;
          display: grid;
          place-items: center;
          background: rgba(0, 212, 255, 0.11);
          border: 1px solid rgba(0, 212, 255, 0.22);
          color: #7dd3fc;
        }

        .empty-state h2 {
          color: #fff;
          font-size: 24px;
          margin: 4px 0 0;
        }

        .empty-state p {
          max-width: 520px;
          margin: 0;
          color: rgba(255,255,255,0.66);
          line-height: 1.55;
        }

        .match-grid {
          display: grid;
          gap: 14px;
        }

        .match-card {
          position: relative;
          overflow: hidden;
          border-radius: 20px;
          padding: 16px;
          cursor: pointer;
          transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
        }

        .match-card:hover {
          transform: translateY(-2px);
          border-color: rgba(0, 212, 255, 0.5);
          box-shadow: 0 24px 60px rgba(0,0,0,0.42), 0 0 38px rgba(0, 212, 255, 0.1);
        }

        .card-glow {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, rgba(0,212,255,0.11), transparent 46%, rgba(255,203,5,0.08));
          opacity: 0.8;
          pointer-events: none;
        }

        .card-main,
        .card-actions {
          position: relative;
          z-index: 1;
        }

        .card-main {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 14px;
          align-items: stretch;
        }

        .match-rank {
          width: 50px;
          min-height: 100%;
          border-radius: 15px;
          display: grid;
          place-items: center;
          background: rgba(0, 212, 255, 0.09);
          border: 1px solid rgba(0, 212, 255, 0.18);
          color: #7dd3fc;
          font-weight: 950;
        }

        .match-content {
          min-width: 0;
        }

        .match-topline,
        .match-body,
        .card-actions,
        .date-pill,
        .completion-pill,
        .progress-row,
        .opponent-display,
        .opponent-editor,
        .score-pill,
        .details-button,
        .delete-button,
        .icon-action {
          display: flex;
          align-items: center;
        }

        .match-topline {
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }

        .date-pill,
        .completion-pill {
          gap: 7px;
          border-radius: 999px;
          padding: 7px 10px;
          font-size: 12px;
          font-weight: 850;
        }

        .date-pill {
          color: rgba(255,255,255,0.72);
          background: rgba(255,255,255,0.055);
          border: 1px solid rgba(255,255,255,0.1);
        }

        .completion-pill.complete {
          color: #86efac;
          background: rgba(34,197,94,0.13);
          border: 1px solid rgba(34,197,94,0.32);
        }

        .completion-pill.partial {
          color: #facc15;
          background: rgba(250,204,21,0.12);
          border: 1px solid rgba(250,204,21,0.3);
        }

        .match-body {
          justify-content: space-between;
          gap: 14px;
        }

        .opponent-area {
          flex: 1.4;
          min-width: 230px;
        }

        .score-area {
          min-width: 110px;
        }

        .quality-area {
          flex: 0.9;
          min-width: 190px;
        }

        .field-label {
          color: rgba(255,255,255,0.46);
          text-transform: uppercase;
          letter-spacing: 0.7px;
          font-size: 11px;
          font-weight: 900;
          margin-bottom: 6px;
        }

        .opponent-display {
          max-width: 100%;
          gap: 9px;
          border: 0;
          padding: 0;
          background: transparent;
          color: #fff;
          font-size: clamp(17px, 2vw, 21px);
          font-weight: 950;
          cursor: text;
          text-align: left;
        }

        .opponent-display span {
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .opponent-display svg {
          color: #7dd3fc;
          opacity: 0.78;
          flex-shrink: 0;
        }

        .opponent-editor {
          gap: 8px;
          width: min(100%, 520px);
        }

        .opponent-editor input {
          min-width: 0;
          flex: 1;
          height: 42px;
          border-radius: 12px;
          border: 1px solid rgba(0, 212, 255, 0.38);
          background: rgba(0, 212, 255, 0.09);
          color: #fff;
          padding: 0 12px;
          outline: none;
          font-size: 14px;
          font-weight: 800;
        }

        .opponent-editor input:focus {
          border-color: rgba(0, 212, 255, 0.7);
          box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.11);
        }

        .icon-action,
        .delete-button {
          width: 42px;
          height: 42px;
          justify-content: center;
          border-radius: 12px;
          cursor: pointer;
          transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
        }

        .icon-action {
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.06);
          color: #d1d5db;
        }

        .icon-action.save {
          border-color: rgba(34,197,94,0.34);
          background: rgba(34,197,94,0.14);
          color: #86efac;
        }

        .score-pill {
          min-width: 82px;
          justify-content: center;
          border: 1px solid;
          border-radius: 13px;
          padding: 10px 14px;
          font-size: 18px;
          font-weight: 950;
        }

        .progress-row {
          gap: 10px;
        }

        .progress-track {
          position: relative;
          flex: 1;
          height: 9px;
          min-width: 110px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,0.1);
        }

        .progress-track span {
          position: absolute;
          inset: 0 auto 0 0;
          border-radius: inherit;
          background: linear-gradient(90deg, #00d4ff, #86efac);
          box-shadow: 0 0 18px rgba(0, 212, 255, 0.3);
        }

        .progress-row strong {
          color: #fff;
          font-size: 13px;
          min-width: 28px;
        }

        .card-actions {
          justify-content: flex-end;
          gap: 10px;
          margin-top: 14px;
        }

        .details-button {
          min-height: 42px;
          gap: 8px;
          border: 1px solid rgba(0, 212, 255, 0.25);
          border-radius: 12px;
          background: rgba(0, 212, 255, 0.1);
          color: #7dd3fc;
          padding: 0 14px;
          font-weight: 900;
          cursor: pointer;
        }

        .delete-button {
          border: 1px solid rgba(239,68,68,0.26);
          background: rgba(239,68,68,0.1);
          color: #fca5a5;
        }

        .details-button:hover,
        .delete-button:hover,
        .icon-action:hover {
          transform: translateY(-1px);
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 820px) {
          .history-hero {
            grid-template-columns: 1fr;
          }

          .match-body {
            align-items: stretch;
            flex-direction: column;
          }

          .score-area,
          .quality-area,
          .opponent-area {
            width: 100%;
            min-width: 0;
          }

          .card-actions {
            justify-content: stretch;
          }

          .details-button {
            flex: 1;
            justify-content: center;
          }
        }

        @media (max-width: 560px) {
          .match-history-page {
            padding: 14px;
          }

          .hero-stats {
            grid-template-columns: 1fr;
          }

          .card-main {
            grid-template-columns: 1fr;
          }

          .match-rank {
            width: 100%;
            min-height: 42px;
            justify-content: flex-start;
            padding-left: 14px;
          }

          .match-topline {
            align-items: stretch;
            flex-direction: column;
          }

          .date-pill,
          .completion-pill {
            justify-content: center;
          }

          .opponent-editor {
            flex-wrap: wrap;
          }

          .opponent-editor input {
            flex-basis: 100%;
          }
        }
      `}</style>
    </main>
  )
}
