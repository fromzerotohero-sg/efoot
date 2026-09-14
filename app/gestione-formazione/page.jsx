'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { pickLang } from '@/lib/i18n'
import { RefreshCw, AlertCircle, Plus, Search, UserCheck, Users as UsersIcon } from 'lucide-react'
import { DEFAULT_SLOT_POSITIONS, completeSlotPositions } from '@/lib/formationDefaultSlots'
import { withAuth } from '@/components/AuthWrapper'

/**
 * ROSA — pagina semplice (progressive disclosure).
 * Reference: mockup owner "MOBILE – ROSA (SQUADRA)".
 * Dati reali: GET /api/formation (layout + slot_positions + players + activeCoach).
 * Il motore completo resta a /nuova-rosa-lab ("Dettagli rosa"). Nessuna riscrittura del motore.
 */

const COPY = {
  title: { it: 'La mia rosa', en: 'My squad', es: 'Mi plantilla' },
  starters: { it: 'Titolari', en: 'Starters', es: 'Titulares' },
  reserves: { it: 'Riserve', en: 'Reserves', es: 'Suplentes' },
  bench: { it: 'Panchina', en: 'Bench', es: 'Banquillo' },
  details: { it: 'Dettagli rosa', en: 'Squad details', es: 'Detalles de la plantilla' },
  addPlayer: { it: 'Aggiungi giocatore', en: 'Add player', es: 'Añadir jugador' },
  emptyTitle: { it: 'Crea la tua rosa', en: 'Create your squad', es: 'Crea tu plantilla' },
  emptyDesc: { it: 'Aggiungi i tuoi giocatori reali: Hero li userà per ogni consiglio.', en: 'Add your real players: Hero will use them for every advice.', es: 'Añade tus jugadores reales: Hero los usará para cada consejo.' },
  emptyCta: { it: 'Crea la tua rosa', en: 'Create your squad', es: 'Crear plantilla' },
  noReserves: { it: 'Nessuna riserva al momento.', en: 'No reserves yet.', es: 'Aún no hay suplentes.' },
  coachTitle: { it: 'Allenatore attivo', en: 'Active coach', es: 'Entrenador activo' },
  coachEmpty: { it: 'Nessun allenatore attivo: scegline uno per sbloccare modulo e consigli tattici.', en: 'No active coach: pick one to unlock formation and tactical advice.', es: 'Ningún entrenador activo: elige uno para desbloquear formación y consejos tácticos.' },
  coachCta: { it: 'Gestisci allenatori', en: 'Manage coaches', es: 'Gestionar entrenadores' },
  coachStyle: { it: 'Stile di gioco', en: 'Playing style', es: 'Estilo de juego' },
  coachAffinity: { it: 'Affinità', en: 'Affinity', es: 'Afinidad' },
  loading: { it: 'Caricamento rosa…', en: 'Loading squad…', es: 'Cargando plantilla…' },
  error: { it: 'Errore di caricamento', en: 'Loading error', es: 'Error de carga' },
  retry: { it: 'Riprova', en: 'Retry', es: 'Reintentar' },
  formation: { it: 'Modulo', en: 'Formation', es: 'Formación' }
}

function normalizeSlotPositions(slotPositions) {
  if (!slotPositions) return completeSlotPositions({})
  if (Array.isArray(slotPositions)) {
    const obj = {}
    slotPositions.forEach((slot, i) => {
      if (slot && typeof slot === 'object') obj[i] = slot
    })
    return completeSlotPositions(obj)
  }
  if (typeof slotPositions === 'object') return completeSlotPositions(slotPositions)
  return completeSlotPositions({})
}

function RosaPage() {
  const router = useRouter()
  const [lang, setLang] = React.useState('it')
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [retryTrigger, setRetryTrigger] = React.useState(0)
  const [layout, setLayout] = React.useState(null)
  const [players, setPlayers] = React.useState([])
  const [activeCoach, setActiveCoach] = React.useState(null)
  const [tacticalSettings, setTacticalSettings] = React.useState(null)
  const [tab, setTab] = React.useState('starters')

  React.useEffect(() => {
    try {
      setLang(localStorage.getItem('app_language') || document.documentElement.lang || 'it')
    } catch {
      /* ignore */
    }
  }, [])

  React.useEffect(() => {
    let cancelled = false
    const fetchFormation = async () => {
      setLoading(true)
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
        const res = await fetch(`/api/formation?t=${Date.now()}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store'
        })
        if (res.status === 401) {
          localStorage.removeItem('auth_token')
          router.push('/login')
          return
        }
        if (!res.ok) throw new Error('formation fetch failed')
        const data = await res.json()
        if (cancelled) return
        setLayout(data.layout || null)
        setPlayers(Array.isArray(data.players) ? data.players : [])
        setActiveCoach(data.activeCoach || null)
        setTacticalSettings(data.tacticalSettings || null)
      } catch (err) {
        console.error('[Rosa] fetch error:', err)
        if (!cancelled) setError('fetch')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchFormation()
    return () => {
      cancelled = true
    }
  }, [retryTrigger, router])

  const starters = React.useMemo(
    () => players.filter((p) => p && p.slot_index !== null && p.slot_index >= 0 && p.slot_index <= 10),
    [players]
  )
  const reserves = React.useMemo(
    () =>
      players
        .filter((p) => p && (p.slot_index === null || p.slot_index === undefined))
        .sort((a, b) => (Number(b.overall_rating) || 0) - (Number(a.overall_rating) || 0)),
    [players]
  )
  const slotPositions = React.useMemo(() => normalizeSlotPositions(layout?.slot_positions), [layout])
  const playerBySlot = React.useMemo(() => {
    const map = {}
    starters.forEach((p) => {
      map[p.slot_index] = p
    })
    return map
  }, [starters])

  const formationName = layout?.formation || null
  const styleName = tacticalSettings?.team_playing_style || null

  if (loading) {
    return (
      <div className="rosaPage rosaCenter">
        <RefreshCw size={34} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
        <p className="rosaMuted">{pickLang(lang, COPY.loading)}</p>
        <style jsx>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rosaPage rosaCenter">
        <AlertCircle size={34} color="#ff8a8a" />
        <p className="rosaMuted">{pickLang(lang, COPY.error)}</p>
        <button type="button" className="rosaPrimaryBtn" onClick={() => setRetryTrigger((n) => n + 1)}>
          {pickLang(lang, COPY.retry)}
        </button>
      </div>
    )
  }

  if (players.length === 0) {
    return (
      <div className="rosaPage rosaCenter">
        <UsersIcon size={38} color="var(--accent)" />
        <h1 className="rosaEmptyTitle">{pickLang(lang, COPY.emptyTitle)}</h1>
        <p className="rosaMuted">{pickLang(lang, COPY.emptyDesc)}</p>
        <button type="button" className="rosaPrimaryBtn" onClick={() => router.push('/nuova-rosa-lab')}>
          {pickLang(lang, COPY.emptyCta)}
        </button>
      </div>
    )
  }

  return (
    <div className="rosaPage">
      {/* Header */}
      <header className="rosaHeader">
        <div>
          <h1 className="rosaTitle">{pickLang(lang, COPY.title)}</h1>
          {(formationName || styleName) && (
            <p className="rosaSubtitle">
              {formationName}
              {styleName ? ` · ${styleName}` : ''}
            </p>
          )}
        </div>
        <span className="rosaCount">
          {starters.length}/11
        </span>
      </header>

      {/* Toggle Titolari / Riserve / Panchina */}
      <div className="rosaTabs" role="tablist" aria-label={pickLang(lang, COPY.title)}>
        {[
          { key: 'starters', label: pickLang(lang, COPY.starters) },
          { key: 'reserves', label: pickLang(lang, COPY.reserves) },
          { key: 'bench', label: pickLang(lang, COPY.bench) }
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={`rosaTab${tab === t.key ? ' rosaTabActive' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'starters' && (
        <>
          {/* Campo da gioco (slot reali da formation_layout) */}
          <div className="rosaPitch" role="img" aria-label={`${pickLang(lang, COPY.formation)} ${formationName || ''}`}>
            <svg className="rosaPitchLines" viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden="true">
              <rect x="1" y="1" width="98" height="138" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.6" />
              <line x1="1" y1="70" x2="99" y2="70" stroke="rgba(255,255,255,0.28)" strokeWidth="0.6" />
              <circle cx="50" cy="70" r="10" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.6" />
              <rect x="24" y="1" width="52" height="16" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.6" />
              <rect x="24" y="123" width="52" height="16" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.6" />
              <rect x="38" y="1" width="24" height="6" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.6" />
              <rect x="38" y="133" width="24" height="6" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.6" />
            </svg>
            {formationName && <span className="rosaFormationChip">{formationName}</span>}
            {Array.from({ length: 11 }, (_, i) => {
              const slot = slotPositions[i] || DEFAULT_SLOT_POSITIONS[i]
              const player = playerBySlot[i]
              const posLabel = slot?.position || player?.position || '?'
              return (
                <div
                  key={i}
                  className={`rosaSlot${player ? '' : ' rosaSlotEmpty'}`}
                  style={{ left: `${slot?.x ?? 50}%`, top: `${slot?.y ?? 50}%` }}
                >
                  {player ? (
                    <>
                      <span className="rosaSlotRating">{player.overall_rating ?? '—'}</span>
                      <span className="rosaSlotPos">{posLabel}</span>
                      <span className="rosaSlotName">{player.player_name}</span>
                    </>
                  ) : (
                    <span className="rosaSlotPos rosaSlotPosEmpty">{posLabel}</span>
                  )}
                </div>
              )
            })}
          </div>

          <button type="button" className="rosaPrimaryBtn rosaDetailsBtn" onClick={() => router.push('/nuova-rosa-lab')}>
            {pickLang(lang, COPY.details)}
          </button>
        </>
      )}

      {tab === 'reserves' && (
        <div className="rosaReserves">
          {reserves.length === 0 ? (
            <p className="rosaMuted">{pickLang(lang, COPY.noReserves)}</p>
          ) : (
            reserves.map((p) => (
              <div key={p.id} className="rosaReserveRow">
                <span className="rosaReserveRating">{p.overall_rating ?? '—'}</span>
                <span className="rosaReserveInfo">
                  <strong>{p.player_name}</strong>
                  <small>{p.position || '—'}</small>
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'bench' && (
        <div className="rosaBench">
          {activeCoach ? (
            <div className="rosaCoachCard">
              <div className="rosaCoachHead">
                <span className="rosaCoachIcon">
                  <UserCheck size={18} />
                </span>
                <div>
                  <p className="rosaCoachLabel">{pickLang(lang, COPY.coachTitle)}</p>
                  <strong className="rosaCoachName">{activeCoach.coach_name}</strong>
                </div>
              </div>
              {activeCoach.team && <p className="rosaMuted">{activeCoach.team}</p>}
              {activeCoach.playing_style_competence && (
                <p className="rosaCoachMeta">
                  {pickLang(lang, COPY.coachStyle)}: <strong>{activeCoach.playing_style_competence}</strong>
                </p>
              )}
              {activeCoach.training_affinity_description && (
                <p className="rosaCoachMeta">
                  {pickLang(lang, COPY.coachAffinity)}: {activeCoach.training_affinity_description}
                </p>
              )}
              <button type="button" className="rosaSecondaryBtn" onClick={() => router.push('/allenatori')}>
                {pickLang(lang, COPY.coachCta)}
              </button>
            </div>
          ) : (
            <div className="rosaCoachCard">
              <p className="rosaMuted">{pickLang(lang, COPY.coachEmpty)}</p>
              <button type="button" className="rosaPrimaryBtn" onClick={() => router.push('/allenatori')}>
                {pickLang(lang, COPY.coachCta)}
              </button>
            </div>
          )}
        </div>
      )}

      {/* FAB "+" (mockup): aggiunta giocatori avviene nel motore */}
      <button
        type="button"
        className="rosaFab"
        aria-label={pickLang(lang, COPY.addPlayer)}
        title={pickLang(lang, COPY.addPlayer)}
        onClick={() => router.push('/nuova-rosa-lab')}
      >
        <Plus size={26} />
      </button>

      <style jsx>{`
        .rosaPage {
          display: flex;
          flex-direction: column;
          gap: 14px;
          max-width: 640px;
          margin: 0 auto;
          width: 100%;
          color: var(--text-main);
        }

        .rosaCenter {
          min-height: 60vh;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 12px;
        }

        .rosaMuted {
          margin: 0;
          font-size: 13px;
          color: var(--text-dim);
          line-height: 1.5;
        }

        .rosaEmptyTitle {
          margin: 0;
          font-size: 24px;
          font-weight: 800;
        }

        .rosaHeader {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 10px;
        }

        .rosaTitle {
          margin: 0;
          font-size: clamp(22px, 5vw, 28px);
          font-weight: 800;
          letter-spacing: -0.01em;
        }

        .rosaSubtitle {
          margin: 4px 0 0;
          font-size: 13px;
          color: var(--text-dim);
        }

        .rosaCount {
          padding: 4px 12px;
          border-radius: 999px;
          background: var(--accent-bg);
          border: 1px solid var(--accent-border);
          color: var(--accent);
          font-size: 13px;
          font-weight: 800;
        }

        .rosaTabs {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          padding: 4px;
          border-radius: 14px;
          background: var(--surface);
          border: 1px solid var(--border-soft);
        }

        .rosaTab {
          min-height: 40px;
          border: none;
          border-radius: 10px;
          background: transparent;
          color: var(--text-dim);
          font-size: 13px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
        }

        .rosaTabActive {
          background: var(--accent-bg);
          color: var(--accent);
          border: 1px solid var(--accent-border);
        }

        .rosaPitch {
          position: relative;
          width: 100%;
          aspect-ratio: 100 / 140;
          max-height: 68vh;
          margin: 0 auto;
          border-radius: 18px;
          background:
            radial-gradient(circle at 50% 0%, rgba(61, 220, 151, 0.14), transparent 46%),
            linear-gradient(180deg, #0e3d2c 0%, #0a2f22 100%);
          border: 1px solid rgba(61, 220, 151, 0.22);
          overflow: hidden;
        }

        .rosaPitchLines {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        .rosaFormationChip {
          position: absolute;
          top: 10px;
          right: 10px;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(5, 20, 15, 0.65);
          border: 1px solid rgba(61, 220, 151, 0.35);
          color: #7dedc0;
          font-size: 11px;
          font-weight: 800;
        }

        .rosaSlot {
          position: absolute;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1px;
          width: 64px;
          padding: 5px 4px;
          border-radius: 10px;
          background: rgba(5, 20, 15, 0.72);
          border: 1px solid rgba(61, 220, 151, 0.35);
          text-align: center;
        }

        .rosaSlotEmpty {
          background: rgba(5, 20, 15, 0.35);
          border: 1px dashed rgba(255, 255, 255, 0.3);
        }

        .rosaSlotRating {
          font-size: 13px;
          font-weight: 900;
          color: #7dedc0;
          line-height: 1.1;
        }

        .rosaSlotPos {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.06em;
          color: rgba(255, 255, 255, 0.65);
          text-transform: uppercase;
        }

        .rosaSlotPosEmpty {
          color: rgba(255, 255, 255, 0.75);
          font-size: 11px;
        }

        .rosaSlotName {
          font-size: 10px;
          font-weight: 700;
          color: #ffffff;
          max-width: 100%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .rosaPrimaryBtn {
          min-height: 48px;
          padding: 12px 20px;
          border: none;
          border-radius: 14px;
          background: linear-gradient(135deg, var(--accent), var(--accent-strong));
          color: var(--accent-ink);
          font-size: 15px;
          font-weight: 800;
          font-family: inherit;
          cursor: pointer;
        }

        .rosaDetailsBtn {
          width: 100%;
        }

        .rosaSecondaryBtn {
          align-self: flex-start;
          min-height: 42px;
          padding: 10px 16px;
          border-radius: 10px;
          border: 1px solid var(--accent-border);
          background: var(--accent-bg);
          color: var(--accent);
          font-size: 13px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
        }

        .rosaReserves {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .rosaReserveRow {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 12px;
          background: var(--surface);
          border: 1px solid var(--border-soft);
        }

        .rosaReserveRating {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 34px;
          height: 34px;
          border-radius: 10px;
          background: var(--accent-bg);
          border: 1px solid var(--accent-border);
          color: var(--accent);
          font-size: 14px;
          font-weight: 900;
          flex-shrink: 0;
        }

        .rosaReserveInfo {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .rosaReserveInfo strong {
          font-size: 14px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .rosaReserveInfo small {
          font-size: 11px;
          color: var(--text-dim);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .rosaBench {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .rosaCoachCard {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 18px;
          border-radius: 16px;
          background: var(--surface);
          border: 1px solid var(--border-soft);
        }

        .rosaCoachHead {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .rosaCoachIcon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--accent-bg);
          border: 1px solid var(--accent-border);
          color: var(--accent);
          flex-shrink: 0;
        }

        .rosaCoachLabel {
          margin: 0;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-dim);
        }

        .rosaCoachName {
          font-size: 17px;
          font-weight: 800;
        }

        .rosaCoachMeta {
          margin: 0;
          font-size: 13px;
          color: var(--text-dim);
        }

        .rosaCoachMeta strong {
          color: var(--text-main);
        }

        .rosaFab {
          position: fixed;
          right: 20px;
          bottom: calc(96px + env(safe-area-inset-bottom, 0px) + 72px);
          z-index: 90;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 58px;
          height: 58px;
          border-radius: 50%;
          border: none;
          background: linear-gradient(135deg, var(--accent), var(--accent-strong));
          color: var(--accent-ink);
          box-shadow: 0 10px 28px rgba(39, 167, 106, 0.4);
          cursor: pointer;
        }

        @media (min-width: 768px) {
          .rosaFab {
            bottom: 92px;
          }
        }

        .rosaTab:focus-visible,
        .rosaPrimaryBtn:focus-visible,
        .rosaSecondaryBtn:focus-visible,
        .rosaFab:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  )
}

export default withAuth(RosaPage)
