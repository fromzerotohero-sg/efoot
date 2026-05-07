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
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Zap
} from 'lucide-react'

const copy = {
  it: {
    eyebrow: 'Nuove carte',
    title: 'Card Advisor',
    subtitle: 'Valuta le nuove carte prima di spendere coins con una lettura reale su ruolo, roster, coach e priorita tattica.',
    dataBadge: 'Analisi reale carta + sistema squadra',
    notPublic: 'Scegli una carta e scopri se vale davvero per te.',
    releaseTitle: 'Uscite recenti',
    sourceNote: 'Seleziona un pack: mostriamo solo le carte di quella uscita, con ricerca e filtri per evitare una pagina infinita.',
    cardScore: 'Sinergia',
    role: 'Ruolo',
    style: 'Stile',
    build: 'Cosa aggiunge',
    verdict: 'Lettura',
    strengths: 'Perché conta',
    risks: 'Rischio tecnico',
    nativeSkills: 'Profilo tecnico',
    teamFit: 'Sinergia con la tua squadra',
    noRosterTitle: 'Analisi carta disponibile',
    noRosterText: 'Senza rosa leggiamo stile, ruolo e profilo tecnico. Con la rosa aggiungiamo doppioni, alternative e priorita reali.',
    selectedHint: 'Clicca una carta per vedere il dettaglio.',
    topPick: 'Sinergia alta',
    goodPick: 'Sinergia buona',
    situationalPick: 'Sinergia parziale',
    skipPick: 'Da contestualizzare',
    compareCta: 'Completa i dati per la sinergia',
    currentRelease: 'Pack corrente',
    allCards: 'Tutte',
    activePacks: 'Pack attivi',
    searchPlaceholder: 'Cerca giocatore, ruolo o pack...',
    cardsAvailable: 'carte disponibili',
    noCardsFound: 'Nessuna carta trovata con questi filtri.',
    needsSourceReview: 'In aggiornamento',
    similarPlayers: 'Alternative in rosa',
    priorityVerdict: 'Lettura per te',
    synergyHigh: 'Sinergia alta',
    synergyMedium: 'Sinergia media',
    synergyLow: 'Sinergia bassa',
    cardProfileOnly: 'Profilo carta',
    rosterSynergy: 'Sinergia rosa',
    moduleFit: 'Fit modulo',
    systemSynergy: 'Sinergia sistema',
    noFormationTitle: 'Formazione non salvata',
    noFormationText: 'Hai giocatori in rosa: posso valutare ruolo, doppioni e alternative, ma per sapere se entra nei titolari serve una formazione salvata.',
    noCoachText: 'Aggiungi il coach attivo per leggere stile squadra, competenze e Link-up.',
    saveFormationCta: 'Salva formazione per il fit titolari',
    addCoachCta: 'Aggiungi coach per sinergia completa',
    analyzeSynergy: 'Analizza sinergia',
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
    replacementLogic: 'ruolo nella rosa',
    duplicateLogic: 'doppioni tecnici',
    priorityLogic: 'priorita squadra',
    loadRoster: 'Carica o completa la rosa',
    closeDetails: 'Chiudi dettagli',
    mainLever: 'Leva principale',
    coachLinkup: 'Coach e Link-up',
    recommendedUse: 'Uso consigliato',
    noNativeSkills: 'Profilo tecnico non ancora disponibile per questa carta',
  },
  en: {
    eyebrow: 'New cards',
    title: 'Card Advisor',
    subtitle: 'Evaluate new cards before spending coins with a real read on role, roster, coach, and tactical priority.',
    dataBadge: 'Real card and system fit analysis',
    notPublic: 'Choose a card and see if it is really worth it for you.',
    releaseTitle: 'Recent releases',
    sourceNote: 'Select one pack: only that release is shown, with search and filters to avoid an endless page.',
    cardScore: 'Synergy',
    role: 'Role',
    style: 'Style',
    build: 'What it adds',
    verdict: 'Read',
    strengths: 'Why it matters',
    risks: 'Technical risk',
    nativeSkills: 'Technical profile',
    teamFit: 'Team synergy',
    noRosterTitle: 'Card profile available',
    noRosterText: 'Without a roster we read style, role, and technical profile. With the roster we add duplicates, alternatives, and real priorities.',
    selectedHint: 'Click a card to inspect details.',
    topPick: 'High synergy',
    goodPick: 'Good synergy',
    situationalPick: 'Partial synergy',
    skipPick: 'Needs context',
    compareCta: 'Complete data for synergy',
    currentRelease: 'Current pack',
    allCards: 'All',
    activePacks: 'Active packs',
    searchPlaceholder: 'Search player, role, or pack...',
    cardsAvailable: 'cards available',
    noCardsFound: 'No cards found with these filters.',
    needsSourceReview: 'Updating',
    similarPlayers: 'Roster alternatives',
    priorityVerdict: 'Read for you',
    synergyHigh: 'High synergy',
    synergyMedium: 'Medium synergy',
    synergyLow: 'Low synergy',
    cardProfileOnly: 'Card profile',
    rosterSynergy: 'Roster synergy',
    moduleFit: 'Module fit',
    systemSynergy: 'System synergy',
    noFormationTitle: 'Formation not saved',
    noFormationText: 'You have players in the roster: I can read role, duplicates, and alternatives, but a saved formation is needed to know if the card enters the starters.',
    noCoachText: 'Add the active coach to read team style, competences, and Link-up.',
    saveFormationCta: 'Save formation for starter fit',
    addCoachCta: 'Add coach for full synergy',
    analyzeSynergy: 'Analyze synergy',
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
    replacementLogic: 'roster role',
    duplicateLogic: 'technical duplicates',
    priorityLogic: 'team priority',
    loadRoster: 'Load or complete roster',
    closeDetails: 'Close details',
    mainLever: 'Main lever',
    coachLinkup: 'Coach and Link-up',
    recommendedUse: 'Recommended use',
    noNativeSkills: 'Technical profile not available for this card yet',
  }
}

const imageByName = {
  'Gianluigi Donnarumma': 'https://pesdb.net/assets/img/card/f105692702811895.png',
  'Achraf Hakimi': 'https://pesdb.net/assets/img/card/f105692702817576.png',
  'Federico Valverde': 'https://pesdb.net/assets/img/card/f52895743589623.png',
  'Antoine Griezmann': 'https://pesdb.net/assets/img/card/f52895743518028.png',
  Zico: 'https://pesdb.net/assets/img/card/f88035555413486.png',
  'Lamine Yamal': 'https://pesdb.net/assets/img/card/f89135067068738.png',
  'Robert Lewandowski': 'https://pesdb.net/assets/img/card/f52896011951170.png',
  'Takefusa Kubo': 'https://pesdb.net/assets/img/card/f88039581932552.png',
  Pedri: 'https://pesdb.net/assets/img/card/f89135067039781.png',
  'Bruno Fernandes': 'https://pesdb.net/assets/img/card/f52898696326240.png',
  Jorginho: 'https://pesdb.net/assets/img/card/f106730474235970.png',
  'P. E. Aubameyang': 'https://pesdb.net/assets/img/card/f70375186668931.png',
  Marcelo: 'https://pesdb.net/assets/img/card/f70374649792604.png',
  'Lucas Moura': 'https://pesdb.net/assets/img/card/f70374649800594.png',
  'Gareth Bale': 'https://pesdb.net/assets/img/card/f89133724764840.png',
  'Thiago Silva': 'https://pesdb.net/assets/img/card/f106652896368901.png',
  'Jonas Hofmann': 'https://pesdb.net/assets/img/card/f105563853795563.png',
  'Neymar Jr': 'https://pesdb.net/assets/img/card/f89133993205152.png',
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
      build: ['Stabilità porta', 'Reattività', 'Gestione area'],
      skills: [],
      strengths: ['Porta sicurezza nelle situazioni dentro l’area', 'Riduce il rischio sulle conclusioni ravvicinate'],
      strengthsEn: ['Adds security inside the box', 'Reduces risk on close-range shots'],
      risks: ['Diventa rotazione quando hai già un portiere affidabile e completo'],
      risksEn: ['Becomes rotation when you already have a reliable complete goalkeeper'],
      lever: 'Stabilità porta',
      leverEn: 'Goal stability',
      use: 'Usalo come portiere titolare quando vuoi ridurre errori e rimbalzi in area.',
      useEn: 'Use him as starting goalkeeper when you want fewer errors and rebounds in the box.'
    }
  }
  if (family === 'def') {
    return {
      build: ['Copertura', 'Duelli', 'Recupero palla'],
      skills: [],
      strengths: ['Rinforza copertura e duelli difensivi', 'Aggiunge presenza nelle chiusure e nei recuperi'],
      strengthsEn: ['Improves defensive coverage and duels', 'Adds presence in blocks and recoveries'],
      risks: ['Diventa doppione quando hai già difensori rapidi con Intercettazione e Blocco'],
      risksEn: ['Becomes a duplicate when you already have fast defenders with Interception and Blocker'],
      lever: 'Copertura e recupero',
      leverEn: 'Coverage and recovery',
      use: 'Usalo per proteggere il lato scoperto e recuperare campo dopo perdita palla.',
      useEn: 'Use him to protect the exposed side and recover ground after losing possession.'
    }
  }
  if (family === 'mid') {
    return {
      build: ['Costruzione', 'Continuità', 'Connessione reparti'],
      skills: [],
      strengths: ['Aumenta qualità tra costruzione e rifinitura', 'Dà più continuità al possesso e alle uscite centrali'],
      strengthsEn: ['Improves build-up and chance creation', 'Adds continuity to possession and central exits'],
      risks: ['Diventa rotazione quando il centrocampo è già coperto da passaggio e filtro'],
      risksEn: ['Becomes rotation when midfield already has passing and defensive coverage'],
      lever: 'Connessione tra reparti',
      leverEn: 'Team-line connection',
      use: 'Usalo per collegare difesa e attacco, non come semplice giocatore da inserimento.',
      useEn: 'Use him to connect defence and attack, not just as a runner.'
    }
  }
  return {
    build: ['Profondità', 'Finalizzazione', '1 contro 1'],
    skills: [],
    strengths: ['Aggiunge minaccia offensiva immediata', 'Alza profondità, ritmo e presenza negli ultimi metri'],
    strengthsEn: ['Adds immediate attacking threat', 'Raises depth, tempo and presence in the final third'],
    risks: ['Diventa doppione quando hai già attaccanti rapidi con finalizzazione e movimento simili'],
    risksEn: ['Becomes a duplicate when you already have fast forwards with similar finishing and movement'],
    lever: 'Profondità offensiva',
    leverEn: 'Attacking depth',
    use: 'Usalo per attaccare spazio e chiudere azioni, non per abbassarsi a costruire.',
    useEn: 'Use him to attack space and finish moves, not to drop deep for build-up.'
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

function enrichCard(card) {
  const normalized = {
    style: 'Profilo da analizzare',
    ...card,
    imageUrl: card.imageUrl || imageByName[card.name] || ''
  }
  const score = scoreFor(normalized.overall, normalized.position)
  return {
    ...normalized,
    id: normalized.id || `${normalizeKey(normalized.category)}-${normalizeKey(normalized.name)}-${normalized.position}-${normalized.overall}`,
    score: normalized.score ?? score,
    verdict: normalized.verdict || verdictFor(score),
    ...buildAdvice(normalized.position),
    lever: normalized.lever || buildAdvice(normalized.position).lever,
    leverEn: normalized.leverEn || buildAdvice(normalized.position).leverEn,
    use: normalized.use || buildAdvice(normalized.position).use,
    useEn: normalized.useEn || buildAdvice(normalized.position).useEn,
    missing: normalized.missing || ['Con la rosa completa il verdetto tiene conto di ruolo, doppioni e priorita squadra.'],
    missingEn: normalized.missingEn || ['With a complete roster, the verdict considers role, duplicates, and team priorities.']
  }
}

function makeCard(name, overall, position, category, style = 'Profilo da analizzare') {
  const score = scoreFor(overall, position)
  return enrichCard({
    id: `${normalizeKey(category)}-${normalizeKey(name)}-${position}-${overall}`,
    name,
    position,
    overall,
    category,
    style,
    imageUrl: imageByName[name] || '',
    score,
    verdict: verdictFor(score)
  })
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

function normalizeRelease(release) {
  return {
    ...release,
    cards: Array.isArray(release.cards) ? release.cards.map(enrichCard) : []
  }
}

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
          <div className="player-silhouette" aria-hidden="true">
            <span className="player-head" />
            <span className="player-body" />
            <span className="player-leg player-leg-left" />
            <span className="player-leg player-leg-right" />
            <span className="player-ball" />
          </div>
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
  const hasRoster = players.length > 0
  const hasFormation = Boolean(data?.layout?.formation) && starters.length > 0
  const hasActiveCoach = Boolean(data?.activeCoach || data?.hasActiveCoach)
  const hasTacticalSettings = Boolean(data?.tacticalSettings?.team_playing_style)
  const roleCounts = players.reduce((acc, player) => {
    const position = player?.position || '?'
    acc[position] = (acc[position] || 0) + 1
    return acc
  }, {})
  return {
    status: hasRoster ? 'ready' : 'missing',
    depth: !hasRoster ? 'card_only' : !hasFormation ? 'roster_only' : hasActiveCoach ? 'system' : 'formation',
    totalPlayers: players.length,
    starters: starters.length,
    formation: data?.layout?.formation || '-',
    players,
    startersList: starters,
    roleCounts,
    profile: data?.profile || {},
    activeCoach: data?.activeCoach || null,
    tacticalSettings: data?.tacticalSettings || null,
    hasRoster,
    hasFormation,
    hasActiveCoach,
    hasTacticalSettings,
    hasGameAnalysis: !!data?.gameAnalysis?.stats
  }
}

function getSameRolePlayers(rosterSummary, position) {
  const players = Array.isArray(rosterSummary?.players) ? rosterSummary.players : []
  return players
    .filter(player => player?.position === position)
    .sort((a, b) => (Number(b.overall_rating) || 0) - (Number(a.overall_rating) || 0))
    .slice(0, 3)
}

function getCoachConnectionLabel(activeCoach) {
  const connection = activeCoach?.connection
  if (!connection || typeof connection !== 'object') return ''
  return connection.name || connection.connection || connection.title || connection.label || ''
}

function getFitSummary(card, rosterSummary, labels, lang) {
  const sameRole = getSameRolePlayers(rosterSummary, card.position)
  const depth = rosterSummary?.depth || 'card_only'
  if (depth === 'card_only') {
    return {
      title: labels.rosterMissingTitle,
      text: lang === 'en'
        ? `${card.name} is read as a technical profile: role, style and native skills. Add your roster to unlock the team synergy read.`
        : `${card.name} viene letto come profilo tecnico: ruolo, stile e abilita native. Aggiungi la rosa per sbloccare la sinergia squadra.`,
      priority: labels.cardProfileOnly,
      alternatives: [],
      cta: labels.loadRoster,
      ctaTarget: 'roster'
    }
  }

  const best = sameRole[0]
  const bestRating = Number(best?.overall_rating) || 0
  const gap = Number(card.overall) - bestRating
  const roleCount = rosterSummary.roleCounts?.[card.position] || 0
  let priority = labels.synergyMedium
  if (roleCount === 0 || gap >= 4) priority = labels.synergyHigh
  if (roleCount >= 2 && gap <= 1) priority = labels.synergyLow

  if (depth === 'roster_only') {
    const text = lang === 'en'
      ? best
        ? `${card.name} is compared with ${best.player_name} in ${card.position}. This is still roster synergy: save a formation to know if the card enters your starters.`
        : `${card.name} covers ${card.position}, a role where your roster has no direct alternative yet. Save a formation to read the starter fit.`
      : best
        ? `${card.name} viene confrontato con ${best.player_name} nel ruolo ${card.position}. Questa e ancora sinergia rosa: salva una formazione per sapere se entra nei titolari.`
        : `${card.name} copre ${card.position}, un ruolo dove la tua rosa non ha alternative dirette. Salva una formazione per leggere il fit titolari.`

    return {
      title: labels.noFormationTitle,
      text,
      priority: labels.rosterSynergy,
      alternatives: sameRole,
      cta: labels.saveFormationCta,
      ctaTarget: 'formation'
    }
  }

  const baseText = lang === 'en'
    ? best
      ? `${card.name} is compared first with ${best.player_name} in ${card.position}. Formation data lets us read if this is a starter fit, rotation, or duplicate.`
      : `${card.name} covers ${card.position}, a role not directly covered in your saved formation.`
    : best
      ? `${card.name} viene confrontato prima con ${best.player_name} nel ruolo ${card.position}. La formazione permette di capire se e fit titolare, rotazione o doppione.`
      : `${card.name} copre ${card.position}, un ruolo non coperto direttamente nella formazione salvata.`

  if (depth === 'formation') {
    return {
      title: labels.moduleFit,
      text: `${baseText} ${labels.noCoachText}`,
      priority: labels.moduleFit,
      alternatives: sameRole,
      cta: labels.addCoachCta,
      ctaTarget: 'coach'
    }
  }

  return {
    title: labels.systemSynergy,
    text: lang === 'en'
      ? `${baseText} Coach and tactics are available, so the read includes team style, coach competences${getCoachConnectionLabel(rosterSummary.activeCoach) ? ` and Link-up ${getCoachConnectionLabel(rosterSummary.activeCoach)}` : ' and Link-up'}.`
      : `${baseText} Coach e tattica sono presenti: la lettura include stile squadra, competenze coach${getCoachConnectionLabel(rosterSummary.activeCoach) ? ` e Link-up ${getCoachConnectionLabel(rosterSummary.activeCoach)}` : ' e Link-up'}.`,
    priority,
    alternatives: sameRole,
    cta: null,
    ctaTarget: null
  }
}

function ReleaseCard({ card, selected, labels, onSelect }) {
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
          <span>{card.category}</span>
          <strong>{labels.analyzeSynergy}</strong>
        </div>
      </div>
    </button>
  )
}

function RosterStatusPanel({ labels, rosterSummary, onLoadRoster, onOpenCoach }) {
  const isLoading = rosterSummary.status === 'loading'
  const isReady = rosterSummary.status === 'ready'
  const isUnavailable = rosterSummary.status === 'unavailable'
  const isRosterOnly = rosterSummary.depth === 'roster_only'
  const isFormationOnly = rosterSummary.depth === 'formation'
  const title = isLoading
    ? labels.checkingRoster
    : isReady
      ? isRosterOnly
        ? labels.noFormationTitle
        : labels.rosterReadyTitle
      : isUnavailable
        ? labels.rosterUnavailableTitle
        : labels.rosterMissingTitle
  const text = isReady
    ? isRosterOnly
      ? labels.noFormationText
      : isFormationOnly
        ? `${labels.rosterReadyText} ${labels.noCoachText}`
        : labels.rosterReadyText
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
        {(!isReady || isRosterOnly || isFormationOnly) && (
          <button type="button" onClick={isFormationOnly ? onOpenCoach : onLoadRoster}>
            {isRosterOnly ? labels.saveFormationCta : isFormationOnly ? labels.addCoachCta : labels.loadRoster}
            <ArrowRight size={16} />
          </button>
        )}
      </div>
    </section>
  )
}

function DetailPanel({ card, labels, lang, rosterSummary, evaluation, evaluating, onOpenFormation, onOpenCoach, onClose }) {
  const verdict = getVerdictMeta(card.verdict, labels)
  const fitSummary = getFitSummary(card, rosterSummary, labels, lang)
  const serverEval = evaluation || null
  const lever = serverEval?.mainLever || (lang === 'en' ? (card.leverEn || card.lever) : card.lever)
  const recommendedUse = serverEval?.recommendedUse || (lang === 'en' ? (card.useEn || card.use) : card.use)
  const connectionLabel = getCoachConnectionLabel(rosterSummary?.activeCoach)
  const coachLinkText = connectionLabel
    ? (lang === 'en'
        ? `Link-up ${connectionLabel} is part of this read: the card is evaluated inside your coach setup.`
        : `Il Link-up ${connectionLabel} entra nella lettura: la carta viene valutata dentro il tuo assetto coach.`)
    : (rosterSummary?.hasActiveCoach
        ? (lang === 'en'
            ? 'Coach and tactics are part of this read.'
            : 'Coach e tattica entrano nella lettura.')
        : (lang === 'en'
            ? 'Add the active coach to include Link-up and style competences.'
            : 'Aggiungi il coach attivo per includere Link-up e competenze stile.'))
  const effectiveTitle = serverEval?.title || fitSummary.title
  const effectivePriority = serverEval?.synergyLevel || fitSummary.priority
  const effectiveFitText = serverEval?.whyItMatters?.length ? serverEval.whyItMatters.join(' ') : fitSummary.text
  const effectiveAlternatives = serverEval?.alternatives || fitSummary.alternatives
  const effectiveCoachText = serverEval?.coachLinkup || coachLinkText
  const effectiveRisk = serverEval?.technicalRisk ? [serverEval.technicalRisk] : listFor(card, 'risks', lang)
  const strengthItems = serverEval?.strengths?.length ? serverEval.strengths : listFor(card, 'strengths', lang)
  const fitReadLines = serverEval?.rosterRead?.length
    ? serverEval.rosterRead
    : effectiveFitText
      ? [effectiveFitText]
      : []
  const effectiveCta = serverEval?.nextCta || (fitSummary.cta ? { label: fitSummary.cta, target: fitSummary.ctaTarget } : null)
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
              <strong>{evaluating ? '...' : effectivePriority}</strong>
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
            <span>{labels.verdict}: <strong style={{ color: verdict.color }}>{effectiveTitle}</strong></span>
          </div>
        </div>
      </div>

      <div className="detail-grid">
        <article>
          <h3><TrendingUp size={18} /> {labels.mainLever}</h3>
          <div className="pill-row">
            <StatPill>{lever}</StatPill>
          </div>
        </article>

        <article>
          <h3><Sparkles size={18} /> {labels.nativeSkills}</h3>
          <div className="pill-row">
            {(serverEval?.technicalProfile || card.skills).length > 0
              ? (serverEval?.technicalProfile || card.skills).map(item => <StatPill key={item}>{item}</StatPill>)
              : <StatPill>{labels.noNativeSkills}</StatPill>}
          </div>
        </article>

        <article>
          <h3><Star size={18} /> {labels.strengths}</h3>
          <ul>
            {strengthItems.map(item => <li key={item}>{item}</li>)}
          </ul>
        </article>

        <article>
          <h3><AlertTriangle size={18} /> {labels.risks}</h3>
          <ul>
            {effectiveRisk.map(item => <li key={item}>{item}</li>)}
          </ul>
        </article>
      </div>

      <div className="detail-grid detail-grid-secondary">
        <article>
          <h3><Users size={18} /> {labels.coachLinkup}</h3>
          <p>{effectiveCoachText}</p>
        </article>

        <article>
          <h3><CheckCircle2 size={18} /> {labels.recommendedUse}</h3>
          <p>{recommendedUse}</p>
        </article>
      </div>

      <div className="fit-panel">
        <div>
          <h3><Users size={18} /> {labels.teamFit}</h3>
          <p>{fitReadLines[0] || effectiveFitText}</p>
          {fitReadLines.length > 1 && (
            <ul>
              {fitReadLines.slice(1).map(item => <li key={item}>{item}</li>)}
            </ul>
          )}
          <div className="fit-summary-grid">
            <div>
              <span>{labels.priorityVerdict}</span>
              <strong>{effectivePriority}</strong>
            </div>
            <div>
              <span>{labels.similarPlayers}</span>
              <strong>
                {effectiveAlternatives.length > 0
                  ? effectiveAlternatives.map(player => `${player.player_name || player.name}${player.overall_rating || player.overall ? ` ${player.overall_rating || player.overall}` : ''}`).join(', ')
                  : '-'}
              </strong>
            </div>
          </div>
          {!serverEval && (
            <div className="fit-logic-list">
              <span>{labels.replacementLogic}</span>
              <span>{labels.duplicateLogic}</span>
              <span>{labels.priorityLogic}</span>
            </div>
          )}
        </div>
        {effectiveCta && (
          <button
            type="button"
            onClick={effectiveCta.target === 'coach' ? onOpenCoach : onOpenFormation}
          >
            {effectiveCta.label}
            <ArrowRight size={16} />
          </button>
        )}
      </div>

    </section>
  )
}

function CardDetailsModal({ card, labels, lang, rosterSummary, evaluation, evaluating, onOpenFormation, onOpenCoach, onClose }) {
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
          evaluation={evaluation}
          evaluating={evaluating}
          onOpenFormation={onOpenFormation}
          onOpenCoach={onOpenCoach}
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
  const [liveReleases, setLiveReleases] = React.useState(null)
  const activeReleases = React.useMemo(() => (
    Array.isArray(liveReleases) && liveReleases.length > 0 ? liveReleases : releases
  ), [liveReleases])
  const [releaseId, setReleaseId] = React.useState(releases[0].id)
  const [rosterSummary, setRosterSummary] = React.useState({ status: 'loading', totalPlayers: 0, starters: 0, formation: '-' })
  const [searchQuery, setSearchQuery] = React.useState('')
  const [evaluationsByCard, setEvaluationsByCard] = React.useState({})
  const [evaluatingCardId, setEvaluatingCardId] = React.useState(null)
  const cards = React.useMemo(() => {
    const baseCards = releaseId === 'all'
      ? activeReleases.flatMap(release => release.cards.map(card => ({ ...card, releaseName: release.name, releaseStatus: release.status })))
      : (activeReleases.find(release => release.id === releaseId)?.cards || []).map(card => ({
          ...card,
          releaseName: activeReleases.find(release => release.id === releaseId)?.name,
          releaseStatus: activeReleases.find(release => release.id === releaseId)?.status
        }))
    const query = searchQuery.trim().toLowerCase()
    if (!query) return baseCards
    return baseCards.filter(card => (
      card.name.toLowerCase().includes(query) ||
      card.position.toLowerCase().includes(query) ||
      card.category.toLowerCase().includes(query) ||
      String(card.releaseName || '').toLowerCase().includes(query)
    ))
  }, [activeReleases, releaseId, searchQuery])
  const [selectedId, setSelectedId] = React.useState(cards[0]?.id)
  const [detailsCardId, setDetailsCardId] = React.useState(null)

  React.useEffect(() => {
    setSelectedId(cards[0]?.id)
  }, [cards])

  React.useEffect(() => {
    let active = true

    async function loadReleases() {
      try {
        const response = await fetch('/api/card-advisor-lab/releases', { cache: 'no-store' })
        if (!response.ok) throw new Error('Unable to load card releases')
        const data = await response.json()
        const normalized = Array.isArray(data?.releases)
          ? data.releases.map(normalizeRelease).filter(release => release.cards.length > 0)
          : []

        if (!active) return
        if (normalized.length > 0) {
          setLiveReleases(normalized)
          setReleaseId(normalized[0].id)
        }
      } catch (error) {
        console.warn('[card-advisor-lab] live releases unavailable:', error)
      }
    }

    loadReleases()
    return () => {
      active = false
    }
  }, [])

  const selectedCard = cards.find(card => card.id === selectedId) || cards[0]
  const detailsCard = cards.find(card => card.id === detailsCardId) || null
  const detailsEvaluation = detailsCard ? evaluationsByCard[detailsCard.id] : null

  React.useEffect(() => {
    let active = true

    async function loadRosterSummary() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
        if (!token) {
          if (active) setRosterSummary({ status: 'missing', totalPlayers: 0, starters: 0, formation: '-' })
          return
        }

        const [formationResponse, dashboardResponse] = await Promise.all([
          fetch(`/api/formation?t=${Date.now()}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Cache-Control': 'no-cache, no-store'
            },
            cache: 'no-store'
          }),
          fetch(`/api/dashboard?t=${Date.now()}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Cache-Control': 'no-cache, no-store'
            },
            cache: 'no-store'
          })
        ])

        if (!formationResponse.ok) throw new Error('Unable to load formation status')
        const formationData = await formationResponse.json()
        const dashboardData = dashboardResponse.ok ? await dashboardResponse.json() : {}
        const data = {
          ...dashboardData,
          ...formationData,
          profile: dashboardData.profile,
          gameAnalysis: dashboardData.gameAnalysis
        }

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

  React.useEffect(() => {
    let active = true

    async function loadEvaluation() {
      if (!detailsCard?.id) return
      if (evaluationsByCard[detailsCard.id]) return
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) return

      setEvaluatingCardId(detailsCard.id)
      try {
        const response = await fetch('/api/card-advisor-lab/evaluate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ card: detailsCard, lang: lang === 'en' ? 'en' : 'it' })
        })
        if (!response.ok) throw new Error('Evaluation failed')
        const data = await response.json()
        if (active && data?.evaluation) {
          setEvaluationsByCard(prev => ({ ...prev, [detailsCard.id]: data.evaluation }))
        }
      } catch (error) {
        console.warn('[card-advisor-lab] evaluation unavailable:', error)
      } finally {
        if (active) setEvaluatingCardId(null)
      }
    }

    loadEvaluation()
    return () => {
      active = false
    }
  }, [detailsCard, evaluationsByCard, lang])

  const selectedRelease = releaseId === 'all'
    ? { name: labels.allCards, cards: activeReleases.flatMap(release => release.cards), status: 'active' }
    : activeReleases.find(release => release.id === releaseId) || activeReleases[0]

  return (
    <main className="card-advisor-page">
      <section className="lab-hero">
        <div className="hero-copy">
          <span className="lab-eyebrow"><Zap size={14} /> {labels.eyebrow}</span>
          <h1>{labels.title}</h1>
          <p>{labels.subtitle}</p>
          <div className="hero-badges">
            <span><ShieldCheck size={15} /> {labels.notPublic}</span>
            <span><BarChart3 size={15} /> {labels.dataBadge}</span>
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
            <span>{activeReleases.reduce((sum, release) => sum + release.cards.length, 0)}</span>
          </button>
          {activeReleases.map(release => (
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
          onOpenCoach={() => router.push('/allenatori')}
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
        evaluation={detailsEvaluation}
        evaluating={detailsCard?.id === evaluatingCardId}
        onOpenFormation={() => router.push('/gestione-formazione')}
        onOpenCoach={() => router.push('/allenatori')}
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
        .detail-panel {
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
        .fit-panel p {
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

        .fit-summary-grid {
          display: grid;
          grid-template-columns: minmax(110px, 0.35fr) minmax(0, 1fr);
          gap: 10px;
          margin-top: 12px;
        }

        .fit-summary-grid div {
          border: 1px solid rgba(34,197,94,0.18);
          background: rgba(34,197,94,0.07);
          border-radius: 14px;
          padding: 10px;
          min-width: 0;
        }

        .fit-summary-grid span {
          display: block;
          color: rgba(255,255,255,0.56);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .fit-summary-grid strong {
          display: block;
          margin-top: 4px;
          color: #fff;
          font-size: 13px;
          line-height: 1.4;
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
          align-items: center;
          justify-content: center;
          background:
            radial-gradient(circle at 50% 30%, rgba(0,212,255,0.22), transparent 22%),
            linear-gradient(155deg, rgba(24,18,54,0.95), rgba(6,10,26,0.98));
        }

        .player-silhouette {
          position: relative;
          width: 58%;
          height: 62%;
          filter: drop-shadow(0 0 20px rgba(0,212,255,0.28));
        }

        .player-head,
        .player-body,
        .player-leg,
        .player-ball {
          position: absolute;
          display: block;
          background: linear-gradient(180deg, rgba(255,255,255,0.90), rgba(0,212,255,0.50));
        }

        .player-head {
          top: 2%;
          left: 42%;
          width: 18%;
          aspect-ratio: 1;
          border-radius: 50%;
        }

        .player-body {
          top: 20%;
          left: 34%;
          width: 31%;
          height: 38%;
          border-radius: 45% 45% 35% 35%;
          transform: rotate(-8deg);
        }

        .player-leg {
          top: 54%;
          width: 13%;
          height: 36%;
          border-radius: 999px;
          transform-origin: top center;
        }

        .player-leg-left {
          left: 36%;
          transform: rotate(18deg);
        }

        .player-leg-right {
          left: 53%;
          transform: rotate(-24deg);
        }

        .player-ball {
          right: 4%;
          bottom: 7%;
          width: 18%;
          aspect-ratio: 1;
          border-radius: 50%;
          background:
            radial-gradient(circle at 35% 35%, #fff, rgba(255,255,255,0.7) 34%, rgba(0,212,255,0.55) 35%, rgba(0,212,255,0.55));
          border: 1px solid rgba(255,255,255,0.55);
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

        .detail-grid-secondary {
          margin-top: 12px;
        }

        .detail-grid article,
        .fit-panel {
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

        .detail-grid article p {
          color: rgba(255,255,255,0.72);
          line-height: 1.6;
          margin: 0;
          font-size: 13px;
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

          .release-toolbar {
            width: 100%;
            flex-direction: column;
            align-items: stretch;
          }

          .release-search {
            min-width: 0;
            width: 100%;
          }

          .release-count {
            width: 100%;
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
            padding: 10px;
          }

          .lab-hero,
          .release-shell {
            border-radius: 18px;
            padding: 16px;
          }

          .hero-copy h1 {
            font-size: clamp(34px, 13vw, 48px);
            letter-spacing: -0.05em;
          }

          .hero-badges span {
            width: 100%;
            justify-content: center;
          }

          .cards-grid,
          .detail-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
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
            display: flex;
            flex-direction: column;
            min-width: 0;
          }

          .release-card-body {
            padding: 10px 2px 2px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }

          .release-card h3 {
            font-size: 13px;
          }

          .release-card p {
            font-size: 11px;
          }

          .card-art-name {
            font-size: 11px;
            padding: 7px 6px;
          }

          .card-art-top {
            top: 8px;
            left: 8px;
            width: 36%;
            align-items: flex-start;
          }

          .card-art-top span {
            font-size: clamp(24px, 11vw, 34px);
            line-height: 0.9;
            max-width: 100%;
          }

          .card-art-top small {
            font-size: clamp(10px, 3.4vw, 13px);
            margin-top: 2px;
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

          .fit-summary-grid {
            grid-template-columns: 1fr;
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
            display: flex;
          }
        }
      `}</style>
    </main>
  )
})
