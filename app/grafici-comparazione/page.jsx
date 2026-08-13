'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase, getValidAccessToken } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import { getBenchmarkComparison, BENCHMARK_CATEGORIES } from '@/lib/gameAnalysisBenchmark'
import GameAnalysisModal from '@/components/GameAnalysisModal'
import { ArrowLeft, BarChart3, MessageCircle, RefreshCw, TrendingUp } from 'lucide-react'

const CATEGORY_KEYS = {
  shot_usage: 'chartsCategoryShot',
  passing: 'chartsCategoryPassing',
  dribbling: 'chartsCategoryDribbling',
  defense: 'chartsCategoryDefense',
  special_commands: 'chartsCategorySpecialCommands'
}

/** Indice 0-100 per categoria: per % è la media, per special_commands normalizzato su max della categoria. */
function getCategorySummary(comparison, categoryKeys) {
  if (!comparison) return []
  return BENCHMARK_CATEGORIES.map((cat) => {
    const series = comparison[cat]
    if (!series?.length) return { categoryKey: cat, categoryLabel: categoryKeys[cat], tuIndex: 0, topIndex: 0 }
    const isPercent = cat !== 'special_commands'
    let tuSum = 0
    let topSum = 0
    let count = 0
    if (isPercent) {
      series.forEach(({ tu, div1 }) => {
        if (tu != null) { tuSum += tu; count++ }
        topSum += div1
      })
      const n = series.length
      return {
        categoryKey: cat,
        categoryLabel: categoryKeys[cat],
        tuIndex: count ? Math.round((tuSum / count) * 10) / 10 : 0,
        topIndex: Math.round((topSum / n) * 10) / 10
      }
    }
    const maxVal = Math.max(...series.flatMap(({ tu, div1 }) => [tu ?? 0, div1]), 1)
    series.forEach(({ tu, div1 }) => {
      tuSum += (tu != null ? tu : 0) / maxVal * 100
      topSum += (div1 / maxVal) * 100
      count++
    })
    const n = series.length
    return {
      categoryKey: cat,
      categoryLabel: categoryKeys[cat],
      tuIndex: n ? Math.round((tuSum / n) * 10) / 10 : 0,
      topIndex: n ? Math.round((topSum / n) * 10) / 10 : 0
    }
  }).filter((s) => s.tuIndex > 0 || s.topIndex > 0)
}

const SUMMARY_CHART_HEIGHT = 220
const LINE_CHART_HEIGHT = 200
const PADDING = { top: 12, right: 12, bottom: 32, left: 44 }

/** Grafico a linee riassuntivo: Tu vs Top sulle 5 categorie (indice 0-100). */
function SummaryLineChart({ summary, categoryLabels, t }) {
  const width = 320
  const height = SUMMARY_CHART_HEIGHT
  const innerW = width - PADDING.left - PADDING.right
  const innerH = height - PADDING.top - PADDING.bottom
  const n = summary.length
  const scaleX = (i) => PADDING.left + (n > 1 ? (i / (n - 1)) * innerW : innerW / 2)
  const scaleY = (v) => PADDING.top + innerH - (v / 100) * innerH

  const tuPoints = summary.map((s, i) => `${scaleX(i)},${scaleY(s.tuIndex)}`).join(' ')
  const topPoints = summary.map((s, i) => `${scaleX(i)},${scaleY(s.topIndex)}`).join(' ')

  return (
    <div className="neon-card" style={{
      padding: 'clamp(12px, 3vw, 20px)',
      borderRadius: '18px',
      marginBottom: 16
    }}>
      borderRadius: '12px',
      minWidth: 0,
      maxWidth: '100%'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <TrendingUp size={20} style={{ color: 'var(--neon-blue)' }} />
        <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.95)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {t('chartsAndComparisonOverview') || 'Panoramica'}
        </h2>
      </div>
      <div style={{ display: 'flex', gap: '20px', marginBottom: '12px', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: 14, height: 2, background: 'var(--neon-blue, #00d4ff)', borderRadius: 1 }} />
          Tu
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: 14, height: 2, background: 'rgba(34, 197, 94, 0.9)', borderRadius: 1 }} />
          Top
        </span>
      </div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }} preserveAspectRatio="xMidYMid meet">
        {/* Griglia */}
        {[25, 50, 75].map((p) => (
          <line key={p} x1={PADDING.left} x2={width - PADDING.right} y1={scaleY(p)} y2={scaleY(p)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        ))}
        {/* Asse Y */}
        {[0, 25, 50, 75, 100].map((tick) => (
          <text key={tick} x={PADDING.left - 6} y={scaleY(tick) + 4} textAnchor="end" fill="rgba(255,255,255,0.5)" fontSize="10">{tick}</text>
        ))}
        <line x1={PADDING.left} y1={PADDING.top} x2={PADDING.left} y2={height - PADDING.bottom} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <line x1={PADDING.left} y1={height - PADDING.bottom} x2={width - PADDING.right} y2={height - PADDING.bottom} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        {/* Linee */}
        <polyline points={tuPoints} fill="none" stroke="var(--neon-blue, #00d4ff)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={topPoints} fill="none" stroke="rgba(34, 197, 94, 0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Punti e etichette X */}
        {summary.map((s, i) => (
          <g key={s.categoryKey}>
            <circle cx={scaleX(i)} cy={scaleY(s.tuIndex)} r="4" fill="var(--neon-blue, #00d4ff)" />
            <circle cx={scaleX(i)} cy={scaleY(s.topIndex)} r="4" fill="rgba(34, 197, 94, 0.9)" />
            <text x={scaleX(i)} y={height - 8} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="9">{String(categoryLabels[s.categoryKey] ?? s.categoryKey).slice(0, 10)}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}

/** Grafico a linee per categoria: due linee Tu e Top sulle voci (asse X = voci, Y = valore). */
function LineChartCard({ title, series, isPercent, t }) {
  const maxVal = Math.max(...series.flatMap(({ tu, div1 }) => [tu ?? 0, div1]), 1)
  const scaleMax = isPercent ? 100 : Math.ceil(maxVal * 1.1)
  const formatVal = (v) => (v == null ? '—' : isPercent ? `${Math.round(v)}%` : String(Math.round(v)))
  const n = series.length
  const width = 400
  const height = LINE_CHART_HEIGHT
  const innerW = width - PADDING.left - PADDING.right
  const innerH = height - PADDING.top - PADDING.bottom
  const scaleX = (i) => PADDING.left + (n > 1 ? (i / (n - 1)) * innerW : innerW / 2)
  const scaleY = (v) => PADDING.top + innerH - (v / scaleMax) * innerH

  const tuPoints = series.map((s, i) => `${scaleX(i)},${scaleY(s.tu ?? 0)}`).join(' ')
  const topPoints = series.map((s, i) => `${scaleX(i)},${scaleY(s.div1)}`).join(' ')

  return (
    <div className="neon-card" style={{
      padding: 'clamp(12px, 3vw, 20px)',
      borderRadius: '18px',
      minWidth: 0,
      maxWidth: '100%'
    }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 'clamp(14px, 3vw, 15px)', fontWeight: 700, color: '#1d1d1f' }}>{title}</h3>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '8px', fontSize: '11px', color: '#6b6b6b' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: 10, height: 2, background: 'var(--neon-blue)' }} /> Tu
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: 10, height: 2, background: 'rgba(34, 197, 94, 0.85)' }} /> Top
        </span>
      </div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }} preserveAspectRatio="xMidYMid meet">
        {[0.25, 0.5, 0.75].map((p) => (
          <line key={p} x1={PADDING.left} x2={width - PADDING.right} y1={PADDING.top + innerH * (1 - p)} y2={PADDING.top + innerH * (1 - p)} stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
        ))}
        {[0, Math.round(scaleMax * 0.25), Math.round(scaleMax * 0.5), Math.round(scaleMax * 0.75), scaleMax].map((tick) => (
          <text key={tick} x={PADDING.left - 6} y={PADDING.top + innerH - (tick / scaleMax) * innerH + 4} textAnchor="end" fill="#9b9b9b" fontSize="10">{isPercent ? `${tick}%` : tick}</text>
        ))}
        <line x1={PADDING.left} y1={PADDING.top} x2={PADDING.left} y2={height - PADDING.bottom} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        <line x1={PADDING.left} y1={height - PADDING.bottom} x2={width - PADDING.right} y2={height - PADDING.bottom} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        <polyline points={tuPoints} fill="none" stroke="var(--neon-blue, #00d4ff)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={topPoints} fill="none" stroke="rgba(34, 197, 94, 0.85)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {series.map((s, i) => (
          <g key={s.label}>
            <circle cx={scaleX(i)} cy={scaleY(s.tu ?? 0)} r="3" fill="var(--neon-blue)" />
            <circle cx={scaleX(i)} cy={scaleY(s.div1)} r="3" fill="rgba(34, 197, 94, 0.85)" />
          </g>
        ))}
      </svg>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: '8px', fontSize: 'clamp(10px, 2.5vw, 11px)', color: 'rgba(255,255,255,0.5)' }}>
        {series.map(({ label, tu, div1 }) => (
          <span key={String(label)} style={{ display: 'inline-flex', gap: '6px' }}>
            <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{t ? (t(String(label)) || String(label)) : String(label)}:</strong> Tu {formatVal(tu)} · Top {formatVal(div1)}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function GraficiComparazionePage() {
  const { t, lang } = useTranslation()
  const router = useRouter()
  const [loading, setLoading] = React.useState(true)
  const [stats, setStats] = React.useState(null)
  const [capturedAt, setCapturedAt] = React.useState(null)
  const [showModal, setShowModal] = React.useState(false)
  const mounted = React.useRef(true)

  const fetchData = React.useCallback(async () => {
    try {
      let token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      
      if (!token && supabase) {
        token = await getValidAccessToken()
      }

      if (!token) {
        router.push('/login')
        return
      }
      const res = await fetch('/api/extract-game-analysis', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!mounted.current) return
      if (data.error || !res.ok) {
        setStats(null)
        setCapturedAt(null)
      } else if (data.stats && typeof data.stats === 'object' && Object.keys(data.stats).length > 0) {
        setStats(data.stats)
        if (data.captured_at) {
          const d = new Date(data.captured_at)
          setCapturedAt(isNaN(d.getTime()) ? data.captured_at : d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'it-IT', { day: 'numeric', month: 'short', year: 'numeric' }))
        } else setCapturedAt(null)
      } else {
        setStats(null)
        setCapturedAt(null)
      }
    } catch (_) {
      if (mounted.current) setStats(null)
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [router, lang])

  React.useEffect(() => {
    mounted.current = true
    fetchData()
    return () => { mounted.current = false }
  }, [fetchData])

  const comparison = stats ? getBenchmarkComparison(stats) : null
  const hasCharts = comparison && BENCHMARK_CATEGORIES.some(cat => (comparison[cat]?.length ?? 0) > 0)
  const isPercentCategories = { shot_usage: true, passing: true, dribbling: true, defense: true, special_commands: false }

  return (
    <div className="ux-v2-light-tool" style={{ minHeight: '100%', overflowX: 'hidden', color: '#1d1d1f' }}>
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="neon-button"
            style={{ padding: '8px', minWidth: 40, minHeight: 40 }}
            aria-label={t('back')}
          >
            <ArrowLeft size={20} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={22} style={{ color: '#00A8C8' }} />
            <h1 style={{ margin: 0, fontSize: 'clamp(18px, 4vw, 22px)', fontWeight: 800, wordBreak: 'break-word', color: '#1d1d1f' }}>{t('chartsAndComparisonTitle')}</h1>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '900px', width: '100%', minWidth: 0, margin: '0 auto', padding: 'clamp(16px, 4vw, 24px) clamp(16px, 4vw, 20px)', boxSizing: 'border-box' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px', color: '#6b6b6b' }}>
            <RefreshCw size={24} className="grafici-comparazione-spinner" />
          </div>
        ) : !hasCharts ? (
          <div className="neon-card" style={{
            padding: '32px 24px',
            textAlign: 'center',
            borderRadius: '18px'
          }}>
            <BarChart3 size={48} style={{ color: '#00A8C8', marginBottom: '16px' }} />
            <p style={{ margin: '0 0 20px', color: '#6b6b6b', fontSize: '15px', lineHeight: 1.5 }}>
              {t('chartsAndComparisonEmpty')}
            </p>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="neon-button"
              style={{
                background: 'var(--neon-green, #22c55e)',
                color: '#0a0a0f',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: 600
              }}
            >
              {t('chartsAndComparisonCta')}
            </button>
          </div>
        ) : (
          <>
            <p style={{ margin: '0 0 24px', color: '#6b6b6b', fontSize: '14px' }}>
              {t('chartsAndComparisonSubtitle')}
              {capturedAt && (
                <span style={{ marginLeft: '8px', opacity: 0.8 }}> · {t('gameAnalysisLastCapture')}: {capturedAt}</span>
              )}
            </p>
            {/* Panoramica: grafico a linee Tu vs Top sulle 5 categorie */}
            {(() => {
              const summary = getCategorySummary(comparison, CATEGORY_KEYS)
              const categoryLabels = summary.length ? Object.fromEntries(summary.map((s) => [s.categoryKey, t(s.categoryLabel)])) : {}
              return summary.length > 0 ? (
                <SummaryLineChart summary={summary} categoryLabels={categoryLabels} t={t} />
              ) : null
            })()}
            {/* Dettaglio per categoria: grafici a linee */}
            <h3 style={{ margin: '24px 0 12px', fontSize: '13px', fontWeight: 700, color: '#9b9b9b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('chartsAndComparisonDetail') || 'Dettaglio per categoria'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {BENCHMARK_CATEGORIES.map((cat) => {
                const series = comparison?.[cat]
                if (!series?.length) return null
                return (
                  <LineChartCard
                    key={cat}
                    title={t(CATEGORY_KEYS[cat] || cat)}
                    series={series}
                    isPercent={isPercentCategories[cat]}
                    t={t}
                  />
                )
              })}
            </div>
            <div style={{ marginTop: '32px', textAlign: 'center' }}>
              <Link
                href="/?openAssistantChat=1"
                className="neon-button"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px'
                }}
              >
                <MessageCircle size={18} />
                {t('chartsAndComparisonAskCoach')}
              </Link>
            </div>
          </>
        )}
      </main>

      <GameAnalysisModal
        show={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={async () => {
          await Promise.resolve()
          fetchData()
          setShowModal(false)
        }}
        lastCaptureDate={capturedAt}
      />

      <style dangerouslySetInnerHTML={{ __html: '.grafici-comparazione-spinner { animation: grafici-spin 1s linear infinite; } @keyframes grafici-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }' }} />
    </div>
  )
}
