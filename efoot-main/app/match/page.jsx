'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'
import { supabase } from '@/lib/supabaseClient'
import { safeJsonResponse } from '@/lib/fetchHelper'
import { Calendar, Plus, RefreshCw, Trash2, ArrowRight, Trophy, Target, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import ConfirmModal from '@/components/ConfirmModal'

export default function MatchHistoryPage() {
  const { t, lang } = useTranslation()
  const router = useRouter()
  
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [editingOpponentId, setEditingOpponentId] = useState(null)
  const [editingOpponentName, setEditingOpponentName] = useState('')
  const [savingOpponentName, setSavingOpponentName] = useState(false)
  
  const [confirmModal, setConfirmModal] = useState(null)
  const [deletingMatchId, setDeletingMatchId] = useState(null)

  useEffect(() => {
    const fetchMatches = async () => {
      setLoading(true)
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

        const res = await fetch(`/api/dashboard?t=${new Date().getTime()}`, {
          headers: { 
            'Authorization': `Bearer ${token}`
          },
          cache: 'no-store'
        })
        
        if (!res.ok) throw new Error('Failed to fetch match history')
        
        const data = await res.json()
        setMatches(data.matches || [])
        
      } catch (err) {
        console.error('Error fetching matches:', err)
        setError(t('errorLoadingLeaderboard'))
      } finally {
        setLoading(false)
      }
    }

    fetchMatches()
  }, [router, t])

  const handleSaveOpponentName = async (matchId, e) => {
    e?.stopPropagation()

    if (!editingOpponentName.trim()) {
      setEditingOpponentId(null)
      return
    }

    setSavingOpponentName(true)
    try {
      let token = localStorage.getItem('auth_token')
      
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }

      if (!token) throw new Error('Session expired')

      const res = await fetch('/api/supabase/save-match-opponent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ match_id: matchId, opponent_name: editingOpponentName.trim() })
      })

      if (!res.ok) throw new Error('Errore salvataggio avversario')

      setMatches(prev => prev.map(m => m.id === matchId ? { ...m, opponent_name: editingOpponentName.trim() } : m))
    } catch (err) {
      console.error('Error saving opponent:', err)
    } finally {
      setSavingOpponentName(false)
      setEditingOpponentId(null)
      setEditingOpponentName('')
    }
  }

  const handleDeleteMatch = async (matchId, e) => {
    e.stopPropagation()
    
    setConfirmModal({
      show: true,
      title: t('confirm'),
      message: t('confirmDeleteMatch'),
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
            headers: { 'Authorization': `Bearer ${token}` }
          })
    
          if (!res.ok) throw new Error('Failed to delete')
    
          setMatches(prev => prev.filter(m => m.id !== matchId))
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
    <main className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header Card */}
      <div 
        className="mb-8"
        style={{
          background: 'linear-gradient(135deg, rgba(255,140,0,0.12), rgba(0,212,255,0.06))',
          border: '1px solid rgba(255,165,0,0.4)',
          borderRadius: '16px',
          padding: '24px'
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div 
              style={{ 
                width: '56px', 
                height: '56px', 
                borderRadius: '14px', 
                background: 'rgba(255,165,0,0.2)', 
                border: '2px solid var(--border-orange)',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}
            >
              <Trophy size={28} style={{ color: 'var(--primary-orange)' }} />
            </div>
            <div>
              <h1 style={{ 
                fontSize: 'clamp(22px, 5vw, 28px)', 
                fontWeight: 700, 
                color: '#fff',
                margin: 0,
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}>
                {t('matchHistory')}
              </h1>
              <p style={{ 
                fontSize: '15px', 
                color: 'rgba(255,255,255,0.7)', 
                margin: '6px 0 0 0'
              }}>
                {matches.length === 0 ? t('noMatchesSaved') : `${matches.length} ${matches.length === 1 ? t('match') : t('matches')} registrate`}
              </p>
            </div>
          </div>
          
          <button
            onClick={() => router.push('/match/new')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '14px 24px',
              background: 'linear-gradient(135deg, var(--primary-gold), #ff9500)',
              border: '2px solid rgba(255,165,0,0.5)',
              borderRadius: '12px',
              color: '#000',
              fontWeight: 700,
              fontSize: '15px',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(255,149,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(255,149,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(255,149,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)'
            }}
          >
            <Plus size={20} />
            {t('addMatch') || 'Aggiungi Partita'}
          </button>
        </div>
      </div>

      {loading ? (
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '60px',
            color: 'var(--primary-cyan)'
          }}
        >
          <RefreshCw size={32} className="animate-spin" />
        </div>
      ) : error ? (
        <div 
          style={{
            background: 'rgba(255,59,48,0.1)',
            border: '1px solid rgba(255,59,48,0.3)',
            borderRadius: '12px',
            padding: '20px',
            color: '#FF3B30',
            textAlign: 'center'
          }}
        >
          {error}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {matches.length === 0 ? (
            <div 
              style={{
                className: 'neon-panel',
                border: '1px solid rgba(0, 212, 255, 0.15)',
                borderRadius: '16px',
                padding: '60px 40px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '20px'
              }}
            >
              <div 
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '20px',
                  background: 'rgba(0, 212, 255, 0.1)',
                  border: '1px solid rgba(0,161,166,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Target size={40} style={{ color: 'var(--neon-cyan)', opacity: 0.6 }} />
              </div>
              <p style={{ fontSize: '18px', color: 'rgba(0, 212, 255, 0.7)', margin: 0 }}>
                {t('noMatchesSaved')}
              </p>
              <button
                onClick={() => router.push('/match/new')}
                style={{
                  padding: '12px 28px',
                  className: 'neon-card',
                  border: '2px solid rgba(0, 212, 255, 0.5)',
                  borderRadius: '10px',
                  color: 'var(--neon-cyan)',
                  fontWeight: 600,
                  fontSize: '15px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0,161,166,0.15)'
                  e.currentTarget.style.color = '#fff'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-elevated)'
                  e.currentTarget.style.color = 'var(--neon-cyan)'
                }}
              >
                Inizia ora
              </button>
            </div>
          ) : (
            matches.map((match, index) => {
              const matchDate = match.match_date ? new Date(match.match_date) : null
              const dateStr = matchDate ? matchDate.toLocaleDateString(lang === 'it' ? 'it-IT' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }) : t('dateNotAvailable')
              const timeStr = matchDate ? matchDate.toLocaleTimeString(lang === 'it' ? 'it-IT' : 'en-US', { hour: '2-digit', minute:'2-digit' }) : ''
              const displayResult = match.result || 'N/A'
              const displayOpponent = match.opponent_name || t('unknownOpponent')
              const isComplete = match.data_completeness === 'complete'
              const isWin = displayResult === 'Vittoria'
              const isLoss = displayResult === 'Sconfitta'

              return (
                <div
                  key={match.id}
                  onClick={() => router.push(`/match/${match.id}`)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    padding: '20px',
                    className: 'neon-panel',
                    border: '1px solid rgba(0, 212, 255, 0.15)',
                    borderRadius: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.5)'
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.15)'
                    e.currentTarget.style.boxShadow = 'none'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  {/* Top row: Rank + Opponent + Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                      {/* Rank indicator */}
                      <div 
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: index < 3 ? 'rgba(255,149,0,0.2)' : 'rgba(0,161,166,0.1)',
                          border: index < 3 ? '1px solid rgba(255,149,0,0.4)' : '1px solid rgba(0,161,166,0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '14px',
                          color: index < 3 ? 'var(--primary-orange)' : 'var(--neon-cyan)',
                          flexShrink: 0
                        }}
                      >
                        {index < 3 ? ['🥇', '🥈', '🥉'][index] : `#${index + 1}`}
                      </div>

                      {/* Opponent name */}
                      <div style={{ flex: 1, minWidth: 0 }} onClick={(e) => e.stopPropagation()}>
                        {editingOpponentId === match.id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                              type="text"
                              value={editingOpponentName}
                              onChange={(e) => setEditingOpponentName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveOpponentName(match.id, e)
                                else if (e.key === 'Escape') { setEditingOpponentId(null); setEditingOpponentName('') }
                              }}
                              autoFocus
                              maxLength={255}
                              style={{
                                flex: 1,
                                minWidth: '120px',
                                padding: '8px 12px',
                                background: 'rgba(0, 212, 255, 0.15)',
                                border: '1px solid rgba(0,161,166,0.4)',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '14px',
                                outline: 'none'
                              }}
                              disabled={savingOpponentName}
                            />
                            <button 
                              onClick={(e) => handleSaveOpponentName(match.id, e)} 
                              disabled={savingOpponentName}
                              style={{
                                padding: '8px 12px',
                                background: 'rgba(34,197,94,0.2)',
                                border: '1px solid rgba(34,197,94,0.4)',
                                borderRadius: '8px',
                                color: '#4ade80',
                                cursor: savingOpponentName ? 'not-allowed' : 'pointer',
                                fontWeight: 600
                              }}
                            >
                              {savingOpponentName ? '...' : '✓'}
                            </button>
                            <button 
                              onClick={() => { setEditingOpponentId(null); setEditingOpponentName('') }}
                              style={{
                                padding: '8px 12px',
                                background: 'rgba(239,68,68,0.2)',
                                border: '1px solid rgba(239,68,68,0.4)',
                                borderRadius: '8px',
                                color: '#f87171',
                                cursor: 'pointer',
                                fontWeight: 600
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ 
                              fontSize: '17px', 
                              fontWeight: 600, 
                              color: '#fff',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {displayOpponent}
                            </span>
                            <button 
                              style={{
                                padding: '4px 8px',
                                background: 'transparent',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '6px',
                                color: 'rgba(255,255,255,0.4)',
                                fontSize: '12px',
                                cursor: 'pointer',
                                opacity: 0,
                                transition: 'all 0.2s'
                              }}
                              title={t('clickToEditOpponentName')}
                              onClick={(e) => { e.stopPropagation(); setEditingOpponentId(match.id); setEditingOpponentName(match.opponent_name || '') }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = '1'
                                e.currentTarget.style.background = 'rgba(0,161,166,0.2)'
                                e.currentTarget.style.borderColor = 'rgba(0,161,166,0.4)'
                                e.currentTarget.style.color = 'var(--neon-cyan)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = '0'
                                e.currentTarget.style.background = 'transparent'
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                                e.currentTarget.style.color = 'rgba(255,255,255,0.4)'
                              }}
                            >
                              ✏️
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => router.push(`/match/${match.id}`)}
                        style={{
                          padding: '10px',
                          background: 'rgba(0, 212, 255, 0.1)',
                          border: '1px solid rgba(0,161,166,0.2)',
                          borderRadius: '10px',
                          color: 'var(--neon-cyan)',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(0,161,166,0.25)'
                          e.currentTarget.style.borderColor = 'rgba(0,161,166,0.5)'
                          e.currentTarget.style.color = '#fff'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(0,161,166,0.1)'
                          e.currentTarget.style.borderColor = 'rgba(0,161,166,0.2)'
                          e.currentTarget.style.color = 'var(--neon-cyan)'
                        }}
                        title="Vedi Dettagli"
                      >
                        <ArrowRight size={18} />
                      </button>
                      
                      <button
                        onClick={(e) => handleDeleteMatch(match.id, e)}
                        disabled={deletingMatchId === match.id}
                        style={{
                          padding: '10px',
                          background: 'rgba(239,68,68,0.1)',
                          border: '1px solid rgba(239,68,68,0.2)',
                          borderRadius: '10px',
                          color: '#f87171',
                          cursor: deletingMatchId === match.id ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s',
                          opacity: deletingMatchId === match.id ? 0.6 : 1
                        }}
                        onMouseEnter={(e) => {
                          if (deletingMatchId !== match.id) {
                            e.currentTarget.style.background = 'rgba(239,68,68,0.25)'
                            e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'
                            e.currentTarget.style.color = '#fff'
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(239,68,68,0.1)'
                          e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'
                          e.currentTarget.style.color = '#f87171'
                        }}
                        title={t('deleteMatch')}
                      >
                        {deletingMatchId === match.id ? <RefreshCw size={18} className="animate-spin" /> : <Trash2 size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Bottom row: Date, Formation, Result, Status */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', color: 'rgba(0, 212, 255, 0.5)' }}>
                        {dateStr} {timeStr && `· ${timeStr}`}
                      </span>
                      
                      {match.formation_played && (
                        <>
                          <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(0, 212, 255, 0.5)' }}></span>
                          <span style={{ 
                            fontSize: '13px', 
                            color: 'var(--neon-cyan)',
                            background: 'rgba(0, 212, 255, 0.1)',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '1px solid rgba(0,161,166,0.2)'
                          }}>
                            {match.formation_played}
                          </span>
                        </>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 700,
                        background: isWin ? 'rgba(34,197,94,0.15)' : isLoss ? 'rgba(239,68,68,0.15)' : 'rgba(234,179,8,0.15)',
                        border: isWin ? '1px solid rgba(34,197,94,0.4)' : isLoss ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(234,179,8,0.4)',
                        color: isWin ? '#4ade80' : isLoss ? '#f87171' : '#facc15'
                      }}>
                        {displayResult}
                      </span>
                      
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 500,
                        background: isComplete ? 'rgba(34,197,94,0.1)' : 'rgba(234,179,8,0.1)',
                        border: isComplete ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(234,179,8,0.3)',
                        color: isComplete ? '#4ade80' : '#facc15'
                      }}>
                        {isComplete ? t('matchComplete') : `${match.photos_uploaded || 0}/5`}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })
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
    </main>
  )
}
