'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { withAuth } from '@/components/AuthWrapper'
import { useTranslation } from '@/lib/i18n'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  X,
  ImageOff,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
  Zap
} from 'lucide-react'

const copy = {
  it: {
    eyebrow: 'Lab interno',
    title: 'Card Advisor',
    subtitle: 'Valuta le nuove carte prima di spendere coins: prima giudizio generale, poi fit con la tua rosa quando sara caricata.',
    dataBadge: 'Demo UI - fonte eFHUB da collegare',
    notPublic: 'Pagina separata: non e collegata a Smart, sidebar o flussi pubblici.',
    releaseTitle: 'Uscite recenti',
    sourceNote: 'Nel prodotto finale qui arrivano pack e immagini cacheati da eFHUB. Questa pagina serve per validare esperienza, proporzioni e logica.',
    cardScore: 'Valutazione',
    role: 'Ruolo',
    style: 'Stile',
    build: 'Build consigliata',
    verdict: 'Verdetto',
    strengths: 'Punti forti',
    risks: 'Rischi',
    nativeSkills: 'Abilita native',
    teamFit: 'Fit con la squadra',
    noRosterTitle: 'Senza rosa diamo comunque valore',
    noRosterText: 'La valutazione generale funziona anche senza rosa. Quando la rosa e caricata, aggiungiamo chi sostituisce, doppioni e priorita reali.',
    missingData: 'Dati da verificare',
    sourcePlan: 'Piano fonte dati',
    sourcePlanText: 'Import eFHUB -> staging -> controllo qualita -> cache immagini nostra -> pubblicazione solo carte ready.',
    selectedHint: 'Clicca una carta per vedere il dettaglio.',
    topPick: 'Top',
    goodPick: 'Buona',
    situationalPick: 'Situazionale',
    skipPick: 'Skip',
    compareCta: 'Carica la rosa per il verdetto personale',
    currentRelease: 'Pack corrente',
    allCards: 'Tutte',
    imageFallback: 'Immagine in cache da collegare',
    responsiveCheck: 'Layout responsive desktop/mobile',
    checkingRoster: 'Controllo rosa...',
    rosterReadyTitle: 'Rosa trovata: fit personale attivabile',
    rosterReadyText: 'Quando collegheremo il motore, questa carta verra confrontata con titolari, riserve, modulo e priorita reali della tua squadra.',
    rosterMissingTitle: 'Rosa non ancora caricata',
    rosterMissingText: 'La pagina continua a dare valutazione generale. Per sapere se la carta entra davvero nella tua squadra, serve caricare almeno la rosa base.',
    rosterUnavailableTitle: 'Controllo rosa non disponibile',
    rosterUnavailableText: 'Il lab resta utilizzabile: la valutazione generale non dipende dalla rosa. Il fit personale verra riattivato quando il controllo dati e disponibile.',
    rosterPlayers: 'Giocatori',
    rosterStarters: 'Titolari',
    rosterFormation: 'Modulo',
    personalFitPreview: 'Anteprima logica fit',
    replacementLogic: 'confronto con chi gioca nello stesso ruolo',
    duplicateLogic: 'controllo doppioni in rosa',
    priorityLogic: 'priorita rispetto ai buchi squadra',
    loadRoster: 'Carica o completa la rosa',
    closeDetails: 'Chiudi dettagli'
  },
  en: {
    eyebrow: 'Internal lab',
    title: 'Card Advisor',
    subtitle: 'Evaluate new cards before spending coins: general verdict first, team fit once the roster is loaded.',
    dataBadge: 'UI demo - eFHUB source to connect',
    notPublic: 'Separate page: not connected to Smart, sidebar, or public flows.',
    releaseTitle: 'Recent releases',
    sourceNote: 'In production this area will receive packs and cached images from eFHUB. This page validates UX, proportions, and logic.',
    cardScore: 'Rating',
    role: 'Role',
    style: 'Style',
    build: 'Recommended build',
    verdict: 'Verdict',
    strengths: 'Strengths',
    risks: 'Risks',
    nativeSkills: 'Native skills',
    teamFit: 'Team fit',
    noRosterTitle: 'Still useful without a roster',
    noRosterText: 'The general card evaluation works without a roster. Once the roster is loaded, we add replacement, duplicate, and priority logic.',
    missingData: 'Data to verify',
    sourcePlan: 'Data source plan',
    sourcePlanText: 'eFHUB import -> staging -> quality check -> own image cache -> publish ready cards only.',
    selectedHint: 'Click a card to inspect details.',
    topPick: 'Top',
    goodPick: 'Good',
    situationalPick: 'Situational',
    skipPick: 'Skip',
    compareCta: 'Load roster for personal verdict',
    currentRelease: 'Current pack',
    allCards: 'All',
    imageFallback: 'Image cache to connect',
    responsiveCheck: 'Desktop/mobile responsive layout',
    checkingRoster: 'Checking roster...',
    rosterReadyTitle: 'Roster found: personal fit can be enabled',
    rosterReadyText: 'Once the engine is connected, this card will be compared with starters, bench, formation, and real team priorities.',
    rosterMissingTitle: 'Roster not loaded yet',
    rosterMissingText: 'The page still gives general evaluation. To know if the card really fits your team, the base roster must be loaded.',
    rosterUnavailableTitle: 'Roster check unavailable',
    rosterUnavailableText: 'The lab remains usable: general evaluation does not depend on roster data. Personal fit will be restored when the data check is available.',
    rosterPlayers: 'Players',
    rosterStarters: 'Starters',
    rosterFormation: 'Formation',
    personalFitPreview: 'Fit logic preview',
    replacementLogic: 'comparison with same-role players',
    duplicateLogic: 'duplicate check in roster',
    priorityLogic: 'priority against team gaps',
    loadRoster: 'Load or complete roster',
    closeDetails: 'Close details'
  }
}

const releases = [
  {
    id: 'naruto-collab-2026',
    name: 'NARUTO SHIPPUDEN Collaboration Campaign 2026',
    date: 'May 2026',
    cards: [
      {
        id: 'lamine-yamal-95',
        name: 'Lamine Yamal',
        position: 'EDA',
        overall: 95,
        category: 'Collaboration',
        style: 'Prolific Winger',
        imageUrl: 'https://pesdb.net/assets/img/card/f89135067068738.png',
        score: 88,
        verdict: 'top',
        build: ['Speed', 'Dribbling', 'Low Pass'],
        skills: ['Double Touch', 'Through Passing', 'Pinpoint Crossing'],
        strengths: ['Accelerazione e cambio direzione', 'Ottimo per fascia e mezzo spazio', 'Aiuta squadre che mancano creativita laterale'],
        strengthsEn: ['Acceleration and change of direction', 'Strong wide and in the half-space', 'Helps teams lacking wide creativity'],
        risks: ['Meno prioritario se hai gia ali creative top', 'Da verificare fisico e resistenza nei dati finali'],
        risksEn: ['Less urgent if you already have elite creative wingers', 'Physical contact and stamina must be verified in final data'],
        missing: ['Overall/build esatta da fonte live', 'Immagine cache interna'],
        missingEn: ['Exact overall/build from live source', 'Internal cached image']
      },
      {
        id: 'lewandowski-95',
        name: 'Robert Lewandowski',
        position: 'P',
        overall: 95,
        category: 'Collaboration',
        style: 'Fox in the Box',
        imageUrl: 'https://pesdb.net/assets/img/card/f52896011951170.png',
        score: 85,
        verdict: 'good',
        build: ['Finishing', 'Physical Contact', 'Offensive Awareness'],
        skills: ['First-time Shot', 'Heading', 'Aerial Superiority'],
        strengths: ['Finalizzatore puro', 'Forte in area e sulle palle alte', 'Ottimo se la squadra crea cross o rifiniture corte'],
        strengthsEn: ['Pure finisher', 'Strong in the box and on aerial balls', 'Excellent if the team creates crosses or short cutbacks'],
        risks: ['Puo essere statico in squadre che attaccano spazio', 'Non risolve problemi di costruzione'],
        risksEn: ['Can be static in teams attacking space', 'Does not solve build-up issues'],
        missing: ['Compatibilita build max', 'Dati booster ufficiali'],
        missingEn: ['Max build compatibility', 'Official booster data']
      },
      {
        id: 'kubo-95',
        name: 'Takefusa Kubo',
        position: 'CLD',
        overall: 95,
        category: 'Collaboration',
        style: 'Roaming Flank',
        imageUrl: 'https://pesdb.net/assets/img/card/f88039581932552.png',
        score: 90,
        verdict: 'top',
        build: ['Dribbling', 'Tight Possession', 'Finishing'],
        skills: ['Double Touch', 'Sole Control', 'Long-Range Curler'],
        strengths: ['Carta da creazione e rifinitura', 'Perfetta tra le linee', 'Aumenta imprevedibilita offensiva'],
        strengthsEn: ['Creation and finishing card', 'Excellent between the lines', 'Adds attacking unpredictability'],
        risks: ['Richiede controllo palla e timing', 'Se hai lag/input delay rende meno'],
        risksEn: ['Requires ball control and timing', 'Less effective with lag/input delay'],
        missing: ['Immagine ufficiale pack', 'Forma e dettagli release'],
        missingEn: ['Official pack image', 'Form and release details']
      }
    ]
  },
  {
    id: 'standout-attackers-season-best',
    name: "Standout Attackers 25-26 Season's Best",
    date: 'May 2026',
    cards: [
      {
        id: 'pedri-87',
        name: 'Pedri',
        position: 'CC',
        overall: 87,
        category: 'Standout',
        style: 'Hole Player',
        imageUrl: 'https://pesdb.net/assets/img/card/f89135067039781.png',
        score: 79,
        verdict: 'situational',
        build: ['Low Pass', 'Kicking Power', 'Stamina'],
        skills: ['Through Passing', 'One-touch Pass', 'Long Range Shooting'],
        strengths: ['Buon TRQ per passaggio e inserimenti', 'Utile se manca rifinitura centrale', 'Puo alzare qualita sui tiri da fuori'],
        strengthsEn: ['Good AMF for passing and runs into the box', 'Useful if central chance creation is missing', 'Can improve long-range shot threat'],
        risks: ['Non e upgrade universale', 'Dipende molto da stile squadra e modulo'],
        risksEn: ['Not a universal upgrade', 'Highly dependent on team style and formation'],
        missing: ['Stats max complete', 'Ruoli secondari verificati'],
        missingEn: ['Complete max stats', 'Verified secondary roles']
      },
      {
        id: 'rafael-leao-87',
        name: 'Rafael Leão',
        position: 'CLS',
        overall: 87,
        category: 'Standout',
        style: 'Prolific Winger',
        imageUrl: 'https://pesdb.net/assets/img/card/f89131308929393.png',
        score: 83,
        verdict: 'good',
        build: ['Speed', 'Acceleration', 'Dribbling'],
        skills: ['Double Touch', 'Sole Control', 'Gamesmanship'],
        strengths: ['Minaccia costante in fascia', 'Ottimo per transizioni e 1v1', 'Da valutare se manca profondita a sinistra'],
        strengthsEn: ['Constant wide threat', 'Excellent for transitions and 1v1s', 'Worth evaluating if left-side depth is missing'],
        risks: ['Meno utile se giochi molto centrale', 'Serve finalizzazione verificata'],
        risksEn: ['Less useful if you mostly attack centrally', 'Finishing must be verified'],
        missing: ['Overall max', 'Piede debole e injury'],
        missingEn: ['Max overall', 'Weak foot and injury resistance']
      },
      {
        id: 'mbappe-87',
        name: 'Kylian Mbappé',
        position: 'P',
        overall: 87,
        category: 'Standout',
        style: 'Goal Poacher',
        imageUrl: 'https://pesdb.net/assets/img/card/f89068226588798.png',
        score: 76,
        verdict: 'situational',
        build: ['Speed', 'Finishing', 'Balance'],
        skills: ['First-time Shot', 'Double Touch', 'Outside Curler'],
        strengths: ['Attaccante mobile', 'Interessante se vuoi profondita', 'Puo coprire piu ruoli offensivi'],
        strengthsEn: ['Mobile forward', 'Interesting if you need depth runs', 'Can cover multiple attacking roles'],
        risks: ['Da confrontare con punte gia in rosa', 'Puo essere doppione se hai gia finalizzatori veloci'],
        risksEn: ['Must be compared with your current forwards', 'Can become a duplicate if you already have fast finishers'],
        missing: ['Compatibilita ruoli completa', 'Immagine fonte'],
        missingEn: ['Full role compatibility', 'Source image']
      }
    ]
  }
]

function getVerdictMeta(verdict, labels) {
  const map = {
    top: { label: labels.topPick, color: '#22c55e', bg: 'rgba(34,197,94,0.16)' },
    good: { label: labels.goodPick, color: '#00d4ff', bg: 'rgba(0,212,255,0.14)' },
    situational: { label: labels.situationalPick, color: '#fbbf24', bg: 'rgba(251,191,36,0.14)' },
    skip: { label: labels.skipPick, color: '#fb7185', bg: 'rgba(251,113,133,0.14)' }
  }
  return map[verdict] || map.situational
}

function CardImage({ card, labels, large = false }) {
  const [failed, setFailed] = React.useState(!card.imageUrl)
  return (
    <div className={`card-art ${large ? 'card-art-large' : ''}`}>
      {!failed ? (
        <img
          src={proxiedImageUrl(card.imageUrl)}
          alt={card.name}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="card-art-fallback">
          <ImageOff size={large ? 34 : 24} />
          <span>{labels.imageFallback}</span>
        </div>
      )}
      <div className="card-art-top">
        <span>{card.overall}</span>
        <small>{card.position}</small>
      </div>
      <div className="card-art-name">{card.name}</div>
    </div>
  )
}

function StatPill({ children }) {
  return <span className="stat-pill">{children}</span>
}

function listFor(card, key, lang) {
  if (lang === 'en' && Array.isArray(card[`${key}En`])) return card[`${key}En`]
  return card[key] || []
}

function proxiedImageUrl(src) {
  if (!src) return ''
  return `/api/card-advisor-lab/image?src=${encodeURIComponent(src)}`
}

function buildRosterSummary(data) {
  const players = Array.isArray(data?.players) ? data.players : []
  const starters = players.filter(player => player?.slot_index != null && Number(player.slot_index) >= 0 && Number(player.slot_index) <= 10)
  return {
    status: players.length > 0 ? 'ready' : 'missing',
    totalPlayers: players.length,
    starters: starters.length,
    formation: data?.layout?.formation || '-'
  }
}

function ReleaseCard({ card, selected, labels, onSelect }) {
  const verdict = getVerdictMeta(card.verdict, labels)
  return (
    <button
      type="button"
      className={`release-card ${selected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <CardImage card={card} labels={labels} />
      <div className="release-card-body">
        <div className="release-card-heading">
          <div>
            <h3>{card.name}</h3>
            <p>{card.category} · {card.style}</p>
          </div>
          <ChevronRight size={18} />
        </div>
        <div className="score-row">
          <span style={{ background: verdict.bg, color: verdict.color }}>{verdict.label}</span>
          <strong>{card.score}/100</strong>
        </div>
      </div>
    </button>
  )
}

function RosterStatusPanel({ labels, rosterSummary, onLoadRoster }) {
  const isLoading = rosterSummary.status === 'loading'
  const isReady = rosterSummary.status === 'ready'
  const isUnavailable = rosterSummary.status === 'unavailable'
  const title = isLoading
    ? labels.checkingRoster
    : isReady
      ? labels.rosterReadyTitle
      : isUnavailable
        ? labels.rosterUnavailableTitle
        : labels.rosterMissingTitle
  const text = isReady
    ? labels.rosterReadyText
    : isUnavailable
      ? labels.rosterUnavailableText
      : labels.rosterMissingText

  return (
    <section className={`roster-status-panel ${isReady ? 'ready' : ''}`}>
      <div className="roster-status-main">
        <span className="mini-kicker">{labels.teamFit}</span>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>

      <div className="roster-status-side">
        <div className="roster-metrics">
          <div>
            <span>{labels.rosterPlayers}</span>
            <strong>{isLoading ? '...' : rosterSummary.totalPlayers ?? 0}</strong>
          </div>
          <div>
            <span>{labels.rosterStarters}</span>
            <strong>{isLoading ? '...' : rosterSummary.starters ?? 0}</strong>
          </div>
          <div>
            <span>{labels.rosterFormation}</span>
            <strong>{isLoading ? '...' : rosterSummary.formation || '-'}</strong>
          </div>
        </div>
        {!isReady && (
          <button type="button" onClick={onLoadRoster}>
            {labels.loadRoster}
            <ArrowRight size={16} />
          </button>
        )}
      </div>
    </section>
  )
}

function DetailPanel({ card, labels, lang, rosterSummary, onLoadRoster, onClose }) {
  const verdict = getVerdictMeta(card.verdict, labels)
  const hasRoster = rosterSummary?.status === 'ready'
  return (
    <section className="detail-panel">
      {onClose && (
        <button
          type="button"
          className="detail-close-button"
          onClick={onClose}
          aria-label={labels.closeDetails}
        >
          <X size={18} />
        </button>
      )}
      <div className="detail-hero">
        <CardImage card={card} labels={labels} large />
        <div className="detail-copy">
          <span className="mini-kicker">{labels.currentRelease}</span>
          <h2>{card.name}</h2>
          <p>{card.category} · {card.position} · {card.style}</p>
          <div className="detail-metrics">
            <div>
              <span>{labels.cardScore}</span>
              <strong>{card.score}</strong>
            </div>
            <div>
              <span>OVR</span>
              <strong>{card.overall}</strong>
            </div>
            <div>
              <span>{labels.role}</span>
              <strong>{card.position}</strong>
            </div>
          </div>
          <div className="verdict-banner" style={{ borderColor: verdict.color }}>
            <CheckCircle2 size={18} style={{ color: verdict.color }} />
            <span>{labels.verdict}: <strong style={{ color: verdict.color }}>{verdict.label}</strong></span>
          </div>
        </div>
      </div>

      <div className="detail-grid">
        <article>
          <h3><TrendingUp size={18} /> {labels.build}</h3>
          <div className="pill-row">
            {card.build.map(item => <StatPill key={item}>{item}</StatPill>)}
          </div>
        </article>

        <article>
          <h3><Sparkles size={18} /> {labels.nativeSkills}</h3>
          <div className="pill-row">
            {card.skills.map(item => <StatPill key={item}>{item}</StatPill>)}
          </div>
        </article>

        <article>
          <h3><Star size={18} /> {labels.strengths}</h3>
          <ul>
            {listFor(card, 'strengths', lang).map(item => <li key={item}>{item}</li>)}
          </ul>
        </article>

        <article>
          <h3><AlertTriangle size={18} /> {labels.risks}</h3>
          <ul>
            {listFor(card, 'risks', lang).map(item => <li key={item}>{item}</li>)}
          </ul>
        </article>
      </div>

      <div className="fit-panel">
        <div>
          <h3><Users size={18} /> {labels.teamFit}</h3>
          <p>{hasRoster ? labels.rosterReadyText : labels.noRosterText}</p>
          <div className="fit-logic-list">
            <span>{labels.replacementLogic}</span>
            <span>{labels.duplicateLogic}</span>
            <span>{labels.priorityLogic}</span>
          </div>
        </div>
        {!hasRoster && (
          <button type="button" onClick={onLoadRoster}>
            {labels.compareCta}
            <ArrowRight size={16} />
          </button>
        )}
      </div>

      <div className="data-warning">
        <AlertTriangle size={18} />
        <div>
          <strong>{labels.missingData}</strong>
          <p>{listFor(card, 'missing', lang).join(' · ')}</p>
        </div>
      </div>
    </section>
  )
}

function CardDetailsModal({ card, labels, lang, rosterSummary, onLoadRoster, onClose }) {
  React.useEffect(() => {
    if (!card) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [card, onClose])

  if (!card) return null

  return (
    <div
      className="card-details-modal"
      role="dialog"
      aria-modal="true"
      aria-label={`${card.name} ${labels.verdict}`}
      onClick={onClose}
    >
      <div className="card-details-modal-inner" onClick={(event) => event.stopPropagation()}>
        <DetailPanel
          card={card}
          labels={labels}
          lang={lang}
          rosterSummary={rosterSummary}
          onLoadRoster={onLoadRoster}
          onClose={onClose}
        />
      </div>
    </div>
  )
}

export default withAuth(function CardAdvisorLabPage() {
  const router = useRouter()
  const { lang } = useTranslation()
  const labels = copy[lang === 'en' ? 'en' : 'it']
  const [releaseId, setReleaseId] = React.useState(releases[0].id)
  const [rosterSummary, setRosterSummary] = React.useState({ status: 'loading', totalPlayers: 0, starters: 0, formation: '-' })
  const cards = React.useMemo(() => {
    if (releaseId === 'all') return releases.flatMap(release => release.cards)
    return releases.find(release => release.id === releaseId)?.cards || releases[0].cards
  }, [releaseId])
  const [selectedId, setSelectedId] = React.useState(cards[0]?.id)
  const [detailsCardId, setDetailsCardId] = React.useState(null)

  React.useEffect(() => {
    setSelectedId(cards[0]?.id)
  }, [cards])

  React.useEffect(() => {
    let active = true

    async function loadRosterSummary() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
        if (!token) {
          if (active) setRosterSummary({ status: 'missing', totalPlayers: 0, starters: 0, formation: '-' })
          return
        }

        const response = await fetch(`/api/dashboard?t=${Date.now()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache, no-store'
          },
          cache: 'no-store'
        })

        if (!response.ok) throw new Error('Unable to load roster status')
        const data = await response.json()
        if (active) setRosterSummary(buildRosterSummary(data))
      } catch (error) {
        console.warn('[card-advisor-lab] roster status unavailable:', error)
        if (active) setRosterSummary({ status: 'unavailable', totalPlayers: 0, starters: 0, formation: '-' })
      }
    }

    loadRosterSummary()
    return () => {
      active = false
    }
  }, [])

  const selectedCard = cards.find(card => card.id === selectedId) || cards[0]
  const detailsCard = cards.find(card => card.id === detailsCardId) || null

  return (
    <main className="card-advisor-page">
      <section className="lab-hero">
        <div className="hero-copy">
          <span className="lab-eyebrow"><Zap size={14} /> {labels.eyebrow}</span>
          <h1>{labels.title}</h1>
          <p>{labels.subtitle}</p>
          <div className="hero-badges">
            <span><ShieldCheck size={15} /> {labels.notPublic}</span>
            <span><BarChart3 size={15} /> {labels.responsiveCheck}</span>
            <span><Target size={15} /> {labels.dataBadge}</span>
          </div>
        </div>
        <div className="source-card">
          <span>{labels.sourcePlan}</span>
          <p>{labels.sourcePlanText}</p>
        </div>
      </section>

      <section className="release-shell">
        <div className="release-header">
          <div>
            <span className="mini-kicker">{labels.releaseTitle}</span>
            <h2>{labels.currentRelease}</h2>
            <p>{labels.sourceNote}</p>
          </div>
          <div className="release-tabs" role="tablist" aria-label={labels.releaseTitle}>
            <button
              type="button"
              className={releaseId === 'all' ? 'active' : ''}
              onClick={() => setReleaseId('all')}
            >
              {labels.allCards}
            </button>
            {releases.map(release => (
              <button
                key={release.id}
                type="button"
                className={releaseId === release.id ? 'active' : ''}
                onClick={() => setReleaseId(release.id)}
              >
                {release.name.split(' ').slice(0, 2).join(' ')}
              </button>
            ))}
          </div>
        </div>

        <RosterStatusPanel
          labels={labels}
          rosterSummary={rosterSummary}
          onLoadRoster={() => router.push('/gestione-formazione')}
        />

        <div className="lab-grid">
          <aside className="cards-column">
            <p className="selected-hint">{labels.selectedHint}</p>
            <div className="cards-grid">
              {cards.map(card => (
                <ReleaseCard
                  key={card.id}
                  card={card}
                  labels={labels}
                  selected={selectedCard?.id === card.id}
                  onSelect={() => {
                    setSelectedId(card.id)
                    setDetailsCardId(card.id)
                  }}
                />
              ))}
            </div>
          </aside>
        </div>
      </section>

      <CardDetailsModal
        card={detailsCard}
        labels={labels}
        lang={lang === 'en' ? 'en' : 'it'}
        rosterSummary={rosterSummary}
        onLoadRoster={() => router.push('/gestione-formazione')}
        onClose={() => setDetailsCardId(null)}
      />

      <style jsx global>{`
        .card-advisor-page {
          width: min(1420px, 100%);
          margin: 0 auto;
          padding: clamp(18px, 3vw, 32px);
        }

        .lab-hero,
        .release-shell,
        .detail-panel,
        .source-card {
          border: 1px solid rgba(0, 212, 255, 0.22);
          background:
            radial-gradient(circle at top right, rgba(138, 43, 226, 0.18), transparent 36%),
            linear-gradient(145deg, rgba(5, 12, 28, 0.94), rgba(2, 4, 12, 0.96));
          box-shadow: 0 0 28px rgba(0, 212, 255, 0.10), inset 0 1px 0 rgba(255,255,255,0.06);
          border-radius: 24px;
        }

        .lab-hero {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(280px, 420px);
          gap: 20px;
          align-items: stretch;
          padding: clamp(22px, 4vw, 36px);
          margin-bottom: 22px;
          overflow: hidden;
        }

        .lab-eyebrow,
        .mini-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #00d4ff;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .hero-copy h1 {
          margin: 12px 0 10px;
          font-size: clamp(34px, 7vw, 72px);
          line-height: 0.95;
          letter-spacing: -0.06em;
          color: #fff;
          text-shadow: 0 0 24px rgba(0,212,255,0.24);
        }

        .hero-copy p,
        .release-header p,
        .source-card p,
        .fit-panel p,
        .data-warning p {
          color: rgba(255,255,255,0.72);
          line-height: 1.65;
        }

        .hero-copy p {
          max-width: 760px;
          font-size: clamp(15px, 2vw, 18px);
        }

        .hero-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 22px;
        }

        .hero-badges span,
        .release-tabs button,
        .stat-pill,
        .score-row span {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(0,212,255,0.18);
          background: rgba(0,212,255,0.08);
          color: rgba(255,255,255,0.86);
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 700;
        }

        .source-card {
          padding: 22px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-height: 180px;
        }

        .source-card span {
          color: #fbbf24;
          font-weight: 900;
          margin-bottom: 8px;
        }

        .release-shell {
          padding: clamp(18px, 3vw, 26px);
        }

        .release-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 20px;
        }

        .release-header h2 {
          margin: 6px 0;
          font-size: clamp(24px, 4vw, 36px);
          color: #fff;
        }

        .release-tabs {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 8px;
          min-width: min(460px, 100%);
        }

        .release-tabs button {
          cursor: pointer;
          color: rgba(255,255,255,0.74);
        }

        .release-tabs button.active {
          background: linear-gradient(135deg, rgba(0,212,255,0.22), rgba(138,43,226,0.22));
          border-color: rgba(0,212,255,0.48);
          color: #fff;
          box-shadow: 0 0 18px rgba(0,212,255,0.16);
        }

        .lab-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          align-items: start;
        }

        .roster-status-panel {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(300px, 420px);
          gap: 16px;
          align-items: stretch;
          margin: 0 0 20px;
          padding: 16px;
          border: 1px solid rgba(251,191,36,0.22);
          border-radius: 20px;
          background:
            radial-gradient(circle at top left, rgba(251,191,36,0.14), transparent 28%),
            rgba(255,255,255,0.045);
        }

        .roster-status-panel.ready {
          border-color: rgba(34,197,94,0.35);
          background:
            radial-gradient(circle at top left, rgba(34,197,94,0.16), transparent 28%),
            rgba(255,255,255,0.045);
        }

        .roster-status-main h3 {
          margin: 8px 0;
          color: #fff;
          font-size: clamp(18px, 2.4vw, 24px);
        }

        .roster-status-main p {
          margin: 0;
          color: rgba(255,255,255,0.72);
          line-height: 1.6;
        }

        .roster-status-side {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 12px;
        }

        .roster-metrics {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .roster-metrics div {
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 14px;
          padding: 10px;
          background: rgba(2,4,12,0.34);
          min-width: 0;
        }

        .roster-metrics span {
          display: block;
          color: rgba(255,255,255,0.52);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .roster-metrics strong {
          display: block;
          margin-top: 3px;
          color: #fff;
          font-size: clamp(18px, 3vw, 24px);
          line-height: 1.1;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .roster-status-side button {
          border: 1px solid rgba(0,212,255,0.42);
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(0,212,255,0.18), rgba(138,43,226,0.20));
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 44px;
          padding: 10px 14px;
          font-weight: 800;
          cursor: pointer;
          width: 100%;
        }

        .selected-hint {
          margin: 0 0 12px;
          color: rgba(255,255,255,0.58);
          font-size: 13px;
        }

        .cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
          gap: 14px;
        }

        .card-details-modal {
          position: fixed;
          inset: 0;
          z-index: 1300;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: clamp(12px, 3vw, 28px);
          background: rgba(2, 4, 12, 0.82);
          backdrop-filter: blur(10px);
        }

        .card-details-modal-inner {
          width: min(1040px, 100%);
          max-height: min(880px, calc(100vh - 32px));
          overflow-y: auto;
          border-radius: 24px;
          box-shadow: 0 0 50px rgba(0, 212, 255, 0.22);
        }

        .card-details-modal .detail-panel {
          position: relative;
          top: auto;
        }

        .detail-close-button {
          position: sticky;
          top: 0;
          margin-left: auto;
          margin-bottom: 10px;
          z-index: 3;
          width: 40px;
          height: 40px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(2,4,12,0.76);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 0 18px rgba(0,0,0,0.35);
        }

        .release-card {
          width: 100%;
          text-align: left;
          color: #fff;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.045);
          border-radius: 18px;
          padding: 10px;
          cursor: pointer;
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .release-card:hover,
        .release-card.selected {
          transform: translateY(-2px);
          border-color: rgba(0,212,255,0.45);
          box-shadow: 0 0 22px rgba(0,212,255,0.14);
        }

        .release-card-body {
          padding: 10px 2px 2px;
        }

        .release-card-heading {
          display: flex;
          justify-content: space-between;
          gap: 10px;
        }

        .release-card h3 {
          margin: 0;
          font-size: 15px;
          line-height: 1.2;
        }

        .release-card p {
          margin: 5px 0 0;
          color: rgba(255,255,255,0.58);
          font-size: 12px;
          line-height: 1.35;
        }

        .score-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 10px;
        }

        .score-row strong {
          color: #fbbf24;
          font-size: 14px;
        }

        .card-art {
          aspect-ratio: 3 / 4.12;
          border-radius: 16px;
          overflow: hidden;
          position: relative;
          background:
            radial-gradient(circle at 50% 35%, rgba(0,212,255,0.35), transparent 26%),
            linear-gradient(155deg, #17122f 0%, #09101f 42%, #2b1142 100%);
          border: 1px solid rgba(251,191,36,0.46);
          box-shadow: inset 0 0 0 2px rgba(255,255,255,0.08), 0 0 20px rgba(138,43,226,0.18);
        }

        .card-art-large {
          width: min(270px, 42vw);
          flex: 0 0 auto;
        }

        .card-art img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .card-art::after {
          content: '';
          position: absolute;
          inset: 8px;
          border: 1px solid rgba(255,255,255,0.26);
          border-radius: 12px;
          pointer-events: none;
        }

        .card-art-fallback {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 18px;
          text-align: center;
          color: rgba(255,255,255,0.7);
          font-size: 12px;
        }

        .card-art-top {
          position: absolute;
          top: 14px;
          left: 14px;
          display: flex;
          flex-direction: column;
          line-height: 1;
          text-shadow: 0 2px 12px rgba(0,0,0,0.7);
        }

        .card-art-top span {
          font-size: clamp(26px, 5vw, 42px);
          font-weight: 950;
        }

        .card-art-top small {
          margin-top: 4px;
          font-weight: 900;
          color: rgba(255,255,255,0.76);
        }

        .card-art-name {
          position: absolute;
          left: 12px;
          right: 12px;
          bottom: 12px;
          border-radius: 10px;
          padding: 9px 8px;
          background: rgba(2,4,12,0.82);
          color: #fff;
          font-size: 13px;
          font-weight: 900;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .detail-panel {
          padding: clamp(16px, 3vw, 22px);
          position: sticky;
          top: 18px;
        }

        .detail-hero {
          display: flex;
          gap: 20px;
          align-items: stretch;
        }

        .detail-copy {
          min-width: 0;
          flex: 1;
        }

        .detail-copy h2 {
          margin: 8px 0 6px;
          font-size: clamp(28px, 4vw, 44px);
          line-height: 1;
          letter-spacing: -0.04em;
        }

        .detail-copy > p {
          color: rgba(255,255,255,0.66);
          margin-bottom: 16px;
        }

        .detail-metrics {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin: 16px 0;
        }

        .detail-metrics div {
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 16px;
          padding: 12px;
          background: rgba(255,255,255,0.05);
        }

        .detail-metrics span {
          display: block;
          color: rgba(255,255,255,0.54);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .detail-metrics strong {
          display: block;
          margin-top: 4px;
          font-size: 24px;
          color: #fff;
        }

        .verdict-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid;
          border-radius: 14px;
          padding: 12px;
          background: rgba(255,255,255,0.05);
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-top: 16px;
        }

        .detail-grid article,
        .fit-panel,
        .data-warning {
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 18px;
          padding: 14px;
          background: rgba(255,255,255,0.045);
        }

        .detail-grid h3,
        .fit-panel h3 {
          margin: 0 0 10px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 15px;
          color: #fff;
        }

        .pill-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .stat-pill {
          border-color: rgba(251,191,36,0.20);
          background: rgba(251,191,36,0.08);
        }

        .card-advisor-page ul {
          margin: 0;
          padding-left: 18px;
          color: rgba(255,255,255,0.72);
          line-height: 1.55;
          font-size: 13px;
        }

        .fit-panel {
          margin-top: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .fit-logic-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }

        .fit-logic-list span {
          display: inline-flex;
          border: 1px solid rgba(34,197,94,0.20);
          background: rgba(34,197,94,0.08);
          color: rgba(255,255,255,0.82);
          border-radius: 999px;
          padding: 7px 10px;
          font-size: 12px;
          font-weight: 700;
        }

        .fit-panel button {
          border: 1px solid rgba(0,212,255,0.42);
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(0,212,255,0.18), rgba(138,43,226,0.20));
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 44px;
          padding: 10px 14px;
          font-weight: 800;
          cursor: pointer;
          flex-shrink: 0;
        }

        .data-warning {
          margin-top: 14px;
          display: flex;
          gap: 12px;
          color: #fbbf24;
        }

        .data-warning strong {
          color: #fff;
        }

        .data-warning p {
          margin: 4px 0 0;
          font-size: 13px;
        }

        @media (max-width: 1180px) {
          .lab-grid {
            grid-template-columns: 1fr;
          }

          .cards-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 900px) {
          .lab-hero,
          .release-header,
          .detail-hero,
          .fit-panel,
          .roster-status-panel {
            grid-template-columns: 1fr;
            flex-direction: column;
          }

          .release-tabs {
            justify-content: flex-start;
            min-width: 0;
          }

          .card-art-large {
            width: min(320px, 100%);
            align-self: center;
          }
        }

        @media (max-width: 720px) {
          .card-advisor-page {
            padding: 14px;
          }

          .cards-grid,
          .detail-grid {
            grid-template-columns: 1fr;
          }

          .card-details-modal {
            align-items: flex-end;
            padding: 8px;
          }

          .card-details-modal-inner {
            width: 100%;
            max-height: calc(100vh - 16px);
            border-radius: 22px 22px 12px 12px;
          }

          .card-details-modal .detail-panel {
            padding: 14px;
          }

          .release-card {
            display: grid;
            grid-template-columns: minmax(96px, 34%) minmax(0, 1fr);
            gap: 10px;
            align-items: stretch;
          }

          .release-card-body {
            padding: 2px 2px 2px 0;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }

          .detail-metrics {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .detail-metrics strong {
            font-size: 20px;
          }

          .fit-panel button {
            width: 100%;
          }

          .roster-metrics {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 420px) {
          .detail-metrics,
          .roster-metrics {
            grid-template-columns: 1fr;
          }

          .release-card {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  )
})
