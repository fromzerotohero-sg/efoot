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
    eyebrow: 'Nuove carte',
    title: 'Card Advisor',
    subtitle: 'Valuta le nuove carte prima di spendere coins: prima giudizio generale, poi fit con la tua rosa quando sara caricata.',
    dataBadge: 'Analisi carta + fit squadra',
    notPublic: 'Scegli una carta e scopri se vale davvero per te.',
    releaseTitle: 'Uscite recenti',
    sourceNote: 'Seleziona un pack: mostriamo solo le carte di quella uscita, con ricerca e filtri per evitare una pagina infinita.',
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
    missingData: 'Nota valutazione',
    sourcePlan: 'Come funziona',
    sourcePlanText: 'Scegli una carta, leggi il verdetto generale e completa la rosa per ricevere il consiglio personalizzato.',
    selectedHint: 'Clicca una carta per vedere il dettaglio.',
    topPick: 'Top',
    goodPick: 'Buona',
    situationalPick: 'Situazionale',
    skipPick: 'Skip',
    compareCta: 'Carica la rosa per il verdetto personale',
    currentRelease: 'Pack corrente',
    allCards: 'Tutte',
    activePacks: 'Pack attivi',
    searchPlaceholder: 'Cerca giocatore, ruolo o pack...',
    cardsAvailable: 'carte disponibili',
    noCardsFound: 'Nessuna carta trovata con questi filtri.',
    needsSourceReview: 'In aggiornamento',
    imageFallback: 'Immagine in arrivo',
    responsiveCheck: 'Pensato per mobile',
    checkingRoster: 'Controllo rosa...',
    rosterReadyTitle: 'Rosa trovata: consiglio personalizzato disponibile',
    rosterReadyText: 'Questa carta verra confrontata con titolari, riserve, modulo e priorita reali della tua squadra.',
    rosterMissingTitle: 'Rosa non ancora caricata',
    rosterMissingText: 'La pagina continua a dare valutazione generale. Per sapere se la carta entra davvero nella tua squadra, serve caricare almeno la rosa base.',
    rosterUnavailableTitle: 'Valutazione generale disponibile',
    rosterUnavailableText: 'Puoi comunque valutare la carta. Completa la rosa per ricevere anche il consiglio personalizzato.',
    rosterPlayers: 'Giocatori',
    rosterStarters: 'Titolari',
    rosterFormation: 'Modulo',
    personalFitPreview: 'Fit squadra',
    replacementLogic: 'confronto con chi gioca nello stesso ruolo',
    duplicateLogic: 'controllo doppioni in rosa',
    priorityLogic: 'priorita rispetto ai buchi squadra',
    loadRoster: 'Carica o completa la rosa',
    closeDetails: 'Chiudi dettagli'
  },
  en: {
    eyebrow: 'New cards',
    title: 'Card Advisor',
    subtitle: 'Evaluate new cards before spending coins: general verdict first, team fit once the roster is loaded.',
    dataBadge: 'Card analysis + team fit',
    notPublic: 'Choose a card and see if it is really worth it for you.',
    releaseTitle: 'Recent releases',
    sourceNote: 'Select one pack: only that release is shown, with search and filters to avoid an endless page.',
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
    missingData: 'Evaluation note',
    sourcePlan: 'How it works',
    sourcePlanText: 'Choose a card, read the general verdict, and complete your roster for a personalized recommendation.',
    selectedHint: 'Click a card to inspect details.',
    topPick: 'Top',
    goodPick: 'Good',
    situationalPick: 'Situational',
    skipPick: 'Skip',
    compareCta: 'Load roster for personal verdict',
    currentRelease: 'Current pack',
    allCards: 'All',
    activePacks: 'Active packs',
    searchPlaceholder: 'Search player, role, or pack...',
    cardsAvailable: 'cards available',
    noCardsFound: 'No cards found with these filters.',
    needsSourceReview: 'Updating',
    imageFallback: 'Image coming soon',
    responsiveCheck: 'Built for mobile',
    checkingRoster: 'Checking roster...',
    rosterReadyTitle: 'Roster found: personalized advice available',
    rosterReadyText: 'This card will be compared with starters, bench, formation, and real team priorities.',
    rosterMissingTitle: 'Roster not loaded yet',
    rosterMissingText: 'The page still gives general evaluation. To know if the card really fits your team, the base roster must be loaded.',
    rosterUnavailableTitle: 'General evaluation available',
    rosterUnavailableText: 'You can still evaluate the card. Complete the roster to also receive the personalized recommendation.',
    rosterPlayers: 'Players',
    rosterStarters: 'Starters',
    rosterFormation: 'Formation',
    personalFitPreview: 'Team fit',
    replacementLogic: 'comparison with same-role players',
    duplicateLogic: 'duplicate check in roster',
    priorityLogic: 'priority against team gaps',
    loadRoster: 'Load or complete roster',
    closeDetails: 'Close details'
  }
}

const imageByName = {
  'Lamine Yamal': 'https://pesdb.net/assets/img/card/f89135067068738.png',
  'Robert Lewandowski': 'https://pesdb.net/assets/img/card/f52896011951170.png',
  'Takefusa Kubo': 'https://pesdb.net/assets/img/card/f88039581932552.png',
  Pedri: 'https://pesdb.net/assets/img/card/f89135067039781.png',
  'Ousmane Dembele': 'https://pesdb.net/assets/img/card/f89135067017250.png',
  'Ousmane Dembélé': 'https://pesdb.net/assets/img/card/f89135067017250.png',
  'Rafael Leao': 'https://pesdb.net/assets/img/card/f89131308929393.png',
  'Rafael Leão': 'https://pesdb.net/assets/img/card/f89131308929393.png',
  'Kylian Mbappe': 'https://pesdb.net/assets/img/card/f89068226588798.png',
  'Kylian Mbappé': 'https://pesdb.net/assets/img/card/f89068226588798.png',
  'Sadio Mane': 'https://pesdb.net/assets/img/card/f89137029898200.png',
  'Sadio Mané': 'https://pesdb.net/assets/img/card/f89137029898200.png'
}

function normalizeKey(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function roleFamily(position) {
  if (['PT'].includes(position)) return 'gk'
  if (['DC', 'TD', 'TS'].includes(position)) return 'def'
  if (['MED', 'CC', 'TRQ', 'CLS', 'CLD'].includes(position)) return 'mid'
  return 'att'
}

function buildAdvice(position) {
  const family = roleFamily(position)
  if (family === 'gk') {
    return {
      build: ['GK Awareness', 'Reflexes', 'Reach'],
      skills: ['GK Low Punt', 'GK Long Throw'],
      strengths: ['Buona base per stabilizzare la porta', 'Utile se subisci molto in area', 'Da valutare con altezza e riflessi'],
      strengthsEn: ['Good base to stabilize the goal', 'Useful if you concede often in the box', 'Must be checked with height and reflexes'],
      risks: ['Poco prioritario se hai gia un portiere top', 'Overall non basta: servono stats GK reali'],
      risksEn: ['Less urgent if you already have a top goalkeeper', 'Overall is not enough: real GK stats matter']
    }
  }
  if (family === 'def') {
    return {
      build: ['Defensive Awareness', 'Tackling', 'Physical Contact'],
      skills: ['Man Marking', 'Interception', 'Blocker'],
      strengths: ['Rinforza copertura e duelli', 'Utile contro attacchi diretti', 'Interessante se mancano difensori rapidi o fisici'],
      strengthsEn: ['Improves coverage and duels', 'Useful against direct attacks', 'Interesting if fast or physical defenders are missing'],
      risks: ['Controlla se ha abbastanza velocita per la tua linea difensiva', 'Puo essere doppione se hai gia centrali completi'],
      risksEn: ['Check whether he has enough speed for your defensive line', 'Can be a duplicate if you already have complete defenders']
    }
  }
  if (family === 'mid') {
    return {
      build: ['Low Pass', 'Stamina', 'Ball Control'],
      skills: ['One-touch Pass', 'Through Passing', 'Interception'],
      strengths: ['Aumenta qualita tra costruzione e rifinitura', 'Utile se manca equilibrio a centrocampo', 'Buona carta per collegare reparti'],
      strengthsEn: ['Improves build-up and chance creation', 'Useful if midfield balance is missing', 'Good card to connect team lines'],
      risks: ['Non sempre cambia la squadra da sola', 'Va confrontata con stile squadra e modulo'],
      risksEn: ['Does not always change the team alone', 'Must be compared with team style and formation']
    }
  }
  return {
    build: ['Speed', 'Finishing', 'Dribbling'],
    skills: ['First-time Shot', 'Double Touch', 'Long Range Shooting'],
    strengths: ['Porta minaccia offensiva immediata', 'Utile se ti manca profondita o finalizzazione', 'Buona per decidere partite chiuse'],
    strengthsEn: ['Adds immediate attacking threat', 'Useful if depth or finishing is missing', 'Good for deciding tight matches'],
    risks: ['Puo essere solo hype se hai gia attaccanti simili', 'Controlla piede debole e fisico prima di spendere'],
    risksEn: ['Can be pure hype if you already have similar attackers', 'Check weak foot and physical profile before spending']
  }
}

function scoreFor(overall, position) {
  const familyBoost = roleFamily(position) === 'att' ? 2 : roleFamily(position) === 'def' ? 1 : 0
  return Math.min(94, Math.max(68, overall - 4 + familyBoost))
}

function verdictFor(score) {
  if (score >= 88) return 'top'
  if (score >= 81) return 'good'
  if (score >= 74) return 'situational'
  return 'skip'
}

function makeCard(name, overall, position, category, style = 'Profilo da analizzare') {
  const score = scoreFor(overall, position)
  return {
    id: `${normalizeKey(category)}-${normalizeKey(name)}-${position}-${overall}`,
    name,
    position,
    overall,
    category,
    style,
    imageUrl: imageByName[name] || '',
    score,
    verdict: verdictFor(score),
    ...buildAdvice(position),
    missing: ['Valutazione indicativa: controlla sempre se la carta risponde al tuo modo di giocare.'],
    missingEn: ['Indicative evaluation: always check whether the card fits your playing style.']
  }
}

function makeRelease(id, name, date, category, rows, status = 'active') {
  return {
    id,
    name,
    date,
    status,
    cards: rows.map(([playerName, overall, position, style]) => makeCard(playerName, overall, position, category, style))
  }
}

const releases = [
  makeRelease('standout-guardians-season-best', "Standout Guardians 25-26 Season's Best", 'May 2026', 'Standout', [
    ['Gabriel Magalhaes', 86, 'DC'], ['Gianluigi Donnarumma', 86, 'PT'], ['Achraf Hakimi', 86, 'TD'],
    ['Leonardo Spinazzola', 80, 'TS'], ['Ramy Bensebaini', 80, 'DC'], ['Nordi Mukiele', 84, 'TD'],
    ['Boubacar Kamara', 82, 'MED'], ['Clinton Mata', 79, 'DC'], ['Jakub Kiwior', 83, 'DC'],
    ['Robin Risser', 80, 'PT'], ['Sidny Cabral', 77, 'TD']
  ]),
  makeRelease('standout-midfielders-season-best', "Standout Midfielders 25-26 Season's Best", 'May 2026', 'Standout', [
    ['Antoine Semenyo', 86, 'CLS'], ['Federico Valverde', 86, 'CC'], ['Elliot Anderson', 85, 'MED'],
    ['Pierre Hojbjerg', 81, 'CC'], ['Kouadio Kone', 81, 'CC'], ['Vitaly Janelt', 80, 'MED'],
    ['Ismael Saibari', 80, 'TRQ'], ['Martin Baturina', 82, 'CC'], ['Valentin Barco', 81, 'CC'],
    ['Tyler Morton', 80, 'MED'], ['Darko Nejasmic', 78, 'MED']
  ]),
  makeRelease('highlight-9-may-26', "Highlight 9 May '26", '9 May 2026', 'Highlight', [
    ['Antoine Griezmann', 85, 'P'], ['Geoffrey Kondogbia', 81, 'MED'], ['Stefan Savic', 80, 'DC'], ['Lucas Hernandez', 82, 'DC']
  ]),
  makeRelease('j1-league-selection-7-may-26', "J1 LEAGUE Selection 7 May '26", '7 May 2026', 'Selection', [
    ['Hiroki Sakai', 83, 'TD'], ['Zico', 84, 'TRQ'], ['Genta Miura', 77, 'DC'], ['Koya Kitagawa', 76, 'P'],
    ['Motohiko Nakajima', 76, 'SP'], ['Shunya Yoneda', 75, 'TS'], ['Shintaro Nago', 76, 'TRQ'],
    ['Tetsushi Yamakawa', 77, 'DC'], ['Reon Yamahara', 76, 'TS'], ['Akito Suzuki', 78, 'P'],
    ['George Onaiwu', 74, 'CLD'], ['Eiji Miyamoto', 76, 'CC'], ['Soichiro Mori', 74, 'TD'], ['Yoon Sung-Jun', 75, 'CC']
  ]),
  makeRelease('brasileirao-selection-7-may-26', "Brasileirao Betano Selection 7 May '26", '7 May 2026', 'Selection', [
    ['Alvaro Barreal', 80, 'CLS'], ['Vitor Roque', 82, 'P'], ['Damian Bobadilla', 81, 'CC'], ['Lucas Moura', 81, 'SP'],
    ['Jorginho', 81, 'MED'], ['Ze Ivaldo', 79, 'DC'], ['Luan Peres', 79, 'DC'], ['Ademir', 80, 'ESA'],
    ['Bruno Fuchs', 79, 'DC'], ['Raniele', 80, 'MED'], ['Viery', 77, 'DC'], ['Gustavo Henrique', 81, 'DC']
  ]),
  makeRelease('naruto-collab-2026', 'NARUTO SHIPPUDEN Collaboration Campaign 2026', 'May 2026', 'Collaboration', [
    ['Takefusa Kubo', 95, 'CLD', 'Roaming Flank'], ['Robert Lewandowski', 95, 'P', 'Fox in the Box'],
    ['Neymar Jr', 95, 'SP'], ['Martin Odegaard', 95, 'TRQ'], ['Luka Modric', 94, 'CC'],
    ['Christian Pulisic', 95, 'SP'], ['Rafael Leao', 95, 'ESA'], ['Alexis Saelemaekers', 94, 'CLD']
  ]),
  makeRelease('standout-attackers-season-best', "Standout Attackers 25-26 Season's Best", 'May 2026', 'Standout', [
    ['Bruno Fernandes', 87, 'TRQ'], ['Vinicius Junior', 87, 'ESA'], ['Ousmane Dembele', 87, 'P', 'Goal Poacher'],
    ['Gerard Moreno', 82, 'P'], ['Dennis Man', 78, 'EDA'], ['Luis Suarez', 80, 'P'],
    ['Igor Paixao', 81, 'ESA'], ['Charles De Ketelaere', 82, 'SP'], ['Ferran Jutgla', 78, 'P'],
    ['Jonathan Burkardt', 83, 'P'], ['Anis Hadj Moussa', 79, 'EDA']
  ]),
  makeRelease('worldwide-clubs-selection-30-apr-26', "Worldwide Clubs Selection 30 Apr '26", '30 Apr 2026', 'Selection', [
    ['P. E. Aubameyang', 86, 'P'], ['Marcelo', 86, 'TS'], ['Gareth Bale', 88, 'EDA'], ['Thiago Silva', 81, 'DC'],
    ['Isco', 82, 'TRQ'], ['Hamari Traore', 80, 'TD'], ['Jonas Hofmann', 80, 'TRQ'], ['Santi Comesana', 80, 'CC'],
    ['Jorgen Strand Larsen', 81, 'P'], ['Andreas Schjelderup', 81, 'ESA'], ['Lucas Beraldo', 83, 'DC']
  ]),
  makeRelease('encore-new-year-2026', 'Encore New Year 2026', '2026', 'Encore', [], 'needs_review')
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
  const [searchQuery, setSearchQuery] = React.useState('')
  const cards = React.useMemo(() => {
    const baseCards = releaseId === 'all'
      ? releases.flatMap(release => release.cards.map(card => ({ ...card, releaseName: release.name, releaseStatus: release.status })))
      : (releases.find(release => release.id === releaseId)?.cards || []).map(card => ({
          ...card,
          releaseName: releases.find(release => release.id === releaseId)?.name,
          releaseStatus: releases.find(release => release.id === releaseId)?.status
        }))
    const query = searchQuery.trim().toLowerCase()
    if (!query) return baseCards
    return baseCards.filter(card => (
      card.name.toLowerCase().includes(query) ||
      card.position.toLowerCase().includes(query) ||
      card.category.toLowerCase().includes(query) ||
      String(card.releaseName || '').toLowerCase().includes(query)
    ))
  }, [releaseId, searchQuery])
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
  const selectedRelease = releaseId === 'all'
    ? { name: labels.allCards, cards: releases.flatMap(release => release.cards), status: 'active' }
    : releases.find(release => release.id === releaseId) || releases[0]

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
      </section>

      <section className="release-shell">
        <div className="release-header">
          <div>
            <span className="mini-kicker">{labels.releaseTitle}</span>
            <h2>{selectedRelease.name}</h2>
            <p>{labels.sourceNote}</p>
          </div>
          <div className="release-toolbar">
            <label className="release-search">
              <span>{labels.activePacks}</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={labels.searchPlaceholder}
              />
            </label>
            <div className="release-count">
              <strong>{cards.length}</strong>
              <span>{labels.cardsAvailable}</span>
            </div>
          </div>
        </div>

        <div className="release-tabs" role="tablist" aria-label={labels.releaseTitle}>
          <button
            type="button"
            className={releaseId === 'all' ? 'active' : ''}
            onClick={() => setReleaseId('all')}
          >
            <strong>{labels.allCards}</strong>
            <span>{releases.reduce((sum, release) => sum + release.cards.length, 0)}</span>
          </button>
          {releases.map(release => (
            <button
              key={release.id}
              type="button"
              className={releaseId === release.id ? 'active' : ''}
              onClick={() => setReleaseId(release.id)}
            >
              <strong>{release.name}</strong>
              <span>{release.status === 'needs_review' ? labels.needsSourceReview : `${release.cards.length} ${labels.cardsAvailable}`}</span>
            </button>
          ))}
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
              {cards.length > 0 ? cards.map(card => (
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
              )) : (
                <div className="empty-card-state">
                  <AlertTriangle size={20} />
                  <span>{selectedRelease.status === 'needs_review' ? labels.needsSourceReview : labels.noCardsFound}</span>
                </div>
              )}
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
          display: block;
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

        .release-toolbar {
          display: flex;
          align-items: flex-end;
          justify-content: flex-end;
          gap: 12px;
          min-width: min(520px, 100%);
        }

        .release-search {
          display: flex;
          flex-direction: column;
          gap: 7px;
          min-width: min(360px, 100%);
        }

        .release-search span {
          color: rgba(255,255,255,0.58);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .release-search input {
          width: 100%;
          min-height: 44px;
          border: 1px solid rgba(0,212,255,0.24);
          border-radius: 14px;
          background: rgba(2,4,12,0.42);
          color: #fff;
          padding: 0 14px;
          outline: none;
        }

        .release-search input:focus {
          border-color: rgba(0,212,255,0.58);
          box-shadow: 0 0 18px rgba(0,212,255,0.12);
        }

        .release-count {
          min-width: 112px;
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 14px;
          background: rgba(255,255,255,0.05);
          padding: 9px 12px;
        }

        .release-count strong {
          display: block;
          color: #fff;
          font-size: 22px;
          line-height: 1;
        }

        .release-count span {
          display: block;
          margin-top: 4px;
          color: rgba(255,255,255,0.58);
          font-size: 11px;
        }

        .release-tabs {
          display: flex;
          overflow-x: auto;
          gap: 10px;
          margin: 0 0 18px;
          padding: 2px 2px 10px;
          scrollbar-width: thin;
        }

        .release-tabs button {
          cursor: pointer;
          color: rgba(255,255,255,0.74);
          flex: 0 0 min(260px, 78vw);
          justify-content: space-between;
          text-align: left;
          white-space: normal;
          min-height: 54px;
        }

        .release-tabs button.active {
          background: linear-gradient(135deg, rgba(0,212,255,0.22), rgba(138,43,226,0.22));
          border-color: rgba(0,212,255,0.48);
          color: #fff;
          box-shadow: 0 0 18px rgba(0,212,255,0.16);
        }

        .release-tabs button strong {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .release-tabs button span {
          color: rgba(255,255,255,0.60);
          font-size: 11px;
          flex-shrink: 0;
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

        .empty-card-state {
          border: 1px solid rgba(251,191,36,0.24);
          border-radius: 18px;
          background: rgba(251,191,36,0.08);
          color: rgba(255,255,255,0.82);
          min-height: 130px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 18px;
          text-align: center;
          grid-column: 1 / -1;
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
